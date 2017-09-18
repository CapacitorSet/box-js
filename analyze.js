const lib = require("./lib");
const escodegen = require("escodegen");
const acorn = require("acorn");
const fs = require("fs");
const iconv = require("iconv-lite");
const path = require("path");
const {VM} = require("vm2");
const child_process = require("child_process");
const argv = require("./argv.js").run;

const filename = process.argv[2];

// JScriptMemberFunctionStatement plugin registration
require("./patches/prototype-plugin.js")(acorn);

lib.debug("Analysis launched: " + JSON.stringify(process.argv));
lib.verbose("Box-js version: " + require("./package.json").version);
if (fs.existsSync(path.join(__dirname, ".git"))) {
	lib.verbose("Commit: " + fs.readFileSync(path.join(__dirname, ".git/refs/heads/master"), "utf8").replace(/\n/, ""));
} else {
	lib.verbose("No git folder found.");
}
lib.verbose(`Analyzing ${filename}`, false);
const sampleBuffer = fs.readFileSync(filename);
let encoding;
if (argv.encoding) {
	lib.debug("Using argv encoding");
	encoding = argv.encoding;
} else {
	lib.debug("Using detected encoding");
	encoding = require("jschardet").detect(sampleBuffer).encoding;
	if (encoding === null) {
		lib.warning("jschardet (v" + require("jschardet/package.json").version + ") couldn't detect encoding, using UTF-8");
		encoding = "utf8";
	} else {
		lib.debug("jschardet (v" + require("jschardet/package.json").version + ") detected encoding " + encoding);
	}
}

let code = iconv.decode(sampleBuffer, encoding);

