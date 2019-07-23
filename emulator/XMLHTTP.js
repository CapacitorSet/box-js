const lib = require("../lib");
const argv = require("../argv.js").run;

function XMLHTTP() {
    this.headers = {};
    this.onreadystatechange = () => {};
    this.readystate = 0;
    this.statustext = "UNSENT";
    this.status = undefined;
    
    this.open = function(method, url) {
	this.url = url;
	this.method = method;
	this.readystate = 1;
	this.statustext = "OPENED";
    };
    this.setrequestheader = function(key, val) {
	key = key.replace(/:$/, ""); // Replace a trailing ":" if present
	this.headers[key] = val;
	lib.info(`Header set for ${this.url}:`, key, val);
    };
    this.send = function(data) {
	if (data)
	    lib.info(`Data sent to ${this.url}:`, data);
	this.readystate = 4;
	let response;
	try {
	    response = lib.fetchUrl(this.method, this.url, this.headers, data);
	    if (argv.download) {
		this.status = 200;
		this.statustext = "OK";
	    } else {
		this.status = 404;
		this.statustext = "Not found";
	    }
	} catch (e) {
	    // If there was an error fetching the URL, pretend that the distribution site is down
	    this.status = 404;
	    this.statustext = "Not found";
	    response = {
		body: new Buffer(""),
		headers: {},
	    };
	}
	this.responsebody = response.body;
	this.responsetext = this.responsebody.toString("utf8");
	this.responseheaders = response.headers;
	this.onreadystatechange();
    };
    this.setoption = () => {};
    this.getresponseheader = (key) => this.responseheaders[key];
}

module.exports = lib.proxify(XMLHTTP, "XMLHTTP");
