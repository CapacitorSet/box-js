const lib = require("../lib");

function MemoryStream() {

    this.data = "";
    
    this.write = function (data) {
        lib.logIOC("System.IO.MemoryStream", {data}, "The script wrote data to a memory stream.");
        this.data = data;
    }

}

module.exports = lib.proxify(MemoryStream, "System.IO.MemoryStream");
