const lib = require("../lib");

function AsciiEncoding() {

    this.issinglebyte = true;

    this.getbytecount = function (str, pos=0) {
        return str.length - pos;
    }

    this.getbytecount_2 = this.getbytecount;

    this.getbytes = function (str, buffer) {
        if (typeof(buffer) === "undefined") buffer = [];
        for(let i = 0; i < str.length; i++){
            let code = str.charCodeAt(i);
            buffer.push(code);
        }
        return buffer;
    }

    this.getbytes_2 = this.getbytes;
    this.getbytes_3 = this.getbytes;
    this.getbytes_4 = this.getbytes;
}

module.exports = lib.proxify(AsciiEncoding, "System.Text.ASCIIEncoding");
