const lib = require("../lib");

function ScriptControl() {
	this.addobject = () => {},
	this.addcode = (code) => lib.logSnippet(lib.getUUID(), {
		as: "Code snippet in ScriptControl",
	}, code);
}

module.exports = function() {
	return new Proxy(new ScriptControl(), {
		get: function(target, name) {
			name = name.toLowerCase();
			if (name in target) return target[name];
			lib.kill(`ScriptControl.${name} not implemented!`);
		},
	});
};