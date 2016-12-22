const controller = require('../_controller');

function VirtualShellApplication(name) {
	this.shellexecute = function(...args) {
		console.log('Executing: ' + args.join(' '));
	};
	this.namespace = (folder) => '(Temporary folder)';
	return this;
}

module.exports = function(name) {
	return new Proxy(new VirtualShellApplication(name), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`ShellApplication.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
};