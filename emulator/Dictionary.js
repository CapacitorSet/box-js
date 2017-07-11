const lib = require("../lib");

function Dictionary() {
	this.dictionary = {};
	/* eslint no-return-assign: 0 */
	// See https://github.com/eslint/eslint/issues/7285
	this.add = (key, value) => (this.dictionary[key] = value);
	this.item = (key) => this.dictionary[key];
}

module.exports = lib.proxify(Dictionary, "Scripting.Dictionary");