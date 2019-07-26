const lib = require("../lib");
const argv = require("../argv.js").run;
const winpath = require("path").win32;

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

function Folder(path, autospawned) {
	this.attributes = 16;
	this.datelastmodified = new Date(new Date() - 15 * 60 * 1000); // Last changed: 15 minutes ago
	this.files = [];
	this.name = (path.replace(/\w:/i, "").match(/\\(\w*)(?:\\)?$/i) || [null, ""])[1],
	this.path = path;
	this.subfolders = autospawned ? [] : [new ProxiedFolder(path + "\\RandomFolder", true)];
        this.type = "folder";
        this.subfolders = {
            "Count": 12,
        };
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

function File(contents) {
	this.attributes = 32;
	this.openastextstream = () => new ProxiedTextStream(contents);
	this.shortpath = "C:\\PROGRA~1\\example-file.exe";
	this.size = Infinity;
}

function ProxiedFile(filename) {
	return lib.proxify(File, "FileSystemObject.File");
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
		return value;
	};
	this.folderexists = (path) => {
		const value = !argv["no-folder-exists"];
		if (value) {
			lib.info(`Returning true for FileSystemObject.FolderExists(${path}); use --no-folder-exists if nothing happens`);
		}
		return value;
	};
	this.getabsolutepathname = (path) => {
		if (!winpath.isAbsolute(path)) path = "C:\\Users\\User\\Desktop\\" + path;
		const ret = winpath.resolve(path);
		console.log(path, ret);
		return ret;
	};
	this.getdrive = (drive) => new ProxiedDrive(drive);
	this.getdrivename = (path) => {
		const matches = path.match(/^\w:/);
		if (matches === null)
			return "";
		return matches[0];
	};
	this.getfile = (filename) => new ProxiedFile(filename);
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
}

module.exports = lib.proxify(FileSystemObject, "FileSystemObject");
