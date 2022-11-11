const lib = require("../lib");

// WARNING: Only handles a single global task object.
TaskFolderObject = {
    _tasks: {},
    GetTask: function(name) {
        lib.info('The sample looked for scheduled task "' + name + '".');
        if (typeof(this._tasks[name]) == "undefined") throw "task not found";
        return this._tasks[name];
    },

    RegisterTaskDefinition: function(name, taskObj) {
        lib.info('The sample registered task "' + name + '".');
        this._tasks[name] = taskObj;
    },
};

class TaskTriggerObject {

    constructor() {
    };

    set ID(v) {
        lib.info('The sample set a task trigger ID to "' + v + '".');
        this.id = v;
    };

    set UserId(v) {
        lib.info('The sample set a task user ID to "' + v + '".');
        this.userId = v;
    };    
};

class TaskObject {

    constructor() {
        this.settings = {};
        this.triggers = {
            Create: function() {
                return new TaskTriggerObject();
            },
        };
        this.Actions = {
            Create: function() {
                return new TaskObject();
            },
        };        
    };

    set Path(v) {
        lib.info('The sample set task path to "' + v + '".');
        this.path = v;
    };

    set Arguments(v) {
        lib.info('The sample set task arguments to "' + v + '".');
        this.args = v;
    };

    set WorkingDirectory(v) {
        lib.info('The sample set task working directory to "' + v + '".');
        this.workingDir = v;
    };

    RunEx() {
        lib.info('The sample ran a scheduled task.');
    };
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
    };

    this.newtask = () => {
        return new TaskObject();
    };
}

module.exports = lib.proxify(ScheduleService, "Schedule.Service");
