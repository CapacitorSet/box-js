const lib = require("../lib");
const fs = require("fs");
const path = require("path");

const diskSize = Math.floor(Math.random() * 1E11);
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
        win32_computersystem : [{
            "domain": "support.kingservers.com",
            "manufacturer": "Dell Inc.",
            "model": "XPS 15",
            "name": "LPTOP-127A",
            "primaryownername": "Sysop12",
            "totalphysicalmemory": 17021726720,
            "currenttimezone": -100,
        }],
    	win32_networkadapterconfiguration: [{
            "pscomputername": "USER-PC",
            "dhcpleaseexpires": "19330110154953.000000-360",
            "index": "7",
            "description": "Huawei Ethernet",
            "dhcpenabled": "True",
            "dhcpleaseobtained": "19330109154953.000000-360",
            "dhcpserver": "121.173.9.22",
            "dnsdomain": "kingservers.com",
            "dnsenabledforwinsresolution": "False",
            "dnshostname": "USER-PC",
            "dnsserversearchorder": ["8.8.8.8"],
            "domaindnsregistrationenabled": "False",
            "fulldnsregistrationenabled": "True",
            "ipaddress": ["185.180.196.9", "2002:b9b4:c409:0:0:0:0:0"],
            "ipconnectionmetric": "25",
            "ipenabled": "True",
            "ipfiltersecurityenabled": "False",
            "winsenablelmhostslookup": "True",
            "winsprimaryserver": "185.180.192.1",
            "winssecondaryserver": "185.180.192.17",
            "__genus": "2",
            "__class": "Win32_NetworkAdapterConfiguration",
            "__superclass": "CIM_Setting",
            "__dynasty": "CIM_Setting",
            "__relpath": "Win32_NetworkAdapterConfiguration.Index=7",
            "__property": "61",
            "__derivation": ["CIM_Setting"],
            "__server": "USER-PC",
            "__namespace": "root\cimv2",
            "__path": "\\USER-PC\root\cimv2:Win32_NetworkAdapterConfiguration.Index=7",
            "caption": "Main Network Adapter",
            "databasepath": "%SystemRoot%\System32\drivers\etc",
            "defaultipgateway": ["185.182.2.2"],
            "gatewaycostmetric": ["0"],
            "interfaceindex": "22",
            "ipsubnet": ["255.255.255.0", "64"],
            "macaddress": "F9:22:77:A3:9C:12",
            "servicename": "fhggtlqq",
            "settingid": ["F8528A8E-51DC-4D29-B02D-518E944A970B"],
            "tcpipnetbiosoptions": "0",
            "tcpwindowsize": "512",
            "scope": "System.Management.ManagementScope",
            "path": "\\USER-PC\root\cimv2:Win32_NetworkAdapterConfiguration.Index=2",
            "options": "System.Management.ObjectGetOptions",
            "classpath": "\\USER-PC\root\cimv2:Win32_NetworkAdapterConfiguration",
            "qualifiers": ["dynamic", "Locale", "provider", "UUID"],
        }
        ],
        win32_operatingsystem: [{
            "pscomputername": "LPTOP-127A",
            "status": "OK",
            "name": "Microsoft Windows 10 Enterprise|C:\WINDOWS|\Device\Harddisk0\Partition4",
            "freephysicalmemory": 8313236,
            "freespaceinpagingfiles": 9541376,
            "freevirtualmemory": 15864120,
            "__genus": 2,
            "__class": "Win32_OperatingSystem",
            "__superclass": "CIM_OperatingSystem",
            "__dynasty": "CIM_ManagedSystemElement",
            "__relpath": "Win32_OperatingSystem=@",
            "__property_count": 64,
            "__derivation": ["CIM_OperatingSystem", "CIM_LogicalElement", "CIM_ManagedSystemElement"],
            "__server": "LPTOP-127A",
            "__namespace": "root\cimv2",
            "__path": "\\LPTOP-127A\root\cimv2:Win32_OperatingSystem=@",
            "bootdevice": "\Device\HarddiskVolume2",
            "buildnumber": "17134",
            "buildtype": "Multiprocessor Free",
            "caption": "Microsoft Windows 10 Enterprise",
            "codeset": 1252,
            "countrycode": 1,
            "creationclassname": "Win32_OperatingSystem",
            "cscreationclassname": "Win32_ComputerSystem",
            "csname": "LPTOP-127A",
            "currenttimezone": -100,
            "dataexecutionprevention_32bitapplications": "True",
            "dataexecutionprevention_available": "True",
            "dataexecutionprevention_drivers": "True",
            "dataexecutionprevention_supportpolicy": 2,
            "debug": "False",
            "distributed": "False",
            "encryptionlevel": 256,
            "foregroundapplicationboost": 2,
            "installdate": "20180917214145.000000-300",
            "lastbootuptime": "20190724150844.500000-300",
            "localdatetime": "20190806095747.977000-300",
            "locale": "0409",
            "manufacturer": "Microsoft Corporation",
            "maxnumberofprocesses": 4294967295,
            "maxprocessmemorysize": 137438953344,
            "muilanguages": ["en-US"],
            "numberofprocesses": 258,
            "numberofusers": 8,
            "operatingsystemsku": 4,
            "organization": "King Servers",
            "osarchitecture": "64-bit",
            "oslanguage": 1033,
            "osproductsuite": 256,
            "ostype": 18,
            "portableoperatingsystem": "False",
            "primary": "True",
            "producttype": 1,
            "registereduser": "Sysop12",
            "serialnumber": "50014-13304-92463-12771",
            "servicepackmajorversion": 0,
            "servicepackminorversion": 0,
            "sizestoredinpagingfiles": 9713940,
            "suitemask": 272,
            "systemdevice": "\Device\HarddiskVolume4",
            "systemdirectory": "C:\WINDOWS\system32",
            "systemdrive": "C:",
            "totalvirtualmemorysize": 26336720,
            "totalvisiblememorysize": 16622780,
            "version": "10.0.17134",
            "windowsdirectory": "C:\WINDOWS",
            "scope": "System.Management.ManagementScope",
            "path": "\\LPTOP-127A\root\cimv2:Win32_OperatingSystem=@",
            "options": "System.Management.ObjectGetOptions",
            "classpath": "\\LPTOP-127A\root\cimv2:Win32_OperatingSystem",
            "properties": ["BootDevice", "BuildNumber", "BuildType", "Caption"],
            "systemproperties": ["__GENUS", "__CLASS", "__SUPERCLASS", "__DYNASTY"],
            "qualifiers": ["dynamic", "Locale", "provider", "Singleton"],
        }],
	win32_process: processes,
};

