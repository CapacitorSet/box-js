const lib = require("../lib");

function Dictionary() {
    this.dictionary = {};
    /* eslint no-return-assign: 0 */
    // See https://github.com/eslint/eslint/issues/7285
    this.add = function(key, value) {
        this.dictionary[key] = value;
    };
    this.item = (key) => this.dictionary[key];
    this.items = function() {
        r = [];
        for (var key in this.dictionary){
            r.push(this.dictionary[key]);
        };
        return r;
    };
}

module.exports = lib.proxify(Dictionary, "Scripting.Dictionary");
