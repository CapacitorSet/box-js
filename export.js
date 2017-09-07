const argv = require("./argv.js").export;
const fs = require("fs");
const RateLimiter = require('limiter').RateLimiter;
const syncRequest = require("sync-request");
const walk = require("walk-sync");

function request(method, URL, params) {
	if (method === "GET")
		URL += "?" + Object.keys(params)
			.map(key => ({key, value: params[key]}))
			.map(({key, value}) => `${key}=${encodeURIComponent(value)}`)
			.join("&");

	let options = {
		headers: {
			"User-Agent": "box-export (https://github.com/CapacitorSet/box-js/)"
		}
	};
	if (method === "POST")
		options.form = params;
	return syncRequest(method, URL, options);
}

function log(tag, text) {
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
	console.log(`[${tag}] ${text}`);
}

if (argv.help || process.argv.length === 2) {
	const columnify = require("columnify");
	console.log(`box-export is a utility to submit the output of box-js to various services like
Cuckoo Sandbox, VirusTotal and Malwr.

Usage:
    box-export [flags] <directories>

    Pass a list of directories produced by box-js (eg. sample.js.results) and
      one or more analysis methods.
    Note that directories are searched recursively, so you can pass a directory
      that contains several .results directories.

Flags:
	`);
	console.log(columnify(
		require("./argv.js").flags.export.map((flag) => ({
			name: (flag.alias ? `-${flag.alias}, ` : "") + `--${flag.name}`,
			description: flag.description,
		})),
		{
			config: {
				description: {
					maxWidth: 80,
				},
			},
		}
	));
	process.exit(0);
}

if (argv.version) {
	console.log(require("./package.json").version);
	process.exit(0);
}

if (argv.license) {
	console.log(fs.readFileSync(__dirname + "/LICENSE", "utf8"));
	process.exit(0);
}

Array.prototype.functionalSplit = function(f) {
	// Call f on every item, put it in a if f returns true, put it in b otherwise.
	const a = [];
	const b = [];
	for (const elem of this)
		if (f(elem))
			a.push(elem);
		else
			b.push(elem);
	return [a, b];
}
Array.prototype.flatten = function() {
	return this.reduce((a, b) => a.concat(b), []);
}
Array.prototype.objectFlatten = function() {
	return this.reduce((a, b) => Object.assign({}, a, b), {});
};
Array.prototype.uniqueStrings = function() {
	// O(n) check using an object as hash map
	// Works for arrays of strings, not guaranteed to work for anything else
	let unique = {};
	for (const elem of this)
		unique[elem] = null;
	return Object.keys(unique);
}
Array.prototype.unique = function(comparator = (a, b) => a === b) {
	if (this.every(item => typeof item === "string")) // Optimize: O(n) rather than O(n^2)
		return this.uniqueStrings();
	return this.reduce(
		(uniq, item) => uniq.some(x => comparator(x, item))
			? uniq
			: [...uniq, item],
		[]
	);
};

const args = process.argv.slice(2);

let [folders, options] = args.functionalSplit(fs.existsSync);

log("info", "Reading file list...");
folders = folders
	.filter(item => {
		const ret = fs.statSync(item).isDirectory();
		if (!ret)
			log("warn", `Ignoring argument "${item}" because it is not a directory`);
		return ret;
	})
	.map(path => ({root: path, files: walk(path)}))
	.map(({root, files}) => files.map(file => root + "/" + file).concat(root))
	.flatten()
	.filter(item => fs.statSync(item).isDirectory());

if (folders.length === 0) {
	log("error", "Please pass one or more filenames or directories as an argument.");
	process.exit(-1);
}

let urls, numUrls;
if (argv["cuckoo-urls"] || argv["vt-urls"]) {
	log("info", "Parsing URLs...");
	urls = folders
		.filter(item => {
			if (!fs.existsSync(item + "/urls.json")) {
				log("verb", `URL collection: discarding ${item} because it doesn't contain urls.json`);
				return false;
			}
			log("debug", `URL collection: folder ${item} is valid.`);
			return true;
		})
		.map(item => JSON.parse(fs.readFileSync(item + "/urls.json")))
		.flatten()
		.unique();
	numUrls = urls.length;
}

let cuckooAddress;
if (argv["cuckoo-urls"] || argv["cuckoo-all-files"] || argv["cuckoo-executables"]) {
	if (!argv["cuckoo-address"])
		throw new Error("Please enter a valid Cuckoo address.");
	cuckooAddress = argv["cuckoo-address"];
	if (!/^http/i.test(cuckooAddress))
		cuckooAddress = "http://" + cuckooAddress;
}

let malwrLimiter;
if (argv["malwr-all-files"] || argv["malwr-executables"]) {
	if (!argv["malwr-key"])
		throw new Error("Please enter a valid API key for Malwr.");
	// Malwr doesn't enforce rate limits, but let's be nice
	malwrLimiter = new RateLimiter(1, "second");
}

let vtRateLimit, vtLimiter;
if (argv["vt-urls"] || argv["vt-all-files"] || argv["vt-executables"]) {
	// The public API is limited to 4 requests per minute.
	vtRateLimit = argv["vt-rate-limit"] || 4;
	vtLimiter = new RateLimiter(vtRateLimit, "minute");
	if (!argv["vt-key"])
		throw new Error("Please enter a valid API key for VirusTotal.");
}

if (argv["cuckoo-urls"]) {
	log("info", `Submitting ${numUrls} URLs to Cuckoo`);
	let cuckooSubmittedUrls = 0;
	for (const url of urls) {
		request("POST", cuckooAddress + "/tasks/create/url", {
			url
		});
		cuckooSubmittedUrls++;
		log("info", `URLs submitted to Cuckoo: ${cuckooSubmittedUrls}/${numUrls} (${(100 * cuckooSubmittedUrls/numUrls).toFixed(2)}%)`);
	}
}

if (argv["vt-urls"]) {
	log("info", `Submitting ${numUrls} URLs to VirusTotal`);
	let vtSubmittedUrls = 0;
	// If the requests can be sent without hitting the rate limit, do not print progress info
	const quiet = numUrls <= vtRateLimit;
	if (!quiet)
		log("info", `Due to API limits, this will take ${(numUrls / vtRateLimit - 1).toFixed(1)} minutes.`);
	for (const url of urls)
		vtLimiter.removeTokens(1, () => {
			request("GET", "http://localhost:8000/test", {
				apikey: argv["vt-key"],
				url
			});
			vtSubmittedUrls++;
			if (!quiet)
				log("info", `URLs submitted to VirusTotal: ${vtSubmittedUrls}/${numUrls} (${(100 * vtSubmittedUrls/numUrls).toFixed(2)}%)`);
		});
}

/*
const allFiles = folders
	.filter(item => {
		if (!fs.existsSync(item + "/resources.json")) {
			log("verb", `URL collection: discarding ${item} because it doesn't contain resources.json`);
			return false;
		}
		log("debug", `URL collection: folder ${item} is valid.`);
		return true;
	})
	.map(item => fs.readFileSync(item + "/resources.json", "utf8"))
	.map(x => {
		try {
			return JSON.parse(x);
		} catch (e) {
			console.log(x);
			console.log(e);
			process.exit(1);
		}
	})
	.objectFlatten()
	.unique((a, b) => a.sha256 === b.sha256);
*/