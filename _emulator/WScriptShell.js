var controller = require("../_controller")

function WScriptShell() {
	this.environment = x => `(Environment variable ${x})`;
	this.expandenvironmentstrings = function(arg) {
		switch (arg) {
			case "%TEMP%":
				return "(path)";
			case "%TEMP%/":
				return "(path)/";
			default:
				controller.kill(`Unknown argument ${arg}`);
		}
	}
	this.exec = this.run = function(command) {
		const filename = controller.getUUID()
		console.log("Executing", filename, "in the WScript shell")
		controller.logSnippet(filename, {as: "WScript code"}, command)
		// throw new Error(); // See README
	}
}

module.exports = function(name) {
	return new Proxy(new WScriptShell(name), {
		get: function(target, name) {
			name = name.toLowerCase()
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`WScriptShell.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}