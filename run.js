var vm = require("vm"),
	fs = require("fs"),
	controller = require("./_controller");

const sample = fs.readFileSync("patch.js", "utf8") + fs.readFileSync("sample.js", "utf8");
evaluator(sample);

function evaluator(code) {
	if (code.match("/*@")) {
		console.log("The code appears to contain conditional compilation statements.");
		console.log("If you run into unexpected results, try uncommenting lines that look like")
		console.log("")
		console.log("    /*@cc_on")
		console.log("    <JavaScript code>")
		console.log("    @*/")
		console.log("")
	}
	controller.logJS(code);

	var sandbox = {
		_evalHook: controller.logJS,
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
	}

	return vm.runInNewContext(code, sandbox, {
		displayErrors: true,
		filename: "sample.js",
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