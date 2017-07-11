const lib = require("../lib");

function VirtualShellApplication(name) {
	this.shellexecute = function(...args) {
		console.log("Executing: " + args.join(" "));
	};
	this.namespace = (folder) => {
		const folders = {
			7: "C:\\Users\\MyUsername\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\StartUp",
		};

		if (!(folder in folders))
			throw new Error(`Unknown ShellApplication.Namespace ${folder}`);

		return {
			Self: {
				Path: folders[folder],
			},
		};
	};
	return this;
}

module.exports = function(name) {
	return new Proxy(new VirtualShellApplication(name), {
		get: function(target, name) {
			name = name.toLowerCase();
			if (name in target) return target[name];
			lib.kill(`ShellApplication.${name} not implemented!`);
		},
	});
};