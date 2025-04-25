import * as webpack from "webpack";
import * as express from "express";
import * as path from "path";
import * as http from "http";
import * as url from "url";
import * as cors from "cors";
import * as mime from "mime";
import * as fsExtra from "fs-extra";
import * as nativeFs from "fs";
import * as serveStatic from "serve-static";
import * as chalk from "chalk";
import * as cliArgs from "command-line-args";
import Debug from "debug";
import {
  getOrganizationUidOrDefaultOrSelect,
  NO_DEFAULT_ORGANIZATION_OPTION,
  ORGANIZATION_UID_OPTION,
} from "@signageos/cli/dist/Organization/organizationFacade";
import { createDevelopment } from "@signageos/sdk";
import { CommandLineOptions } from "@signageos/cli/dist/Command/commandDefinition";
import { AppletServer } from "@signageos/sdk/dist/Development/Applet/Serve/AppletServer";
import { Development } from "@signageos/sdk/dist/Development/Development";
const debug = Debug("@signageos/webpack-plugin:index");

type FileSystem = typeof nativeFs;
type OutputFileSystem = webpack.Compiler["outputFileSystem"];

interface IAppletOptions {
  appletUid: string;
  appletVersion: string;
}

export interface IWebpackOptions {
  /**
   * Emulator port.
   * @default 8090
   */
  port?: number;
  /**
   * @default http://localhost:8090
   */
  publicUrl?: string;
  /**
   * Custom applet server port.
   * @default 8091
   */
  appletPort?: number;
  /**
   * Public url of local machine applet server.
   * @default http://localhost:8091
   */
  appletPublicUrl?: string;
}

function getCompilationFileSystem(possibleFs: OutputFileSystem) {
  let fileSystem = possibleFs as unknown as FileSystem;
  if (!("createReadStream" in fileSystem)) {
    // TODO uncomment this warning when webpack-dev-server is fixed for device connected builds (currently webpack --watch is supported)
    /*console.warn(
			'The environment is running in not standard mode. '
			+ 'Try to use `npm start` or `webpack-dev-server` instead. '
			+ 'The real FS will be used as failover.',
		);*/
    fileSystem = nativeFs;
  }
  return fileSystem;
}

const DEFAULT_WEBPACK_OPTIONS: IWebpackOptions = {
  port: 8090,
  appletPort: 8091,
};
export default class Plugin {
  constructor(private options: IWebpackOptions = {}) {
    this.options = { ...DEFAULT_WEBPACK_OPTIONS, ...this.options };
  }

  public apply(compiler: webpack.Compiler) {
    console.log("SOS Plugin started");

    const appletPath = compiler.context;

    let organizationUid: string | undefined;
    let emulator: IEmulator | undefined;
    let server: AppletServer | undefined;
    let appletOptions: IAppletOptions | undefined;
    let dev: Development | undefined;

    compiler.hooks.watchRun.tapPromise(
      "SignageOSPlugin",
      async (_compiler: webpack.Compiler) => {
        if (!organizationUid) {
          organizationUid = await getCurrentOrganizationUid();
        }
        if (!dev) {
          dev = createDevelopment({
            organizationUid,
          });
        }

        if (!appletOptions) {
          try {
            appletOptions =
              await dev.applet.identification.getAppletUidAndVersion(
                appletPath,
              );
          } catch (e) {
            console.warn(
              chalk.yellow(
                "Applet is not uploaded yet. It cannot be developed on real device.",
              ),
            );
          }
        }

        if (!emulator) {
          emulator = await createEmulator(
            this.options,
            appletOptions,
            organizationUid,
            appletPath,
          );
        }
        if (!server && appletOptions) {
          server = await dev.applet.serve.serve({
            ...appletOptions,
            port: this.options.appletPort,
            publicUrl: this.options.appletPublicUrl,
          });
        }
      },
    );

    compiler.hooks.watchClose.tap("SignageOSPlugin", async () => {
      if (emulator) {
        emulator.stop();
        emulator = undefined;
      }
      if (server) {
        await server.stop();
        server = undefined;
      }
    });

    compiler.hooks.assetEmitted.tap(
      "SignageOSPlugin",
      async (filename, assetEmittedInfo) => {
        if (emulator) {
          emulator.notifyEmittedFile(filename, assetEmittedInfo);
        }
      },
    );

    compiler.hooks.done.tap("SignageOSPlugin", async (stats) => {
      if (emulator) {
        emulator.notifyDone(stats);
      }
      if (dev && appletOptions) {
        const virtualFs = getCompilationFileSystem(
          stats.compilation.compiler.outputFileSystem,
        );
        const build = await dev.applet.build.build({
          appletPath,
          ...appletOptions,
          fileSystems: [nativeFs, virtualFs],
        });
        console.info(
          `Applet ${appletOptions.appletUid} v${appletOptions.appletVersion} built into ${build.packageArchivePath}`,
        );
        debug("Applet built files", build.filePaths);
        const { deviceUids } = await dev.deviceConnect.reloadConnected();
        console.info("Connected devices reloaded", deviceUids);
      }
    });

    process.on("exit", () => {
      if (emulator) {
        emulator.stop();
        emulator = undefined;
      }
      if (server) {
        server.stop();
        server = undefined;
      }
    });
  }
}
module.exports = Plugin;
module.exports.default = Plugin;

