const lib = require("../lib");

function SWbemDateTime() {
    this.value = 0;
    this.getvardate = function() {

	// Fake up an answer based on the current date.
	//
	// DmtfDateTime is of the form "yyyyMMddHHmmss.ffffff+UUU"
	return "20250319131005.000000+000"
    };
}

module.exports = lib.proxify(SWbemDateTime, "WbemScripting.SWbemDateTime");
