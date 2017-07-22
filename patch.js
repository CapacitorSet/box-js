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
	Function = (...args) => {
		const source = args.pop();
		source = rewrite(source);
		logJS(source);
		_OriginalFunction(...args, source);
	}
/* End patches */