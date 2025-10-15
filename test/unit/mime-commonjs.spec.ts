import { strict as assert } from 'assert';

describe('mime library CommonJS compatibility', () => {
	it('should be able to import mime using CommonJS require', () => {
		// This test ensures that the mime library is CommonJS compatible
		// Version 4.x of mime is ESM-only and would fail this test
		const mime = require('mime');

		assert.ok(mime, 'mime should be importable via require()');
		assert.strictEqual(typeof mime.getType, 'function', 'mime.getType should be a function');
	});

	it('should be able to import mime using ES6 import', async () => {
		// Test ES6 import compatibility
		const mime = await import('mime');

		assert.ok(mime, 'mime should be importable via ES6 import');
		assert.strictEqual(typeof mime.default.getType, 'function', 'mime.default.getType should be a function');
	});

	it('should correctly detect MIME types', () => {
		const mime = require('mime');

		// Test some common MIME type detections
		assert.strictEqual(mime.getType('file.html'), 'text/html');
		assert.strictEqual(mime.getType('file.js'), 'application/javascript');
		assert.strictEqual(mime.getType('file.json'), 'application/json');
		assert.strictEqual(mime.getType('file.css'), 'text/css');
		assert.strictEqual(mime.getType('file.png'), 'image/png');
	});

	it('should be on version 3.x (not 4.x which is ESM-only)', () => {
		const packageJson = require('mime/package.json');
		const version = packageJson.version;

		assert.ok(version, 'mime should have a version');
		assert.ok(version.startsWith('3.'), `mime version should be 3.x, but got ${version}`);
	});
});