if (code.match("<job") || code.match("<script")) { // The sample may actually be a .wsf, which is <job><script>..</script><script>..</script></job>.
	lib.debug("Sample seems to be WSF");
	code = code.replace(/<\??\/?\w+( [\w=\"\']*)*\??>/g, ""); // XML tags
	code = code.replace(/<!\[CDATA\[/g, "");
	code = code.replace(/\]\]>/g, "");
}

function lacksBinary(name) {
	const path = child_process.spawnSync("command", ["-v", name], {shell: true}).stdout;
	return path.length === 0;
}

function rewrite(code) {
	if (code.match("@cc_on")) {
		lib.debug("Code uses conditional compilation");
		if (!argv["no-cc_on-rewrite"]) {
			code = code
				.replace(/\/\*@cc_on/gi, "")
				.replace(/@cc_on/gi, "")
				.replace(/\/\*@/g, "\n").replace(/@\*\//g, "\n");
			// "@if" processing requires m4 and cc, but don't require them otherwise
			if (/@if/.test(code)) {
				/*
					"@if (cond) source" becomes "\n _boxjs_if(cond)" with JS
					"\n _boxjs_if(cond)" becomes "\n #if (cond) \n source" with m4
					"\n #if (cond) \n source" becomes "source" with the C preprocessor
				*/
				code = code
					.replace(/@if\s*/gi, "\n_boxjs_if")
					.replace(/@elif\s*/gi, "\n_boxjs_elif")
					.replace(/@else/gi, "\n#else\n")
					.replace(/@end/gi, "\n#endif\n")
					.replace(/@/g, "_boxjs_at");
				// Require m4, cc
				if (lacksBinary("cc")) lib.kill("You must install a C compiler (executable 'cc' not found).");
				if (lacksBinary("m4")) lib.kill("You must install m4.");
				code = `
define(\`_boxjs_if', #if ($1)\n)
define(\`_boxjs_elif', #elif ($1)\n)
` + code;
				lib.info("    Replacing @cc_on statements (use --no-cc_on-rewrite to skip)...", false);
				const outputM4 = child_process.spawnSync("m4", [], {input: code});
				const outputCc = child_process.spawnSync("cc", [
					"-E", "-P", // preprocess, don't compile
					"-xc", // read from stdin, lang: c
					"-D_boxjs_at_x86=1", "-D_boxjs_at_win16=0", "-D_boxjs_at_win32=1", "-D_boxjs_at_win64=1", // emulate Windows 32 bit
					"-D_boxjs_at_jscript=1",
					"-o-", // print to stdout
					"-", // read from stdin
				], {
					input: outputM4.stdout.toString("utf8"),
				});
				code = outputCc.stdout.toString("utf8");
			}
			code = code.replace(/_boxjs_at/g, "@");
		} else {
			lib.warn(
				`The code appears to contain conditional compilation statements.
If you run into unexpected results, try uncommenting lines that look like

    /*@cc_on
    <JavaScript code>
    @*/

`
			);
		}
	}

	if (!argv["no-rewrite"]) {
		try {
			lib.verbose("Rewriting code...", false);
			if (argv["dumb-concat-simplify"]) {
				lib.verbose("    Simplifying \"dumb\" concatenations (remove --dumb-concat-simplify to skip)...", false);
				code = code.replace(/'[ \r\n]*\+[ \r\n]*'/gm, "");
				code = code.replace(/"[ \r\n]*\+[ \r\n]*"/gm, "");
			}

			if (argv.preprocess) {
				lib.verbose(`    Preprocessing with uglify-es v${require("uglify-es/package.json").version} (remove --preprocess to skip)...`, false);
				const unsafe = !!argv["unsafe-preprocess"];
				lib.debug("Unsafe preprocess: " + unsafe);
				const result = require("uglify-es").minify(code, {
					parse: {
						bare_returns: true, // used when rewriting function bodies
					},
					compress: {
						passes: 3,

						booleans: true,
						cascade: true,
						collapse_vars: true,
						comparisons: true,
						conditionals: true,
						dead_code: true,
						drop_console: false,
						evaluate: true,
						if_return: true,
						inline: true,
						join_vars: false, // readability
						keep_fargs: unsafe, // code may rely on Function.length
						keep_fnames: unsafe, // code may rely on Function.prototype.name
						keep_infinity: true, // readability
						loops: true,
						negate_iife: false, // readability
						properties: true,
						pure_getters: false, // many variables are proxies, which don't have pure getters
						/* If unsafe preprocessing is enabled, tell uglify-es that Math.* functions
						 * have no side effects, and therefore can be removed if the result is
						 * unused. Related issue: mishoo/UglifyJS2#2227
						 */
						pure_funcs: unsafe ?
							// https://stackoverflow.com/a/10756976
							Object.getOwnPropertyNames(Math).map(key => `Math.${key}`) :
							null,
						reduce_vars: true,
						/* Using sequences (a; b; c; -> a, b, c) provides some performance benefits
						 * (https://github.com/CapacitorSet/box-js/commit/5031ba7114b60f1046e53b542c0e4810aad68a76#commitcomment-23243778),
						 * but it makes code harder to read. Therefore, this behaviour is disabled.
						 */
						sequences: false,
						toplevel: true,
						typeofs: false, // typeof foo == "undefined" -> foo === void 0: the former is more readable
						unsafe,
						unused: true,
					},
					output: {
						beautify: true,
						comments: true,
					},
				});
				if (result.error) {
					lib.error("Couldn't preprocess with uglify-es: " + JSON.stringify(result.error));
				} else {
					code = result.code;
				}
			}

			let tree;
			try {
				tree = acorn.parse(code, {
					allowReturnOutsideFunction: true, // used when rewriting function bodies
					plugins: {
						// enables acorn plugin needed by prototype rewrite
						JScriptMemberFunctionStatement: !argv["no-rewrite-prototype"],
					},
				});
			} catch (e) {
				lib.error("Couldn't parse with Acorn:");
				lib.error(e);
				lib.error("");
				if (filename.match(/jse$/)) {
					lib.error(
`This appears to be a JSE (JScript.Encode) file.
Please compile the decoder and decode it first:

cc decoder.c -o decoder
./decoder ${filename} ${filename.replace(/jse$/, "js")}

`
					);
				} else {
					lib.error(
`This doesn't seem to be a JavaScript/WScript file.
If this is a JSE file (JScript.Encode), compile
decoder.c and run it on the file, like this:

cc decoder.c -o decoder
./decoder ${filename} ${filename}.js

`
					);
				}
				process.exit(4);
				return;
			}

			if (!argv["no-rewrite-prototype"]) {
				lib.verbose("    Replacing `function A.prototype.B()` (use --no-rewrite-prototype to skip)...", false);
				traverse(tree, function(key, val) {
					if (!val) return;
					if (val.type !== "FunctionDeclaration" &&
						val.type !== "FunctionExpression") return;
					if (!val.id) return;
					if (val.id.type !== "MemberExpression") return;
					return require("./patches/prototype.js")(val);
				});
			}


			if (!argv["no-hoist-prototype"]) {
				lib.verbose("    Hoisting `function A.prototype.B()` (use --no-hoist-prototype to skip)...", false);
				hoist(tree);
			}

			if (argv["function-rewrite"]) {
				lib.verbose("    Rewriting functions (remove --function-rewrite to skip)...", false);
				traverse(tree, function(key, val) {
					if (key !== "callee") return;
					if (val.autogenerated) return;
					switch (val.type) {
						case "MemberExpression":
							return require("./patches/this.js")(val.object, val);
						default:
							return require("./patches/nothis.js")(val);
					}
				});
			}

			if (!argv["no-typeof-rewrite"]) {
				lib.verbose("    Rewriting typeof calls (use --no-typeof-rewrite to skip)...", false);
				traverse(tree, function(key, val) {
					if (!val) return;
					if (val.type !== "UnaryExpression") return;
					if (val.operator !== "typeof") return;
					if (val.autogenerated) return;
					return require("./patches/typeof.js")(val.argument);
				});
			}

			if (!argv["no-eval-rewrite"]) {
				lib.verbose("    Rewriting eval calls (use --no-eval-rewrite to skip)...", false);
				traverse(tree, function(key, val) {
					if (!val) return;
					if (val.type !== "CallExpression") return;
					if (val.callee.type !== "Identifier") return;
					if (val.callee.name !== "eval") return;
					return require("./patches/eval.js")(val.arguments);
				});
			}

			if (!argv["no-catch-rewrite"]) { // JScript quirk
				lib.verbose("    Rewriting try/catch statements (use --no-catch-rewrite to skip)...", false);
				traverse(tree, function(key, val) {
					if (!val) return;
					if (val.type !== "TryStatement") return;
					if (!val.handler) return;
					if (val.autogenerated) return;
					return require("./patches/catch.js")(val);
				});
			}

			// console.log(JSON.stringify(tree, null, "\t"));
			code = escodegen.generate(tree);

			// The modifications may have resulted in more concatenations, eg. "a" + ("foo", "b") + "c" -> "a" + "b" + "c"
			if (argv["dumb-concat-simplify"]) {
				lib.verbose("    Simplifying \"dumb\" concatenations (remove --dumb-concat-simplify to skip)...", false);
				code = code.replace(/'[ \r\n]*\+[ \r\n]*'/gm, "");
				code = code.replace(/"[ \r\n]*\+[ \r\n]*"/gm, "");
			}

			lib.verbose("Rewritten successfully.", false);
		} catch (e) {
			console.log("An error occurred during rewriting:");
			console.log(e);
			process.exit(3);
		}
	}

	return code;
}

code = rewrite(code);
lib.logJS(code);
code = fs.readFileSync(path.join(__dirname, "patch.js"), "utf8") + code;

Array.prototype.Count = function() {
	return this.length;
};

const sandbox = {
	logJS: lib.logJS,

	ActiveXObject,
	alert: (x) => {},
	console: {
		log: (x) => lib.info("Script output: " + JSON.stringify(x)),
	},
	Enumerator: require("./emulator/Enumerator"),
	GetObject: require("./emulator/WMI").GetObject,
	JSON,
	location: new Proxy({
		href: "http://www.foobar.com/",
		protocol: "http:",
		host: "www.foobar.com",
		hostname: "www.foobar.com",
	}, {
		get: function(target, name) {
			switch (name) {
				case Symbol.toPrimitive:
					return () => "http://www.foobar.com/";
				default:
					return target[name.toLowerCase()];
			}
		},
	}),
	parse: (x) => {},
	rewrite: (code, log = false) => {
		const ret = rewrite(code);
		if (log) lib.logJS(ret);
		return ret;
	},
	ScriptEngine: () => {
		const type = "JScript"; // or "JavaScript", or "VBScript"
		// lib.warn(`Emulating a ${type} engine (in ScriptEngine)`);
		return type;
	},
	_typeof: (x) => x.typeof ? x.typeof : typeof x,
	WScript: new Proxy({}, {
		get: function(target, name) {
			if (typeof name === "string") name = name.toLowerCase();
			switch (name) {
				case Symbol.toPrimitive:
					return () => "Windows Script Host";
				case "tostring":
					return "Windows Script Host";

				case "arguments":
					return new Proxy((n) => `${n}th argument`, {
						get: function(target, name) {
							switch (name) {
								case "Unnamed":
									return [];
								case "length":
									return 0;
								case "ShowUsage":
									return {
										typeof: "unknown",
									};
								case "Named":
									return [];
								default:
									return new Proxy(
										target[name],
										{
											get: (target, name) => name.toLowerCase() === "typeof" ? "unknown" : target[name],
										}
									);
							}
						},
					});
				case "createobject":
					return ActiveXObject;
				case "echo":
					if (argv["no-echo"])
						return () => {};
					return (x) => {
						lib.verbose("Script wrote: " + x);
						lib.verbose("Add flag --no-echo to disable this.");
					};
				case "path":
					return "C:\\TestFolder\\";
				// case "sleep":
				// This function is emulated in patch.js, because it requires access
				// to the variable _globalTimeOffset, which belongs to the script and
				// not to the emulator.
				case "stdin":
					return new Proxy({
						atendofstream: {
							typeof: "unknown",
						},
						line: 1,
						writeline: (text) => {
							if (argv["no-echo"]) return;
							lib.verbose("Script wrote: " + text);
							lib.verbose("Add flag --no-echo to disable this.");
						},
					}, {
						get: function(target, name) {
							name = name.toLowerCase();
							if (!(name in target))
								lib.kill(`WScript.StdIn.${name} not implemented!`);
							return target[name];
						},
					});
				case "quit":
					return () => {};
				case "scriptfullname":
					return "(ScriptFullName)";
				case "scriptname":
					return "sample.js";
				case "version":
					return "5.8";
				default:
					if (name.toLowerCase() in target) return target[name];
					lib.kill(`WScript.${name} not implemented!`);
			}
		},
	}),
	WSH: "Windows Script Host",
};

// See https://github.com/nodejs/node/issues/8071#issuecomment-240259088
// It will prevent console.log from calling the "inspect" property,
// which can be kinda messy with Proxies
require("util").inspect.defaultOptions.customInspect = false;

if (argv["dangerous-vm"]) {
	lib.verbose("Analyzing with native vm module (dangerous!)");
	const vm = require("vm");
	vm.runInNewContext(code, sandbox, {
		displayErrors: true,
		lineOffset: -fs.readFileSync(path.join(__dirname, "patch.js"), "utf8").split("\n").length,
		filename: "sample.js",
	});
} else {
	lib.debug("Analyzing with vm2 v" + require("vm2/package.json").version);
	const vm = new VM({
		timeout: (argv.timeout || 10) * 1000,
		sandbox,
	});

	vm.run(code);
}

function ActiveXObject(name) {
	lib.verbose(`New ActiveXObject: ${name}`);
	name = name.toLowerCase();
	if (name.match("xmlhttp") || name.match("winhttprequest"))
		return require("./emulator/XMLHTTP");
	if (name.match("dom")) {
		return {
			createElement: require("./emulator/DOM"),
			load: (filename) => {
				// console.log(`Loading ${filename} in a virtual DOM environment...`);
			},
		};
	}

	switch (name) {
		case "adodb.stream":
			return require("./emulator/ADODBStream")();
		case "adodb.recordset":
			return require("./emulator/ADODBRecordSet")();
		case "scriptcontrol":
			return require("./emulator/ScriptControl");
		case "scripting.filesystemobject":
			return require("./emulator/FileSystemObject");
		case "scripting.dictionary":
			return require("./emulator/Dictionary");
		case "shell.application":
			return require("./emulator/ShellApplication");
		case "wscript.network":
			return require("./emulator/WScriptNetwork");
		case "wscript.shell":
			return require("./emulator/WScriptShell");
		case "wbemscripting.swbemlocator":
			return require("./emulator/WBEMScriptingSWBEMLocator");
		default:
			lib.kill(`Unknown ActiveXObject ${name}`);
			break;
	}
}

function traverse(obj, func) {
	const keys = Object.keys(obj);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const replacement = func.apply(this, [key, obj[key]]);
		if (replacement) obj[key] = replacement;
		if (obj.autogenerated) continue;
		if (obj[key] !== null && typeof obj[key] === "object")
			traverse(obj[key], func);
	}
}

// Emulation of member function statements hoisting of by doing some reordering within AST
function hoist(obj, scope) {
	scope = scope || obj;
	// All declarations should be moved to the top of current function scope
	let newScope = scope;
	if (obj.type === "FunctionExpression" && obj.body.type === "BlockStatement")
		newScope = obj.body;

	for (const key of Object.keys(obj)) {
		if (obj[key] !== null && typeof obj[key] === "object") {
			const hoisted = [];
			if (Array.isArray(obj[key])) {
				obj[key] = obj[key].reduce((arr, el) => {
					if (el && el.hoist) {
						// Mark as hoisted yet
						el.hoist = false;
						// Should be hoisted? Add to array and filter out from current.
						hoisted.push(el);
						// If it was an expression: leave identifier
						if (el.hoistExpression)
							arr.push(el.expression.left);
					} else
						arr.push(el);
					return arr;
				}, []);
			} else if (obj[key].hoist) {
				const el = obj[key];

				el.hoist = false;
				hoisted.push(el);
				obj[key] = el.expression.left;
			}
			scope.body.unshift(...hoisted);
			// Hoist all elements
			hoist(obj[key], newScope);
		}
	}
}