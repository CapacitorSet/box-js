const lib = require("../lib");
const fs = require("fs");
const path = require("path");

const diskSize = Math.floor(Math.random() * (10 ** 11));
const freeSpace = Math.floor(Math.random() * diskSize);

// Note: all fields MUST be in lowercase!
const processes = JSON.parse(fs.readFileSync(path.join(__dirname, "processes.json"), "utf8"));
const tables = {
	antivirusproduct: [],
	win32_computersystemproduct: [],
	win32_logicaldisk: [{ // dirty patch by @ALange
		deviceid: "C:",
		drivetype: 3,
		freespace: freeSpace,
		size: diskSize,
		volumeserialnumber: "B55B4A40",
	}],
	win32_operatingsystem: [{
		version: "5.3",
		caption: "Windows XP"
	}],
	win32_process: processes
};

Object.keys(tables).forEach(name => {
	if (/[A-Z]/.test(name))
		lib.kill("Internal error: non-lowercase table name");
	tables[name].forEach(row => Object.keys(row).forEach(label => {
		if (/[A-Z]/.test(label))
			lib.kill("Internal error: non-lowercase property");
	}));
});

function getTable(_tableName) {
	const tableName = _tableName.toLowerCase();
	if (tableName === "win32_process")
		lib.info("Script tried to read the list of processes");
	lib.verbose(`Script tried to read table ${tableName}`);
	if (!(tableName in tables))
		lib.kill("Table ${tableName} not implemented!");
	// Proxify everything
	return tables[tableName].map(row => new Proxy(row, {
		get(target, _prop) {
			const prop = _prop.toLowerCase();
			if (prop in target) return target[prop];
			lib.kill(`${tableName}.${prop} not implemented!`);
		},
	}));
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
	return new Proxy({
		InstancesOf: getTable,
		ExecQuery: query => {
			// TODO: implement actual SQL
			const parts = query.match(/^select +(\*|(?:\w+, *)*(?:\w+)) +from +(\w+)/i);
			if (!parts)
				lib.kill(`Not implemented: query "${query}"`);
			// For now, fields are ignored.
			// const fields = parts[1];
			const tableName = parts[2].toLowerCase();
			return getTable(tableName);
		},
	}, {
		get(target, name) {
			if (name in target) return target[name];
			lib.kill(`WMI.GetObject.${name} not implemented!`);
		},
	});
};