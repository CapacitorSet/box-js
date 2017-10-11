/* Patches from box-js */
	window = this;

	_globalTimeOffset = 0;
	WScript.sleep = function(delay) {
		_globalTimeOffset += delay;
	}

	let fullYearGetter = Date.prototype.getFullYear;
	Date.prototype.getFullYear = function() {
		console.log("Warning: the script tried to read the current date.");
		console.log("If it doesn't work correctly (eg. fails to decrypt a string,");
		console.log("try editing patch.js with a different year.");

		// return 2017;
		return fullYearGetter.call(this);
	};
	Date.prototype.getYear = function() {
		return this.getFullYear();
	};
	Date.prototype.toString = function() {
		// Example format: Thu Aug 24 18:17:18 UTC+0200 2017
		const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][this.getDay()];
		const monName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][this.getMonth()];
		return [
			dayName, monName, this.getUTCDay(),
			this.getUTCHours() + ":" + this.getUTCMinutes() + ":" + this.getUTCSeconds(),
			"UTC-0500", // New York timezone
			this.getFullYear()
		].join(" ");
	}
	const legacyDate = Date;
	Date = function() {
		return new Proxy({
			_actualTime: new legacyDate(...arguments),
		}, {
			get: (target, prop) => {
				const modifiedDate = new legacyDate(target._actualTime.getTime() + _globalTimeOffset);
				if (prop === Symbol.toPrimitive) return hint => {
					switch (hint) {
						case "string":
						case "default":
							return modifiedDate.toString();
						case "number":
							return modifiedDate.getTime();
						default:
							throw new Error("Unknown hint!");
					}
				}
				if (typeof prop !== "symbol") {
					if (!(prop in modifiedDate) && (prop in legacyDate)) return legacyDate[prop];
					if (!(prop in legacyDate.prototype)) return undefined;                
				}
				const boundFn = modifiedDate[prop].bind(modifiedDate);
				return function() {
					const ret = boundFn.apply(null, arguments);
					target._actualTime = new legacyDate(modifiedDate.getTime() - _globalTimeOffset);
					return ret;
				}
			}
		});
	}
	Date.now = () => legacyDate.now() + _globalTimeOffset;
	Date.length = 7;
	Date.parse = legacyDate.parse;
	Date.UTC = legacyDate.UTC;

	Array.prototype.Count = function() {
		return this.length;
	};

	let _OriginalFunction = Function;
	Function = function(...args) {
		let originalSource = args.pop();
		let source;
		if (typeof originalSource === "function") {
			originalSource = originalSource.toString();
			source = rewrite("(" + originalSource + ")");
		} else if (typeof originalSource === "string") {
			source = `/* Function arguments: ${JSON.stringify(args)} */\n` + rewrite(originalSource);
		} else {
			// What the fuck JS
			// For some reason, IIFEs result in a call to Function.
			return new _OriginalFunction(...args, source);
		}
		logJS(source);
		return new _OriginalFunction(...args, source);
	}
/* End patches */
