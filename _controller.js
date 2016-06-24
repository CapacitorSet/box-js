var fs = require("fs"),
	uuid = require("uuid")

var urls = [],
	snippets = {},
	resources = {};

module.exports = {
	getUUID: uuid.v4,
	kill: function(message) {
		console.trace(message)
		process.exit(0)
	},
	logUrl: function(method, url) {
		console.log(method, url);
		if (urls.indexOf(url) == -1) urls.push(url);
		fs.writeFileSync("urls.json", JSON.stringify(urls, null, "\t"))
	},
	logResource: function(resourceName, logContent, content) {
		resources[resourceName] = logContent;
		fs.writeFileSync(resourceName, content);
		fs.writeFileSync("resources.json", JSON.stringify(resources, null, "\t"))
	},
	logSnippet: function(filename, logContent, content) {
		snippets[filename] = logContent;
		fs.writeFileSync(filename, content);
		fs.writeFileSync("snippets.json", JSON.stringify(snippets, null, "\t"));
	}
}