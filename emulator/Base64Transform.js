const lib = require("../lib");

function Base64Transform() {

    this.transformfinalblock = function (bytes, start, count) {

        // Chop out the block of "bytes" to b64 decode.
        const chunk = bytes.slice(start, start + count);

        // Convert the "bytes" back to a string.
        var str = "";
        for (let i = 0; i < chunk.length; i++) {
            str += String.fromCharCode(chunk[i]);
        }
        const r = atob(str);
        return r;
    }
    
}

module.exports = lib.proxify(Base64Transform, "System.Security.Cryptography.FromBase64Transform");
