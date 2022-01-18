import * as webpack from 'webpack';
import * as express from 'express';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import * as cors from 'cors';
import * as mime from 'mime';
import * as fsExtra from 'fs-extra';
import * as nativeFs from "fs";
import * as serveStatic from 'serve-static';
import * as chalk from 'chalk';
import Debug from 'debug';
import {  loadConfig } from '@signageos/sdk/dist/SosHelper/sosControlHelper';
import {
	createAllAppletZips,
	reloadConnectedDevices,
} from './ConnectControl/helper';
const createDomain = require('webpack-dev-server/lib/utils/createDomain');
const debug = Debug('@signageos/webpack-plugin:index');

type FileSystem = typeof nativeFs;

export interface IWebpackOptions {
	https?: boolean; // default false
	port?: number; // default 8090
	public?: string; // default undefined
	useLocalIp?: boolean; // default true
	host?: string; // default undefined
}

function getCompilationFileSystem(possibleFs: webpack.OutputFileSystem) {
	let fileSystem = possibleFs as unknown as FileSystem;
	if (!('createReadStream' in fileSystem)) {
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

export default class Plugin {

	constructor(
		private options: IWebpackOptions = {},
	) {
		this.options = { ...{ useLocalIp: true, port: 8090 }, ...this.options };
	}

	public apply(compiler: webpack.Compiler) {
		console.log('SOS Plugin started');

		let emulator: IEmulator | undefined;

		compiler.plugin("watch-run", async (_compiler: webpack.Compiler, callback: () => void) => {
			if (!emulator) {
				emulator = await createEmulator(this.options);
			}
			callback();
		});

		compiler.plugin("watch-close", async () => {
			if (emulator) {
				emulator.stop();
				emulator = undefined;
			}
		});

		compiler.plugin('done', async (stats: webpack.Stats) => {
			if (emulator) {
				emulator.notifyDone(stats);
				await createAllAppletZips(getCompilationFileSystem(stats.compilation.compiler.outputFileSystem));
				reloadConnectedDevices();
			}
		});

		process.on('exit', () => {
			if (emulator) {
				emulator.stop();
				emulator = undefined;
			}
		});
	}
}
module.exports = Plugin;
module.exports.default = Plugin;

interface IEmulator {
	notifyDone(stats: webpack.Stats): void;
	stop(): void;
}

type WebpackAssets = {
	[filePath: string]: {
		existsAt: string;
		source(): string;
	};
};

type WebpackCompilation = webpack.compilation.Compilation & {
	compiler: webpack.Compiler & { outputFileSystem: typeof fsExtra };
};

const APPLET_DIRECTORY_PATH = '/applet';

type IEnvVars = {
	frontAppletVersion: string;
	frontAppletBinaryFile: string;
	uid: string;
	version: string;
	binaryFilePath: string;
	organizationUid: string;
	checksum: string;
};

async function createEmulator(options: IWebpackOptions): Promise<IEmulator | undefined> {
	try {
		const projectPath = process.cwd();

		const defaultPort = options.port;
		const frontDisplayPath = path.dirname(require.resolve('@signageos/front-display/package.json', { paths: [projectPath]}));
		const frontDisplayDistPath = path.join(frontDisplayPath, 'dist');

		const packagePath = path.join(projectPath, 'package.json');
		const packageConfig = fsExtra.pathExistsSync(packagePath)
			? JSON.parse(fsExtra.readFileSync(packagePath).toString())
			: { version: '0.0.0' };

		const sosGlobalConfig = await loadConfig();
		const organizationUid = sosGlobalConfig.defaultOrganizationUid;

		if (!organizationUid) {
			throw new Error(`No default organization selected. Use ${chalk.green('sos organization set-default')} first.`);
		}

		let currentCompilation: WebpackCompilation;
		let lastCompilationAssets: WebpackAssets = {};
		let envVars: IEnvVars = {
			uid: packageConfig.sos?.appletUid || '__default_timing__',
			version: packageConfig.version,
			organizationUid,
			binaryFilePath: `${APPLET_DIRECTORY_PATH}/index.html`,
			checksum: '',
			frontAppletVersion: '', // has bundled front applet
			frontAppletBinaryFile: '', // has bundled front applet
		};

		const app = express();

		app.use(cors());

		app.get('/display.appcache', (_req: express.Request, res: express.Response) => {
			const currentDate = new Date();
			res.header('Last-Modified', currentDate.toString());
			res.header('Content-type', 'text/cache-manifest; charset=UTF-8');
			res.send(`CACHE MANIFEST\n# v1 - ${currentDate.toISOString()}\n/tmp\nNETWORK:\n*\n`);
		});
		app.get('/', (_req: express.Request, res: express.Response) => {
			res.send(
				`<script>
					window.__SOS_BUNDLED_APPLET = {};
					window.__SOS_BUNDLED_APPLET.binaryFile = location.origin + ${JSON.stringify(envVars.binaryFilePath)};
					window.__SOS_BUNDLED_APPLET.uid = ${JSON.stringify(envVars.uid)};
					window.__SOS_BUNDLED_APPLET.version = ${JSON.stringify(envVars.version)};
					window.__SOS_BUNDLED_APPLET.checksum = ${JSON.stringify(envVars.checksum)};
					window.__SOS_BUNDLED_APPLET.frontAppletVersion = ${JSON.stringify(envVars.frontAppletVersion)};
					window.__SOS_BUNDLED_APPLET.frontAppletBinaryFile = ${JSON.stringify(envVars.frontAppletBinaryFile)};
					window.__SOS_AUTO_VERIFICATION = {};
					window.__SOS_AUTO_VERIFICATION.organizationUid = ${JSON.stringify(envVars.organizationUid)};
				</script>`
				+ fsExtra.readFileSync(path.join(frontDisplayDistPath, 'index.html')).toString(),
			);
		});
		app.use(serveStatic(frontDisplayDistPath));

		const server = http.createServer(app);
		server.listen(defaultPort, () => {
			console.log(`Emulator is running at ${chalk.blue(chalk.bold(createDomain(options, server)))}`);
		});

		app.use(APPLET_DIRECTORY_PATH, (req: express.Request, res: express.Response, next: () => void) => {
			const fileUrl = url.parse(req.url);
			const relativeFilePath = fileUrl.pathname ? fileUrl.pathname.substr(1) : '';

			if (!currentCompilation) {
				res.status(502).send(
					'<span style="background-color: darkred;">Webpack is starting up. Please wait a second & try it again.</span>',
				);
				return;
			}

			const fileSystem = getCompilationFileSystem(currentCompilation.compiler.outputFileSystem);

			if (relativeFilePath === 'index.html') {
				if (typeof lastCompilationAssets[relativeFilePath] === 'undefined') {
					res.status(404).send();
				} else {
					// Propagate Hot reload of whole emulator
					const prependFileContent = '<script>window.onunload = function () { window.parent.location.reload(); }</script>';
					res.setHeader('Content-Type', 'text/html');
					res.send(prependFileContent + lastCompilationAssets[relativeFilePath].source());
				}
			} else
			if (typeof lastCompilationAssets[relativeFilePath] !== 'undefined') {
				const compiledFilePath = lastCompilationAssets[relativeFilePath].existsAt;
				const contentType = mime.getType(relativeFilePath) || 'application/octet-stream';
				res.setHeader('Content-Type', contentType);
				const readStream = fileSystem.createReadStream(compiledFilePath);
				readStream.pipe(res);
			} else {
				next();
			}
		});

		return {
			notifyDone(stats: webpack.Stats) {
				try {
					console.log('SOS Applet compilation done');

					envVars.checksum = stats.compilation.hash!;
					debug('process.env', envVars);

					if (typeof stats.compilation.assets['index.html'] === 'undefined') {
						console.warn(`Applet has to have ${chalk.green('index.html')} in output files.`);
						return;
					}
					currentCompilation = stats.compilation as WebpackCompilation;
					lastCompilationAssets = { ...lastCompilationAssets, ...stats.compilation.assets };
				} catch (error) {
					console.error(error);
					process.exit(1);
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
