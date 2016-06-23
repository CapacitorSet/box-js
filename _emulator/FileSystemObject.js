var controller = require("../_controller")

function FileSystemObject() {
	this.GetSpecialFolder = function(id) {
		switch (id) {
			case 0:
				return "C:\\WINDOWS\\"
			case 1:
				return "(System folder)"
			case 2:
				return "(Temporary folder)"
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