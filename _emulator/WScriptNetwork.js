const controller = require("../_controller");

function WScriptNetwork() {
	this.ComputerName = "COMPUTER_NAME";
}

module.exports = function() {
	return new Proxy(new WScriptNetwork(), {
		get: function(target, name) {
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`WScriptNetwork.${name} not implemented!`);
					}
					return target[name];
			}
		}
	});
};