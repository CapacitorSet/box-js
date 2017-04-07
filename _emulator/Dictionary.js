const controller = require("../_controller");

function Dictionary() {
	this.dictionary = {};
	/* eslint no-return-assign: 0 */
	// See https://github.com/eslint/eslint/issues/7285
	this.add = (key, value) => (this[key] = value);
	this.item = (key) => this[key];
}

module.exports = function() {
	return new Proxy(new Dictionary(), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`Scripting.Dictionary.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
};