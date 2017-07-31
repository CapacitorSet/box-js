const lib = require("../lib");

function VirtualWMIObject(object) {
	return new Proxy(object, {
		get: function(target, name) {
			if (typeof name === "string") name = name.toLowerCase();
			switch (name) {
				case "instancesof":
					return function(table) {
						table = table.toLowerCase();
						if (table in target) return target[table];
						lib.kill(`WMIObject(${JSON.stringify(target)}).InstancesOf(${table}) not implemented!`);
					};
				case "execquery":
					return query => {
						query = query.toLowerCase();
						// TODO: implement actual SQL
						if (query === "select * from win32_process") {
							lib.info("Script tried to read the list of processes");
							return [{name: "wscript.exe"}];
						}
						if (query === "select version from win32_operatingsystem") return [{version: "10"}];
						throw new Error(`Not implemented: query "${query}"`);
					}
				default:
					if (name in target) return target[name];
					if (name === "valueof") return undefined;
					if (name === "tojson") return () => JSON.stringify(target);
					lib.kill(`WMIObject(${JSON.stringify(target)}).${name} not implemented!`);
			}
		},
	});
}

module.exports.GetObject = function(name) {
/*
	name = name.toLowerCase();
	name = name.replace(/{impersonationlevel=impersonate}/g, "");
	switch (name) {
		case "winmgmts:":
			// ...
		case "winmgmts:\\\\localhost\\root\\securitycenter":
		case "winmgmts:\\\\localhost\\root\\securitycenter2":
			// ...
		default:
			lib.kill(`GetObject(${name}) not implemented!`);
	}
*/
	return new VirtualWMIObject({
		"win32_computersystemproduct": [new VirtualWMIObject({
			name: "Foobar",
		})],
		"win32_operatingsystem": [new VirtualWMIObject({
			caption: "Microsoft Windows 10 Pro",
		})],
		"win32_logicaldisk": [new VirtualWMIObject({ // dirty patch by @ALange
			deviceid: "C:",
			volumeserialnumber: "B55B4A40",
		})],
		"antivirusproduct": [],
	});
};