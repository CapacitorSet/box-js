const controller = require("../_controller");

function WScriptNetwork() {
	this.computername = "COMPUTER_NAME";
	this.enumprinterconnections = () => [{
		foo: "bar",
	}];
	this.userdomain = "";
}

module.exports = function() {
	return new Proxy(new WScriptNetwork(), {
		get: function(target, name) {
			name = name.toLowerCase();
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