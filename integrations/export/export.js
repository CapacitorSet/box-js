#!/usr/bin/env node
const argv = require("../../argv.js").export;
const child_process = require("child_process");
const fs = require("fs");
const RateLimiter = require("limiter").RateLimiter;
const walk = require("walk-sync");

function lacksBinary(name) {
	const path = child_process.spawnSync("command", ["-v", name], {shell: true}).stdout;
	return path.length === 0;
}
if (lacksBinary("curl"))
	throw new Error("Curl must be installed.");

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
		require("../../argv.js").flags.export.map((flag) => ({
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
	console.log(require("../../package.json").version);
	process.exit(0);
}

if (argv.license) {
	console.log(fs.readFileSync(__dirname + "/../../LICENSE", "utf8"));
	process.exit(0);
}

Array.prototype.flatten = function() {
	return this.reduce((a, b) => a.concat(b), []);
};
Array.prototype.uniqueStrings = function() {
	// O(n) check using an object as hash map
	// Works for arrays of strings, not guaranteed to work for anything else
	const unique = {};
	for (const elem of this)
		unique[elem] = null;
	return Object.keys(unique);
};

function request(method, URL, params, files) {
	const args = [
		// Disables "Expect: 103 continue", useful for debugging
		// "-H", "Expect:",
		"--user-agent", "box-export (https://github.com/CapacitorSet/box-js/)",
	];
	if (method === "GET") {
		URL += "?" + Object.keys(params)
			.map(key => ({key, value: params[key]}))
			.map(({key, value}) => `${key}=${encodeURIComponent(value)}`)
			.join("&");
		if (Object.keys(files).length !== 0) { // Allow an empty object
			log("error", "Tried to upload file(s) " + JSON.stringify(files) + " to endpoint " + URL);
			throw new Error("Cannot upload files in a GET request!");
		}
	} else if (method === "POST") {
		for (const key of Object.keys(params))
			args.push("--data", key + "=" + params[key]);
		for (const key of Object.keys(files))
			args.push("--form", key + "=@" + files[key]);
	}

	args.push(URL);

	return child_process.spawnSync("curl", args);
}

function APISubmit(method, endpoint, params, files, limiter, cb) {
	const f = () => {
		request(method, endpoint, params, files);
		cb();
	};
	if (limiter)
		limiter.removeTokens(1, f);
	else
		f();
}

function bulkAPISubmit(
	items,
	method, endpoint,
	paramFactory = () => ({}), fileFactory = () => ({}),
	setupMsg = total => `Submitting ${total} items`, progressMsg = "Items submitted:",
	limiter, rateLimit, unit) {
	const numItems = items.length;
	log("info", setupMsg(numItems));
	let processedItems = 0;

	if (numItems <= rateLimit)
		log("info", `Due to API limits, this will take ${(numItems / rateLimit - 1).toFixed(1)} ${unit}s.`);
	for (const item of items)
		APISubmit(method, endpoint, paramFactory(item), fileFactory(item), limiter, () => {
			processedItems++;
			log("info", progressMsg + ` ${processedItems}/${numItems} (${(100 * processedItems/numItems).toFixed(2)}%)`);
		});
}

const args = process.argv.slice(2);
let folders = args.filter(fs.existsSync);

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

let cuckooAddress;
if (argv["cuckoo-urls"] || argv["cuckoo-all-files"] || argv["cuckoo-executables"]) {
	if (!argv["cuckoo-address"])
		throw new Error("Please enter a valid Cuckoo address (see --help for more information).");
	cuckooAddress = argv["cuckoo-address"];
	if (!/^http/i.test(cuckooAddress))
		cuckooAddress = "http://" + cuckooAddress;
}

let malwrApiKey;
// Malwr doesn't enforce rate limits, but let's be nice
const malwrRateLimit = 1;
let malwrLimiter;
if (argv["malwr-all-files"] || argv["malwr-executables"]) {
	if (!argv["malwr-key"])
		throw new Error("Please enter a valid API key for Malwr (see --help for more information).");
	malwrApiKey = argv["malwr-key"];
	malwrLimiter = new RateLimiter(malwrApiKey, "second");
}

let vtApiKey;
let vtRateLimit, vtLimiter;
if (argv["vt-urls"] || argv["vt-all-files"] || argv["vt-executables"]) {
	if (!argv["vt-key"])
		throw new Error("Please enter a valid API key for VirusTotal (see --help for more information).");
	vtApiKey = argv["vt-key"];
	// The public API is limited to 4 requests per minute.
	vtRateLimit = argv["vt-rate-limit"] || 4;
	vtLimiter = new RateLimiter(vtRateLimit, "minute");
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
		.uniqueStrings();
	numUrls = urls.length;
}

if (argv["cuckoo-urls"]) {
	bulkAPISubmit(
		urls,
		"POST", cuckooAddress + "/tasks/create/url",
		url => ({url}), undefined,
		num => `Submitting ${numUrls} URLs to Cuckoo`, "URLs submitted to Cuckoo:"
	);
}

if (argv["vt-urls"]) {
	bulkAPISubmit(
		urls,
		"GET", "http://localhost:8000/test",
		url => ({apikey: vtApiKey, url}), undefined,
		num => `Submitting ${num} URLs to VirusTotal`, "URLs submitted to VirusTotal:",
		vtLimiter, vtRateLimit, "minute"
	);
}

let allFiles = [], executables = [];
if (argv["cuckoo-all-files"] || argv["cuckoo-executables"]
	|| argv["malwr-all-files"] || argv["malwr-executables"]
	|| argv["vt-all-files"] || argv["vt-executables"]) {
	for (const folder of folders) {
		if (!fs.existsSync(folder + "/resources.json")) {
			log("verb", `URL collection: discarding ${folder} because it doesn't contain resources.json`);
			continue;
		}
		log("debug", `URL collection: folder ${folder} is valid.`);
		const resourcesString = fs.readFileSync(folder + "/resources.json", "utf8");
		if (resourcesString === "") continue;
		const resources = JSON.parse(resourcesString);
		for (const filename in resources) {
			if (!resources.hasOwnProperty(filename)) continue;
			const resource = resources[filename];
			// If the resource was already inserted, skip.
			if (allFiles.some(file => file.sha256 === resource.sha256))
				continue;
			allFiles.push({
				path: folder + "/" + filename,
				emulatedPath: resource.path,
				type: resource.type,
				md5: resource.md5,
				sha1: resource.sha1,
				sha256: resource.sha256,
			});
		}
	}
	executables = allFiles.filter(item => /executable/.test(item.type));
}

if (argv["cuckoo-all-files"]) {
	bulkAPISubmit(
		allFiles,
		"POST", cuckooAddress + "/tasks/create/file",
		undefined, file => ({file: file.path}),
		num => `Submitting ${num} files to Cuckoo`, "Files submitted to Cuckoo:"
	);
} else if (argv["cuckoo-executables"]) {
	bulkAPISubmit(
		executables,
		"POST", cuckooAddress + "/tasks/create/file",
		undefined, file => ({file: file.path}),
		num => `Submitting ${num} files to Cuckoo`, "Files submitted to Cuckoo:"
	);
}

if (argv["malwr-all-files"]) {
	bulkAPISubmit(
		allFiles,
		"POST", "http://localhost:8000/test",
		() => ({api_key: malwrApiKey, shared: !argv["malwr-private"]}), file => ({file: file.path}),
		num => `Submitting ${num} files to Malwr`, "Files submitted to Malwr:",
		malwrLimiter, malwrRateLimit, "second"
	);
} else if (argv["malwr-executables"]) {
	bulkAPISubmit(
		executables,
		"POST", "http://localhost:8000/test",
		() => ({api_key: malwrApiKey, shared: !argv["malwr-private"]}), file => ({file: file.path}),
		num => `Submitting ${num} files to Malwr`, "Files submitted to Malwr:",
		malwrLimiter, malwrRateLimit, "second"
	);
}

if (argv["vt-all-files"]) {
	bulkAPISubmit(
		allFiles,
		"POST", "http://localhost:8000/test",
		() => ({apikey: vtApiKey}), file => ({file: file.path}),
		num => `Submitting ${num} files to VirusTotal`, "Files submitted to VirusTotal:",
		vtLimiter, vtRateLimit, "minute"
	);
} else {
	bulkAPISubmit(
		executables,
		"POST", "http://localhost:8000/test",
		() => ({apikey: vtApiKey}), file => ({file: file.path}),
		num => `Submitting ${num} files to VirusTotal`, "Files submitted to VirusTotal:",
		vtLimiter, vtRateLimit, "minute"
	);
}
