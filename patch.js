/* Patches from box-js */
	window = this;

	Date.prototype.getYear = function() {
		return new Date().getFullYear();
	};

	Array.prototype.Count = function() {
		return this.length;
	};

	function Error(message, description) {
		const e = new Error(message);
		e.description = description;
		return e;
	}

	_OriginalFunction = Function;
	Function = function(...args) {
		const originalSource = args.pop();
		/* Wrap the original source in an IIFE so that uglify-js doesn't
		 * complain about return statements outside of a function
		 */
		const IIFE = `(() => {${originalSource}})()`;
		const source = "/* IIFE added by box-js, see patch.js */ return " + rewrite(IIFE);
		logJS(source);
		return new _OriginalFunction(...args, source);
	}
/* End patches */