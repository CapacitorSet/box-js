const lib = require("../lib");
const argv = require("../argv.js").run;
const winpath = require("path").win32;
const crypto = require('crypto');

function TextStream(filename) {
    this.buffer = lib.readFile(filename) || "";
    this.uuid = lib.getUUID();
    this.filename = filename;
    this.bufferarray = [];

    this.atendofstream = () => this.bufferarray.length === 0;
    this.close = () => {};
    this.readall = () => {
	return this.buffer;
    };
    this.readline = function() {
	if (this.bufferarray.length === 0)
	    this.bufferarray = this.buffer.split("\n");
	return this.bufferarray.shift();
    };
    this.shortpath = (path) => path;
    this.write = (line) => {
	this.buffer = this.buffer + line;
	lib.writeFile(filename, this.buffer);
	lib.logResource(this.uuid, this.filename, this.buffer);
    };
    this.writeline = (line) => {
	this.buffer = this.buffer + line + "\r\n";
	lib.writeFile(filename, this.buffer);
	lib.logResource(this.uuid, this.filename, this.buffer);
    };
}

function ProxiedTextStream(filename) {
    return new Proxy(new TextStream(filename), {
	get: function(target, name) {
	    name = name.toLowerCase();
	    if (name in target) return target[name];
	    lib.kill(`TextStream.${name} not implemented!`);
	},
	set: function(a, b, c) {
	    b = b.toLowerCase();
	    b = b.replace("bufferarray", "<internal buffer>");
	    if (c.length < 1024 && !(c.length === 1 && c[0] === ""))
		lib.info(`FSObject[${b}] = ${c};`);
	    a[b] = c;
	    return true;
	},
    });
}

function makeFakeSubfolders(path) {

    // Make list of fake subfolders of the given path.
    var r = [];
    for (var x = 0; x < 6; x++) {
        r[x] = path + "\\_FAKE_BOXJS_FOLDER_" + x;
    }

    // Add a Count attrbute to the list to mimic ActiveX Subfolders object.
    Object.defineProperty(r, 'Count', {
        get: function() { return this.length }
    });

    return r;
}

function Folder(path, autospawned) {
    this.attributes = 16;
    this.datelastmodified = new Date(new Date() - 15 * 60 * 1000); // Last changed: 15 minutes ago
    this.files = [];
    this.name = (path.replace(/\w:/i, "").match(/\\(\w*)(?:\\)?$/i) || [null, ""])[1],
    this.path = path;
    //this.subfolders = autospawned ? [] : [new ProxiedFolder(path + "\\RandomFolder", true)];
    this.type = "folder";
    this.subfolders = makeFakeSubfolders(this.path);
}

function ProxiedFolder(path, name, autospawned = false) {
    return new Proxy(new Folder(path, name, autospawned), {
	get: function(target, name) {
	    name = name.toLowerCase();
	    if (name in target) return target[name];
	    lib.kill(`FileSystemObject.Folder.${name} not implemented!`);
	},
    });
}

function File(contents, name = "example-file.exe", typ = "Application") {
    lib.info("The sample created a file named '" + name + "'.")
    // Handle blobs/arrays.
    if (typeof(contents) === "undefined") contents = "???";
    if ((contents.constructor.name == "Array") && (contents.length > 0)) {
        contents = contents[0];
    }
    if (contents.constructor.name == "Blob") {
        contents = contents.data;
    }
    lib.writeFile(name, contents);
    this.uuid = crypto.randomUUID();
    lib.logResource(this.uuid, name, contents);
    this.attributes = 32;
    this.openastextstream = () => new ProxiedTextStream(contents);
    this.shortpath = "C:\\PROGRA~1\\example-file.exe";
    this._name = name;
    this.size = Infinity;
    this.type = typ;
    this.copy = (src, dest, overwrite) => {
	lib.logIOC("Copy", {src, dest}, "The script copied a file.");
	lib.info(`Copying ${src} to ${dest}`);
	lib.writeFile(dest, `(Contents of ${dest})`);
    };
}

