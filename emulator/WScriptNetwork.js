const lib = require("../lib");

function WScriptNetwork() {
	this.computername = "COMPUTER_NAME";
	this.enumprinterconnections = () => [{
		foo: "bar",
	}];
	this.userdomain = "";
}

module.exports = lib.proxify(WScriptNetwork, "WScriptNetwork");