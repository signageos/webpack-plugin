import * as os from 'os';
import * as _ from 'lodash';
import * as fsExtra from "fs-extra";
import * as nativeFs from "fs";
import * as path from 'path';
import { DevicePowerAction } from "@signageos/sdk/dist/RestApi/Device/PowerAction/IPowerAction";
import { createOrganizationRestApi } from "./apiHelper";
import * as archiver from 'archiver';

type FileSystem = typeof nativeFs;

const CONNECT_DIRECTORY = 'signageos';
const connectRuntimeDirPath = path.join(os.tmpdir(), CONNECT_DIRECTORY);
export const ignoredFiles: string[] = ["node_modules", "package-lock.json", "src", "public", ".gitignore", "README.md"];

export async function reloadConnectedDevices() {
	const connectedDeviceUids = await loadConnectedDeviceUids();
	if (connectedDeviceUids.length >= 1) {
		const resApi = await createOrganizationRestApi();
		await Promise.all(connectedDeviceUids.map(async (deviceUid: string) => {
			try {
				await resApi.device.powerAction.set(deviceUid, {
					devicePowerAction: DevicePowerAction.AppletReload,
				});
				console.log(`Successfully reloaded device ${deviceUid} `);
			} catch (error) {
				console.log("Reload Failed", error);
			}
		}));
	}
}

export async function loadConnectedDeviceUids(): Promise<string[]> {
	if (!await fsExtra.pathExists(connectRuntimeDirPath)) {
		return [];
	}
	const connectFileContent = await fsExtra.readdir(connectRuntimeDirPath);
	let connectedDeviceUids: string[] = [];
	if (connectFileContent.length >= 1) {
		for (const file of connectFileContent) {
			if ((await fsExtra.stat(path.join(connectRuntimeDirPath, file))).isDirectory()) {
				connectedDeviceUids.push(file);
			}
		}
	}
	return connectedDeviceUids;
}

export async function createAllAppletZips(outputFileSystem: FileSystem) {
	const connectedDeviceUids = await loadConnectedDeviceUids();
	const packageZipPaths = await Promise.all(connectedDeviceUids.map(async (deviceUid: string) => {
		return await createAppletZip(deviceUid, outputFileSystem);
	}));
	return packageZipPaths;
}

export async function createAppletZip(deviceUid: string, outputFileSystem: FileSystem) {
	const archive = archiver('zip');
	const deviceConnectDir = path.join(connectRuntimeDirPath, deviceUid);
	const packageZipPath = path.join(deviceConnectDir, "package.zip" + `${deviceUid}`);
	const output = fsExtra.createWriteStream(packageZipPath);
	archive.pipe(output);
	const actualDirectory = process.cwd();
	const outputFiles = await getAllFiles(actualDirectory, outputFileSystem);
	const realFiles = await getAllFiles(actualDirectory, nativeFs);
	const oldRealFiles = _.difference(realFiles, outputFiles);

	// First put all old real files from general file system to zip
	for (const fileAbsolutePath of oldRealFiles) {
		const fileRelativePath = getAppletFileRelativePath(fileAbsolutePath, actualDirectory);
		archive.append(nativeFs.createReadStream(fileAbsolutePath), { name: fileRelativePath });
	}
	// Then extend zip with files from output file system (which is usually in memory FS from webpack in memory compilation)
	for (const fileAbsolutePath of outputFiles) {
		const fileRelativePath = getAppletFileRelativePath(fileAbsolutePath, actualDirectory);
		archive.append(outputFileSystem.createReadStream(fileAbsolutePath), { name: fileRelativePath });
	}

	const promise = new Promise<void>((resolve: () => void, reject: (error: Error) => void) => {
		archive.on('end', () => resolve());
		archive.on('error', (error: Error) => reject(error));
	});
	archive.finalize();
	await promise;
	return packageZipPath;
}

export async function getAllFiles(directory: string, outputFileSystem: FileSystem) {
	let fileList: string[] = [];

	const files = outputFileSystem.readdirSync(directory);
	for (const file of files) {
		if (!ignoredFiles.includes(file)) {
			const p = path.join(directory, file);
			if (outputFileSystem.statSync(p).isDirectory()) {
				fileList = [...fileList, ...(await getAllFiles(p, outputFileSystem))];
			} else {
				fileList.push(p);
			}
		}
	}

	return fileList;
}

export function getAppletFileRelativePath(fileAbsolutePath: string, directoryAbsolutePath: string) {
	const directoryAbsolutePathNormalized = path.normalize(directoryAbsolutePath);
	const fileAbsolutePathNormalized = path.normalize(fileAbsolutePath);

	return fileAbsolutePathNormalized.substring(directoryAbsolutePathNormalized.length + 1);
}
