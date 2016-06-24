// http://stackoverflow.com/a/5034657
// Adds a hook to eval
eval = (f => function() { _evalHook.apply(this, arguments); return f.apply(this, arguments); })(eval);