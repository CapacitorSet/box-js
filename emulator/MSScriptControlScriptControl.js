const lib = require("../lib");

function ScriptControl() {

    this.Language = undefined;
    this.Timeout = undefined;

    this.addcode = code => {
        lib.info(`Script added dynamic code '''${code}'''`);
	return 0;
    };
}

module.exports = lib.proxify(ScriptControl, "MSScriptControl.ScriptControl");
