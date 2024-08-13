// Load JSON file with faked up file contents. This maps file names to
// file contents.
const fakeFileInfo = require('./FakeFileInfo.json');
const fs = require('node:fs');

// See if we can read some fake file contents.
function ReadFakeFileContents(fname) {

    // See if we can return some real file contents.
    try {
        const data = fs.readFileSync(fname, 'utf8');
        return data;
    }
    catch (err) { }

    // No real contents, try fake contents.
    return fakeFileInfo[fname];
}

exports.ReadFakeFileContents = ReadFakeFileContents;