interface IEmulator {
  notifyEmittedFile(
    filename: string,
    assetEmittedInfo: webpack.AssetEmittedInfo | Buffer,
  ): void;
  notifyDone(stats: webpack.Stats): void;
  stop(): void;
}

// Type guard to check if an object is a webpack AssetEmittedInfo
function isAssetEmittedInfo(obj: any): obj is webpack.AssetEmittedInfo {
  return obj && typeof obj === "object" && "source" in obj;
}

type WebpackAssets = {
  [filePath: string]: {
    source: Pick<webpack.Asset["source"], "buffer" | "source">;
  };
};

const APPLET_DIRECTORY_PATH = "/applet";

type IEnvVars = {
  frontAppletVersion: string;
  frontAppletBinaryFile: string;
  uid: string;
  version: string;
  binaryFilePath: string;
  organizationUid: string;
  checksum: string;
};

async function getCurrentOrganizationUid() {
  const cliOptions = cliArgs(
    [NO_DEFAULT_ORGANIZATION_OPTION, ORGANIZATION_UID_OPTION],
    { partial: true },
  ) as CommandLineOptions<
    [typeof ORGANIZATION_UID_OPTION, typeof NO_DEFAULT_ORGANIZATION_OPTION]
  >;
  const organizationUid = await getOrganizationUidOrDefaultOrSelect(cliOptions);
  if (!organizationUid) {
    throw new Error(
      `No default organization selected. Use ${chalk.green("sos organization set-default")} first.`,
    );
  }

  return organizationUid;
}

