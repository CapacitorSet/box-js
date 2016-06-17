var safe = require("safe-eval"),
	fs = require("fs"),
	uuid = require("uuid"),
	beautify = require("js-beautify").js_beautify;

var urls = [],
	snippets = [];

evaluator(fs.readFileSync("sample.js"));

fs.writeFileSync("urls.json", JSON.stringify(urls));
fs.writeFileSync("snippets.json", JSON.stringify(snippets));

function evaluator(code) {
	var filename = uuid.v4() + ".js";
	console.log("Code saved to", filename);
	snippets.push(filename);
	fs.writeFileSync(filename, beautify(code));

	safe("1;" + code, {
		eval: evaluator,
		console: {
			log: x => {}
		},
		ActiveXObject: function(name) {
			//console.log("New ActiveXObject created:", name);
			this.ExpandEnvironmentStrings = function(arg) {
				switch (arg) {
					case "%TEMP%":
						return "(path)";
					default:
						throw arg;
				}
			}
			this.open = function(method, url) {
				console.log("Request made:", method, url);
				urls.push(url);
			}
			this.setRequestHeader = function(key, val) {
				console.log("Header set:", key, val);
			}
			this.send = function(data) {
				console.log("Data sent:", data)
			}
		}
	}, {
		timeout: 10000
	});
}