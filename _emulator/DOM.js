var controller = require("../_controller")

function VirtualDOMTag(name) {
	//console.log(`Creating a <${name}> tag...`);
	this.name = name;
	return this;
}

// Catches requests to <tag>.nodeTypedValue in order to emulate them correctly
module.exports = function(name) {
	return new Proxy(new VirtualDOMTag(name), {
		get: function(target, name) {
			switch (name) {
				case "nodeTypedValue":
					return target.text;
				default:
					if (!(name in target)) {
						controller.kill(`VirtualDOMTag.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}