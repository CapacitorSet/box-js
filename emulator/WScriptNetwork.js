const lib = require("../lib");
const argv = require("../argv.js").run;

var fakeUserDomain = "";
if (argv["fake-domain"]) {
    fakeUserDomain = argv["fake-domain"];
}

class DriveInfo {
    constructor(driveLetters) {
        this._drives = driveLetters;
    };

    Item(i) { return this._drives[i]; };

    get length() {
        return this._drives.length;
    };
};

function WScriptNetwork() {
    this.computername = "COMPUTER_NAME";
    this.enumprinterconnections = () => [{
	foo: "bar",
    }];
    this.userdomain = fakeUserDomain;
    this.username = "harvey_danger";
    this.mapnetworkdrive = function(letter, path) {
        lib.info(`Script maps network drive ${letter} to path ${path}`);
        lib.logUrl("map", ("https:" + path).replace("@", ":").replace(/\\/g, "/"));
    };
    this.removenetworkdrive = function(letter) {
        lib.info(`Script removes network drive ${letter}`);
    };
    this.enumnetworkdrives = function() {
        return new DriveInfo(["D:", "E:", "F:"]);
    };
}

module.exports = lib.proxify(WScriptNetwork, "WScriptNetwork");
