const lib = require("../lib");

function WordApplication() {

    this.documents = {
        Open : function(path) {
            lib.logIOC("Word.Application", path, "The script opened a Word document.");
            lib.logUrl('Word Document', path);
        },
    };

    this.quit = function() {};
}

module.exports = lib.proxify(WordApplication, "WordApplication");
