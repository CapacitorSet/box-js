const lib = require("../lib");

function ShellApplication(name) {
	this.shellexecute = (file, args = "", dir = "") => lib.runShellCommand(dir + file + " " + args);
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
}

module.exports = lib.proxify(ShellApplication, "ShellApplication");