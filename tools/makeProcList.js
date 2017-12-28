/* run
 *
 *     gwmi -Query "SELECT * FROM Win32_Process" > a.txt
 *
 * then run this script.
 */

const fs = require("fs");
const a = fs.readFileSync("a.txt", "ucs2").replace(/\r\n/g, "\n");

const processes = a.split("\n\n");
const properties = processes.map(proc => proc.split("\n")
	.map(a => a.split(":"))
	.map(a => a.map(b => b.trim())));

const propString = properties
	.map(proc => proc.map(([a, b]) => JSON.stringify(a.toLowerCase()) + ": " + JSON.stringify(b)).join(",\n"))
	.join("},\n{");

const jsonString = "[{\n" + propString + "\n}]";

const jsonStringBeau = JSON.stringify(JSON.parse(jsonString), null, 2);
fs.writeFileSync("processes.json", jsonStringBeau);