// Patches window
window = this;

// Patches Date
Date.prototype.getYear = function() {
	return new Date().getFullYear();
};

// Patches Error
function Error(message, description) {
	const e = new Error(message);
	e.description = description;
	return e;
}