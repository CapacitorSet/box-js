box.js
======

An utility to analyze malicious JavaScript.

To execute it, put your sample file in `sample.js`, and run `node run`.

`snippets.json` contains the fragments of code that were executed; `urls.json`, the URLs requested; `resources.json`, the ADODB streams.

To clear the results, `rm [0-f]* resources.json snippets.json urls.json`.
