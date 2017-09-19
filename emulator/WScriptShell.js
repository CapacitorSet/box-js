const lib = require("../lib.js");
const TextStream = require("./TextStream.js");
const argv = require("../argv.js").run;

function WScriptShell() {
	const vars = {
		/* %APPDATA% equals C:\Documents and Settings\{username}\Application Data on Windows XP,
		 * but C:\Users\{username}\AppData\Roaming on Win Vista and above.
		 */
		appdata: argv["windows-xp"]
			? "C:\\Documents and Settings\\User\\Application Data"
			: "C:\\Users\\User\\AppData\\Roaming",
		computername: "USER-PC",
		comspec: "%SystemRoot%\\system32\\cmd.exe",
		os: "Windows_NT",
		processor_revision: "0209",
		processor_architecture: "x86",
		programdata: "C:\\ProgramData",
		systemroot: "C:\\WINDOWS",
		tmp: "C:\\DOCUME~1\\User\\LOCALS~1\\Temp",
		temp: "C:\\DOCUME~1\\User\\LOCALS~1\\Temp",
		username: "User",
		userprofile: "C:\\Users\\User",
		windir: "C:\\WINDOWS"
	};
	this.environment = (x) => {
		if (x.toLowerCase() === "system")
			return (argument) => {
				argument = argument.toLowerCase();
				if (argument in vars) return vars[argument];
				lib.kill(`Unknown parameter ${argument} for WScriptShell.Environment.System`);
			};
		return `(Environment variable ${x})`;
	};
	this.specialfolders = (x) => `(Special folder ${x})`;
	this.createshortcut = () => ({});
	this.expandenvironmentstrings = (path) => {
		Object.keys(vars).forEach(key => {
			path = path.replace(RegExp("%" + key + "%", "gi"), vars[key]);
		});

		if (/%\w+%/i.test(path)) {
			lib.warning("Possibly failed to expand environment strings in " + path);
		}

		return path;
	};
	this.run = cmd => {
		lib.runShellCommand(cmd);
		return 0;
	};
	this.exec = cmd => {
		lib.runShellCommand(cmd);
		return {
			ExitCode: 1,
			ProcessID: Math.floor(Math.random() * 1000),
			Status: 1, // Finished			
			StdErr: null,
			StdIn: null,
			StdOut: new TextStream(`<output of ${cmd}>`),
		};
	};
	this._normalize_reg_key = (key) => {
		key = key
			.replace("HKLM", "HKEY_LOCAL_MACHINE")
			.replace("HKCR", "HKEY_CLASSES_ROOT")
			.replace("HKU", "HKEY_USERS")
			.replace("HKCU", "HKEY_CURRENT_USER")
			.replace("HKCC", "HKEY_CURRENT_CONFIG");
		return key;
	};
	this.regread = (key) => {
		if (!this._reg_entries) // Load once needed
			this._reg_entries = require("system-registry");
		key = this._normalize_reg_key(key);
		lib.verbose(`Reading registry key ${key}`);

		const normalizedEqual = (a, b) => a.toLowerCase() === b.toLowerCase();
		let val = this._reg_entries;
		const parts = key.split("\\");
		for (part of parts) {
			if (!Object.keys(val).some(key => normalizedEqual(key, part))) {
				lib.warning(`Unknown registry key ${key}!`);
				return "";
			}
			// De-normalization: retrieve the key with the actual capitalization
			const actualKey = Object.keys(val).filter(key => normalizedEqual(key, part))[0]
			val = val[actualKey];
		}
		return val;
	};
	this.regwrite = (key, value, type = "(unspecified)") => {
		key = this._normalize_reg_key(key);
		lib.info(`Setting registry key ${key} to ${value} of type ${type}`);
		this._reg_entries[key] = value;
	};
	this.popup = function(text, a, title = "[Untitled]", b) {
		if (!argv["no-echo"]) {
			lib.verbose(`Script opened a popup window: title "${title}", text "${text}"`);
			lib.verbose("Add flag --no-echo to disable this.");
		}
		return true; // Emulates a click
	};
}

module.exports = lib.proxify(WScriptShell, "WScriptShell");
