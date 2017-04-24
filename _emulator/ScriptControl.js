const controller = require("../_controller");

function ScriptControl() {
	this.addobject = () => {},
	this.addcode = (code) => controller.logSnippet(controller.getUUID(), {
		as: "Code snippet in ScriptControl",
	}, code);
}

module.exports = function() {
	return new Proxy(new ScriptControl(), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`ScriptControl.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
};