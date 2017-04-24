const controller = require("../_controller");

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
				switch (name) {
					default:
						if (!(name in target)) {
							controller.kill(`WBEMScripting.SWBEMServices.${name} not implemented!`);
						}
						return target[name];
				}
			},
		});
	};
	return this;
}

module.exports = function(name) {
	return new Proxy(new VirtualWBEMLocator(name), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`WBEMScripting.SWBEMLocator.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
};