var safe = require("safe-eval"),
	fs = require("fs"),
	beautify = require("js-beautify").js_beautify,
	controller = require("./_controller");

evaluator(fs.readFileSync("sample.js", "utf8"));

function evaluator(code, globals) {
	// For whatever reason, the "1;" prevents many parsers from breaking
	code = "1; eval = function(x) { return _eval(x, this); };" + code;
	const filename = controller.getUUID() + ".js";

	console.log("Code saved to", filename)
	controller.logSnippet(filename, {as: "JS"}, beautify("1;" + code))

	return safe("1;" + code, globals ? globals : {
		_eval: evaluator,
		console: {
			log: x => console.log(x)
		},
		WScript: new Proxy({}, {
			get: function(target, name) {
				switch (name) {
					case "CreateObject":
						return ActiveXObject
					case "Sleep":
						// return x => console.log(`Sleeping for ${x} ms...`)
						return x => {}
					case "ScriptFullName":
						return "(ScriptFullName)";
					default:
						controller.kill(`WScript.${name} not implemented!`)
				}
			}
		}),
		ActiveXObject
	}, {
		timeout: 10000
	});
}

function ActiveXObject(name) {
	// console.log("New ActiveXObject created:", name);
	switch (name) {
		case "WScript.Shell":
			return require("./_emulator/WScriptShell")();
		case "MSXML2.XMLHTTP":
			return require("./_emulator/XMLHTTP")();
		case "ADODB.Stream":
			return require("./_emulator/ADODBStream")();
		case "Msxml2.DOMDocument.3.0":
			this.createElement = require("./_emulator/DOM");
			break;
		case "WinHttp.WinHttpRequest.5.1":
			return require("./_emulator/WinHttpRequest")();
		case "WScript.Network":
			return require("./_emulator/WScriptNetwork")();
		case "Scripting.FileSystemObject":
			return require("./_emulator/FileSystemObject")();
		default:
			controller.kill(`Unknown ActiveXObject ${name}`);
			break;
	}
}