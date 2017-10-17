const fs = require("fs");
const path = require("path");
const commandLineArgs = require("command-line-args");
const pluralize = require("pluralize");

const flags = JSON.parse(fs.readFileSync(path.join(__dirname, "flags.json"), "utf8"));

function isFlag(argument) {
	// e.g., --test and -t should match
	return /^(--|-)\w*$/.test(argument);
}

function throwIfUnknownFlag(unknownArguments) {
	const flags = unknownArguments ? unknownArguments.filter(isFlag) : [];

	if (flags.length) {
		throw new Error(`Unknown ${pluralize("argument", flags.length)}: ${flags}`);
	}
}

function getArgs(flags) {
	flags = flags.map((flag) => {
		if (flag.type === "String") flag.type = String;
		if (flag.type === "Number") flag.type = Number;
		if (flag.type === "Boolean") flag.type = Boolean;
		return flag;
	});
	const argv = commandLineArgs(flags, {
		partial: true,
	});

	throwIfUnknownFlag(argv._unknown);

	if (!argv.loglevel) argv.loglevel = "info"; // The default value handling in the library is buggy
	if (argv.loglevel === "verbose") argv.loglevel = "verb";
	if (argv.loglevel === "warning") argv.loglevel = "warn";

	return argv;
}

module.exports = {
	flags,

	run: getArgs(flags.run),
	export: getArgs(flags.export),
};
