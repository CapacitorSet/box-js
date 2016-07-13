var controller = require("../_controller")

function WinHttpRequest() {
	this.open = function(method, url) {
		controller.logUrl(method, url);
		this.method = method;
		this.url = url;
	}
	this.send = function(data) {
		if (data)
			console.log(`Data sent to ${this.url}:`, data);
		this.readystate = 4;
		this.status = 200;
		this.ResponseBody = controller.fetchUrl(this.method, this.url);
		//this.onreadystatechange();
	}
}

module.exports = function() {
	return new Proxy(new WinHttpRequest(), {
		get: function(target, name) {
			switch (name) {
				/* Add here "special" traps with case statements */
				default:
					if (!(name in target)) {
						controller.kill(`WinHttpRequest.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}