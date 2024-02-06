const lib = require("../lib");

function WScriptNetwork() {
    this.computername = "COMPUTER_NAME";
    this.enumprinterconnections = () => [{
	foo: "bar",
    }];
    this.userdomain = "";
    this.mapnetworkdrive = function(letter, path) {
        lib.info(`Script maps network drive ${letter} to path ${path}`);
        lib.logUrl("map", ("https:" + path).replace("@", ":").replace(/\\/g, "/"));
    };
    this.removenetworkdrive = function(letter) {
        lib.info(`Script removes network drive ${letter}`);
    }
}

module.exports = lib.proxify(WScriptNetwork, "WScriptNetwork");
