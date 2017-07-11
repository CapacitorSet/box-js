const lib = require("../lib");

function VirtualSWBEMServices() {
	this.get = function(...args) {
		console.log(args);
	};
}

function VirtualWBEMLocator() {
	this.connectserver = function(server, namespace) {
		console.log(`WBEMLocator: emulating a connection to server ${server} with namespace ${namespace}`);
		return new Proxy(new VirtualSWBEMServices(), {
			get: function(target, name) {
				name = name.toLowerCase();
				if (name in target) return target[name];
				lib.kill(`WBEMScripting.SWBEMServices.${name} not implemented!`);
			},
		});
	};
	return this;
}

module.exports = function(name) {
	return new Proxy(new VirtualWBEMLocator(name), {
		get: function(target, name) {
			name = name.toLowerCase();
			if (name in target) return target[name];
			lib.kill(`WBEMScripting.SWBEMLocator.${name} not implemented!`);
		},
	});
};