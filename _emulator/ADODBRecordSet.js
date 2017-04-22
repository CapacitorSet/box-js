const controller = require("../_controller");

// http://stackoverflow.com/a/30410454
function nthOfGenerator(generator, n) {
	let i = 0;

	if (n < 0) throw new Error("Invalid index");

	for (const value of generator)
		if (i++ === n) return value;

	throw new Error(`Generator has fewer than ${n} elements`);
}

/* Because Proxies can't change their targets (i.e. you can't
 * do `target = new Buffer(...)`), this wrapper is needed.
 */
function RewritableTarget(target) {
	this.value = target;
	this.get = (prop) => this.value[prop];
	this.set = (prop, val) => (this.value[prop] = val);
	this.rewrite = (val) => (this.target = val);
}

function ProxiedField(field, updateFn) {
	return new Proxy(
		new RewritableTarget(field),
		{
			get: function(target, name) {
				name = name.toLowerCase();
				switch (name) {
					case "appendchunk":
						return (chunk) => {
							target.value = Buffer.concat([
								target.value,
								Buffer.from(chunk),
							]);
							updateFn(target.value);
						};
					case "getchunk":
						return (length) => target.value.toString("utf8", 0, length);
					default:
						if (name in target.value) return target.value[name];
						if (name in target) return target[name];
						controller.kill(`ProxiedField.${name} not implemented!`);
				}
			},
		}
	);
}

function ADODBRecordSet() {
	this.addnew = this.close = this.open = this.update = () => {};

	// Contains the data contained in the fields. That's for internal use.
	this._fields = new Map();
	// Also for internal use. Used with movefirst, etc.
	this._currentRecordName = "";
	this._index = 0;
	this._goToRecord = () => (this._currentRecordName = nthOfGenerator(this._fields.keys(), this._index));

	this.movefirst = () => {
		this._index = 0;
		this._goToRecord();
	};
	this.movelast = () => {
		this._index = this._fields.size() - 1;
		this._goToRecord();
	};
	this.movenext = () => {
		this._index++;
		this._goToRecord();
	};
	this.moveprevious = () => {
		this._index--;
		this._goToRecord();
	};

	this.fields = new Proxy(
		(argument) => new ProxiedField(
			this._fields.get(argument),
			(newVal) => this._fields.set(argument, newVal)
		),
		{
			get: (target, name) => {
				name = name.toLowerCase();
				switch (name) {
					case "append":
						return (name, type, definedSize, attrib, fieldValue = "") => {
							if (Number(type) !== 204) {
								console.log(`Warning: unknown datatype ${type} in ADODBRecordSet`);
							}
							this._fields.set(name, Buffer.from(fieldValue));
						};
					case "fields":
						return (key) => new Proxy(target[key], {
							get: function(target, name) {
								switch (name) {
									default:
										if (!(name in target)) {
											controller.kill(`ADODBRecordSet.Fields.${name} not implemented!`);
										}
										return target[name];
								}
							},
						});
					default:
						if (!(name in target)) {
							controller.kill(`ADODBRecordSet.Fields.${name} not implemented!`);
						}
						return target[name];
				}
			},
			set: function(a, b, c) {
				b = b.toLowerCase();
				a[b] = c;
				return true;
			},
		}
	);
}

module.exports = function() {
	this._instance = new ADODBRecordSet();
	return new Proxy((data) => this._instance.fields(data), {
		get: (target, name) => {
			name = name.toLowerCase();
			switch (name) {
				default:
					if (name in target) return target[name];
					if (name in this._instance) return this._instance[name];
					controller.kill(`ADODBRecordSet.${name} not implemented!`);
			}
		},
		set: function(a, b, c) {
			b = b.toLowerCase();
			a[b] = c;
			return true;
		},
	});
};