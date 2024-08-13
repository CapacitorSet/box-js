const lib = require("../lib");

module.exports = class TextStream {
    constructor(str) {
	this.str = str;
	this.pos = 0;
    }

    get AtEndOfLine() {
	lib.kill("TextStream.AtEndOfLine not implemented!");
    }
    get AtEndOfStream() {
	return this.pos === this.str.length;
    }
    get Column() {
	lib.kill("TextStream.Column not implemented!");
    }
    get Line() {
	lib.kill("TextStream.Line not implemented!");
    }

    Close() {
	lib.kill("TextStream.Close not implemented!");
    }
    Read() {
	lib.kill("TextStream.Read not implemented!");
    }
    ReadAll() {
	return this.str;
    }
    ReadLine() {
	lib.kill("TextStream.ReadLine not implemented!");
    }
    Skip() {
	lib.kill("TextStream.Skip not implemented!");
    }
    SkipLine() {
	lib.kill("TextStream.SkipLine not implemented!");
    }
    Write() {
	lib.kill("TextStream.Write not implemented!");
    }
    WriteBlankLines() {
	lib.kill("TextStream.WriteBlankLines not implemented!");
    }
    WriteLine() {
	lib.kill("TextStream.WriteLine not implemented!");
    }

}
