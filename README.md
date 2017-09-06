box.js
======

[![npm](https://img.shields.io/npm/v/box-js.svg)]() [![Build Status](https://travis-ci.org/CapacitorSet/box-js.svg?branch=master)](https://travis-ci.org/CapacitorSet/box-js) [![paypal](https://img.shields.io/badge/paypal-donate-yellow.svg)](https://paypal.me/capacitorset)

A utility to analyze malicious JavaScript.

# Installation

Simply install box-js from npm:

```
npm install box-js --global
```

# Usage

Let's say you have a sample called `sample.js`: to analyze it, simply run

```
box-js sample.js
```

Chances are you will also want to download any payloads; use the flag `--download` to enable downloading. Otherwise, the engine will simulate a 404 error, so that the script will be tricked into thinking the distribution site is down and contacting any fallback sites.

Box.js will emulate a Windows JScript environment, print a summary of the emulation to the console, and create a folder called `sample.js.results` (if it already exists, it will create `sample.js.1.results` and so on). This folder will contain:

 * `analysis.log`, a log of the analysis as it was printed on screen;
 * a series of files identified by UUIDs;
 * `snippets.json`, a list of pieces of code executed by the sample (JavaScript, shell commands, etc.);
 * `urls.json`, a list of URLs contacted;
 * `active_urls.json`, a list of URLs that seem to drop active malware;
 * `resources.json`, the ADODB streams (i.e. the files that the script wrote to disk) with file types and hashes.

## Batch usage

While box.js is typically used on single files, it can also run batch analyses. You can simply pass a list of files or folders to analyse:

```
box-js sample1.js sample2.js /var/data/mySamples ...
```

By default box.js will process samples in parallel, running one analysis per core. You can use a different setting by specifying a value for `--threads`: in particular, 0 will remove the limit, making box-js spawn as many analysis threads as possible and resulting in very fast analysis but possibly overloading the system (note that **analyses are usually CPU-bound**, not RAM-bound).

You can use `--loglevel=warn` to silence analysis-related messages and only display progress info.

After the analysis is finished, you can extract the active URLs like this:

```
cat ./*.results/active_urls.json | sort | uniq
```

## Flags

<!--START_FLAGS-->
--help (Boolean): Show the help text and quit

--version (Boolean): Show the package version and quit

--license (Boolean): Show the license and quit

--debug (Boolean): Die when an emulation error occurs, even in "batch mode"

--loglevel (String): Logging level (debug, verbose, info, warning, error - default "info"

--threads (Number): When running in batch mode, how many analyses to run at the same time (0 = unlimited, default: as many as the number of CPU cores)

--download (Boolean): Actually download the payloads

--encoding (String): Encoding of the input sample (will be automatically detected by default)

--timeout (Number): The script will timeout after this many seconds (default 10)

--output-dir (String): The location on disk to write the results files and folders to (defaults to the current directory)

--preprocess (Boolean): Preprocess the original source code (makes reverse engineering easier, but takes a few seconds)

--unsafe-preprocess (Boolean): More aggressive preprocessing. Often results in better code, but can break on some edge cases (eg. redefining prototypes)

--no-kill (Boolean): Do not kill the application when runtime errors occur

--no-echo (Boolean): When the script prints data, do not print it to the console

--no-rewrite (Boolean): Do not rewrite the source code at all, other than for `@cc_on` support

--no-catch-rewrite (Boolean): Do not rewrite try..catch clauses to make the exception global-scoped

--no-cc_on-rewrite (Boolean): Do not rewrite `/*@cc_on <...>@*/` to `<...>`

--no-eval-rewrite (Boolean): Do not rewrite `eval` so that its argument is rewritten

--no-file-exists (Boolean): Return `false` for Scripting.FileSystemObject.FileExists(x)

--no-folder-exists (Boolean): Return `false` for Scripting.FileSystemObject.FileExists(x)

--function-rewrite (Boolean): Rewrite function calls in order to catch eval calls

--no-rewrite-prototype (Boolean): Do not rewrite expressions like `function A.prototype.B()` as `A.prototype.B = function()`

--no-hoist-prototype (Boolean): Do not hoist expressions like `function A.prototype.B()` (implied by no-rewrite-prototype)

--no-shell-error (Boolean): Do not throw a fake error when executing `WScriptShell.Run` (it throws a fake error by default to pretend that the distribution sites are down, so that the script will attempt to poll every site)

--no-typeof-rewrite (Boolean): Do not rewrite `typeof` (e.g. `typeof ActiveXObject`, which must return 'unknown' in the JScript standard and not 'object')

--proxy (String): [experimental] Use the specified proxy for downloads. This is not relevant if the --download flag is not present.

--windows-xp (Boolean): Emulate Windows XP (influences the value of environment variables)

--dangerous-vm (Boolean): Use the `vm` module, rather than `vm2`. This sandbox can be broken, so **don't use this** unless you're 100% sure of what you're doing. Helps with debugging by giving correct stack traces.
<!--END_FLAGS-->

# Analyzing the output

## Console output

The first source of information is the console output. On a succesful analysis, it will typically print something like this:

```
Using a 10 seconds timeout, pass --timeout to specify another timeout in seconds
Analyzing sample.js
Header set for http://foo.bar/baz: User-Agent Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)
Emulating a GET request to http://foo.bar/baz
Downloaded 301054 bytes.
Saved sample.js.results/a0af1253-597c-4eed-9e8f-5b633ff5f66a (301054 bytes)
sample.js.results/a0af1253-597c-4eed-9e8f-5b633ff5f66a has been detected as data.
Saved sample.js.results/f8df7228-7e0a-4241-9dae-c4e1664dc5d8 (303128 bytes)
sample.js.results/f8df7228-7e0a-4241-9dae-c4e1664dc5d8 has been detected as PE32 executable (GUI) Intel 80386, for MS Windows.
http://foo.bar/baz is an active URL.
Executing sample.js.results/d241e130-346f-4c0c-a698-f925dbd68f0c in the WScript shell
Header set for http://somethingelse.com/: User-Agent Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)
Emulating a GET request to http://somethingelse.com/
...
```

In this case, we are seeing a dropper that downloads a file from `http://foo.bar/baz`, setting the HTTP header `User-Agent` to `Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)`. Then, it proceeds to decode it, and write the result to disk (a PE32 executable). Finally, it runs some command in the Windows shell.

 * `sample.js.results/a0af1253-597c-4eed-9e8f-5b633ff5f66a` will contain the payload as it was downloaded from http://foo.bar/baz;
 * `sample.js.results/f8df7228-7e0a-4241-9dae-c4e1664dc5d8` will contain the actual payload (PE executable);
 * `sample.js.results/d241e130-346f-4c0c-a698-f925dbd68f0c` will contain the command that was run in the Windows shell.

## JSON logs

Every HTTP request is both printed on the terminal and logged in `urls.json`. Duplicate URLs aren't inserted (i.e. requesting the same URL twice will result in only one line in `urls.json`).

`active_urls.json` contains the list of URLs that eventually resulted in an executable payload. This file is the most interesting, if you're looking to take down distribution sites.

`snippets.json` contains every piece of code that `box-js` came across, either JavaScript, a cmd.exe command or a PowerShell script.

`resources.json` contains every file written to disk by the sample. For instance, if the application tried to save `Hello world!` to `$PATH/foo.txt`, the content of `resources.json` would be:

```json
{
	"9a24...": {
		"path": "(path)\\foo.txt",
		"type": "ASCII text, with no line terminators",
		"md5": "86fb269d190d2c85f6e0468ceca42a20",
		"sha1": "d3486ae9136e7856bc42212385ea797094475802",
		"sha256": "c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a"
	}
}
```

The `resources.json` file is also important: watch out for any executable resource (eg. with `"type": "PE32 executable (GUI) Intel 80386, for MS Windows"`).

# Patching

Some scripts in the wild have been observed to use `new Date().getYear()` where `new Date().getFullYear()`. If a sample isn't showing any suspicious behaviour, watch out for `Date` checks.

--------

If you run into .JSE files, compile the decoder and run it like this:

```bash
cc decoder.c -o decoder
./decoder foo.jse bar.js
node run bar.js
```

## Expanding

You may occasionally run into unsupported components. In this case, you can file an issue on GitHub, or emulate the component yourself if you know JavaScript.

The error will typically look like this (line numbers may be different):

```
1 Jan 00:00:00 - Unknown ActiveXObject WinHttp.WinHttpRequest.5.1
Trace
    at kill (/home/CapacitorSet/box-js/run.js:24:10)
    at Proxy.ActiveXObject (/home/CapacitorSet/box-js/run.js:75:4)
    at evalmachine.<anonymous>:1:6471
    at ContextifyScript.Script.runInNewContext (vm.js:18:15)
    at ...
```

You can see that the exception was raised in `Proxy.ActiveXObject`, which looks like this:

```
function ActiveXObject(name) {
	name = name.toLowerCase();
	/* ... */
	switch (name) {
		case "wscript.shell":
			return require("./emulator/WScriptShell");
		/* ... */
		default:
			kill(`Unknown ActiveXObject ${name}`);
			break;
	}
}
```

Add a new `case "winhttp.winhttprequest.5.1"` (note the lowercase!), and have it return an ES6 `Proxy` object (eg. `ProxiedWinHttpRequest`). This is used to catch unimplemented features as soon as they're requested by the malicious sample:

```
/* emulator/WinHttpRequest.exe */
const lib = require("../lib");

module.exports = function ProxiedWinHttpRequest() {
	return new Proxy(new WinHttpRequest(), {
		get: function(target, name, receiver) {
			switch (name) {
				/* Add here "special" traps with case statements */
				default:
					if (name in target) return target[name];
					else lib.kill(`WinHttpRequest.${name} not implemented!`)
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

# Contributors

@CapacitorSet: Main developer

@daviesjamie:

 * npm packaging
 * command-line help
 * `--output-directory`
 * bugfixes

@ALange:

 * support for non-UTF8 encodings
 * bug reporting

@alexlamsl, @kzc

 * advice on integrating UglifyJS in box-js
 * improving the features of UglifyJS used in deobfuscation

@psrok:

 * bugfixes