const controller = require("../_controller");

function VirtualWMIObject(object) {
	return new Proxy({}, {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				case "instancesof":
					return function(table) {
						table = table.toLowerCase();
						if (object[table]) return object[table];
						switch (table) {
							default:
								if (!(name in target)) {
									controller.kill(`WMIObject(${object}).InstancesOf(${table}) not implemented!`);
								}
								return target[name];
						}
					};
				default:
					if (!(name in target)) {
						controller.kill(`WMIObject(${object}).${name} not implemented!`);
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
				"win32_computersystemproduct": [{
					Name: "Foobar",
				}],
				"win32_operatingsystem": [{
					Caption: "Microsoft Windows 10 Pro",
				}],
				"win32_logicaldisk": [{ // dirty patch by @ALange
					VolumeSerialNumber: "B55B4A40",
				}],
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