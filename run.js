#!/usr/bin/env node

// Makes node-box not throw an error
function __eval_hook(arg) {
    return arg;
}

try {
    eval("(x, y) => [x, y]");
} catch (e) {
    console.log("You must use a recent version of V8 (at least Node 6.0).");
    process.exit(1);
}

require("./_run.js");
