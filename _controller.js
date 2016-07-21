var fs = require("fs"),
	uuid = require("uuid"),
	request = require("sync-request");

var urls = [],
	snippets = {},
	resources = {},
	files = [];

var logSnippet = function(filename, logContent, content) {
	snippets[filename] = logContent;
	fs.writeFileSync(filename, content);
	fs.writeFileSync("snippets.json", JSON.stringify(snippets, null, "\t"));
};

module.exports = {
	getUUID: uuid.v4,
	kill: function(message) {
		console.trace(message)
		process.exit(0)
	},
	fetchUrl: function(method, url) {
		if (process.argv.indexOf("--download") == -1) {
			console.log(`Faking a ${method} request to ${url}`);
			console.log("Use the flag --download to actually download the file (eg. for encoded payloads).");
			return `(Content of ${url})`;
		}

		console.log(`Emulating a ${method} request to ${url}`);
		if (method == "POST")
			throw new Error("Emulating a POST request is not yet supported.")
		var file = request(method, url, {
			headers: {
				"User-Agent": "Mozilla/4.0 (Windows; MSIE 6.0; Windows NT 6.0)"
			},
			maxRedirects: 20,
			timeout: 5000
		});
		return file.body;
	},
	writeFile: function(filename, contents) {
		files[filename] = contents;
	},
	readFile: function(filename) {
		return files[filename];
	},
	logUrl: function(method, url) {
		if (urls.indexOf(url) == -1) urls.push(url);
		fs.writeFileSync("urls.json", JSON.stringify(urls, null, "\t"))
	},
	logResource: function(resourceName, logContent, content) {
		resources[resourceName] = logContent;
		fs.writeFileSync(resourceName, content);
		fs.writeFileSync("resources.json", JSON.stringify(resources, null, "\t"))
	},
	logSnippet,
	logJS: function(code) {
		const filename = uuid.v4() + ".js";
		console.log("Code saved to", filename)
		logSnippet(filename, {as: "eval'd JS"}, code)
		return code; // Helps with tail call optimization
	}
}