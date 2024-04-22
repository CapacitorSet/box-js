const lib = require("../lib");

module.exports = class Enumerator {
    constructor(array) {
	this.array = array;
	this.index = 0;
    }
    get length() {
	return this.array.length;
    }
    atEnd() {
	return this.index === this.array.length;
    }
    item() {
	return this.array[this.index];
    }
    moveFirst() {
	this.index = 0;
    }
    moveNext() {
	this.index++;
    }
};
