box.js
======

[![npm](https://img.shields.io/npm/v/box-js.svg)]() [![Build Status](https://travis-ci.org/CapacitorSet/box-js.svg?branch=master)](https://travis-ci.org/CapacitorSet/box-js) [![paypal](https://img.shields.io/badge/paypal-donate-yellow.svg)](https://paypal.me/capacitorset)

A utility to analyze malicious JavaScript.

# Installation

Simply install box-js from npm:

```
npm install box-js --global
```

>box-js is also available:
> - as a Cuckoo module (see the `integrations` directory and [Nwinternights/Cuckoo_Boxjs](https://github.com/Nwinternights/Cuckoo_Boxjs));
> - as a Dockerfile (see `integrations/README.md`);
> - as a package in distros for security professionals ([REMnux](https://remnux.org/), [BlackArch](https://blackarch.org/));
> - as part of open source applications ([Intel Owl](https://github.com/intelowlproject/IntelOwl));
> - as part of commercial third-party services ([any.run](https://any.run/)).

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
 * `resources.json`, the ADODB streams (i.e. the files that the script wrote to disk) with file types and hashes;
 * `IOC.json`, a list of behaviours identified as IOCs (Indicators of Compromise). These include registry accesses, written files, HTTP requests and so on.

 You can analyze these by yourself, or you can automatically submit them to Malwr, VirusTotal or a Cuckoo sandbox: for more information, run `box-export --help`.

 >For further isolation, it is recommended to run the analysis in a temporary Docker container. Consult `integrations/README.md` for more information.

 >If you wish to automate the analysis, you can use the return codes - documented in `integrations/README.md` - to distinguish between different types of errors.

## Analysis Fails Due to Missing 'document' Object or Other Objects/Functions

The box-js repository from git includes a `boilerplate.js` file. This file defines some stubbed versions of common browser objects such as document. Try rerunning your analysis with the `--prepended-code=DIR/boilerplate.js` option, where `DIR` is the directory of the cloned box-js repository or with `--prepended-code=default`. The `--prepended-code` option tells box-js to prepend the JavaScript in the given file to the sample being analyzed.

Note that you can copy boilerplate.js and add your own stubbed classes, objects, etc. as needed. Use the `--prepended-code=show-default` command line option to print the full path to the default box-js boilerplate.js file.

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
    NAME                   DESCRIPTION                                                                     
    -h, --help                 Show the help text and quit                                                     
    -v, --version              Show the package version and quit                                               
    --license                  Show the license and quit                                                       
    --debug                    Die when an emulation error occurs, even in "batch mode", and pass on the exit  
                               code.                                                                           
    --loglevel                 Logging level (debug, verbose, info, warning, error - default "info")           
    --threads                  When running in batch mode, how many analyses to run at the same time (0 =      
                               unlimited, default: as many as the number of CPU cores)                         
    --download                 Actually download the payloads                                                  
    --encoding                 Encoding of the input sample (will be automatically detected by default)        
    --timeout                  The script will timeout after this many seconds (default 10)                    
    --output-dir               The location on disk to write the results files and folders to (defaults to the 
                               current directory)                                                              
    --preprocess               Preprocess the original source code (makes reverse engineering easier, but takes
                               a few seconds)                                                                  
    --unsafe-preprocess        More aggressive preprocessing. Often results in better code, but can break on   
                               some edge cases (eg. redefining prototypes)                                     
    --prepended-code           Input file or directory containing code that should be prepended to the JS      
                               file(s) we're analyzing. If directory is given,  prepends contents of all files 
                               in the directory. If 'default' is given use the default boilerplate.js that     
                               comes with box-js. if 'show-default' is given just print path of boilerplate.js 
                               and exit (useful if you want to copy and modify default boilerplate code).      
    --fake-script-engine       The script engine to report in WScript.FullName and WScript.Name (ex.           
                               'cscript.exe', 'wscript.exe', or 'node'). Default is wscript.exe.               
    --fake-cl-args             Fake script command line arguments. In the string these should be comma         
                               separated.                                                                      
    --fake-sample-name         Fake file name to use for the sample being analyzed. Can be a full path or just 
                               the file name to use. If you have '\' in the path escape them as '\\' in this   
                               command line argument value (ex. --fake-sample-name=C:\\foo\\bar.js).           
    --fake-language            Specify the language code to return for Win32_OperatingSystem.OSLanguage.       
                               Supported values are 'spanish', 'english', and 'portuguese'.                    
    --fake-domain              Specify the user domain to return for WScript.Network.UserDomain.
    --fake-download            Fake that HTTP requests work and have them return a fake payload                
    --no-kill                  Do not kill the application when runtime errors occur                           
    --no-echo                  When the script prints data, do not print it to the console                     
    --no-rewrite               Do not rewrite the source code at all, other than for `@cc_on` support          
    --no-catch-rewrite         Do not rewrite try..catch clauses to make the exception global-scoped           
    --no-cc_on-rewrite         Do not rewrite `/*@cc_on <...>@*/` to `<...>`                                   
    --no-eval-rewrite          Do not rewrite `eval` so that its argument is rewritten                         
    --no-file-exists           Return `false` for Scripting.FileSystemObject.FileExists(x)                     
    --limit-file-checks        Switch default value for folder/file exists checks if many checks are performed 
                               (try to break infinite file check loops).                                       
    --no-folder-exists         Return `false` for Scripting.FileSystemObject.FileExists(x)                     
    --function-rewrite         Rewrite function calls in order to catch eval calls                             
    --no-rewrite-prototype     Do not rewrite expressions like `function A.prototype.B()` as `A.prototype.B =  
                               function()`                                                                     
    --no-hoist-prototype       Do not hoist expressions like `function A.prototype.B()` (implied by            
                               no-rewrite-prototype)                                                           
    --no-shell-error           Do not throw a fake error when executing `WScriptShell.Run` (it throws a fake   
                               error by default to pretend that the distribution sites are down, so that the   
                               script will attempt to poll every site)                                         
    --no-typeof-rewrite        Do not rewrite `typeof` (e.g. `typeof ActiveXObject`, which must return         
                               'unknown' in the JScript standard and not 'object')                             
    --proxy                    [experimental] Use the specified proxy for downloads. This is not relevant if   
                               the --download flag is not present.                                             
    --windows-xp               Emulate Windows XP (influences the value of environment variables)              
    --dangerous-vm             Use the `vm` module, rather than `vm2`. This sandbox can be broken, so **don't  
                               use this** unless you're 100% sure of what you're doing. Helps with debugging by
                               giving correct stack traces.                                                    
    --rewrite-loops            Rewrite some types of loops to make analysis faster                             
    --throttle-writes          Throttle reporting and data tracking of file writes that write a LOT of data    
    --throttle-commands        Stop the analysis if a LOT of the same commands have been run                   
    --extract-conditional-code Pull the actual code to analyze from JScript conditional comments (/*@if(...).  
    --loose-script-name        Rewrite == checks so that comparisons of the current script name to a hard coded
                               script name always return true.                                                 
    --real-script-name         Return the real file name of the currently analyzed script rather than a fake   
                               name.                                                                           
    --activex-as-ioc           Logs All ActiveX calls as IOC's and tries to determine if the call is obfuscated
                               in the JS source.                                                               
    --ignore-wscript-quit      Ignore calls to WSCript.Quit() and continue execution.                          
    --ignore-rewrite-errors    Analyze original sample if any sample rewrites fail.                            
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

[@CapacitorSet](https://github.com/CapacitorSet/): Original developer

[@kirk-sayre-work](https://github.com/kirk-sayre-work/): Maintainer

[@daviesjamie](https://github.com/daviesjamie/):

 * npm packaging
 * command-line help
 * `--output-directory`
 * bugfixes

[@ALange](https://github.com/ALange/):

 * support for non-UTF8 encodings
 * bug reporting

[@alexlamsl](https://github.com/alexlamsl/), [@kzc](https://github.com/kzc/)

 * advice on integrating UglifyJS in box-js
 * improving the features of UglifyJS used in deobfuscation

[@psrok](https://github.com/psrok/):

 * bugfixes

[@gaelmuller](https://github.com/gaelmuller/):

 * bugfixes
