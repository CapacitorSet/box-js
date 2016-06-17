var safe = require("safe-eval"),
	fs = require("fs"),
	uuid = require("uuid"),
	beautify = require("js-beautify").js_beautify;

var urls = [],
	snippets = {},
	resources = {};

evaluator(fs.readFileSync("sample.js", "utf8"));

fs.writeFileSync("urls.json", JSON.stringify(urls, null, '\t'));
fs.writeFileSync("snippets.json", JSON.stringify(snippets, null, '\t'));
fs.writeFileSync("resources.json", JSON.stringify(resources, null, '\t'))

function evaluator(code, v8Context) {
	var self = this;
	this.context = null;
	code = "1;" + code; // For whatever reason, it prevents many parsers from breaking
	var filename = uuid.v4() + ".js";
	console.log("Code saved to", filename);
	snippets[filename] = {as: "JS"};
	fs.writeFileSync(filename, beautify("1;" + code));

	safe("1;" + code, {
		//eval: code => evaluator(code, self.context),
		console: {
			log: x => console.log(x)
		},
		ActiveXObject: function(name) {
			//console.log("New ActiveXObject created:", name);
			switch (name) {
				case "WScript.Shell": {
					this.ExpandEnvironmentStrings = function(arg) {
						switch (arg) {
							case "%TEMP%":
								return "(path)";
							default:
								throw new Error(`Unknown argument ${arg}`);
						}
					}
					this.Run = function(command) {
						var filename = uuid.v4();
						fs.writeFileSync(filename, command);
						snippets[filename] = {as: "WScript code"}
					}				
				}
				break;
				case "MSXML2.XMLHTTP": {
					this.open = function(method, url) {
						console.log("Request made:", method, url);
						urls.push(url);
						this.url = url;
					}
					this.setRequestHeader = function(key, val) {
						console.log("Header set:", key, val);
					}
					this.send = function(data) {
						if (data)
							console.log("Data sent:", data);
						this.readyState = 4;
						this.status = 200;
						this.ResponseBody = `(Content of ${this.url})`;
						this.onreadystatechange();
					}
				}
				break;
				case "ADODB.Stream": {
					this.buffer = "";
					this.open = () => {}
					this.Open = this.open;
					var resourcename = uuid.v4();
					this.Write = this.write = function(chunk) {
						this.buffer += String(chunk);
					}
					this.SaveToFile = this.saveToFile = function(filename) {
						this.virtual_filename = filename;
					}
					this.Close = this.close = () => {
						resources[resourcename] = {as: this.virtual_filename};
						console.log("ADODB stream created:", resourcename);
						fs.writeFileSync(resourcename, this.buffer);
					}
				}
				break;
				default:
					console.log('!!!');
					console.log(`Unknown ActiveXObject ${name}`);
					console.log('!!!');
					{
						console.log("Simulating a DOM...");
						this.createElement = ProxiedVirtualDOMTag;
					}
					break;
			}
		}
	}, v8Context, {
		timeout: 10000
	}, function(context) {
		self.context = context;
	});
}

function VirtualDOMTag(name) {
	console.log(name);
	this.name = name;
	this.dataType = "";
	this.nodeTypedValue = "bait";
	return this;
}

function ProxiedVirtualDOMTag(name) {
	return new Proxy(new VirtualDOMTag(name), {
		get: function(target, name, receiver) {
			console.log(`Getting ${name}...`);
			switch (name) {
				case "nodeTypedValue":
					return target.text;
				default:
					return target[name];
			}
		}
	})
}