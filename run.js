#!/usr/bin/env node

var cp = require('child_process');
var fs = require("fs");
var walk = require("walk");

var argv = require('minimist')(process.argv.slice(2));

var help = `box-js is a utility to analyze malicious JavaScript files.

Usage:
    box-js <files|directories> [args]

Arguments:
    --download            Actually download the payloads

    --no-cc_on-rewrite    Do not rewrite \`/\*@cc_on <...>@*/\` to \`<...>\`

    --no-concat-simplify  Do not simplify \`"a"+"b"\` to \`"ab"\`

    --no-echo             When the script prints data, do not print it to the
                          console

    --no-eval-rewrite     Do not rewrite \`eval\` so that its argument is
                          rewritten

    --no-rewrite          Do not rewrite the source code at all, other than for
                          \`@cc_on\` support

    --no-shell-error      Do not throw a fake error when executing
                          \`WScriptShell.Run\` (it throws a fake error by
                          default to pretend that the distributions sites are
                          down, so that the script will attempt to poll every
                          site)

    --no-typeof-rewrite   Do not rewrite \`typeof\`
                          (e.g. \`typeof ActiveXObject\`, which must return
                          "unknown" in the JScript standard and not "object")

    --output-dir=./       The location on disk to write the results files and
                          folders to (defaults to current directory)

    --timeout=10          The script will timeout after this many seconds
                          (default 10)

    --windows-xp          Emulate Windows XP (influences the value of
                          environment variables)

    --experimental-neq    [experimental] rewrite \`a != b\` to \`false\`
`;

if (argv.h || argv.help || argv.length === 0) {
    console.log(help);
    process.exit(0);
}

let timeout = argv.timeout || 10;
if (!argv.timeout)
	console.log("Using a 10 seconds timeout, pass --timeout to specify another timeout in seconds");

let outputDir = argv["output-dir"] || "./";
outputDir = outputDir.slice(-1) != "/" ? outputDir + "/" : outputDir;

const isFile = path => {
	try {
		fs.statSync(path);
		return true;
	} catch (e) {
		return false;
	}
};

const options = process.argv
	.slice(2)
	.filter(path => !isFile(path));

const tasks = process.argv
	.slice(2)
	.filter(isFile)
	.map(path => fs.statSync(path).isDirectory() ?
		cb => {
			let files = [];
			walk.walkSync(path, {
				listeners: {
					file: (root, stat, next) => {
						files.push({root, name: stat.name});
						next();
					}
				}
			});
			return files.map(
				({root, name}) => analyze(root + name, name, outputDir)
			);
		} :
		() => analyze(path, path, outputDir)
	);

if (tasks.length === 0) {
	console.log("Please pass one or more filenames or directories as an argument.");
	process.exit(-1);
}

// Prevent "possible memory leak" warning
process.setMaxListeners(Infinity);

tasks.forEach(task => task());

function isDir(path) {
	try {
		return fs.statSync(path).isDirectory();
	} catch (e) {
		return false;
	}
}

function analyze(path, filename, outputDir) {
	let directory = outputDir + filename + ".results";
	let i = 1;
	while (isDir(directory)) {
		i++;
		directory = outputDir + filename + "." + i + ".results";
	}
	fs.mkdirSync(directory);
	directory += "/"; // For ease of use
	let worker = cp.fork('./analyze', [path, directory, ...options]);
	let killTimeout;

	worker.on('message', function(data) {
		clearTimeout(killTimeout);
		worker.kill();
	});

	worker.on('exit', function(code, signal) {
		if (code === 1) {
			console.log(`
 * If you see garbled text, try emulating Windows XP with --windows-xp.
 * If the error is about a weird \"Unknown ActiveXObject\", try --no-kill.
 * If the error is about a legitimate \"Unknown ActiveXObject\", report a bug at https://github.com/CapacitorSet/box-js/issues/ .`);
		}
		clearTimeout(killTimeout);
		worker.kill();
	});

	worker.on('error', function(err) {
		console.log("weee");
		console.log(err);
		clearTimeout(killTimeout);
		worker.kill();
	});

	killTimeout = setTimeout(function killOnTimeOut() {
		console.log(`Analysis for ${filename} timed out.`);
		worker.kill();
	}, timeout * 1000);

	process.on('exit', () => worker.kill());
	process.on('SIGINT', () => worker.kill());
	// process.on('uncaughtException', () => worker.kill());
}
