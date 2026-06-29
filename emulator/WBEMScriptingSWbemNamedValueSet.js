const lib = require("../lib");

function SWbemNamedValueSet() {

    this.clazz = "SWbemNamedValueSet";
    
    this.add = function(name, val) {
    };
}

module.exports = lib.proxify(SWbemNamedValueSet, "WbemScripting.SWbemNamedValueSet");
