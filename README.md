box.js
======

An utility to analyze malicious JavaScript.

To execute it, put your sample file in `sample.js`, and run

```
node run.js
```

>Some samples may trigger stack overflow errors. If this happens, add `--stack-size=8192` (`--stack-size` may be restricted to 1024 on Windows).

`snippets.json` contains the fragments of code that were executed; `urls.json`, the URLs requested; `resources.json`, the ADODB streams.

To clear the results, `rm [0-f]* resources.json snippets.json urls.json`.

## Analyzing the output

### Console output

The first source of information is the console output. On a succesful analysis, it will typically print something like this:

```
Code saved to 6084f868-3b26-4173-9bdc-30de0728b958.js
Code saved to d600003c-cf7e-4a5a-9eab-dd9ccac3bb77.js
Code saved to 5c713b31-0065-4621-aa1f-8c683c142c2b.js
POST http://google.com/redir2.php
Header set for http://google.com/redir2.php: Content-Type application/x-www-form-urlencoded
Data sent to http://google.com/redir2.php: foo=0.5321231725506976&bar=1000&baz=wTLHfzNQnC
Executing 2887675c-6693-45f9-9b0e-4cef92cf661c in the WScript shell
```

The lines with `Code saved to...` represent pieces of JavaScript code that were executed. When you see several line, it's usually because of nested `eval`s. Every piece of code is saved to disk and formatted (beautified) for easier study.

The lines with `GET x` or `POST x` are HTTP requests; `Header set for...` and `Data sent to...` also relates to HTTP. Note that while the requests are logged, they are not actually made, they're just emulated (`box-js` will return the string `(Content of ...)`). This behaviour is typical of droppers; you can download the file yourself and analyze it further.

Finally, the lines with `Executing ...` represent pieces of code that *attempted* to be executed. Again, they weren't really executed, they were just logged to disk.

Sometimes, you'll find that the content of the linked file is something like `(path)\mCzCqYM.js`. To figure out which file is this, consult `resources.json`, and look for a row like

```
	"9a24d544-f6f4-4523-98e1-9a4c1be6caff": "(path)\\mCzCqYM.js"
```

* **When a resource points to JavaScript code, the result should be re-run through `box-js`**.

* Sometimes, the files may use base64 encoding.

### JSON logs

Every HTTP request is both printed on the terminal and logged in `urls.json`. Duplicate URLs aren't inserted (i.e. requesting the same URL twice will result in only one line in `urls.json`).

`snippets.json` contains every piece of code that `box-js` came across, either executed from `eval` or `WScript.Shell.Run`.

`resources.json` contains every file that the sample tried to write to disk. For instance, if the application tried to save `Hello world!` to `$PATH/foo.txt`, the content of `resources.json` would be `{ "9a24...": "(path)\\foo.txt" }`, and the content of the file `9a24...` would be `Hello world!`.

## Patching

Sometimes calls to `eval` may throw an error, because they only have access to globals because of how they are implemented. This is an example:

```
// box-js implementation
eval = function(code) {
	// Calls the internal function _eval (see run.js) and passes the global variables
	return _eval(code, this)
}

function foo(x) {
	eval("x.bar = 1")
}
foo({})
```

In this case, `eval` will fail, because `x` is not global but rather a parameter. To patch this, make a global variable `x`, and rename the parameter:

```
x = null
function foo(param) {
	x = param
	eval("x.bar = 1")
}
```

-------

Some droppers use [conditional compilation](https://en.wikipedia.org/wiki/Conditional_comment#Conditional_comments_in_JScript), which is a feature of JScript but not of JavaScript, and thus isn't implemented in V8. Watch out for blocks like

```
/*@cc_on

Javascript code

@*/
```

and remove them (leave the plain JavaScript code).

## Expanding

You may occasionally run into unsupported components. In this case, you can file an issue on GitHub, or emulate the component yourself if you know JavaScript.

The error will typically look like this:

```
1 Jan 00:00:00 - Unknown ActiveXObject WinHttp.WinHttpRequest.5.1
Trace
    at kill (/home/CapacitorSet/box-js/run.js:24:10)
    at Proxy.ActiveXObject (/home/CapacitorSet/box-js/run.js:75:4)
    at evalmachine.<anonymous>:1:6471
    at ContextifyScript.Script.runInNewContext (vm.js:18:15)
    at ...
```

You can see that the exception was raised in `Proxy.ActiveXObject`, line 75, which looks like this:

```
function ActiveXObject(name) {
	switch (name) {
		case "WScript.Shell":
			return new ProxiedWScriptShell();
		/* ... */
		default:
			kill(`Unknown ActiveXObject ${name}`);
			break;
	}
}
```

Add a new `case "WinHttp.WinHttpRequest.5.1"`, and have it return an ES6 `Proxy` object (eg. `ProxiedWinHttpRequest`). This is used to catch unimplemented features as soon as they're requested by the malicious sample:

```
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
	
}
```

Rerun the analysis: it will fail again, telling you what exactly was not implemented.

```
1 Jan 00:00:00 - WinHttpRequest.open not implemented!
Trace
    at kill (/home/CapacitorSet/box-js/run.js:24:10)
    at Object.ProxiedWinHttpRequest.Proxy.get (/home/CapacitorSet/box-js/run.js:89:7)
```

Emulate `WinHttpRequest.open` as needed:

```
function WinHttpRequest() {
	this.open = function(method, url) {
		URLLogger(method, url);
		this.url = url;
	}
}
```

and iterate until the code emulates without errors.