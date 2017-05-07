const controller = require("../_controller");

function WScriptShell() {
	this.environment = (x) => {
		if (x.toLowerCase() === "system")
			return (argument) => {
				argument = argument.toLowerCase();
				switch (argument) {
					case "comspec":
						return "%SystemRoot%\\system32\\cmd.exe";
					case "os":
						return "Windows_NT";
					case "processor_architecture":
						// Emulate a 32-bit environment for maximum compatibility
						return "x86";
					default:
						controller.kill(`Unknown parameter ${argument} for WScriptShell.Environment.System`);
				}
			};
		return `(Environment variable ${x})`;
	};
	this.specialfolders = (x) => `(Special folder ${x})`;
	this.createshortcut = () => ({});
	this.expandenvironmentstrings = (path) => {
		path = path.replace(/%COMPUTERNAME%/gi, "USER-PC");
		path = path.replace(/%PROCESSOR_REVISION%/gi, "0209");
		path = path.replace(/%PROGRAMDATA%/gi, "C:\\ProgramData");
		path = path.replace(/%TE?MP%/gi, "C:\\DOCUME~1\\User\\LOCALS~1\\Temp");
		path = path.replace(/%USERNAME%/gi, "User");
		path = path.replace(/%USERPROFILE%/gi, "C:\\Users\\User");
		path = path.replace(/%WINDIR%/gi, "C:\\WINDOWS");

		// %APPDATA% equals C:\Documents and Settings\{username}\Application Data on Windows XP,
		// but C:\Users\{username}\AppData\Roaming on Win Vista and above
		if (process.argv.indexOf("--windows-xp") === -1)
			path = path.replace(/%APPDATA%/gi, "C:\\Documents and Settings\\User\\Application Data");
		else
			path = path.replace(/%APPDATA%/gi, "C:\\Users\\User\\AppData\\Roaming");

		if (/%\w+%/i.test(path)) {
			console.log("Possibly failed to expand environment strings in " + path);
		}

		return path;
	};
	this.exec = this.run = function(...args) {
		const command = args.join(" ");
		const filename = controller.getUUID();
		console.log(`Executing ${controller.directory + filename} in the WScript shell`);
		controller.logSnippet(filename, {as: "WScript code"}, command);
		if (process.argv.indexOf("--no-shell-error") === -1)
			throw new Error("If you can read this, re-run box.js with the --no-shell-error flag.");
	};
	this.regread = (key) => {
		key = key.toUpperCase();
		console.log(`Reading registry key ${key}`);
		switch (key) {
			case "HKEY_LOCAL_MACHINE\\SOFTWARE\\MICROSOFT\\WINDOWS NT\\CURRENTVERSION\\CURRENTVERSION":
				return "5.1";
			case "HKLM\\SOFTWARE\\MICROSOFT\\WINDOWS NT\\CURRENTVERSION\\SYSTEMROOT":
				return "C:\\WINDOWS";
			default:
				console.log("Unknown registry key!");
				return;
		}
	};
	this.regwrite = (key, value, type = "(unspecified)") => console.log(`Setting registry key ${key} to ${value} of type ${type}`);
	this.popup = function(text, a, title = "[Untitled]", b) {
		if (process.argv.indexOf("--no-echo") === -1) {
			console.log(`Script opened a popup window: title "${title}", text "${text}"`);
			console.log("Add flag --no-echo to disable this.");
		}
		return true; // Emulates a click
	};
}

module.exports = function(name) {
	return new Proxy(new WScriptShell(name), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`WScriptShell.${name} not implemented!`);
					}
					return target[name];
			}
		},
		set: function(a, b, c) {
			b = b.toLowerCase();
			if (c.length < 1024)
				console.log(`WScriptShell[${b}] = ${c};`);
			a[b] = c;
			return true;
		},
	});
};
