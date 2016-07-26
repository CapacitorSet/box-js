var cp = require('child_process'),
	fs = require("fs"),
	walk = require("walk"),
	async = require("async");

var argv = require('minimist')(process.argv.slice(2));

let timeout = argv.timeout || 10000;
if (!argv.timeout)
	console.log("Using a 10 seconds timeout, pass --timeout to specify another timeout in seconds")

var options = process.argv
	.slice(2)
	.filter(path => {try{fs.statSync(path);return false}catch(e){return true}});

var tasks = process.argv
	.slice(2)
	.filter(path => {try{fs.statSync(path);return true}catch(e){return false}})
	.map(path => fs.statSync(path).isDirectory() ?
		cb => {
			let files = [];
			walk.walkSync(path, {
				listeners: {
					file: (root, stat, next) => {files.push({root, name:stat.name}); next();}
				}
			});
			return files.map(
				({root, name}) => analyze(root + name, name)
			);
		} :
		() => analyze(path, path)
	);

if (tasks.length == 0) {
	console.log("Please pass one or more filenames or directories as an argument.");
	process.exit(-1);
}

tasks.forEach(task => task());

process.setMaxListeners(Infinity);

function isDir(path) {
	let exists = false;
	try {
		exists = fs.statSync(path).isDirectory();
	} catch(e) {}
	return exists;
}

function analyze(path, filename) {
	let directory = filename + ".results";
	let i = 1;
	let killed = false;
	while (isDir(directory)) {
		i++;
		directory = filename + "." + i + ".results";
	}
	fs.mkdirSync(directory);
	directory += "/"; // For ease of use
	let worker = cp.fork('./analyze', [path, directory, ...options]);

	worker.on('message', function(data) {
		killed = true;
		worker.kill();
	});

	worker.on('exit', function (code, signal) {
		killed = true;
		worker.kill();
	});

	worker.on('error', function (err) {
		killed = true;
		worker.kill();
	});

	setTimeout(function killOnTimeOut() {
		if (killed) return;
		console.log(`Analysis for ${filename} timed out.`);
		worker.kill();
	}, timeout * 1000);

	process.on('exit', () => worker.kill());
	process.on('SIGINT', () => worker.kill());
	// process.on('uncaughtException', () => worker.kill());
}