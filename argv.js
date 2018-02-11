const fs = require("fs");
const path = require("path");
const commandLineArgs = require("command-line-args");

// e.g., --test-foo and -t should match
const isFlag = argument => /^(--|-)[\w-]*$/.test(argument);

const transformFlag = flag => {
	if (flag.type === "String") flag.type = String;
	if (flag.type === "Number") flag.type = Number;
	if (flag.type === "Boolean") flag.type = Boolean;
	return flag;
};

const flags = JSON.parse(fs.readFileSync(path.join(__dirname, "flags.json"), "utf8"));
flags.run = flags.run.map(transformFlag);
flags.export = flags.export.map(transformFlag);

function getArgs(flags) {
	const argv = commandLineArgs(flags, {
		partial: true,
	});

	if (!argv.loglevel) argv.loglevel = "info"; // The default value handling in the library is buggy
	if (argv.loglevel === "verbose") argv.loglevel = "verb";
	if (argv.loglevel === "warning") argv.loglevel = "warn";

	return argv;
}

const allFlags = [...flags.run, ...flags.export].reduce((set, item) => {
	// Make unique
	if (!set.some(it => it.name === item.name))
		return set.concat(item);
	return set;
}, []);
const argv = commandLineArgs(allFlags, {partial: true});
if (argv._unknown != null && argv._unknown.some(isFlag)) {
	throw new Error(`Unknown arguments: ${unknownArguments.filter(isFlag)}`);
}

module.exports = {
	flags,

	run: getArgs(flags.run),
	export: getArgs(flags.export),
};