function ProxiedFile(filename) {
    var r = lib.proxify(File, "FileSystemObject.File");
    Object.defineProperty(r, 'name', {
        set: function(v) {
            lib.info('The sample set a file name to "' + v + '".');
            this._name = v;
        },
        get: function(v) {
            return this._name;
        }
    });
    Object.defineProperty(r, 'shortname', {
        get: function() {
            return this._name;
        }
    });
    return r;
}

function Drive(name) {
    this.availablespace = 80*1024*1024*1024;
    this.drivetype = 2;
    this.filesystem = "NTFS";
    this.serialnumber = 1234;
    this.volumename = name;
    this.path = name + "\\";
    this.isready = true;
}

function ProxiedDrive(name) {
    return lib.proxify(Drive, "FileSystemObject.Drive");
}

function FileSystemObject() {
    this.buildpath = (...args) => args.join("\\");
    this.createfolder = (folder) => {
	lib.logIOC("FolderCreate", {folder}, "The script created a folder.");
	return "(Temporary new folder)";
    }
    this.createtextfile = this.opentextfile = (filename) => new ProxiedTextStream(filename);
    this.copyfile = (src, dest, overwrite) => {
	lib.logIOC("FileCopy", {src, dest}, "The script copied a file.");
	lib.info(`Copying ${src} to ${dest}`);
	lib.writeFile(dest, `(Contents of ${dest})`);
    };
    this.copy = this.copyfile;
    this.drives = [new ProxiedDrive("C:")];
    this.deletefile = (path) => {
	lib.logIOC("FileDelete", {path}, "The script deleted a file.");
	return true;
    }
    this.fileexists = (path) => {
	const value = !argv["no-file-exists"];
	if (value) {
	    lib.info(`Returning true for FileSystemObject.FileExists(${path}); use --no-file-exists if nothing happens`);
	}
        lib.logIOC("FileExists", path, "The script checked to see if a file exists.");
	return value;
    };
    this.folderexists = (path) => {
	const value = !argv["no-folder-exists"];
	if (value) {
	    lib.info(`Returning true for FileSystemObject.FolderExists(${path}); use --no-folder-exists if nothing happens`);
	}
        lib.logIOC("FolderExists", path, "The script checked to see if a folder exists.");
	return value;
    };
    this.getabsolutepathname = (path) => {
	if (!winpath.isAbsolute(path)) path = "C:\\Users\\User\\Desktop\\" + path;
	const ret = winpath.resolve(path);
        lib.logIOC("FileSystemObject", {"path": path, "absolute": ret}, "The script got an absolute path.");
	return ret;
    };
    this.getdrive = (drive) => new ProxiedDrive(drive);
    this.getdrivename = (path) => {
	const matches = path.match(/^\w:/);
	if (matches === null)
	    return "";
	return matches[0];
    };
    this.getfile = function(filename) {
        var r = new ProxiedFile(filename);
        return r;
    };
    this.getfileversion = () => "";
    this.getfolder = (str) => new ProxiedFolder(str);
    this.getspecialfolder = function(id) {
	const folders = {
	    0: "C:\\WINDOWS\\",
	    1: "C:\\WINDOWS\\(System folder)\\",
	    2: "C:\\(Temporary folder)\\",
	};
	if (id in folders) return folders[id];
	return `C:\\(Special folder ${id}\\`;
    };
    this.gettempname = () => "(Temporary file)";
    this.movefile = (src, dest, overwrite) => {
	lib.logIOC("FileMove", {src, dest}, "The script moved a file.");
	lib.info(`Moving ${src} to ${dest}`);
	lib.writeFile(dest, `(Contents of ${dest})`);
    };
    this.getparentfoldername = (path) => {
        var r = path;
        if (r.includes("\\")) {
            var end = r.lastIndexOf("\\");
            r = r.substring(0, end);
        }
        //return r;
        return "C:\\Temp\AppData"
    };
    this.getextensionname = (path) => {
        var r = "";
        if (path.includes(".")) {
            var start = path.lastIndexOf(".");
            r = path.substring(start, path.length);
        }
        return r;
    };
    this.file = File;
}

module.exports = lib.proxify(FileSystemObject, "FileSystemObject");
