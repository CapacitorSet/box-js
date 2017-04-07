const controller = require('../_controller');

function TextStream(filename) {
	this.buffer = controller.readFile(filename) || '';
	this.uuid = controller.getUUID();
	this.filename = filename;
	this.write = (line) => {
		this.buffer = this.buffer + line;
		controller.writeFile(filename, this.buffer);
		controller.logResource(this.uuid, this.filename, this.buffer);
	};
	this.writeline = (line) => {
		this.buffer = this.buffer + line + '\n';
		controller.writeFile(filename, this.buffer);
		controller.logResource(this.uuid, this.filename, this.buffer);
	};
	this.readall = () => {
		return this.buffer;
	};
	this.close = () => {};
	this.bufferarray = [];
	this.readline = function() {
		if (this.bufferarray.length === 0)
			this.bufferarray = this.buffer.split('\n');
		return this.bufferarray.shift();
	};
	this.shortpath = (path) => path;
}

function ProxiedTextStream(filename) {
	return new Proxy(new TextStream(filename), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`TextStream.${name} not implemented!`);
					}
					return target[name];
			}
		},
		set: function(a, b, c) {
			b = b.toLowerCase();
			if (c.length < 1024)
				console.log(`FSObject[${b}] = ${c};`);
			a[b] = c;
		},
	});
}

function Folder(path, autospawned) {
	this.attributes = 16;
	this.datelastmodified = new Date(new Date() - 15 * 60 * 1000); // Last changed: 15 minutes ago
	this.files = [];
	this.name = (path.replace(/\w:/i, '').match(/\\(\w*)(?:\\)?$/i) || [null, ''])[1],
	this.path = path;
	this.subfolders = autospawned ? [] : [new ProxiedFolder(path + '\\RandomFolder', true)];
	this.type = 'folder';
}

function ProxiedFolder(path, name, autospawned = false) {
	return new Proxy(new Folder(path, name, autospawned), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`FileSystemObject.Folder.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
}

function File(contents) {
	this.openastextstream = () => new ProxiedTextStream(contents);
	this.shortpath = 'C:\\PROGRA~1\\example-file.exe';
	this.size = Infinity;
	this.attributes = 32;
}

function ProxiedFile(filename) {
	return new Proxy(new File(filename), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`FileSystemObject.File.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
}

function Drive(name) {
	this.volumename = name;
	this.availablespace = 80*1024*1024*1024;
	this.drivetype = 2;
	this.filesystem = "NTFS";
	this.serialnumber = 1234;
}

function ProxiedDrive(name) {
	return new Proxy(new Drive(name), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`FileSystemObject.Drive.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
}

function FileSystemObject() {
	this.createtextfile = this.opentextfile = (filename) => new ProxiedTextStream(filename);
	this.buildpath = (...args) => args.join('\\');
	this.fileexists = this.deletefile = () => {
		const value = process.argv.indexOf('--no-file-exists') === -1;
		if (value) {
			console.log('Returning `true` for FileSystemObject.FileExists; use --no-file-exists if nothing happens');
		}
		return value;
	};
	this.getfile = (filename) => new ProxiedFile(filename);
	this.getspecialfolder = function(id) {
		switch (id) {
			case 0:
			case '0':
				return 'C:\\WINDOWS\\';
			case 1:
			case '1':
				return '(System folder)';
			case 2:
			case '2':
				return '(Temporary folder)';
			default:
				return '(Special folder ' + id + ')';
		}
	};
	this.gettempname = () => '(Temporary file)';
	this.createfolder = (folder) => '(Temporary new folder)';
	this.folderexists = (folder) => {
		const defaultValue = true;
		console.log(`Checking if ${folder} exists, returning ${defaultValue}`);
		return defaultValue;
	};
	this.getfolder = (str) => new ProxiedFolder(str);
	this.getfileversion = () => '';
	this.drives = [new ProxiedDrive('C:')];
	this.getdrive = (drive) => new ProxiedDrive(drive);
	this.getdrivename = path => {
		const matches = path.match(/^\w:/);
		if (matches == null)
			return "";
		return matches[0];
	}
}

module.exports = function() {
	return new Proxy(new FileSystemObject(), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`FileSystemObject.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
};