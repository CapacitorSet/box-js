var safe = require("safe-eval"),
	fs = require("fs"),
	uuid = require("uuid"),
	beautify = require("js-beautify").js_beautify;

var urls = [],
	snippets = {},
	resources = {};

evaluator(fs.readFileSync("sample.js", "utf8"));

function saveUrls() {
	fs.writeFileSync("urls.json", JSON.stringify(urls, null, '\t'))
}
function saveSnippets() {
	fs.writeFileSync("snippets.json", JSON.stringify(snippets, null, '\t'))
}
function saveResources() {
	fs.writeFileSync("resources.json", JSON.stringify(resources, null, '\t'))
}

function kill(msg) {
	require("util").log(msg);
	console.trace()
	process.exit(0);
}

function URLLogger(method, url) {
	console.log("Request made:", method, url);
	if (urls.indexOf(url) == -1) urls.push(url);
	saveUrls()
}

function evaluator(code, globals) {
	// For whatever reason, the "1;" prevents many parsers from breaking
	code = "1; eval = function(x) { return _eval(x, this); };" + code; 
	var filename = uuid.v4() + ".js";

	console.log("Code saved to", filename)
	fs.writeFileSync(filename, beautify("1;" + code));

	snippets[filename] = {as: "JS"}
	saveSnippets()

	return safe("1;" + code, globals ? globals : {
		_eval: evaluator,
		console: {
			log: x => console.log(x)
		},
		WScript: new Proxy({}, {
			get: function(target, name, receiver) {
				switch (name) {
					case "CreateObject":
						return ActiveXObject
					case "Sleep":
						// return x => console.log(`Sleeping for ${x} ms...`)
						return x => {}
					default:
						kill(`WScriptShell.${name} not implemented!`)
				}
			}
		}),
		ActiveXObject
	}, {
		timeout: 10000
	});
}

function ActiveXObject(name) {
	// console.log("New ActiveXObject created:", name);
	switch (name) {
		case "WScript.Shell":
			return new ProxiedWScriptShell();
		case "MSXML2.XMLHTTP":
			return new ProxiedXMLHTTP();
		case "ADODB.Stream":
			return new ProxiedADODBStream();
		case "Msxml2.DOMDocument.3.0":
			this.createElement = ProxiedVirtualDOMTag;
			break;
		case "WinHttp.WinHttpRequest.5.1":
			return new ProxiedWinHttpRequest();
		default:
			kill(`Unknown ActiveXObject ${name}`);
			break;
	}
}

function ProxiedWinHttpRequest() {
	return new Proxy(new WinHttpRequest(), {
		get: function(target, name, receiver) {
			switch (name) {
				/* Add here "special" traps with case statements */
				default:
					if (!(name in target)) {
						kill(`WinHttpRequest.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}

function WinHttpRequest() {
	this.open = function(method, url) {
		URLLogger(method, url);
		this.url = url;
	}
	this.send = function(data) {
		if (data)
			console.log(`Data sent to ${this.url}:`, data);
		this.readystate = 4;
		this.status = 200;
		this.ResponseBody = `(Content of ${this.url})`;
		//this.onreadystatechange();
	}
}

function WScriptShell() {
	this.ExpandEnvironmentStrings = function(arg) {
		switch (arg) {
			case "%TEMP%":
				return "(path)";
			case "%TEMP%/":
				return "(path)/";
			default:
				kill(`Unknown argument ${arg}`);
		}
	}
	this.Run = function(command) {
		var filename = uuid.v4();
		fs.writeFileSync(filename, command);
		snippets[filename] = {as: "WScript code"}
		throw new Error();
	}
}

function ProxiedWScriptShell(name) {
	return new Proxy(new WScriptShell(name), {
		get: function(target, name, receiver) {
			switch (name) {
				default:
					if (!(name in target)) {
						kill(`WScriptShell.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
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
			switch (name) {
				case "nodeTypedValue":
					return target.text;
				default:
					if (!(name in target)) {
						kill(`VirtualDOMTag.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}

function ADODBStream() {
	this.buffer = "";
	this.open = () => {}
	var resourcename = uuid.v4();
	this.write = function(chunk) {
		this.buffer += String(chunk);
	}
	this.savetofile = function(filename) {
		this.virtual_filename = filename;
	}
	this.close = () => {
		resources[resourcename] = {as: this.virtual_filename};
		saveResources()
		// console.log("ADODB stream created:", resourcename);
		fs.writeFileSync(resourcename, this.buffer);
	}
	this.loadfromfile = function(filename) {
		// console.log(`Loading ${filename}...`)
		this.readtext = `(Content of ${filename})`
	}
}

function ProxiedADODBStream() {
	return new Proxy(new ADODBStream(), {
		get: function(target, name, receiver) {
			name = name.toLowerCase();
			switch (name) {
				case "size":
					return target.buffer.length;
				default:
					if (!(name in target)) {
						kill(`ADODBStream.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}

function XMLHTTP() {
	this.open = function(method, url) {
		this.url = url;
		URLLogger(method, url);
	}
	this.setRequestHeader = function(key, val) {
		console.log(`Header set for ${this.url}:`, key, val);
	}
	this.send = function(data) {
		if (data)
			console.log(`Data sent to ${this.url}:`, data);
		this.readyState = 4;
		this.status = 200;
		this.ResponseBody = `(Content of ${this.url})`;
		this.onreadystatechange();
	}
}

function ProxiedXMLHTTP() {
	return new Proxy(new XMLHTTP(), {
		get: function(target, name, receiver) {
			switch (name) {
				default:
					if (!(name in target)) {
						kill(`XMLHTTP.${name} not implemented!`)
					}
					return target[name];
			}
		}
	})
}
