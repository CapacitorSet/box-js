const lib = require("../lib");

function VirtualDOMTag(name) {
	this.name = name;
}

// Catches requests to <tag>.nodeTypedValue in order to emulate them correctly
module.exports = function(name) {
	return new Proxy(new VirtualDOMTag(name), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				case "nodetypedvalue":
					if (target.dataType !== "bin.base64") return target.text;
					return new Buffer(target.text, "base64").toString("utf8");
				default:
					if (name in target) return target[name];
					lib.kill(`VirtualDOMTag.${name} not implemented!`);
			}
		},
	});
};