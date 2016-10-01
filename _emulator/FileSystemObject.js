var controller = require("../_controller");

function TextStream(filename) {
	this.buffer = controller.readFile(filename) || "";
	this.uuid = controller.getUUID();
	this.filename = filename;
	this.write = line => {
		this.buffer = this.buffer + line;
		controller.writeFile(filename, this.buffer);
		controller.logResource(this.uuid, this.filename, this.buffer);
	};
	this.writeline = line => {
		this.buffer = this.buffer + line + "\n";
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
			this.bufferarray = this.buffer.split("\n");
		return this.bufferarray.shift();
	};
	this.shortpath = path => path;
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
		}
	});
}

function File(contents) {
	this.OpenAsTextStream = () => new ProxiedTextStream(contents);
	this.ShortPath = "C:\\PROGRA~1\\example-file.exe";
}

function ProxiedFile(filename) {
	return new Proxy(new File(filename), {
		get: function(target, name) {
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`File.${name} not implemented!`);
					}
					return target[name];
			}
		}
	});
}

function FileSystemObject() {
	this.createtextfile = this.opentextfile = filename => new ProxiedTextStream(filename);
	this.buildpath = function() {
		return Array.prototype.slice.call(arguments, 0).join("\\");
	};
	this.fileexists = this.deletefile = () => true;
	this.getfile = function(filename) {
		return new ProxiedFile(filename);
	};
	this.getspecialfolder = function(id) {
		switch (id) {
			case 0:
			case "0":
				return "C:\\WINDOWS\\";
			case 1:
			case "1":
				return "(System folder)";
			case 2:
			case "2":
				return "(Temporary folder)";
			default:
				return "(Special folder " + id + ")";
		}
	};
	this.gettempname = () => "(Temporary file)";
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
		}
	});
};