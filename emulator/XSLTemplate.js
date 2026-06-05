const lib = require("../lib");
const argv = require("../argv.js").run;

function XSLTemplate() {
    this.createprocessor = function() {
	return {
	    transform: function() {},
	};
    };
}

module.exports = lib.proxify(XSLTemplate, "XSLTemplate");
