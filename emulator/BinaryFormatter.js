const lib = require("../lib");

function BinaryFormatter() {

    this.deserialize = function (stream) {
        var currData = stream;
        if (typeof(stream.data) !== "undefined") currData = stream.data;
        return data;
    }

    this.deserialize_2 = this.deserialize;
}

module.exports = lib.proxify(BinaryFormatter, "System.Runtime.Serialization.Formatters.Binary.BinaryFormatter");
