const lib = require("../lib");

function ShellApplication(name) {
    this.shellexecute = (file, args = "", dir = "") => {
        if (dir == null) dir = "";
        if (args == null) args = "";
        lib.runShellCommand(dir + file + " " + args);
    };
    const shellExecFuncRef = this.shellexecute;
    
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

    this.windows = function () {
        return {
            __name: "ShellApplication.Windows()",
            Count: 5,
            Item: function() {
                //Forkontore.Item(0).Document.Application.ShellExecute(Lacto,String.fromCharCode(34)+Legestue+String.fromCharCode(34),"","open",0);
                return {
                    __name: "ShellApplication.Windows().Item()",
                    Document: {
                        Application: {
                            ShellExecute: shellExecFuncRef,
                            //function (file, args, dir) {
                            //    console.log("BLAH");
                            //},
                        }
                    }
                };
            }
        };
    };
}

module.exports = lib.proxify(ShellApplication, "ShellApplication");
