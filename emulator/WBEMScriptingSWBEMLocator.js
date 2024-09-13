const lib = require("../lib");
const enumerator = require("./Enumerator");

// Fake SWBEMService.instancesof results.

_fake_win32_operatingsystem = {
    "Status" : "OK",
    "Name" : "Microsoft Windows 10 Enterprise|C:\WINDOWS|\Device\Harddisk0\Partition3",
    "FreePhysicalMemory" : "3409216",
    "FreeSpaceInPagingFiles" : "57801156",
    "FreeVirtualMemory" : "9689128",
    "Caption" : "Microsoft Windows 10 Enterprise",
    "Description" : "",
    "InstallDate" : "4/6/2022 11:31:32 AM",
    "CreationClassName" : "Win32_OperatingSystem",
    "CSCreationClassName" : "Win32_ComputerSystem",
    "CSName" : "MAC935",
    "CurrentTimeZone" : "-200",
    "Distributed" : "False",
    "LastBootUpTime" : "3/22/2024 2:11:13 PM",
    "LocalDateTime" : "4/19/2024 12:02:47 PM",
    "MaxNumberOfProcesses" : "2294967295",
    "MaxProcessMemorySize" : "37438953344",
    "NumberOfLicensedUsers" : "",
    "NumberOfProcesses" : "104",
    "NumberOfUsers" : "10",
    "OSType" : "18",
    "OtherTypeDescription" : "",
    "SizeStoredInPagingFiles" : "59278400",
    "TotalSwapSpaceSize" : "",
    "TotalVirtualMemorySize" : "25828864",
    "TotalVisibleMemorySize" : "16550464",
    "Version" : "10.0.19045",
    "BootDevice" : "\Device\HarddiskVolume1",
    "BuildNumber" : 19045,
    "BuildType" : "Multiprocessor Free",
    "CodeSet" : "1252",
    "CountryCode" : "1",
    "CSDVersion" : "",
    "DataExecutionPrevention_32BitApplications" : "False",
    "DataExecutionPrevention_Available" : "False",
    "DataExecutionPrevention_Drivers" : "False",
    "DataExecutionPrevention_SupportPolicy" : "1",
    "Debug" : "False",
    "EncryptionLevel" : "256",
    "ForegroundApplicationBoost" : "2",
    "LargeSystemCache" : "",
    "Locale" : "0409",
    "Manufacturer" : "Microsoft Corporation",
    "MUILanguages" : "{en-US}",
    "OperatingSystemSKU" : "4",
    "Organization" : "USERS",
    "OSArchitecture" : "64-bit",
    "OSLanguage" : "1033",
    "OSProductSuite" : "256",
    "PAEEnabled" : "",
    "PlusProductID" : "",
    "PlusVersionNumber" : "",
    "PortableOperatingSystem" : "False",
    "Primary" : "True",
    "ProductType" : "1",
    "RegisteredUser" : "user",
    "SerialNumber" : "12379-38562-28486-38294",
    "ServicePackMajorVersion" : "0",
    "ServicePackMinorVersion" : "0",
    "SuiteMask" : "272",
    "SystemDevice" : "\Device\HarddiskVolume3",
    "SystemDirectory" : "C:\WINDOWS\system32",
    "SystemDrive" : "C:",
    "WindowsDirectory" : "C:\WINDOWS",
    "PSComputerName" : "",
    "CimClass" : "root/cimv2:Win32_OperatingSystem",
    "CimInstanceProperties" : "{Caption, Description, InstallDate, Name...}",
    "CimSystemProperties" : "Microsoft.Management.Infrastructure.CimSystemProperties",
}

function VirtualSWBEMServices() {
    this.instancesof = function(item) {
        lib.info(`SWBEMServices: emulating getting instances of ${item}`);
	switch (item.toLowerCase()) {
        case 'win32_operatingsystem': {
            return [_fake_win32_operatingsystem];
        };
            
        default : {
            lib.warning("SWBEMService '" + item + "' not known. Returning empty list.");
            return [];
        }
        };
    };

    this.execquery = function(query) {
        lib.logIOC("SWBEMService", query, "Executed SWBEMService query '" + query + "'.");
        if (query.indexOf("Win32_OperatingSystem") > -1) return [_fake_win32_operatingsystem];
        return [];
    };
    
    this.get = function(item) {
        return {
            spawninstance_ : function() {
                return {
                    add : function(item) {}
                };
            }
        };
    };
}

function VirtualWBEMLocator() {
    this.connectserver = function(server, namespace) {
	lib.info(`WBEMLocator: emulating a connection to server ${server} with namespace ${namespace}`);
        
	return lib.proxify(VirtualSWBEMServices, "WBEMScripting.SWBEMServices");
    };
}

module.exports = lib.proxify(VirtualWBEMLocator, "WBEMScripting.SWBEMServices");
