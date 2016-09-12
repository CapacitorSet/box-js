var cp = require('child_process');
var fs = require("fs");
var walk = require("walk");

var argv = require('minimist')(process.argv.slice(2));

let timeout = argv.timeout || 10;
if (!argv.timeout)
	console.log("Using a 10 seconds timeout, pass --timeout to specify another timeout in seconds");

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
				({root, name}) => analyze(root + name, name)
			);
		} :
		() => analyze(path, path)
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

function analyze(path, filename) {
	let directory = filename + ".results";
	let i = 1;
	while (isDir(directory)) {
		i++;
		directory = filename + "." + i + ".results";
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
		clearTimeout(killTimeout);
		worker.kill();
	});

	worker.on('error', function(err) {
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