const controller = require('../_controller');

function WScriptShell() {
	this.environment = (x) => {
		if (x.toLowerCase() === 'system')
			return (argument) => {
				argument = argument.toLowerCase();
				switch (argument) {
					case 'comspec':
						return '%SystemRoot%\\system32\\cmd.exe';
					case 'os':
						return 'Windows_NT';
					case 'processor_architecture':
						// Emulate a 32-bit environment for maximum compatibility
						return 'x86';
					default:
						controller.kill(`Unknown parameter ${argument} for WScriptShell.Environment.System`);
				}
			};
		return `(Environment variable ${x})`;
	};
	this.specialfolders = (x) => '(some folder)';
	this.createshortcut = () => ({});
	this.expandenvironmentstrings = (path) => {
		path = path.replace(/%TE?MP%/gi, 'C:\\DOCUME~1\\MyUsername\\LOCALS~1\\Temp');
		path = path.replace(/%PROCESSOR_REVISION%/gi, '0209');

		// %APPDATA% equals C:\Documents and Settings\{username}\Application Data on Windows XP,
		// but C:\Users\{username}\AppData\Roaming on Win Vista and above
		if (process.argv.indexOf('--windows-xp') === -1)
			path = path.replace(/%APPDATA%/gi, 'C:\\Documents and Settings\\MyUsername\\Application Data');
		else
			path = path.replace(/%APPDATA%/gi, 'C:\\Users\\MyUsername\\AppData\\Roaming');
		return path;
	};
	this.exec = this.run = function(...args) {
		const command = args.join(' ');
		const filename = controller.getUUID();
		console.log(`Executing ${controller.directory + filename} in the WScript shell`);
		controller.logSnippet(filename, {as: 'WScript code'}, command);
		if (process.argv.indexOf('--no-shell-error') === -1)
			throw new Error('If you can read this, re-run box.js with the --no-shell-error flag.');
	};
	this.regwrite = (key, value, type = '(unspecified)') => console.log(`Setting registry key ${key} to ${value} of type ${type}`);
	this.popup = function(text, a, title = "[Untitled]", b) {
		if (process.argv.indexOf("--no-echo") !== -1) return;
		console.log(`Script opened a popup window: title "${title}", text "${text}"`);
		console.log("Add flag --no-echo to disable this.");
	}
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
		},
	});
};