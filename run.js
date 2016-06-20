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

function evaluator(code, globals) {
	var self = this;
	// For whatever reason, the "1;" prevents many parsers from breaking
	code = "1; eval = function(x) { return _eval(x, this); };" + code; 
	var filename = uuid.v4() + ".js";
	console.log("Code saved to", filename);
	snippets[filename] = {as: "JS"};
	fs.writeFileSync(filename, beautify("1;" + code));

	safe("1;" + code, globals ? globals : {
		_eval: evaluator,
		console: {
			log: x => console.log(x)
		},
		ActiveXObject: function(name) {
			// console.log("New ActiveXObject created:", name);
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
						throw new Error();
					}				
				}
				break;
				case "MSXML2.XMLHTTP":
					return new ProxiedXMLHTTP();
				break;
				case "ADODB.Stream":
					return new ProxiedADODBStream();
				case "Msxml2.DOMDocument.3.0":
					this.createElement = ProxiedVirtualDOMTag;
					break;
				default:
					console.log('!!!');
					console.log(`Unknown ActiveXObject ${name}`);
					console.log('!!!');
					break;
			}
		}
	}, {
		timeout: 10000
	});
}

function VirtualDOMTag(name) {
	//console.log(`Creating a <${name}> tag...`);
	this.name = name;
	return this;
}

// Catches requests to <tag>.nodeTypedValue in order to emulate them correctly
function ProxiedVirtualDOMTag(name) {
	return new Proxy(new VirtualDOMTag(name), {
		get: function(target, name, receiver) {
			//console.log(`Getting VirtualDOMTag.${name}`);
			if (!(name in target)) {
				//console.log("Not implemented!")
			}
			switch (name) {
				case "nodeTypedValue":
					return target.text;
				default:
					return target[name];
			}
		}
	})
}

function ADODBStream() {
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

function ProxiedADODBStream() {
	return new Proxy(new ADODBStream(), {
		get: function(target, name, receiver) {
			//console.log(`Getting ProxiedADODBStream.${name}`);
			switch (name) {
				case "size":
					return target.buffer.length;
				default:
					if (!(name in target)) {
						//console.log("Not implemented!")
					}
					return target[name];
			}
		}
	})
}

function XMLHTTP() {
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

function ProxiedXMLHTTP() {
	return new Proxy(new XMLHTTP(), {
		get: function(target, name, receiver) {
			//console.log(`Getting XMLHTTP.${name}`);
			switch (name) {
				default:
					if (!(name in target)) {
						//console.log("Not implemented!")
					}
					return target[name];
			}
		}
	})
}
