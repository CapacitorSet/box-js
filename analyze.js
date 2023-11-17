const lib = require("./lib");
const loop_rewriter = require("./loop_rewriter");
const equality_rewriter = require("./equality_rewriter");
const escodegen = require("escodegen");
const acorn = require("acorn");
const fs = require("fs");
const iconv = require("iconv-lite");
const path = require("path");
const {VM} = require("vm2");
const child_process = require("child_process");
const argv = require("./argv.js").run;
const jsdom = require("jsdom").JSDOM;
const dom = new jsdom(`<html><head></head><body></body></html>`);
const { DOMParser } = require('xmldom');

const filename = process.argv[2];

// JScriptMemberFunctionStatement plugin registration
// Plugin system is now different in Acorn 8.*, so commenting out.
//require("./patches/prototype-plugin.js")(acorn);

lib.debug("Analysis launched: " + JSON.stringify(process.argv));
lib.verbose("Box-js version: " + require("./package.json").version);

let git_path = path.join(__dirname, ".git");
if (fs.existsSync(git_path) && fs.lstatSync(git_path).isDirectory()) {
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

let rawcode;
if (argv["activex-as-ioc"]) {
    rawcode = iconv.decode(sampleBuffer, encoding);
}

/*
if (code.match("<job") || code.match("<script")) { // The sample may actually be a .wsf, which is <job><script>..</script><script>..</script></job>.
    lib.debug("Sample seems to be WSF");
    code = code.replace(/<\??\/?\w+( [\w=\"\']*)*\??>/g, ""); // XML tags
    code = code.replace(/<!\[CDATA\[/g, "");
    code = code.replace(/\]\]>/g, "");
}
*/

function lacksBinary(name) {
    const path = child_process.spawnSync("command", ["-v", name], {
        shell: true
    }).stdout;
    return path.length === 0;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function stripSingleLineComments(s) {
    const lines = s.split("\n");
    var r = "";
    for (const line of lines) {
        var lineStrip = line.trim();
        // Full line comment?
        if (lineStrip.startsWith("//")) continue;
        r += line + "\n";
    }
    return r;
}

function isAlphaNumeric(str) {
    var code, i;

    if (str.length == 0) return false;
    code = str.charCodeAt(0);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
        return false;
    }
    return true;
};

function hideStrs(s) {
    var inStrSingle = false;
    var inStrDouble = false;
    var inStrBackTick = false;
    var inComment = false;
    var inCommentSingle = false;
    var inRegex = false
    var oldInRegex = false
    var currStr = undefined;
    var prevChar = "";
    var prevPrevChar = "";
    var allStrs = {};
    var escapedSlash = false;
    var prevEscapedSlash = false;
    var counter = 1000000;
    var r = "";
    var skip = false;
    var justExitedComment = false;
    var slashSubstr = ""
    var resetSlashes = false;
    s = stripSingleLineComments(s);
    //console.log("prev,curr,dbl,single,commsingl,comm,regex,slash,justexitcom");
    for (let i = 0; i < s.length; i++) {

        // Track consecutive backslashes. We use this to tell if the
        // current back slash has been escaped (even # of backslashes)
        // or is escaping the next character (odd # of slashes).
        if (prevChar == "\\" && (slashSubstr.length == 0)) {
            slashSubstr = "\\";
        }
        else if (prevChar == "\\" && (slashSubstr.length > 0)) {
            slashSubstr += "\\";
        }        
        else if (prevChar != "\\") {
            slashSubstr = "";
        }
        // Backslash escaping gets 'reset' when hitting a space.
        var currChar = s[i];
        if ((currChar == " ") && slashSubstr) {
            slashSubstr = "";
            resetSlashes = true;
        }
        
        // Start /* */ comment?
	var oldInComment = inComment;
        inComment = inComment || ((prevChar == "/") && (currChar == "*") && !inStrDouble && !inStrSingle && !inCommentSingle && !inStrBackTick);
        //console.log(JSON.stringify([prevChar, currChar, inStrDouble, inStrSingle, inCommentSingle, inComment, inRegex, slashSubstr, justExitedComment]))
	//console.log(r);
        
        // In /* */ comment?
        if (inComment) {

	    // We are stripping /* */ comments, so drop the '/' if we
	    // just entered the comment.
	    if (oldInComment != inComment) {
                inRegex = false;
                r = r.slice(0, -1);
            }
	    
	    // Dropping /* */ comments, so don't save current char.

            // Out of comment?
            if ((prevChar == "*") && (currChar == "/")) {
                inComment = false;
                // Handle FP single line comment detection for things
                // like '/* comm1 *//* comm2 */'.
                justExitedComment = true;
            }

            // Keep going until we leave the comment. Recognizing some
            // constructs is hard with whitespace, so strip that out
            // when tracking previous characters.
            if (currChar != " ") prevChar = currChar;
            continue;
        }

        // Start // comment?
        inCommentSingle = inCommentSingle || ((prevChar == "/") && (currChar == "/") && !inStrDouble && !inStrSingle && !inComment && !justExitedComment && !inStrBackTick);
	// Could have falsely jumped out of a /**/ comment if it contains a //.
	if ((prevChar == "/") && (currChar == "/") && !inComment && justExitedComment) {
	    inComment = true;
	    justExitedComment = false;
	    continue
	}
        justExitedComment = false;
        
        // In // comment?
        if (inCommentSingle) {

            // Not in a regex if we are in a '// ...' comment.
            inRegex = false;

            // Save comment text unmodified.
            r += currChar;

            // Out of comment?
            if (currChar == "\n") {
                inCommentSingle = false;
            }

            // Keep going until we leave the comment.
            if (currChar != " ") prevChar = currChar;
            continue;
        }

        // Start /.../ regex expression?
        oldInRegex = inRegex;
        // Assume that regex expressions can't be preceded by ')' or
        // an alphanumeric character. This is to try to tell divisiion
        // from the start of a regex.
        inRegex = inRegex || ((prevChar != "/") && (prevChar != ")") && !isAlphaNumeric(prevChar) &&
                              (currChar == "/") && !inStrDouble && !inStrSingle && !inComment && !inCommentSingle && !inStrBackTick);
        
        // In /.../ regex expression?
        if (inRegex) {

            // Save regex unmodified.
            r += currChar;

            // Out of regex?
            if (oldInRegex && (currChar == "/") && ((slashSubstr.length % 2) == 0)) {
                inRegex = false;
            }

            // Keep going until we leave the regex.
            if (currChar != " ") prevChar = currChar;
            if (resetSlashes) prevChar = " ";
            resetSlashes = false;
            continue;
        }
        
        // Looking at an escaped back slash (1 char back)?
        escapedSlash = (prevChar == "\\" && prevPrevChar == "\\");
        
	// Start/end single quoted string?
	if ((currChar == "'") &&
            ((prevChar != "\\") || ((prevChar == "\\") && ((slashSubstr.length % 2) == 0) && inStrSingle)) &&
            !inStrDouble && !inStrBackTick) {

	    // Switch being in/out of string.
	    inStrSingle = !inStrSingle;

	    // Finished up a string we were tracking?
	    if (!inStrSingle) {
		currStr += "'";
                const strName = "HIDE_" + counter++;
                allStrs[strName] = currStr;
                r += strName;
                skip = true;
	    }
	    else {
		currStr = "";
	    }
	};

	// Start/end double quoted string?
	if ((currChar == '"') &&
            ((prevChar != "\\") || ((prevChar == "\\") && ((slashSubstr.length % 2) == 0) && inStrDouble)) &&
            !inStrSingle && !inStrBackTick) {

	    // Switch being in/out of string.
	    inStrDouble = !inStrDouble;

	    // Finished up a string we were tracking?
	    if (!inStrDouble) {
		currStr += '"';
                const strName = "HIDE_" + counter++;
                allStrs[strName] = currStr;
                r += strName;
                skip = true;
	    }
	    else {
		currStr = "";
	    }
	};

	// Start/end backtick quoted string?
	if ((currChar == '`') &&
            ((prevChar != "\\") || ((prevChar == "\\") && escapedSlash && !prevEscapedSlash && inStrBackTick)) &&
            !inStrSingle && !inStrDouble) {

	    // Switch being in/out of string.
	    inStrBackTick = !inStrBackTick;

	    // Finished up a string we were tracking?
	    if (!inStrBackTick) {
		currStr += '`';
                const strName = "HIDE_" + counter++;
                allStrs[strName] = currStr;
                r += strName;
                skip = true;
	    }
	    else {
		currStr = "";
	    }
	};

	// Save the current character if we are tracking a string.
	if (inStrDouble || inStrSingle || inStrBackTick) {
            currStr += currChar;
        }

        // Not in a string. Just save the original character in the
        // result string.
        else if (!skip) {
            r += currChar;
        };
        skip = false;

	// Track what is now the previous character so we can handle
	// escaped quotes in strings.
        prevPrevChar = prevChar;
        if (currChar != " ") prevChar = currChar;
        if (resetSlashes) prevChar = " ";
        resetSlashes = false;
        prevEscapedSlash = escapedSlash;
    }
    return [r, allStrs];
}

function unhideStrs(s, map) {

    // Replace each HIDE_NNNN with the hidden string.
    var oldPos = 0;
    var currPos = s.indexOf("HIDE_");
    var r = "";
    var done = (currPos < 0);
    while (!done) {

        // Add in the previous non-hidden string contents.
        r += s.slice(oldPos, currPos);

        // Pull out the name of the hidden string.
        var tmpPos = currPos + "HIDE_".length + 7;

        // Get the original string.
        var hiddenName = s.slice(currPos, tmpPos);        
        var origVal = map[hiddenName];
        
        // Add in the unhidden string.
        r += origVal;

        // Move to the next string to unhide.
        oldPos = tmpPos;
        currPos = s.slice(tmpPos).indexOf("HIDE_");
        done = (currPos < 0);
        currPos = tmpPos + currPos;
    }

    // Add in remaining original string that had nothing hidden.
    r += s.slice(tmpPos);
    
    // Done.
    return r;
}

// JScript lets you stick the actual code to run in a conditional
// comment like '/*@if(@_jscript_version >= 4)....*/'. If there,
// extract that code out.
function extractCode(code) {

    // See if we can pull code out from conditional comments.
    // /*@if(@_jscript_version >= 4) ... @else @*/
    // /*@if(1) ... @end@*/
    const commentPat = /\/\*@if\s*\([^\)]+\)(.+?)@(else|end)\s*@\s*\*\//
    const codeMatch = code.match(commentPat);
    if (!codeMatch) return code;
    var r = codeMatch[1];
    lib.info("Extracted code to analyze from conditional JScript comment.");
    return r;
}

