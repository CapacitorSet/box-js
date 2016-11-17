var fs = require("fs"),
	uuid = require("uuid"),
	request = require("sync-request");

const argv = require('minimist')(process.argv.slice(2));

const directory = process.argv[3];

var urls = [],
	activeUrls = [],
	snippets = {},
	resources = {},
	files = [];

var latestUrl = "";

var logSnippet = function(filename, logContent, content) {
	snippets[filename] = logContent;
	fs.writeFileSync(directory + filename, content);
	fs.writeFileSync(directory + "snippets.json", JSON.stringify(snippets, null, "\t"));
};

module.exports = {
	directory,
	getUUID: uuid.v4,
	kill: function(message) {
		if (process.argv.indexOf("--no-kill") == -1) {
			console.trace(message);
			console.log("Exiting (use --no-kill to just simulate a runtime error).")
			process.exit(0);
		} else {
			throw new Error(message);
		}
	},
	fetchUrl: function(method, url, headers = {}, body) {
		try {
			latestUrl = url;
			if (process.argv.indexOf("--download") == -1) {
				console.log(`Faking a ${method} request to ${url}`);
				console.log("Use the flag --download to actually download the file (eg. for encoded payloads).");
				return `(Content of ${url})`;
			}

			console.log(`Emulating a ${method} request to ${url}`);
			headers["User-Agent"] = "Mozilla/4.0 (Windows; MSIE 6.0; Windows NT 6.0)";
			let options = {
				headers,
				maxRedirects: 20,
				timeout: 5000
			};
			if (body)
				options.body = body;
			if (argv.proxy)
				options.proxy = argv.proxy;

			var file = request(method, url, options);
			Buffer.prototype.charCodeAt = function(index) { return this[index]; }
			console.log(`Downloaded ${file.body.length} bytes.`);
			return file.body;
		} catch (e) {
			console.log(`An error occurred while emulating a ${method} request to ${url}.`)
			// console.log(e);
			// throw e;
			return `(Content of ${url})`;
		}
	},
	writeFile: function(filename, contents) {
		files[filename] = contents;
	},
	readFile: function(filename) {
		return files[filename];
	},
	logUrl: function(method, url) {
		if (urls.indexOf(url) == -1) urls.push(url);
		fs.writeFileSync(directory + "urls.json", JSON.stringify(urls, null, "\t"))
	},
	logResource: function(resourceName, logContent, content, print = false) {
		resources[resourceName] = logContent;
		fs.writeFileSync(directory + resourceName, content);
		fs.writeFileSync(directory + "resources.json", JSON.stringify(resources, null, "\t"))
		if (!print) return;
		let filetype = require("child_process").execSync("file " + JSON.stringify(directory + resourceName)).toString("utf8");
		filetype = filetype.replace(`${directory + resourceName}: `, "").replace("\n", "");
		console.log(`Saved ${directory + resourceName} (${content.length} bytes)`);
		console.log(`${directory + resourceName} has been detected as ${filetype}.`);
		if (/executable/.test(filetype)) {
			console.log("Active URL detected: " + latestUrl);
			// Log active url
			if (activeUrls.indexOf(latestUrl) == -1)
				activeUrls.push(latestUrl);
			fs.writeFileSync(directory + "active_urls.json", JSON.stringify(activeUrls, null, "\t"));
		}
	},
	logSnippet,
	logJS: function(code) {
		const filename = uuid.v4() + ".js";
		// console.log("Code saved to", filename)
		logSnippet(filename, {as: "eval'd JS"}, code)
		return code; // Helps with tail call optimization
	}
}