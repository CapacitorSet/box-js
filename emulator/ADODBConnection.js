const lib = require("../lib");
const iconv = require("iconv-lite");

function ADODBConnection() {

    this.open = function(query, conn) {
        log.logIOC("ADODBConnection", {"query": query}, "The script opened an ADODB connection.");
    };
    
    this.cursorlocation1 = function(arg) {
        log.logIOC("ADODBConnection", {"arg": arg}, "The script called ADODB cursor location.");
    };

    this.close = () => {};
}

module.exports = function() {
    return new Proxy(new ADODBConnection(), {
	get: function(target, name) {
	    name = name.toLowerCase();
	    switch (name) {
	    case "size":
	    case "length":
		return target.buffer.length;
	    case "readtext":
		return target.buffer;
	    default:
		if (name in target) return target[name];
		lib.kill(`ADODBConnection.${name} not implemented!`);
	    }
	},
	set: function(a, b, c) {
	    b = b.toLowerCase();
	    a[b] = c;
	    return true;
	},
    });
};
