const controller = require("../_controller");

function VirtualWMIObject(object) {
	return new Proxy(object, {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				case "instancesof":
					return function(table) {
						table = table.toLowerCase();
						if (target[table]) return target[table];
						switch (table) {
							default:
								if (!(name in target)) {
									controller.kill(`WMIObject(${JSON.stringify(target)}).InstancesOf(${table}) not implemented!`);
								}
								return target[name];
						}
					};
				default:
					if (!(name in target)) {
						controller.kill(`WMIObject(${JSON.stringify(target)}).${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
}

module.exports.GetObject = function(name) {
	name = name.toLowerCase();
	name = name.replace(/{impersonationlevel=impersonate}/g, "");
	switch (name) {
		case "winmgmts:":
			return VirtualWMIObject({
				"win32_computersystemproduct": [VirtualWMIObject({
					name: "Foobar",
				})],
				"win32_operatingsystem": [VirtualWMIObject({
					caption: "Microsoft Windows 10 Pro",
				})],
				"win32_logicaldisk": [VirtualWMIObject({ // dirty patch by @ALange
					volumeserialnumber: "B55B4A40",
				})],
			});
		case "winmgmts:\\\\localhost\\root\\securitycenter":
			return VirtualWMIObject({
				"antivirusproduct": [],
			});
		case "winmgmts:\\\\localhost\\root\\securitycenter2":
			return VirtualWMIObject({
				"antivirusproduct": [],
			});
		default:
			controller.kill(`GetObject(${name}) not implemented!`);
	}
};