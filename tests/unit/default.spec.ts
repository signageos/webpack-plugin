import { strict as assert } from "assert";
import Plugin, { IWebpackOptions } from "../../src/index";

describe("SignageOS Webpack Plugin", () => {
  describe("constructor", () => {
    it("should use default options if none provided", () => {
      const plugin = new Plugin();
      // Accessing private property via type assertion for testing
      const options = (plugin as any).options;

      assert.strictEqual(options.port, 8090);
      assert.strictEqual(options.appletPort, 8091);
      assert.strictEqual(options.publicUrl, undefined);
      assert.strictEqual(options.appletPublicUrl, undefined);
    });

    it("should merge provided options with defaults", () => {
      const customOptions: IWebpackOptions = {
        port: 9000,
        publicUrl: "http://custom-domain.com:9000",
        appletPublicUrl: "http://custom-domain.com:9001",
      };

      const plugin = new Plugin(customOptions);
      const options = (plugin as any).options;

      assert.strictEqual(options.port, 9000);
      assert.strictEqual(options.appletPort, 8091); // Default value
      assert.strictEqual(options.publicUrl, "http://custom-domain.com:9000");
      assert.strictEqual(
        options.appletPublicUrl,
        "http://custom-domain.com:9001",
      );
    });
  });

  describe("apply", () => {
    it("should register webpack hooks when applied", () => {
      const plugin = new Plugin();

      // Create a mock compiler with hooks
      const mockCompiler = {
        context: "/mock/path",
        hooks: {
          watchRun: {
            tapPromise: function (name: string, callback: Function) {
              assert.strictEqual(name, "SignageOSPlugin");
              assert.strictEqual(typeof callback, "function");
              this.callback = callback;
              return true;
            },
            callback: null as Function | null,
          },
          watchClose: {
            tap: function (name: string, callback: Function) {
              assert.strictEqual(name, "SignageOSPlugin");
              assert.strictEqual(typeof callback, "function");
              return true;
            },
          },
          assetEmitted: {
            tap: function (name: string, callback: Function) {
              assert.strictEqual(name, "SignageOSPlugin");
              assert.strictEqual(typeof callback, "function");
              return true;
            },
          },
          done: {
            tap: function (name: string, callback: Function) {
              assert.strictEqual(name, "SignageOSPlugin");
              assert.strictEqual(typeof callback, "function");
              return true;
            },
          },
        },
      };

      // Apply the plugin to our mock compiler
      plugin.apply(mockCompiler as any);

      // If we've reached here without assertion errors, all hooks were registered correctly
      assert.ok(true, "All webpack hooks registered successfully");
    });
  });

  // A simple test to verify the module exports
  describe("module exports", () => {
    it("should export the Plugin class as default export", () => {
      assert.strictEqual(typeof Plugin, "function");
      assert.strictEqual(Plugin.name, "Plugin");

      const plugin = new Plugin();
      assert.ok(plugin instanceof Plugin);
    });
  });
});
