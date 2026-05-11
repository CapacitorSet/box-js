// Use stubbed box-js packages in some cases. Stubbed packages are
// defined in boilerplate.js.
function require(arg) {
    
    // Override some Node packages with stubbed box-js versions. Add
    // any new stubbed packages here so they are loaded via require()
    // when sandboxing with box-js.
    const overrides = {
	"child_process" : {
	    execSync: _execSync,
	    spawn: _spawn,
            fork: _fork,
	    exec: _execSync,
	},
	"http" : _http,
        "net" : {
            createConnection: _createConnection,
            Socket: _Socket,
	    createServer: _createServer,
        },
        "request" : {
        },
        "socket.io-client" : _io_client,
        "axios" : {
            post: _axiosPost,
            get: _axiosGet,
        },
        "better-sqlite3" : {
        },
        "node-machine-id" : {
            machineId : _machineId,
            machineIdSync : _machineIdSync,
        },
	"express" : {
	    Router : _router,
	},
    }
    if (typeof overrides[arg] !== "undefined") return overrides[arg];
    try {
	return _origRequire(arg);
    }
    catch (e) {
	lib.error("require(" + arg + ") failed (module unknown). Returning empty module ...");
	return {};
    }
}
