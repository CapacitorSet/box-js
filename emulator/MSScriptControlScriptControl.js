const lib = require("../lib");

function ScriptControl() {

    this.Language = undefined;
    this.Timeout = undefined;

    this.addcode = code => {
        lib.info(`Script added dynamic code '''${code}'''`);
        lib.logIOC("DynamicCode", {code}, "The script wrote dynamic code with MSScriptControl.ScriptControl ActiveX object.");
	return 0;
    };
}

module.exports = lib.proxify(ScriptControl, "MSScriptControl.ScriptControl");
