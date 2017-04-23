const controller = require("../_controller");

function Enumerator(array) {
	this._internalindex = 0;
	this._Length = () => array.length;
	this.item = function(index = this._internalindex) {
		return array[index];
	};
	this.movenext = () => this._internalindex++;
	this.atend = () => array.length == this._internalindex;
}

module.exports = function(array) {
	return new Proxy(new Enumerator(array), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				case "length":
					return target._Length();
				default:
					if (!(name in target)) {
						controller.kill(`Enumerator.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
};
