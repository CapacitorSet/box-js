const lib = require("../lib");

function ScriptControl() {
	this.addobject = () => {},
	this.addcode = (code) => lib.logSnippet(lib.getUUID(), {
		as: "Code snippet in ScriptControl",
	}, code);
}

module.exports = lib.proxify(ScriptControl, "ScriptControl");