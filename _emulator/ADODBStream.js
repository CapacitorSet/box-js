var controller = require("../_controller")

function ADODBStream() {
	this.buffer = "";
	this.open = () => {}
	this.write = this.writetext = function(chunk) {
		this.buffer += String(chunk);
	}
	this.savetofile = function(filename) {
		this.virtual_filename = filename;
	}
	this.close = () => {
		// console.log("ADODB stream created:", resourcename);
		controller.logResource(controller.getUUID(), this.virtual_filename, this.buffer)
	}
	this.loadfromfile = function(filename) {
		// console.log(`Loading ${filename}...`)
		
		//this.readtext = `(Content of ${filename})`
		this.readtext = this.buffer;
	}
}

module.exports = function() {
	return new Proxy(new ADODBStream(), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				case "size":
					return target.buffer.length;
				default:
					if (!(name in target)) {
						controller.kill(`ADODBStream.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}