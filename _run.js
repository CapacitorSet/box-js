const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const walk = require("walk-sync");
const argv = require("./argv.js").run;

// Just printing where to find default boilerplate code?
if (argv["prepended-code"] == "show-default") {
    const defaultBP = __dirname + "/boilerplate.js"
    console.log(defaultBP);
    process.exit(0);
}

function list_delete(arr, item) {
    for( var i = 0; i < arr.length; i++){ 
        
        if ( arr[i] === item) { 
            arr.splice(i, 1); 
            i--; 
        }
    }
    return arr;
}

// Track whether we should return an error shell code or not.
var single_sample = false;

// Read and format JSON flag documentation
if (argv.help || process.argv.length === 2) {
    const columnify = require("columnify");
    console.log(`box-js is a utility to analyze malicious JavaScript files.

Usage:
    box-js [flags] <files|directories>

    Pass a list of samples to be analyzed. Note that directories are searched
      recursively, so you can pass a directory that contains several samples and
      they will be analyzed in parallel.
    Creates one .results directory for each sample; see README.md for more
      information.

Flags:
	`);
    console.log(columnify(
	require("./argv.js").flags.run.map((flag) => ({
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

let timeout = argv.timeout;
if (!timeout) {
    console.log("Using a 10 seconds timeout, pass --timeout to specify another timeout in seconds");
    timeout = 10;
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

const args = process.argv.slice(2);
args.push(`--timeout=${timeout}`);

const [targets, options] = args.functionalSplit(fs.existsSync);

// Array of {filepath, filename}
const tasks = [];

var [folders, files] = targets.functionalSplit(path => fs.statSync(path).isDirectory());

// The output dir does not have samples to analyze.
const outputDir = argv["output-dir"] || "./";
if (outputDir != "./") {
    folders = list_delete(folders, outputDir);
}

files
    .map(filepath => ({
	filepath,
	filename: path.basename(filepath),
    }))
    .forEach(task => tasks.push(task));

folders
    .map(root => ({root, files: walk(root, {directories: false})}))
    .map(({root, files}) => files.map(file => root + "/" + file))
    .reduce((a, b) => a.concat(b), []) // flatten
    .map(filepath => ({
	filepath,
	filename: path.basename(filepath),
    }))
    .forEach(task => tasks.push(task));

if (tasks.length === 0) {
    console.log("Please pass one or more filenames or directories as an argument.");
    process.exit(255);
}

// Prevent "possible memory leak" warning
process.setMaxListeners(Infinity);

const q = require("queue")();
// Screw you, buggy option parser
if (argv.threads === 0) q.concurrency = Infinity;
else if (argv.threads)  q.concurrency = argv.threads;
else                    q.concurrency = require("os").cpus().length;

if (tasks.length > 1) { // If batch mode
    if (argv.threads) {
	console.log(`Analyzing ${tasks.length} items with ${q.concurrency} threads`)
    }
    else {
	console.log(`Analyzing ${tasks.length} items with ${q.concurrency} threads (use --threads to change this value)`)
    }
}
    
// queue the input files for analysis
tasks.forEach(({filepath, filename}) => q.push(cb => analyze(filepath, filename, cb)));

let completed = 0;

q.on("success", () => {
    completed++;
    if (tasks.length !== 1)
	console.log(`Progress: ${completed}/${tasks.length} (${(100 * completed/tasks.length).toFixed(2)}%)`);
});

// Exit with a meaningful return code if we are only analyzing 1 sample.
single_sample = (q.length == 1);

// Start analyzing samples.
q.start();

function analyze(filepath, filename, cb) {

    let directory = path.join(outputDir, filename + ".results");

    // Find a suitable directory name
    for (let i = 1; fs.existsSync(directory); i++)
	directory = path.join(outputDir, filename + "." + i + ".results");

    fs.mkdirSync(directory);
    directory += "/"; // For ease of use
    const worker = cp.fork(path.join(__dirname, "analyze"), [filepath, directory, ...options]);

    const killTimeout = setTimeout(() => {
	console.log(`Analysis for ${filename} timed out.`);
	if (!argv.preprocess)
	    console.log("Hint: if the script is heavily obfuscated, --preprocess --unsafe-preprocess can speed up the emulation.");
	worker.kill();
        // Useful analysis may have occurred.
	process.exit(0);
	cb();
    }, timeout * 1000);

    let expectShellError = false;

    worker.on("message", function(message) {
	switch (message) {
	case "expect-shell-error":
	    expectShellError = true;
	    break;
	case "no-expect-shell-error":
	    expectShellError = false;
	    break;
	}
    });

    worker.on("exit", function(code) {
	if (argv.debug && expectShellError) {
	    // Use the appropriate exit code, as documented in the README
	    process.exit(5);
	}
	if (code === 1) {
	    console.log(`
 * If the error is about a weird \"Unknown ActiveXObject\", try --no-kill.
 * Otherwise, report a bug at https://github.com/CapacitorSet/box-js/issues/ .`);
	}
        if (code != 0) {
            final_code = code;
        }
	clearTimeout(killTimeout);
	worker.kill();
	if (argv.debug || single_sample) process.exit(code);
	cb();
    });

    worker.on("error", function(err) {
	console.log("error!");
	console.log(err);
	clearTimeout(killTimeout);
	worker.kill();
	if (argv.debug) process.exit(1);
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
