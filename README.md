box.js
======

An utility to analyze malicious JavaScript.

To execute it, put your sample file in `sample.js`, and run

```
node --stack-size=8192 run.js
```

>You may need `--stack-size` may be restricted to 1024 on Windows.

`snippets.json` contains the fragments of code that were executed; `urls.json`, the URLs requested; `resources.json`, the ADODB streams.

To clear the results, `rm [0-f]* resources.json snippets.json urls.json`.

## Notes

Droppers usually rely on `new ActiveXObject("WScript.Shell").Run(payload)` to fail if the payload is invalid (usually because the website is down, clean, or otherwise unable to deliver the code). If you're getting fewer results than expected, try commenting out `throw new Error()` in the WScript emulator.

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