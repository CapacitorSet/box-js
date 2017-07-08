box.js
======

[![Build Status](https://travis-ci.org/CapacitorSet/box-js.svg?branch=master)](https://travis-ci.org/CapacitorSet/box-js) [![npm](https://img.shields.io/npm/v/box-js.svg)]()

A utility to analyze malicious JavaScript (**requires at least Node 6.0.0**).

To execute it, simply install its dependencies (`npm install`) and run

```
node run.js file1.js file2.js folder ...
```

>If you are interested in receiving the payloads, add the flag `--download`. You may also want to add a longer timeout, eg. `--timeout=30`.

>Some samples may trigger stack overflow errors. If this happens, add `--stack-size=8192` (`--stack-size` may be restricted to 1024 on Windows).

It will create a folder called `file1.js.results`; if it already exists, it will create `file1.js.1.results`, and so on. In this folder, `snippets.json` contains the fragments of code that were executed; `urls.json`, the URLs requested; `active_urls.json`, the URLs that seem to drop active malware; `resources.json`, the ADODB streams (i.e. the files that the script wrote to disk).

>If you have a batch of samples, you can extract all the URLs from the folders with `cat ./*.results/urls.json | sort | uniq` (`active_urls.json` works too).

>You can use `npm run clean` to remove the folders when you're done.

## Flags

<!--START_FLAGS-->
--help (Boolean): Show the help text and quit

--version (Boolean): Show the package version and quit

--license (Boolean): Show the license and quit

--debug (Boolean): Die when an emulation error occurs, even in "batch mode"

--download (Boolean): Actually download the payloads

--encoding (String): Encoding of the input sample (will be automatically detected by default)

--timeout (Number): The script will timeout after this many seconds (default 10)

--output-dir (String): The location on disk to write the results files and folders to (defaults to the current directory)

--no-kill (Boolean): Do not kill the application when runtime errors occur

--no-echo (Boolean): When the script prints data, do not print it to the console

--no-rewrite (Boolean): Do not rewrite the source code at all, other than for `@cc_on` support

--no-catch-rewrite (Boolean): Do not rewrite try..catch clauses to make the exception global-scoped

--no-cc_on-rewrite (Boolean): Do not rewrite `/*@cc_on <...>@*/` to `<...>`

--no-concat-simplify (Boolean): Do not simplify `'a'+'b'` to `'ab'`

--no-eval-rewrite (Boolean): Do not rewrite `eval` so that its argument is rewritten

--no-file-exists (Boolean): Return `false` for Scripting.FileSystemObject.FileExists(x)

--no-rewrite-prototype (Boolean): Do not rewrite expressions like `function A.prototype.B()` as `A.prototype.B = function()`

--no-shell-error (Boolean): Do not throw a fake error when executing `WScriptShell.Run` (it throws a fake error by default to pretend that the distribution sites are down, so that the script will attempt to poll every site)

--no-typeof-rewrite (Boolean): Do not rewrite `typeof` (e.g. `typeof ActiveXObject`, which must return 'unknown' in the JScript standard and not 'object')

--proxy (String): [experimental] Use the specified proxy for downloads. This is not relevant if the --download flag is not present.

--windows-xp (Boolean): Emulate Windows XP (influences the value of environment variables)
<!--END_FLAGS-->

## Analyzing the output

### Console output

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

### JSON logs

Every HTTP request is both printed on the terminal and logged in `urls.json`. Duplicate URLs aren't inserted (i.e. requesting the same URL twice will result in only one line in `urls.json`).

`active_urls.json` contains the list of URLs that eventually resulted in an executable payload. This file is the most interesting, if you're looking to take down distribution sites.

`snippets.json` contains every piece of code that `box-js` came across, either executed from `eval` or `WScript.Shell.Run`.

`resources.json` contains every file that the sample tried to write to disk. For instance, if the application tried to save `Hello world!` to `$PATH/foo.txt`, the content of `resources.json` would be `{ "9a24...": "(path)\\foo.txt" }`, and the content of the file `9a24...` would be `Hello world!`. This file is also important: watch out for any .dll or .exe resource.

## Patching

Some scripts in the wild have been observed to use `new Date().getYear()` where `new Date().getFullYear()`. If a sample isn't showing any suspicious behaviour, look out for `Date` checks.

--------

If you run into .JSE files, compile the decoder and run it like this:

```bash
cc decoder.c -o decoder
./decoder foo.jse bar.js
node run bar.js
```

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

## Contributors

@CapacitorSet: Main developer

@daviesjamie:

 * npm packaging
 * command-line help
 * `--output-directory`
 * bugfixes

@ALange:

 * support for non-UTF8 encodings