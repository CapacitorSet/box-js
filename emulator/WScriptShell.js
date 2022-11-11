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
	//tmp: "C:\\DOCUME~1\\User\\LOCALS~1\\Temp",
	tmp: "C:\\Users\\SYSOP1~1\\AppData\\Local\\Temp",
	//temp: "C:\\DOCUME~1\\User\\LOCALS~1\\Temp",
	temp: "C:\\Users\\SYSOP1~1\\AppData\\Local\\Temp",
	username: "User",
	userprofile: "C:\\Users\\Sysop12\\",
	windir: "C:\\WINDOWS"
    };
    
    this.environment = (x) => {
	if (x.toLowerCase() === "system")
	    return (argument) => {
		argument = argument.toLowerCase();
		if (argument in vars) return vars[argument];
		lib.kill(`Unknown parameter ${argument} for WScriptShell.Environment.System`);
	    };
	if (x.toLowerCase() === "process")
	    return {
		Item: function(x) {
		    if (x.toLowerCase() === "programdata")
			return "C:\\ProgramData";
		    return "Unknown process item " + x;
		}
	    };
	return `(Environment variable ${x})`;
    };

    this.environment1 = undefined;
    this.specialfolders = (x) => `(Special folder ${x})`;
    this.createshortcut = (x) => ({
        name: x,
        save: function() {
            var name = "???";
            if (typeof(this.name) !== "undefined") {
                name = this.name;
            };
            var cmd = "???";
            if ((typeof(this.targetPath) !== "undefined") && (typeof(this.arguments) !== "undefined")) {
                cmd = "" + this.targetPath + " " + this.arguments;
            }
            lib.logIOC("CreateShortcut", {name: name, cmd: cmd}, "The script saved a shortcut.");
        }
    });
    this.expandenvironmentstrings = (path) => {
	Object.keys(vars).forEach(key => {

	    const regex = RegExp("%" + key + "%", "gi");

	    if (!regex.test(path)) return;

	    lib.logIOC("Environ", key, "The script read an environment variable");
	    path = path.replace(regex, vars[key]);
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
    
    this.exec = function(cmd) {
        console.log("EXEC: 1");
        console.log(cmd);
	lib.runShellCommand(cmd);
        var r = {
	    ExitCode: 1,
	    ProcessID: Math.floor(Math.random() * 1000),
	    Status: 1, // Finished			
	    StdErr: null,
	    StdIn: {
                writeline: function(txt) {
                    lib.logIOC("Run", {txt}, "The script piped text to a process: '" + txt + "'.");
                },
            },
	    StdOut: new TextStream(`<output of ${cmd}>`),
	};
        return lib.noCasePropObj(r);
    };

    if (!this._reg_entries) {
	this._reg_entries = require("system-registry");
        
	// lacks the HKEY_CURRENT_USER reg key by default (y tho?)
	this._reg_entries["HKEY_CURRENT_USER"] = {}
    }

    // expand registry acronyms and make lowercase
    function normalizeRegKey(key) {
	key = key
	    .replace("HKLM", "HKEY_LOCAL_MACHINE")
	    .replace("HKCR", "HKEY_CLASSES_ROOT")
	    .replace("HKU", "HKEY_USERS")
	    .replace("HKCU", "HKEY_CURRENT_USER")
	    .replace("HKCC", "HKEY_CURRENT_CONFIG");
	return key.toLowerCase();
    };
    
    // traverse registry object searching for the key
    this._resolveRegKey = (inKey) => {

	var inKeyParts = inKey.split("\\")
	var currRegEntry = this._reg_entries

	// compare the given key to the "this" value (see usage below)
	var keysEqual = function(key) {
	    return normalizeRegKey(key) === normalizeRegKey(this)
	}

	for (inKeyPart of inKeyParts) {

	    // give the part of the input key we're searching for as the "this" value of keysEqual
	    var foundKey = Object.keys(currRegEntry).filter(keysEqual, inKeyPart)
	    if (foundKey.length > 0) {
		currRegEntry = currRegEntry[foundKey[0]]
	    }
	    else {
		return undefined
	    }
	}

	return currRegEntry
    }

    this.regread = (key) => {

	// log the IOC whether or not we handle the read correctly
	lib.logIOC("RegRead", {key}, "The script read a registry key");
	value = this._resolveRegKey(key)

	if (value) {
	    lib.verbose(`Read registry key ${key}`);
	    return value
	}
	else {
	    lib.warning(`Unknown registry key ${key}!`);
	    //return "";
            throw("Registry key not found.");
	}
    };
    
    this.regwrite = (key, value, type = "(unspecified)") => {

	// log the IOC whether or not we correctly handle it
	lib.logIOC("RegWrite", {key, value, type}, "The script wrote to a registry key");

	var badKey = false
	var existingKey = key
	var existingRegEntry = undefined
	var keysToCreate = []

	// find the deepest part of the given key that exists in our registry object
	do {
	    existingRegEntry = this._resolveRegKey(existingKey)

	    // if we've checked the very top level key and didn't find it
	    if (existingKey.split("\\").length == 1 && !existingRegEntry) {
		lib.info("script tried to write to an invalid key root " + existingKey)
		badKey = true
	    }

	    // chop off the last element of the key path and try again
	    // save the last part of the key that didn't exist as the key we need to create
	    if (!existingRegEntry && !badKey) {
		keyParts = existingKey.split("\\")
		keysToCreate.unshift(keyParts.pop())
		existingKey = keyParts.join("\\")
	    }
	} while (!existingRegEntry && !badKey);

	if (!badKey) {
	    // the key already existed, just need to overwrite the last element
	    if (keysToCreate.length == 0) {
		keysToCreate.unshift(key.split("\\").pop())
	    }

	    lib.info(`Setting registry key ${key} to ${value} of type ${type}`);

	    // iterate through keys that need new nested objects
	    while (keysToCreate.length > 1) {
		newKey = keysToCreate.shift()
		existingRegEntry[newKey] = {}
		existingRegEntry = existingRegEntry[newKey]
	    }

	    // set the value in our (possibly) newly created registry entry
	    existingRegEntry[keysToCreate.shift()] = value
	}
    };
    
    this.regdelete = (key) => {

	lib.logIOC("RegDelete", {key}, "The script deleted a registry key.");

	keyParts = key.split("\\")
	keyToDelete = keyParts.pop()
	pathtoKey = keyParts.join("\\")

	toDelete = this._resolveRegKey(pathtoKey)

	if (toDelete) {
	    lib.info(`deleting registry key ${key}`);
	    delete toDelete[keyToDelete]
	}
	else {
	    lib.warning(`registry key not present ${key}`)
	}
    }

    this.appactivate = function(app) {
        lib.info(`Activate application '${app}'`);
        return true;
    };

    this.sendkeys = function(keys) {
        lib.info(`Send keystrokes '${keys}'`);
        return true;
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
