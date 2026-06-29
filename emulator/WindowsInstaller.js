const lib = require("../lib");

function WindowsInstaller() {

    this.clazz = "WindowsInstaller";
    
    this.installproduct = function(url) {
        lib.logIOC("WindowsInstaller", {"url": url}, "The script installed a remote MSI.");
        lib.logUrl('Remote MSI Install', url);
    };

    this.openpackage = function(url) {
        lib.logIOC("WindowsInstaller", {"url": url}, "The script opened a remote MSI package.");
        lib.logUrl('Remote MSI Install', url);
    };
}

module.exports = lib.proxify(WindowsInstaller, "WindowsInstaller");
