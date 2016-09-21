const fs = require("fs");
const flags = JSON.parse(fs.readFileSync("flags.json", "utf8"));
const text = flags.map(item => item.flag + ": " + item.description).join("\n\n");
const README = fs.readFileSync("README.md", "utf8");
fs.writeFileSync(
	"README.md",
	README.replace(/<!--START_FLAGS-->(?:.|\r|\n)+<!--END_FLAGS-->/m,  `<!--START_FLAGS-->\n${text}\n<!--END_FLAGS-->`)
)