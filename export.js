const argv = require("./argv.js").export;
const fs = require("fs");
const RateLimiter = require('limiter').RateLimiter;
const syncRequest = require("sync-request");
const walk = require("walk-sync");

let virustotalRateLimit = argv["vt-rate-limit"] || 4; // The public API is limited to 4 requests per minute.
const virustotalLimiter = new RateLimiter(virustotalRateLimit, "minute");

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
Array.prototype.unique = function() {
	// O(n) check using an object as hash map
	// Works for arrays of strings, not guaranteed to work for anything else
	let unique = {};
	for (const elem of this)
		unique[elem] = null;
	return Object.keys(unique);
}

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

log("info", "Parsing URLs...");
const urls = folders
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

if (argv["vt-urls"]) {
	const numUrls = urls.length;
	let submitted = 0;
	log("info", `Submitting ${numUrls} URLs to VirusTotal`);
	// If the requests can be sent without hitting the rate limit, do not print progress info
	const quiet = numUrls <= virustotalRateLimit;
	if (!quiet)
		log("info", `Due to API limits, this will take ${(numUrls / virustotalRateLimit - 1).toFixed(1)} minutes.`);
	for (const url of urls)
		virustotalLimiter.removeTokens(1, () => {
			request("GET", "http://localhost:8000/test", {
				apikey: argv["vt-key"],
				url
			});
			submitted++;
			if (!quiet)
				log("info", `URLs submitted to VirusTotal: ${submitted}/${numUrls} (${(100 * submitted/numUrls).toFixed(2)}%)`);
		});
}