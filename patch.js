// Various transparent patches, that don't pollute the global namespace.

// Patches window
window = new Proxy(
	{},
	{
		get: function(target, name) {
			return (function(){return this})()[name]
		}
	}
);