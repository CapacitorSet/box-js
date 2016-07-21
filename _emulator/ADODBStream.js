var controller = require("../_controller");

function ADODBStream() {
	this.buffer = "";
	this.open = () => {}
	this.write = this.writetext = function(chunk) {
		if (typeof chunk === "object") { // This should be a Buffer from Node.js. Store it directly.
			this.buffer = chunk;
		} else {
			this.buffer += String(chunk);
		}
	}
	this.savetofile = function(filename) {
		this.virtual_filename = filename;
		controller.writeFile(filename, this.buffer);
	}
	this.close = () => {
		// console.log("ADODB stream created:", resourcename);
		controller.logResource(controller.getUUID(), this.virtual_filename, this.buffer)
	}
	this.loadfromfile = function(filename) {
		// console.log(`Loading ${filename}...`)
		this.buffer = controller.readFile(filename);
	}
}

module.exports = function() {
	return new Proxy(new ADODBStream(), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				case "size":
					return target.buffer.length;
				case "readtext":
					return target.buffer;
				default:
					if (!(name in target)) {
						controller.kill(`ADODBStream.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}