function rewrite(code) {

    //console.log("!!!! CODE: 0 !!!!");
    //console.log(code);                
    //console.log("!!!! CODE: 0 !!!!");
    
    // box-js is assuming that the JS will be run on Windows with cscript or wscript.
    // Neither of these engines supports strict JS mode, so remove those calls from
    // the code.
    code = code.toString().replace(/"use strict"/g, '"STRICT MODE NOT SUPPORTED"');
    code = code.toString().replace(/'use strict'/g, "'STRICT MODE NOT SUPPORTED'");

    // The following 2 code rewrites should not be applied to patterns
    // in string literals. Hide the string literals first.
    //
    // This also strips all comments.
    var counter = 1000000;
    const [newCode, strMap] = hideStrs(code);
    code = newCode;
    //console.log("!!!! CODE: 1 !!!!");
    //console.log(code);                
    //console.log("!!!! CODE: 1 !!!!");
    
    // WinHTTP ActiveX objects let you set options like 'foo.Option(n)
    // = 12'. Acorn parsing fails on these with a assigning to rvalue
    // syntax error, so rewrite things like this so we can parse
    // (replace these expressions with comments). We have to do this
    // with regexes rather than modifying the parse tree since these
    // expressions cannot be parsed by acorn.
    const rvaluePat = /[\n;][^\n^;]*?\([^\n^;]+?\)\s*=[^=^>][^\n^;]+?\r?(?=[\n;])/g;
    code = code.toString().replace(rvaluePat, ';/* ASSIGNING TO RVALUE */');
    //console.log("!!!! CODE: 2 !!!!");
    //console.log(code);                
    //console.log("!!!! CODE: 2 !!!!");
    //console.log("!!!! STRMAP !!!!");
    //console.log(strMap);
    //console.log("!!!! STRMAP !!!!");
    
    // Now unhide the string literals.
    code = unhideStrs(code, strMap);
    //console.log("!!!! CODE: 3 !!!!");
    //console.log(code);                
    //console.log("!!!! CODE: 3 !!!!");
    
    // Some samples (for example that use JQuery libraries as a basis to which to
    // add malicious code) won't emulate properly for some reason if there is not
    // an assignment line at the start of the code. Add one here (this should not
    // change the behavior of the code).
    code = "__bogus_var_name__ = 12;\n\n" + code;
    
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
                const outputM4 = child_process.spawnSync("m4", [], {
                    input: code
                });
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

            let tree;
            try {
                //console.log("!!!! CODE FINAL !!!!");
                //console.log(code);                
                //console.log("!!!! CODE FINAL !!!!");
                tree = acorn.parse(code, {
                    ecmaVersion: "latest",
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
                        // @@@ Emacs JS mode does not properly parse this block.
                        //`This doesn't seem to be a JavaScript/WScript file.
                        //If this is a JSE file (JScript.Encode), compile
                        //decoder.c and run it on the file, like this:
                        //
                        //cc decoder.c -o decoder
                        //./decoder ${filename} ${filename}.js
                        //
                        //`
                        "Decode JSE. 'cc decoder.c -o decoder'. './decoder ${filename} ${filename}.js'"
                    );
                }
                process.exit(4);
                return;
            }

            // Loop rewriting is looking for loops in the original unmodified code so
            // do this before any other modifications.
            if (argv["rewrite-loops"]) {
                lib.verbose("    Rewriting loops...", false);
                traverse(tree, loop_rewriter.rewriteSimpleWaitLoop);
                traverse(tree, loop_rewriter.rewriteSimpleControlLoop);
                traverse(tree, loop_rewriter.rewriteLongWhileLoop);
            };

            // Rewrite == checks so that comparisons of the current script name to
            // a hard coded script name always return true.
            if (argv["loose-script-name"] && code.includes("==")) {
                lib.verbose("    Rewriting == checks...", false);
                traverse(tree, equality_rewriter.rewriteScriptCheck);
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
                            Object.getOwnPropertyNames(Math).map(key => `Math.${key}`) : null,
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
            
            if (!argv["no-rewrite-prototype"]) {
                lib.verbose("    Replacing `function A.prototype.B()` (use --no-rewrite-prototype to skip)...", false);
                traverse(tree, function(key, val) {
                    if (!val) return;
                    if (val.type !== "FunctionDeclaration" &&
                        val.type !== "FunctionExpression") return;
                    if (!val.id) return;
                    if (val.id.type !== "MemberExpression") return;
                    r = require("./patches/prototype.js")(val);
                    return r;
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

            code = escodegen.generate(tree);
            //console.log("!!!! CODE !!!!");
            //console.log(code);

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

// Extract the actual code to analyze from conditional JScript
// comments if needed.
if (argv["extract-conditional-code"]) {
    code = extractCode(code);
}

// Track if we are throttling large/frequent file writes.
if (argv["throttle-writes"]) {
    lib.throttleFileWrites(true);
};

// Rewrite the code if needed.
code = rewrite(code);

// prepend extra JS containing mock objects in the given file(s) onto the code
if (argv["prepended-code"]) {

    var prependedCode = ""
    var files = []

    // get all the files in the directory and sort them alphebetically
    if (fs.lstatSync(argv["prepended-code"]).isDirectory()) {

        dir_files = fs.readdirSync(argv["prepended-code"]);
        for (var i = 0; i < dir_files.length; i++) {
            files.push(path.join(argv["prepended-code"], dir_files[i]))
        }

        // make sure we're adding mock code in the right order
        files.sort()
    } else {
        files.push(argv["prepended-code"])
    }

    for (var i = 0; i < files.length; i++) {
        prependedCode += fs.readFileSync(files[i], 'utf-8') + "\n\n"
    }

    code = prependedCode + "\n\n" + code
}

// prepend patch code, unless it is already there.
if (!code.includes("let __PATCH_CODE_ADDED__ = true;")) {
    code = fs.readFileSync(path.join(__dirname, "patch.js"), "utf8") + code;
}
else {
    console.log("Patch code already added.");
}

// append more code
code += "\n\n" + fs.readFileSync(path.join(__dirname, "appended-code.js"));

lib.logJS(code);

Array.prototype.Count = function() {
    return this.length;
};

// Set the fake scripting engine to report.
var fakeEngineShort = "wscript.exe"
if (argv["fake-script-engine"]) {
    fakeEngineShort = argv["fake-script-engine"];
}
var fakeEngineFull = "C:\\WINDOWS\\system32\\" + fakeEngineShort;

// Fake command line options can be set with the --fake-cl-args option.
var commandLineArgs = [];
if (argv["fake-cl-args"]) {
    commandLineArgs = argv["fake-cl-args"].split(",");
}

// Fake sample file name can be set with the --fake-sample-name option.
var sampleName = "CURRENT_SCRIPT_IN_FAKED_DIR.js";
var sampleFullName = "C:\Users\\Sysop12\\AppData\\Roaming\\Microsoft\\Templates\\" + sampleName;
if (argv["fake-sample-name"]) {

    // Sample name with full path?
    var dirChar = undefined;
    if (argv["fake-sample-name"].indexOf("\\") >= 0) {
        dirChar = "\\";
    }
    if (argv["fake-sample-name"].indexOf("/") >= 0) {
        dirChar = "/";
    }
    if (dirChar) {

        // Break out the immediate sample name and full name.
        sampleName = argv["fake-sample-name"].slice(argv["fake-sample-name"].lastIndexOf(dirChar) + 1);
        sampleFullName = argv["fake-sample-name"];
    }
    else {
        sampleName = argv["fake-sample-name"];
        sampleFullName = "C:\Users\\Sysop12\\AppData\\Roaming\\Microsoft\\Templates\\" + sampleName;
    }
    lib.logIOC("Sample Name",
               {"sample-name": sampleName, "sample-name-full": sampleFullName},
               "Using fake sample file name " + sampleFullName + " when analyzing.");
}
else {
    lib.logIOC("Sample Name",
               {"sample-name": sampleName, "sample-name-full": sampleFullName},
               "Using standard fake sample file name " + sampleFullName + " when analyzing.");
}

// Fake up the WScript object for Windows JScript.
var wscript_proxy = new Proxy({
    arguments: new Proxy((n) => commandLineArgs[n], {
        get: function(target, name) {
            name = name.toString().toLowerCase();
            switch (name) {
            case "unnamed":
                return commandLineArgs;
            case "length":
                return commandLineArgs.length;
            case "showUsage":
                return {
                    typeof: "unknown",
                };
            case "named":
                return commandLineArgs;
            default:
                return new Proxy(
                    target[name], {
                        get: (target, name) => name.toLowerCase() === "typeof" ? "unknown" : target[name],
                    }
                );
            }
        },
    }),
    buildversion: "1234",
    interactive: true,
    fullname: fakeEngineFull,
    name: fakeEngineShort,
    path: "C:\\TestFolder\\",
    scriptfullname: sampleFullName,
    scriptname: sampleName,
    quit: function() {        
        lib.logIOC("WScript", "Quit()", "The sample explcitly called WScript.Quit().");
        //console.trace()
        if (!argv["ignore-wscript-quit"]) {
            process.exit(0);
        }
    },
    get stderr() {
        lib.error("WScript.StdErr not implemented");
    },
    get stdin() {
        lib.error("WScript.StdIn not implemented");
    },
    get stdout() {
        lib.error("WScript.StdOut not implemented");
    },
    version: "5.8",
    get connectobject() {
        lib.error("WScript.ConnectObject not implemented");
    },
    createobject: ActiveXObject,
    get disconnectobject() {
        lib.error("WScript.DisconnectObject not implemented");
    },
    echo() {},
    get getobject() {
        lib.error("WScript.GetObject not implemented");
    },
    // Note that Sleep() is implemented in patch.js because it requires
    // access to the variable _globalTimeOffset, which belongs to the script
    // and not to the emulator.
    [Symbol.toPrimitive]: () => "Windows Script Host",
    tostring: "Windows Script Host",
}, {
    get(target, prop) {
        // For whatever reasons, WScript.* properties are case insensitive.
        if (typeof prop === "string")
            prop = prop.toLowerCase();
        return target[prop];
    }
});

const sandbox = {
    saveAs : function(data, fname) {
        // TODO: If Blob need to extract the data.
        lib.writeFile(fname, data);
    },
    setInterval : function() {},
    setTimeout : function(func, time) {

        // The interval should be an int, so do a basic check for int.
        if ((typeof(time) !== "number") || (time == null)) {
            throw("time is not a number.");
        }
        
        // Just call the function immediately, no waiting.
        if (typeof(func) === "function") {
            func();
        }
        else {
            throw("Callback must be a function");
        }
    },
    logJS: lib.logJS,
    logIOC: lib.logIOC,
    logUrl: lib.logUrl,
    ActiveXObject,
    dom,
    alert: (x) => {},
    InstallProduct: (x) => {
        lib.logUrl("InstallProduct", x);
    },
    console: {
        //log: (x) => console.log(x),
        //log: (x) => lib.info("Script output: " + JSON.stringify(x)),
        log: function (x) {
            lib.info("Script output: " + x);
            // Log evals of JS downloaded from a C2 if needed.
            if (x === "EXECUTED DOWNLOADED PAYLOAD") {
                lib.logIOC("PayloadExec", x, "The script executed JS returned from a C2 server.");
            }
        },
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
    WScript: wscript_proxy,
    WSH: wscript_proxy,
    self: {},
    require
};

// See https://github.com/nodejs/node/issues/8071#issuecomment-240259088
// It will prevent console.log from calling the "inspect" property,
// which can be kinda messy with Proxies
require("util").inspect.defaultOptions.customInspect = false;

if (argv["dangerous-vm"]) {
    lib.verbose("Analyzing with native vm module (dangerous!)");
    const vm = require("vm");
    //console.log(code);
    vm.runInNewContext(code, sandbox, {
        displayErrors: true,
        // lineOffset: -fs.readFileSync(path.join(__dirname, "patch.js"), "utf8").split("\n").length,
        filename: "sample.js",
    });
} else {
    lib.debug("Analyzing with vm2 v" + require("vm2/package.json").version);

    const vm = new VM({
        timeout: (argv.timeout || 10) * 1000,
        sandbox,
    });

    // Fake cscript.exe style ReferenceError messages.
    code = "ReferenceError.prototype.toString = function() { return \"[object Error]\";};\n\n" + code;
    // Fake up Object.toString not being defined in cscript.exe.
    //code = "Object.prototype.toString = undefined;\n\n" + code;

    // Run the document.body.onload() function if defined to simulate
    // document loading.
    code += "\nif ((typeof(document) != 'undefined') && (typeof(document.body) != 'undefined') && (typeof(document.body.onload) != 'undefined')) document.body.onload();\n"
    
    try{
        vm.run(code);
    } catch (e) {
        lib.error("Sandbox execution failed:");
        console.log(e.stack);
        lib.error(e.message);
        process.exit(1);
    }
}

function mapCLSID(clsid) {
    clsid = clsid.toUpperCase();
    switch (clsid) {
    case "F935DC22-1CF0-11D0-ADB9-00C04FD58A0B":
        return "wscript.shell";
    case "000C1090-0000-0000-C000-000000000046":
        return "windowsinstaller.installer";
    case "00000566-0000-0010-8000-00AA006D2EA4":
        return "adodb.stream";
    case "00000535-0000-0010-8000-00AA006D2EA4":
        return "adodb.recordset";
    case "00000514-0000-0010-8000-00AA006D2EA4":
        return "adodb.connection";
    case "0E59F1D5-1FBE-11D0-8FF2-00A0D10038BC":
        return "scriptcontrol";
    case "0D43FE01-F093-11CF-8940-00A0C9054228":
        return "scripting.filesystemobject";
    case "EE09B103-97E0-11CF-978F-00A02463E06F":
        return "scripting.dictionary";
    case "13709620-C279-11CE-A49E-444553540000":
        return "shell.application";
    case "0002DF01-0000-0000-C000-000000000046":
        return "internetexplorer.application";
    case "F935DC26-1CF0-11D0-ADB9-00C04FD58A0B":
        return "wscript.network";
    case "76A64158-CB41-11D1-8B02-00600806D9B6":
        return "wbemscripting.swbemlocator";
    case "0E59F1D5-1FBE-11D0-8FF2-00A0D10038BC":
        return "msscriptcontrol.scriptcontrol";
    case "0F87369F-A4E5-4CFC-BD3E-73E6154572DD":
        return "schedule.service";
    default:
        return null;
    }
}

function ActiveXObject(name) {

    // Check for use of encoded ActiveX object names.
    lib.verbose(`New ActiveXObject: ${name}`);
    if (argv["activex-as-ioc"]) {
        
        // Handle ActiveX objects referred to by CLSID.
        m = name.match(
            /new\s*:\s*\{?([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})\}?/i
        );
        if (m !== null) {
            clsid = m[1].toUpperCase();
            mappedname = mapCLSID(clsid);
            if (mappedname !== null) {
                lib.logIOC("CLSID ActiveX Object Created",{name, mappedname}, `The script created a new ActiveX object ${mappedname} using CLSID ${name}`);
                name = mappedname;
            }
        }
        
        // Is the name obfuscated in the source? Note that if the name
        // is given as a CLSID this will probably be true.
        //console.log((new Error()).stack);
        name_re = new RegExp(name, 'i');
        pos = rawcode.search(name_re);
        if (pos === -1) {
            lib.logIOC("Obfuscated ActiveX Object",{name}, `The script created a new ActiveX object ${name}, but the string was not found in the source.`);
        }
        else {
            lib.logIOC("ActiveX Object Created",{name}, `The script created a new ActiveX object ${name}`);
        }
    }

    // Actually emulate the ActiveX object creation.
    name = name.toLowerCase();
    if (name.match("xmlhttp") || name.match("winhttprequest")) {
        return require("./emulator/XMLHTTP");
    }
    if (name.match("dom")) {
        const r = {
            createElement: function(tag) {
                var r = this.document.createElement(tag);
                r.text = "";
                return r;
            },
            load: (filename) => {
                console.log(`Loading ${filename} in a virtual DOM environment...`);
            },
            loadXML: function(s) {
                try {
                    this.document = new DOMParser().parseFromString(s);
                    this.documentElement = this.document.documentElement;
                    this.documentElement.document = this.document;
                    this.documentElement.createElement = function(tag) {
                        var r = this.document.createElement(tag);
                        r.text = "";
                        return r;
                    };
                    return true;
                }
                catch (e) { return false; };
            },
        };
        return r;
    }

    switch (name) {
    case "windowsinstaller.installer":
        return require("./emulator/WindowsInstaller");
    case "adodb.stream":
        return require("./emulator/ADODBStream")();
    case "adodb.recordset":
        return require("./emulator/ADODBRecordSet")();
    case "adodb.connection":
        return require("./emulator/ADODBConnection")();
    case "scriptcontrol":
        return require("./emulator/ScriptControl");
    case "scripting.filesystemobject":
        return require("./emulator/FileSystemObject");
    case "scripting.dictionary":
        return require("./emulator/Dictionary");
    case "shell.application":
        return require("./emulator/ShellApplication");
    case "internetexplorer.application":
        return require("./emulator/InternetExplorerApplication");
    case "wscript.network":
        return require("./emulator/WScriptNetwork");
    case "wscript.shell":
        return require("./emulator/WScriptShell");
    case "wbemscripting.swbemlocator":
        return require("./emulator/WBEMScriptingSWBEMLocator");
    case "msscriptcontrol.scriptcontrol":
        return require("./emulator/MSScriptControlScriptControl");
    case "schedule.service":
        return require("./emulator/ScheduleService");
    case "system.text.asciiencoding":
        return require("./emulator/AsciiEncoding");
    case "system.security.cryptography.frombase64transform":
        return require("./emulator/Base64Transform");
    case "system.io.memorystream":
        return require("./emulator/MemoryStream");
    case "system.runtime.serialization.formatters.binary.binaryformatter":
        return require("./emulator/BinaryFormatter");
    case "system.collections.arraylist":
        return require("./emulator/ArrayList");
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
