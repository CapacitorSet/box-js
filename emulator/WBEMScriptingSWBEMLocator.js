const lib = require("../lib");

function VirtualSWBEMServices() {
	this.get = function(...args) {
		console.log(args);
	};
}

function VirtualWBEMLocator() {
	this.connectserver = function(server, namespace) {
		console.log(`WBEMLocator: emulating a connection to server ${server} with namespace ${namespace}`);
		return lib.proxify(VirtualSWBEMServices, "WBEMScripting.SWBEMServices");
	};
}

module.exports = lib.proxify(VirtualWBEMLocator, "WBEMScripting.SWBEMServices");