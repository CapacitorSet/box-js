var controller = require("../_controller");

function TextStream(filename) {
	this.buffer = controller.readFile(filename) || "";
	this.uuid = controller.getUUID();
	this.filename = filename;
	this.Write = this.WriteLine = line => {
		this.buffer = this.buffer + line;
		controller.writeFile(filename, this.buffer);
		controller.logResource(this.uuid, this.filename, this.buffer);
	}
	this.ReadAll = () => {
		return this.buffer;
	}
	this.Close = () => {};
	this.BufferArray = [];
	this.ReadLine = function() {
		if (this.BufferArray.length == 0)
			this.BufferArray = this.buffer.split("\n");
		return this.BufferArray.shift();
	}
}

function ProxiedTextStream(filename) {
	return new Proxy(new TextStream(filename), {
		get: function(target, name) {
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`TextStream.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}

function File(contents) {
	this.OpenAsTextStream = () => ProxiedTextStream(contents);
}

function ProxiedFile(filename) {
	return new Proxy(new File(filename), {
		get: function(target, name) {
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`File.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}

function FileSystemObject() {
	this.CreateTextFile = this.OpenTextFile = filename => new ProxiedTextStream(filename);
	this.BuildPath = function() {
		return Array.prototype.slice.call(arguments, 0).join("\\");
	}
	this.FileExists = this.DeleteFile = () => true;
	this.GetFile = function(filename) {
		return new ProxiedFile(filename);
	}
	this.GetSpecialFolder = function(id) {
		switch (id) {
			case 0:
			case "0":
				return "C:\\WINDOWS\\"
			case 1:
			case "1":
				return "(System folder)"
			case 2:
			case "2":
				return "(Temporary folder)"
			default:
				return "(Special folder " + id + ")"
		}
	}
	this.GetTempName = () => "(Temporary file)"
}

module.exports = function() {
	return new Proxy(new FileSystemObject(), {
		get: function(target, name) {
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`FileSystemObject.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}