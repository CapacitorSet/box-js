const lib = require("../lib");

function WindowsInstaller() {

    this.installproduct = function(url) {
        lib.logIOC("WindowsInstaller", {"url": url}, "The script installed a remote MSI.");
        lib.logUrl('Remote MSI Install', url);
    };
}

module.exports = lib.proxify(WindowsInstaller, "WindowsInstaller");
