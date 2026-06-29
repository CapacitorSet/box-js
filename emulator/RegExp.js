const lib = require("../lib");

function RegExp() {
    this.Pattern = undefined;
    this.Global = false;
    this.IgnoreCase = false;

    this.test = function(s) {
	throw "Not Implemented!";
    };

    this.execute = function(s) {
	throw "Not Implemented!";
    };

    this.replace = function(s, repl) {
	const regex = new RegExp(this.Pattern, "g");
	const r = s.replace(regex, repl);
	return r;
    };
}

module.exports = lib.proxify(RegExp, "VBScript.RegExp");
