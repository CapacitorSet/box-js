const cp = require("child_process");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const os = require("os");
const path = require("path");
const base_path = os.homedir();
const p = require("util").promisify;
const uuid = require("uuid").v4;
const lib = {
	getOutputFolder: id => path.join(base_path, "tmp-boxjs", "box-js-" + id),
	getDebugOutputDir: () => path.join(base_path, "test_dir")
};

const app = express();
 
app.use(require("express-fileupload")());
// to support JSON-encoded bodies
app.use(bodyParser.json());
// to support URL-encoded bodies
app.use(bodyParser.urlencoded({
	extended: true
}));

function spawn(proc, args, opts = {stdio: "pipe"}) {
	return new Promise((resolve, reject) => {
		const newProcess = cp.spawn(proc, args, opts);
		newProcess.on("error", reject);
		let stdout, stderr;
		if (opts.stdio === "pipe") {
			stdout = stderr = "";
			newProcess.stdout.on("data", it => stdout += it);
			newProcess.stderr.on("data", it => stderr += it);
		}
		newProcess.on("close", code => resolve({
			code,
			stdout,
			stderr
		}));
	});
}

/*
app.use((req, res, next) => {
	console.log("New request: " + req.originalUrl);
	next();
});
*/

const q = require("queue")();
q.concurrency = os.cpus().length;
q.autostart = true;

/* GET /concurrency
 *
 * Returns the maximum number of analyses to be run at a time.
 */
app.get("/concurrency", (req, res) => res.send(String(q.concurrency)));

/* POST /concurrency
 *
 * Arguments:
 *   - value: the maximum number of analyses to be run at a time
 * 
 * Returns "1".
 */
app.post("/concurrency", (req, res) => {
	q.concurrency = req.body.value;
	res.json({server_err: 0});
});

/* GET /debug/connectivity
 *
 * Returns "1". Used for checking connectivity to the API server.
 */
app.get("/debug/connectivity", (req, res) => {
	console.log("Connectivity check successful.");
	res.json({server_err: 0});
});

/* GET /debug/docker
 *
 * Returns "1" if a test container could be spinned successfully.
 * Used for debugging issues with Docker.
 */
app.get("/debug/docker", async (req, res) => {
	console.log("Docker check running...");
	const proc = await spawn("docker", [
		"run",
		"--rm", // Delete container fs after finishing
		"hello-world"
	]);
	console.log(proc);
	const stderr = proc.stderr ? proc.stderr.toString() : "<none>";
	if (proc.code !== 0) { // Check for success status code
		console.log("Failed: status code is not zero.");
		console.log(proc.stderr);
		res.json({
			server_err: 99,
			code: proc.code,
			stderr
		});
		return;
	}
	if (!/Hello from Docker!/g.test(proc.stdout.toString())) { // Check for presence of hello world
		console.log("Failed: stdout does not contain hello world.");
		console.log(proc);
		const stdout = proc.stdout ? proc.stdout.toString() : "<none>";
		res.json({
			server_err: 99,
			stdout,
			stderr
		});
		return;
	}
	console.log("Successful.");
	res.json({server_err: 0});
});

/* GET /sample/:id
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Returns 404 if the analysis is still taking place, or a JSON object if it is
 * finished. The keys are "status" for the exit code, and "stderr" for the
 * contents of stderr.
 */
app.get("/sample/:id", async (req, res) => {
	if (!/^[0-9a-f-]+$/.test(req.params.id)) {
		res.json({server_err: 1});
		return;
	}

	const outputFolder = lib.getOutputFolder(req.params.id);
	if (!await p(fs.exists)(outputFolder)) {
		res.json({server_err: 2});
		return;
	}

	const outputFile = path.join(outputFolder, ".analysis-completed");
	if (!await p(fs.exists)(outputFile)) {
		res.json({server_err: 4});
		return;
	}

	res.send(await p(fs.readFile)(outputFile));
});

/* POST /sample
 *
 * Arguments:
 *   - sample: a file to be analyzed
 *   - flags: a string containing any additional flags (eg. "--preprocess --unsafe-preprocess")
 *
 * Returns the analysis ID.
 */
app.post("/sample", async (req, res) => {
	if (!req.files) {
		res.json({server_err: 5});
		return;
	}
	if (!req.body.flags)
		req.body.flags = "";

	const analysisID = uuid();
	const outputFolder = lib.getOutputFolder(analysisID);
	await p(fs.mkdir)(outputFolder);
	const outputFile = path.join(outputFolder, "sample.js");
	console.log(`New sample received, saving to ${outputFile}`);
	res.json({
		server_err: 0,
		analysisID
	});
	req.files.sample.mv(outputFile, function(err) {
		if (err) {
			console.log("Couldn't receive uploaded file:");
			console.log(err);
			return;
		}
		q.push(async cb => {
			console.log(`Analyzing ${analysisID}...`);
			const proc = await spawn("docker", [
				"run",
				"--rm", // Delete container fs after finishing
				"--volume", outputFolder + ":/samples", // Volumes
				"box-js", // Image name
				...("box-js /samples --output-dir=/samples --loglevel=debug --debug").split(" "),
				...(req.body.flags.split(" "))
			]);

			const stderr = proc.stderr.toString();
			if (proc.code !== 0) { // Check for success status code
				console.log(`Analysis for ${analysisID} failed, status code != 0.`);
				console.log("The error follows:");
				console.log(stderr.replace(/^/gm, " | "));
			}
			await p(fs.writeFile)(path.join(outputFolder, ".analysis-completed"), JSON.stringify({
				server_err: 0, // successful
				code: proc.code,
				stderr
			}));
			console.log(`Analysis for ${analysisID} completed.`);
			cb();
		});
	});
});

