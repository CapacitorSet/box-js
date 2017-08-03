const fs = require("fs");
const uuid = require("uuid");
const request = require("sync-request");
const argv = require("./argv.js");

const directory = process.argv[3];

const urls = [];
const activeUrls = [];
const snippets = {};
const resources = {};
const files = {};

let latestUrl = "";

const logSnippet = function(filename, logContent, content) {
	snippets[filename] = logContent;
	fs.writeFileSync(directory + filename, content);
	fs.writeFileSync(directory + "snippets.json", JSON.stringify(snippets, null, "\t"));
};

function kill(message) {
	if (argv["no-kill"])
		throw new Error(message);
	console.trace(message);
	console.log("Exiting (use --no-kill to just simulate a runtime error).");
	process.exit(0);
}

function log(tag, text, toFile = true, toStdout = true) {
	const levels = {
		"debug": 0,
		"verb": 1,
		"info": 2,
		"warn": 3,
		"error": 4,
	};
	if (!(tag in levels)) {
		log("warn", `Application error: unknown logging tag ${tag}`, false);
		return;
	}
	if (!(argv.loglevel in levels)) {
		const oldLevel = argv.loglevel; // prevents infinite recursion
		argv.loglevel = "debug";
		log("warn", `Log level ${oldLevel} is invalid (valid levels: ${Object.keys(levels).join(", ")}), defaulting to "info"`, false);
	}
	const level = levels[tag];
	if (level < levels[argv.loglevel]) return;
	const message = `[${tag}] ${text}`;
	if (!argv.quiet && (toStdout || argv.loglevel === "debug")) // Debug level always writes to stdout and file, but --quiet overrides writing to the console.
		console.log(message);
	if (toFile || argv.loglevel === "debug")
		fs.appendFileSync(directory + "/analysis.log", message + "\n");
}

module.exports = {
	directory,
	argv,
	kill,
	getUUID: uuid.v4,

	debug: log.bind(null, "debug"),
	verbose: log.bind(null, "verb"),
	info: log.bind(null, "info"),
	warning: log.bind(null, "warn"),
	error: log.bind(null, "error"),

	proxify: (actualObject, objectName = "<unnamed>") => {
		/* Creating a Proxy is a common operation, because they normalize property names
		 * and help catch unimplemented features. This function implements this behaviour.
		 */
		return new Proxy(new actualObject, {
			get: function(target, prop) {
				const lProp = prop.toLowerCase();
				if (lProp in target) return target[lProp];
				kill(`${objectName}.${prop} not implemented!`);
			},
			set: function(a, b, c) {
				b = b.toLowerCase();
				a[b] = c;
				return true;
			},
		});
	},
	fetchUrl: function(method, url, headers = {}, body) {
		// Ignore HTTPS errors
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		try {
			log("info", "Downloading...");

			headers["User-Agent"] = "Mozilla/4.0 (Windows; MSIE 6.0; Windows NT 6.0)";
			const options = {
				headers,
				maxRedirects: 20,
				timeout: 4000,
			};
			if (body)
				options.body = body;
			if (argv.proxy)
				options.proxy = argv.proxy;

			const file = request(method, url, options);
			Buffer.prototype.charCodeAt = function(index) {
				return this[index];
			};
			log("info", `Downloaded ${file.body.length} bytes.`);
			return file;
		} catch (e) {
			// Log and rethrow
			log("error", `An error occurred while emulating a ${method} request to ${url}.`);
			log("error", e);
			throw e;
		}
	},
	writeFile: function(filename, contents) {
		files[filename] = contents;
	},
	readFile: function(filename) {
		return files[filename];
	},
	logUrl: function(method, url) {
		log("info", `${method} ${url}`);
		latestUrl = url;
		if (urls.indexOf(url) === -1) urls.push(url);
		fs.writeFileSync(directory + "urls.json", JSON.stringify(urls, null, "\t"));
	},
	logResource: function(resourceName, logContent, content) {
		resources[resourceName] = logContent;
		fs.writeFileSync(directory + resourceName, content);
		fs.writeFileSync(directory + "resources.json", JSON.stringify(resources, null, "\t"));

		let filetype = require("child_process").execSync("file " + JSON.stringify(directory + resourceName)).toString("utf8");
		filetype = filetype.replace(`${directory + resourceName}: `, "").replace("\n", "");
		log("info", `Saved ${directory + resourceName} (${content.length} bytes)`);
		log("info", `${directory + resourceName} has been detected as ${filetype}.`);

		if (/executable/.test(filetype)) {
			log("info", `Active URL detected: ${latestUrl}`);
			// Log active url
			if (activeUrls.indexOf(latestUrl) === -1)
				activeUrls.push(latestUrl);
			fs.writeFileSync(directory + "active_urls.json", JSON.stringify(activeUrls, null, "\t"));
		}
	},
	logSnippet,
	logJS: function(code) {
		const filename = uuid.v4() + ".js";
		log("verb", `Code saved to ${filename}`);
		logSnippet(filename, {as: "eval'd JS"}, code);
		return code; // Helps with tail call optimization
	},
};