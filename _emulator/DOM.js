const controller = require('../_controller');

function VirtualDOMTag(name) {
	this.name = name;
	return this;
}

// Catches requests to <tag>.nodeTypedValue in order to emulate them correctly
module.exports = function(name) {
	return new Proxy(new VirtualDOMTag(name), {
		get: function(target, name) {
			switch (name) {
				case 'nodeTypedValue':
					if (target.dataType !== 'bin.base64')
						return target.text;
					return new Buffer(target.text, 'base64').toString('utf8');
				default:
					if (!(name in target)) {
						controller.kill(`VirtualDOMTag.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
};