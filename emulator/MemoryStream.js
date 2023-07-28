const lib = require("../lib");

function MemoryStream() {

    this.data = "";
    
    this.write = function (data) {
        let buff = new Buffer.alloc(data.length);
        buff.write(data);
        let base64data = buff.toString('base64');
        lib.logIOC("System.IO.MemoryStream", {data, base64data}, "The script wrote data to a memory stream.");
        this.data = data;
    }

}

module.exports = lib.proxify(MemoryStream, "System.IO.MemoryStream");
