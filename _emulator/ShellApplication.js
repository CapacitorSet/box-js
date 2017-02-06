const controller = require('../_controller');

function VirtualShellApplication(name) {
	this.shellexecute = function(...args) {
		console.log('Executing: ' + args.join(' '));
	};
	this.namespace = (folder) => {
		let path;
		switch (folder) {
			case 7:
				path = 'C:\\Users\\MyUsername\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\StartUp';
				break;
			default:
				throw new Error('Unknown ShellApplication.Namespace ' + folder);
		}
		return {
			Self: {
				Path: path,
			},
		};
	};
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