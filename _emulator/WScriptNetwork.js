const controller = require("../_controller");

function WScriptNetwork() {
	this.ComputerName = "COMPUTER_NAME";
	this.EnumPrinterConnections = () => [{
		foo: "bar",
	}];
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
		},
	});
};