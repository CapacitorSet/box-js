const cp = require("child_process");
const fs = require("fs");
const hapi = require("hapi"); // Not installed by default!
const os = require("os");
const path = require("path");
const rimraf = require("rimraf").sync;
const uuid = require("uuid").v4;

function getOutputFolder(id) {
	return path.join(os.tmpdir(), "box-js-" + id);
}

const server = new hapi.Server();
server.connection({
	host: "127.0.0.1", // Use "0.0.0.0" to bind to all interfaces, or change as appropriate
	port: 8000
});

const q = require("queue")();
q.concurrency = os.cpus().length;
q.autostart = true;

/* GET /concurrency
 *
 * Returns the maximum number of analyses to be run at a time.
 */
server.route({
	method: "GET",
	path: "/concurrency",
	handler: (request, reply) => reply(q.concurrency)
});

/* POST /concurrency
 *
 * Arguments:
 *   - value: the maximum number of analyses to be run at a time
 * 
 * Returns "OK".
 */
server.route({
	method: "POST",
	path: "/concurrency",
	handler: (request, reply) => {
		q.concurrency = request.payload.value;
		reply("OK")
	}
});

/* GET /sample/{id}
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Returns 0 if the analysis is still taking place, 1 if it finished.
 */
server.route({
	method: "GET",
	path: "/sample/{id}",
	handler: (request, reply) => {
		if (!/^[0-9a-f\-]+$/.test(request.params.id)) {
			reply("Invalid ID").code(400);
			return;
		}

		const outputFolder = getOutputFolder(request.params.id);
		if (!fs.existsSync(outputFolder)) {
			reply("Not found").code(404);
			return;
		}

		reply(fs.existsSync(path.join(outputFolder, ".analysis-completed")) ? "1" : "0");
	}
});

/* POST /sample
 *
 * Arguments:
 *   - sample: a file to be analyzed
 *
 * Returns the analysis ID.
 */
server.route({
	method: "POST",
	path: "/sample",
	config: {
		payload: {
			output: "stream",
			parse: true,
			allow: "multipart/form-data"
		},
		handler: (request, reply) => {
			if (!request.payload.sample) {
				reply("No file sent!");
				return;
			}

			const analysisID = uuid();
			const outputFolder = getOutputFolder(analysisID);
			fs.mkdirSync(outputFolder)
			const outputFile = path.join(outputFolder, "sample.js");
			console.log(`New sample received, saving to ${outputFile}`);
			request.payload.sample.pipe(fs.createWriteStream(outputFile));
			request.payload.sample.on("end", function(err) {
				if (err) throw err;
				q.push(cb => {
					console.log(`Analyzing ${analysisID}...`);
					cp.spawnSync("docker", [
						"run",
						"--rm", // Delete container fs after finishing
						"--volume", outputFolder + ":/samples",
						...("box-js /samples --output-dir=/samples --loglevel=debug").split(" ")
					]);
					fs.writeFileSync(path.join(outputFolder, ".analysis-completed"), "");
					console.log(`Analyzed.`);
					cb();
				})
				reply(analysisID);
			});
		}	
	}
});

/* GET /sample/{id}
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Returns "OK".
 */
server.route({
	method: "DELETE",
	path: "/sample/{id}",
	handler: (request, reply) => {
		if (!/^[0-9a-f\-]+$/.test(request.params.id)) {
			reply("Invalid ID").code(400);
			return;
		}

		const outputFolder = getOutputFolder(request.params.id);
		if (!fs.existsSync(outputFolder)) {
			reply("Not found").code(404);
			return;
		}

		rimraf(outputFolder);
		reply("OK");
	}
});

/* GET /sample/{id}/urls
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Returns a JSON array of URLs extracted during the analysis.
 */
server.route({
	method: "GET",
	path: "/sample/{id}/urls",
	handler: (request, reply) => {
		if (!/^[0-9a-f\-]+$/.test(request.params.id)) {
			reply("Invalid ID").code(400);
			return;
		}

		const outputFolder = getOutputFolder(request.params.id);
		if (!fs.existsSync(outputFolder)) {
			reply("Not found").code(404);
			return;
		}

		const file = path.join(outputFolder, "sample.js.results", "urls.json");
		if (!fs.existsSync(file)) {
			reply("Not found").code(404);
			return;
		}

		reply(fs.readFileSync(file, "utf8"));
	}
});

/* GET /sample/{id}/resources
 *
 * Arguments:
 *   - id: the analysis ID
 *
 * Returns a JSON object of resources extracted during the analysis.
 */
server.route({
	method: "GET",
	path: "/sample/{id}/resources",
	handler: (request, reply) => {
		if (!/^[0-9a-f\-]+$/.test(request.params.id)) {
			reply("Invalid ID").code(400);
			return;
		}

		const outputFolder = getOutputFolder(request.params.id);
		if (!fs.existsSync(outputFolder)) {
			reply("Not found").code(404);
			return;
		}

		const file = path.join(outputFolder, "sample.js.results", "resources.json");
		if (!fs.existsSync(file)) {
			reply("Not found").code(404);
			return;
		}

		reply(fs.readFileSync(file, "utf8"));
	}
});

server.start(err => {
	if (err) throw err;
	console.log(`API server running at ${server.info.uri}`);
});

q.start();