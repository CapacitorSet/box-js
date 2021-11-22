const lib = require("../lib");
const iconv = require("iconv-lite");

function ADODBConnection() {

    this.open = function(query, conn) {
        console.log("adodb.connection open()");
        console.log(query);
        console.log(conn);
    };
    
    this.cursorlocation1 = function(arg) {
        console.log("adodb.connection cursorlocation()");
        console.log(arg);
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