async function createEmulator(
  options: IWebpackOptions,
  appletOptions: IAppletOptions | undefined,
  organizationUid: string,
  appletPath: string,
): Promise<IEmulator | undefined> {
  try {
    const defaultPort = options.port;
    const frontDisplayPath = path.dirname(
      require.resolve("@signageos/front-display/package.json", {
        paths: [appletPath],
      }),
    );
    const frontDisplayDistPath = path.join(frontDisplayPath, "dist");

    let lastCompilationAssets: WebpackAssets = {};
    let envVars: IEnvVars = {
      uid: appletOptions?.appletUid || "__default_timing__",
      version: appletOptions?.appletVersion || "0.0.0",
      organizationUid,
      binaryFilePath: `${APPLET_DIRECTORY_PATH}/index.html`,
      checksum: "",
      frontAppletVersion: "", // has bundled front applet
      frontAppletBinaryFile: "", // has bundled front applet
    };

    const app = express();

    app.use(cors());

    app.get("/", (_req: express.Request, res: express.Response) => {
      const page = fsExtra
        .readFileSync(path.join(frontDisplayDistPath, "index.html"))
        .toString();

      const script = `
<script>
	window.__SOS_BUNDLED_APPLET = {};
	window.__SOS_BUNDLED_APPLET.binaryFile = location.origin + ${JSON.stringify(envVars.binaryFilePath)};
	window.__SOS_BUNDLED_APPLET.uid = ${JSON.stringify(envVars.uid)};
	window.__SOS_BUNDLED_APPLET.version = ${JSON.stringify(envVars.version)};
	window.__SOS_BUNDLED_APPLET.checksum = ${JSON.stringify(envVars.checksum)};
	window.__SOS_BUNDLED_APPLET.frontAppletVersion = ${JSON.stringify(envVars.frontAppletVersion)};
	window.__SOS_BUNDLED_APPLET.frontAppletBinaryFile = ${JSON.stringify(envVars.frontAppletBinaryFile)};
	window.__SOS_AUTO_VERIFICATION = {};
	window.__SOS_AUTO_VERIFICATION.organizationUid = ${JSON.stringify(envVars.organizationUid)};
</script>`;

      res.send(page.replace("</head>", `${script}</head>`));
    });
    app.use(serveStatic(frontDisplayDistPath));

    const server = http.createServer(app);
    server.listen(defaultPort, () => {
      const emulatorUrl =
        options.publicUrl ?? `http://localhost:${defaultPort}`;
      console.log(
        `Emulator is running at ${chalk.blue(chalk.bold(emulatorUrl))}`,
      );
    });

    app.use(
      APPLET_DIRECTORY_PATH,
      (req: express.Request, res: express.Response, next: () => void) => {
        const fileUrl = url.parse(req.url);
        const relativeFilePath = fileUrl.pathname
          ? fileUrl.pathname.substr(1)
          : "";

        if (relativeFilePath === "index.html") {
          if (typeof lastCompilationAssets[relativeFilePath] === "undefined") {
            res.status(404).send();
          } else {
            // Propagate Hot reload of whole emulator
            const prependFileContent =
              "<script>window.onbeforeunload = function () { window.parent.location.reload(); }</script>";
            res.setHeader("Content-Type", "text/html");
            const page = lastCompilationAssets[relativeFilePath].source
              .source()
              ?.toString();
            res.send(page.replace("</head>", `${prependFileContent}</head>`));
          }
        } else if (
          typeof lastCompilationAssets[relativeFilePath] !== "undefined"
        ) {
          const contentType =
            mime.getType(relativeFilePath) || "application/octet-stream";
          res.setHeader("Content-Type", contentType);
          res.send(lastCompilationAssets[relativeFilePath].source.buffer());
        } else {
          next();
        }
      },
    );

    return {
      notifyEmittedFile(
        filename: string,
        assetEmittedInfo: webpack.AssetEmittedInfo | Buffer,
      ) {
        try {
          console.log("SOS Applet compilation done");

          if (assetEmittedInfo instanceof Buffer) {
            // Back compatibility for Webpack 4 and less.
            // It's returning Buffer of the emitted asset directly
            lastCompilationAssets[filename] = {
              source: {
                source: () => assetEmittedInfo,
                buffer: () => assetEmittedInfo,
              },
            };
          } else if (isAssetEmittedInfo(assetEmittedInfo)) {
            // For Webpack 5+, use the type guard to safely access the source property
            lastCompilationAssets[filename] = {
              source: assetEmittedInfo.source as Pick<
                webpack.Asset["source"],
                "buffer" | "source"
              >,
            };
          }
        } catch (error) {
          console.error(error);
          process.exit(1);
        }
      },
      notifyDone(stats: webpack.Stats) {
        envVars.checksum = stats.compilation.hash!;
        debug("process.env", envVars);

        if (typeof stats.compilation.assets["index.html"] === "undefined") {
          console.warn(
            `Applet has to have ${chalk.green("index.html")} in output files.`,
          );
          return;
        }
      },
      stop() {
        server.close();
      },
    };
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
