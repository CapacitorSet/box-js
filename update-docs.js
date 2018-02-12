const fs = require("fs");
const columnify = require("columnify");
const flags = JSON.parse(fs.readFileSync("flags.json", "utf8"));
const text = columnify(
	require("./argv.js").flags.run.map((flag) => ({
		name: (flag.alias ? `-${flag.alias}, ` : "") + `--${flag.name}`,
		description: flag.description,
	})),
	{
		config: {
			description: {
				maxWidth: 80,
			},
		},
	}
).split("\n").map(line => "    " + line).join("\n");
const README = fs.readFileSync("README.md", "utf8");
fs.writeFileSync(
	"README.md",
	README.replace(/<!--START_FLAGS-->(?:.|\r|\n)+<!--END_FLAGS-->/m, `<!--START_FLAGS-->\n${text}\n<!--END_FLAGS-->`)
);