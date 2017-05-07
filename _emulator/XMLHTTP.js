const controller = require("../_controller");

function XMLHTTP() {
	this.headers = {};
	this.onreadystatechange = () => {};
	this.open = function(method, url) {
		this.url = url;
		this.method = method;
		controller.logUrl(method, url);
	};
	this.setrequestheader = function(key, val) {
		key = key.replace(/:$/, ""); // Replace a trailing ":" if present
		this.headers[key] = val;
		console.log(`Header set for ${this.url}:`, key, val);
	};
	this.send = function(data) {
		if (data)
			console.log(`Data sent to ${this.url}:`, data);
		this.readystate = 4;
		this.status = 200;
		const response = controller.fetchUrl(this.method, this.url, this.headers, data);
		this.responsebody = response.body;
		this.responsetext = this.responsebody.toString("utf8");
		this.responseheaders = response.headers;
		this.onreadystatechange();
	};
	this.setoption = () => {};
	this.getresponseheader = (key) => this.responseheaders[key];
}

module.exports = function() {
	return new Proxy(new XMLHTTP(), {
		get: function(target, name) {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (!(name in target)) {
						controller.kill(`XMLHTTP.${name} not implemented!`);
					}
					return target[name];
			}
		},
	});
};