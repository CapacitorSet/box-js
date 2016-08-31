var controller = require("../_controller")

function WScriptShell() {
	this.environment = x => {
		if (x.toLowerCase() == "system") return argument => {
			argument = argument.toLowerCase();
			switch (argument) {
				case "comspec":
					return "\\%SystemRoot\\%\\\\system32\\cmd.exe";
				case "os":
					return "Windows_NT";
				case "processor_architecture":
					// Emulate a 32-bit environment for maximum compatibility
					return "x86";
				default:
					controller.kill(`Unknown parameter ${argument} for WScriptShell.Environment.System`);
			}
		}
		return `(Environment variable ${x})`;
	}
	this.specialfolders = x => "(some folder)";
	this.createshortcut = () => ({});
	this.expandenvironmentstrings = path => {
		path = path.replace(/%TE?MP%/gi, "C:\\DOCUME~1\\MyUsername\\LOCALS~1\\Temp");
		return path;
	};
	this.exec = this.run = function() {
		const command = Object.keys(arguments).map(key => arguments[key]).join(" ");
		const filename = controller.getUUID()
		console.log(`Executing ${controller.directory + filename} in the WScript shell`);
		controller.logSnippet(filename, {as: "WScript code"}, command)
		if (process.argv.indexOf("--no-shell-error") == -1)
			throw new Error("If you can read this, re-run box.js with the --no-shell-error flag.");
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
		},
		set: function(a, b, c) {
			b = b.toLowerCase();
			if (c.length < 1024)
				console.log(`WScriptShell[${b}] = ${c};`);
			a[b] = c;
		}

	})
}