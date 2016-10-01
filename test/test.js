/* eslint-env mocha */

const assert = require('assert');
const exec = require('child_process').exec;
const fs = require('fs');
const tmpDir = require('os').tmpdir();
const boxDir = `${__dirname}/..`;
const boxCommand = `nodejs ${boxDir}/run.js`;

describe('package.json', function() {
	const source = fs.readFileSync(`${boxDir}/package.json`, 'UTF8');
	const config = JSON.parse(source);
	it('should include a box-js executable', function() {
		assert('bin' in config);
		const bin = config.bin;
		assert('box-js' in bin);
	});
});

describe('run.js', function() {
	it('should exist', function() {
		assert.doesNotThrow(function() {
			fs.accessSync(`${boxDir}/run.js`, fs.F_OK);
		});
	});
	it('should throw an error when no files are passed', function(done) {
		exec(boxCommand, function(err) {
			assert.notStrictEqual(err, null);
			done();
		});
	});
	it('should run on a blank script', function(done) {
		const path = `${tmpDir}/blank.js`;
		fs.writeFileSync(`${tmpDir}/blank.js`, "");
		exec(`${boxCommand} ${path}`, done);
	});
	it('should run on all files in a folder');
	it('should accept several paths');
});

describe('analyze.js', function() {
});