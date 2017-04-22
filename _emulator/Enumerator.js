const controller = require("../_controller");

function Enumerator(array) {
	this._InternalIndex = 0;
	this.item = function(index = this._InternalIndex) {
		return array[index];
	};
	this.movenext = () => this._InternalIndex++;
	this.atend = () => (array.length - this._InternalIndex) == 1;
}

module.exports = function(array) {
	return new Proxy(new Enumerator(array), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`Enumerator.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
};
