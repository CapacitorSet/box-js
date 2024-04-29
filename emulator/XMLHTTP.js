const lib = require("../lib");
const argv = require("../argv.js").run;

function XMLHTTP() {
    this.headers = {};
    this._onreadystatechange = () => {};
    get onreadystatechange() {
        return this._onreadystatechange;
    };
    set onreadystatechange(func) {
        lib.info("onreadystatechange() method set for XMLHTTP object.");
        //if (typeof(func) !== "undefined") func();
    };
    this.readystate = 0;
    this.statustext = "UNSENT";
    this.status = undefined;
    this.url = "URL NOT SET";
    this.method = "METHOD NOT SET";
    
    this.open = function(method, url) {
	// Maybe you can skip the http part of the URL and XMLHTTP
	// still handles it?
	if (url.startsWith("//")) {
	    url = "http:" + url;
	}
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
    this.settimeouts = function() {
        // Stubbed out.
    };
    this.setproxy = function() {
        // Stubbed out.
    };    
    this.send = function(data) {
	if (data)
	    lib.info(`Data sent to ${this.url}:`, data);
	this.readystate = 4;
	let response;

        // Track the initial request.
	response = lib.fetchUrl(this.method, this.url, this.headers, data);
        
        // Fake that the request worked?
        if (argv["fake-download"]) {
	    this.status = 200;
	    this.statustext = "OK";
        }

        // Not faking request.
        else {
	    try {
                                
                // Actually try the request?
	        if (argv.download) {
		    this.status = 200;
		    this.statustext = "OK";
	        } else {
		    this.status = 404;
		    this.statustext = "Not found";
	        };
	    } catch (e) {
	        // If there was an error fetching the URL, pretend that the distribution site is down
	        this.status = 404;
	        this.statustext = "Not found";
	        response = {
		    body: new Buffer(""),
		    headers: {},
	        };
	    };
        };
	this.responsebody = response.body;
	this.responsetext = this.responsebody.toString("utf8");
	this.responseheaders = response.headers;
	this.onreadystatechange();
    };
    this.setoption = () => {};
    // Fake up setting options.
    this.option = {};
    this.getresponseheader = (key) => this.responseheaders[key];
    this.waitforresponse = function() {};
}

module.exports = lib.proxify(XMLHTTP, "XMLHTTP");
