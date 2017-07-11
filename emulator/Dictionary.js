const lib = require("../lib");

function Dictionary() {
	this.dictionary = {};
	/* eslint no-return-assign: 0 */
	// See https://github.com/eslint/eslint/issues/7285
	this.add = (key, value) => (this.dictionary[key] = value);
	this.item = (key) => this.dictionary[key];
}

module.exports = function() {
	return new Proxy(new Dictionary(), {
		get: function(target, name) {
			name = name.toLowerCase();
			if (name in target) return target[name];
			lib.kill(`Scripting.Dictionary.${name} not implemented!`);
		},
	});
};