/* DELETE /sample/:id
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Deletes the given sample (or attempts to). Returns "1".
 */
app.delete("/sample/:id", async (req, res) => {
	if (!/^[0-9a-f-]+$/.test(req.params.id)) {
		res.json({server_err: 1});
		return;
	}

	const outputFolder = lib.getOutputFolder(req.params.id);
	if (!await p(fs.exists)(outputFolder)) {
		res.json({server_err: 2});
		return;
	}

	// We must delegate the directory removal to a setuid script.
	await spawn(path.join(__dirname, "rimraf.js"), [req.params.id]);
	res.json({server_err: 0});
});

/* GET /sample/:id/raw/:filename
 *
 * Arguments:
 *   - id: the analysis ID
 *   - filename: the filename (usually a UUID)
 *
 * Returns the given file from sample.results.
 */
app.get("/sample/:id/raw/:filename", async (req, res) => {
	if (!/^[0-9a-f-]+$/.test(req.params.id)) {
		res.json({server_err: 1});
		return;
	}

	const outputFolder = lib.getOutputFolder(req.params.id);
	if (!await p(fs.exists)(outputFolder)) {
		res.json({server_err: 2});
		return;
	}

	const outputFile = path.join(outputFolder, "sample.js.results", req.params.filename);
	if (!await p(fs.exists)(outputFile)) {
		res.json({server_err: 3});
		return;
	}

	res.send(await p(fs.readFile)(outputFile));
});

/* GET /sample/:id/urls
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Returns a JSON array of URLs extracted during the analysis.
 */
app.get("/sample/:id/urls", async (req, res) => {
	if (!/^[0-9a-f-]+$/.test(req.params.id)) {
		res.json({server_err: 1});
		return;
	}

	const outputFolder = lib.getOutputFolder(req.params.id);
	if (!await p(fs.exists)(outputFolder)) {
		res.json({server_err: 2});
		return;
	}

	const file = path.join(outputFolder, "sample.js.results", "urls.json");
	if (!await p(fs.exists)(file)) {
		res.send("[]");
		return;
	}

	res.send(await p(fs.readFile)(file, "utf8"));
});

/* GET /sample/:id/resources
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Returns a JSON object of resources extracted during the analysis.
 */
app.get("/sample/:id/resources", async (req, res) => {
	if (!/^[0-9a-f-]+$/.test(req.params.id)) {
		res.json({server_err: 1});
		return;
	}

	const outputFolder = lib.getOutputFolder(req.params.id);
	if (!await p(fs.exists)(outputFolder)) {
		res.json({server_err: 2});
		return;
	}

	const file = path.join(outputFolder, "sample.js.results", "resources.json");
	if (!await p(fs.exists)(file)) {
		res.send("{}");
		return;
	}

	res.send(await p(fs.readFile)(file, "utf8"));
});

/* GET /sample/:id/snippets
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Returns a JSON object of snippets executed during the analysis.
 */
app.get("/sample/:id/snippets", async (req, res) => {
	if (!/^[0-9a-f-]+$/.test(req.params.id)) {
		res.json({server_err: 1});
		return;
	}

	const outputFolder = lib.getOutputFolder(req.params.id);
	if (!await p(fs.exists)(outputFolder)) {
		res.json({server_err: 2});
		return;
	}

	const file = path.join(outputFolder, "sample.js.results", "snippets.json");
	if (!await p(fs.exists)(file)) {
		res.send("[]");
		return;
	}

	res.send(await p(fs.readFile)(file, "utf8"));
});

/* GET /sample/:id/ioc
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Returns a JSON object of IOCs (Indicators of Compromise) executed during the analysis.
 */
app.get("/sample/:id/ioc", async (req, res) => {
	if (!/^[0-9a-f-]+$/.test(req.params.id)) {
		res.json({server_err: 1});
		return;
	}

	const outputFolder = lib.getOutputFolder(req.params.id);
	if (!await p(fs.exists)(outputFolder)) {
		res.json({server_err: 2});
		return;
	}

	const file = path.join(outputFolder, "sample.js.results", "IOC.json");
	if (!await p(fs.exists)(file)) {
		res.send("[]");
		return;
	}

	res.send(await p(fs.readFile)(file, "utf8"));
});

console.log("Building the latest version of box-js...");
spawn("docker", [
	"build",
	"--no-cache",
	"-t",
	"box-js",
	"."
], {
	stdio: "inherit" // Show progress
}).then(proc => {
	if (proc.code !== 0)
		throw new Error("Docker process returned exit code " + proc.code);
}).catch(e => {
	console.error("Couldn't build the latest version of box-js.");
	if (e) {
		console.error(e);
		process.exit(1);
	}
}).then(() => new Promise((resolve, reject) => app.listen(
	9000,
	"127.0.0.1", // Use "0.0.0.0" to bind to all interfaces, or change as appropriate
	err => {
		if (err) reject(err);
		else resolve();
	}
))).catch(e => {
	console.error("Couldn't initialize the Web server.");
	if (e)
		console.error(e);
	process.exit(2);
}).then(() => {
	console.log("API server running!");
	console.log(`Output folder: ${lib.getOutputFolder("<id>")}`);
	q.start();
});
