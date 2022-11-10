const lib = require("../lib");

TaskFolderObject = {
    GetTask: function(name) {
        lib.info('The sample looked for scheduled task "' + name + '".');
        throw "task not found";
    },
};

function ScheduleService() {

    this.Language = undefined;
    this.Timeout = undefined;

    this.connect = () => {
        lib.info('The sample connected to the task scheduler.');
    };

    this.getfolder = root => {
        lib.info('The sample got a scheduled task folder object rooted at "' + root + '".');
        return TaskFolderObject;
    }
}

module.exports = lib.proxify(ScheduleService, "Schedule.Service");
