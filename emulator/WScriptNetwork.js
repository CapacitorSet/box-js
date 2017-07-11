const lib = require("../lib");

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
			if (name in target) return target[name];
			lib.kill(`WScriptNetwork.${name} not implemented!`);
		},
	});
};