const classes = {
	win32_process: new Proxy(processes, {
		get(target, _prop) {
			const prop = _prop.toLowerCase();
			if (prop in target) return target[prop];
			if (prop === "create")
				return command => {
					lib.logIOC("CommandExec", command, "The script executed a command.");
					lib.logSnippet(lib.getUUID(), {as: "command"}, command);
				}
			lib.kill(`Win32_Process.${prop} not implemented!`);
		},
	}),
	win32_processstartup: new Proxy({
		spawninstance_: () => {}
	}, {
		get(target, _prop) {
			const prop = _prop.toLowerCase();
			if (prop in target) return target[prop];
			lib.kill(`Win32_Process.${prop} not implemented!`);
		},
	})
}

Object.keys(tables).forEach(name => {
	if (/[A-Z]/.test(name))
		lib.kill("Internal error: non-lowercase table name");
	tables[name].forEach(row => Object.keys(row).forEach(label => {
		if (/[A-Z]/.test(label))
		    lib.kill("Internal error: non-lowercase property: '" + label + "'");
	}));
});

function getTable(_tableName) {
	const tableName = _tableName.toLowerCase();
	if (tableName === "win32_process")
		lib.info("Script tried to read the list of processes");
	lib.verbose(`Script tried to read table ${tableName}`);
	if (!(tableName in tables))
		lib.kill(`Table ${tableName} not implemented!`);
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
		Get: className => {
			const _class = classes[className.toLowerCase()];
			if (!_class)
				lib.kill(`Not implemented: WMI.Get(${className})`);
			return _class;
		},
	}, {
		get(target, name) {
			if (name in target) return target[name];
			lib.kill(`WMI.GetObject.${name} not implemented!`);
		},
	});
};
