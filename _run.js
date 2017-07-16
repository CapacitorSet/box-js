const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const walk = require("walk");
const argv = require("./argv.js");

// Read and format JSON flag documentation
if (argv.help || process.argv.length === 2) {
	const columnify = require("columnify");
	console.log(`box-js is a utility to analyze malicious JavaScript files.

Usage:
    box-js <files|directories> [args]

Arguments:
	`);
	console.log(columnify(
		argv.flags.map((flag) => ({
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

if (!argv.timeout)
	console.log("Using a 10 seconds timeout, pass --timeout to specify another timeout in seconds");
const timeout = Number(argv.timeout) || 10;

const outputDir = argv["output-dir"] || "./";

const isFile = (filepath) => {
	try {
		fs.statSync(filepath);
		return true;
	} catch (e) {
		return false;
	}
};

const options = process.argv
	.slice(2)
	.filter((filepath) => !isFile(filepath));

options.push(`--timeout=${timeout}`);

// Files and directories
const targets = process.argv
	.slice(2)
	.filter(isFile);

// Array of {filepath, filename}
const tasks = [];

// Files
targets
	.filter(filepath => !fs.statSync(filepath).isDirectory())
	.map(filepath => ({
		filepath,
		filename: path.basename(filepath),
	}))
	.forEach(task => tasks.push(task));

// Folders
targets
	.filter(filepath => fs.statSync(filepath).isDirectory())
	.map(filepath => {
		// "Flattens" a folder to an array of {filepath, filename}
		const tasks = [];
		walk.walkSync(filepath, {
			listeners: {
				file: (root, stat, next) => {
					tasks.push({
						filepath: path.join(root, stat.name),
						filename: stat.name,
					});
					next();
				},
			},
		});
		return tasks;
	})
	.reduce((a, b) => a.concat(b), []) // flatten
	.forEach(task => tasks.push(task));

if (tasks.length === 0) {
	console.log("Please pass one or more filenames or directories as an argument.");
	process.exit(-1);
}

// Prevent "possible memory leak" warning
process.setMaxListeners(Infinity);

const q = require("queue")();
// Screw you, buggy option parser
if (argv.threads === 0) q.concurrency = Infinity;
else if (argv.threads)  q.concurrency = argv.threads;
else                    q.concurrency = require("os").cpus().length;

if (tasks.length > 1) // If batch mode
	if (argv.threads)
		console.log(`Analyzing ${tasks.length} items with ${q.concurrency} threads`)
	else
		console.log(`Analyzing ${tasks.length} items with ${q.concurrency} threads (use --threads to change this value)`)

tasks.forEach(({filepath, filename}) => q.push(analyze.bind(null, filepath, filename)));
q.start();

function isDirectory(filepath) {
	try {
		return fs.statSync(filepath).isDirectory();
	} catch (e) {
		return false;
	}
}

function analyze(filepath, filename, cb) {
	let directory = path.join(outputDir, filename + ".results");
	// Find a suitable directory name
	for (let i = 1; isDirectory(directory); i++)
		directory = path.join(outputDir, filename + "." + i + ".results");

	fs.mkdirSync(directory);
	directory += "/"; // For ease of use
	const worker = cp.fork(path.join(__dirname, "analyze"), [filepath, directory, ...options]);

	const killTimeout = setTimeout(() => {
		console.log(`Analysis for ${filename} timed out.`);
		if (!argv.preprocess) {
			console.log("Hint: if the script is heavily obfuscated, --preprocess --unsafe-preprocess can speed up the emulation.");
		}
		worker.kill();
		cb();
	}, timeout * 1000);

	worker.on("message", function() {
		clearTimeout(killTimeout);
		worker.kill();
		cb();
	});

	worker.on("exit", function(code) {
		if (code === 1) {
			console.log(`
 * If the error is about a weird \"Unknown ActiveXObject\", try --no-kill.
 * If the error is about a legitimate \"Unknown ActiveXObject\", report a bug at https://github.com/CapacitorSet/box-js/issues/ .`);
		}
		clearTimeout(killTimeout);
		worker.kill();
		if (argv.debug) process.exit(-1);
		cb();
	});

	worker.on("error", function(err) {
		console.log(err);
		clearTimeout(killTimeout);
		worker.kill();
		cb();
	});

	process.on("exit", () => {
		worker.kill();
		cb();
	});
	process.on("SIGINT", () => {
		worker.kill();
		cb();
	});
	// process.on('uncaughtException', () => worker.kill());
}