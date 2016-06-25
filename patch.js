// Various transparent patches, that don't pollute the global namespace.

// Patches window
window = new Proxy(
	{},
	{
		get: function(target, name) {
			return (function(){return this})()[name]
		}
	}
)

// http://stackoverflow.com/a/5034657
// Adds a hook to eval
eval = (f => function() {
	_evalHook.apply(this, arguments);
	return f.apply(this, arguments);
})(eval);