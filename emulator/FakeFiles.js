// Load JSON file with faked up file contents. This maps file names to
// file contents.
const fakeFileInfo = require('./FakeFileInfo.json');

// See if we can read some fake file contents.
function ReadFakeFileContents(fname) {
    return fakeFileInfo[fname];
}

exports.ReadFakeFileContents = ReadFakeFileContents;
