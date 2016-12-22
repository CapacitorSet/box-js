const controller = require('../_controller');

function Enumerator(array) {
	this.item = function(index) {
		return array[index];
	};
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
