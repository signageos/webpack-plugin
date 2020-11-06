import * as os from 'os';
import * as fs from "fs-extra";
import * as path from 'path';
import { DevicePowerAction } from "@signageos/sdk/dist/RestApi/Device/PowerAction/IPowerAction";
import { createOrganizationRestApi } from "./apiHelper";

const archiver = require('archiver');
const CONNECT_DIRECTORY = 'signageos';
const connectRuntimeDirPath = path.join(os.tmpdir(), CONNECT_DIRECTORY);
export const ignoredFiles: string[] = ["node_modules", "package-lock.json", "src", "public", ".gitignore", "README.md"];

export async function reloadDevice() {
	const connectContent = await loadConnectFile();
	if (connectContent.length >= 1) {
		const resApi = await createOrganizationRestApi();
		for (const device of connectContent) {
			await createAppletZip(device);
			await resApi.device.powerAction.set(device, {
				devicePowerAction: DevicePowerAction.AppletReload,
			}).finally(() => {
				console.log(`Successfully reloaded device ${device} `);
			}).catch(() => {
				console.log("Reload Failed");
			});
		}
	}
}

export async function loadConnectFile(): Promise<Array<string>> {
	if (!await fs.pathExists(connectRuntimeDirPath)) {
		return [];
	}
	const connectFileContent = await fs.readdir(connectRuntimeDirPath);
	let connectedDevices: string[] = [];
	if (connectFileContent.length >= 1) {
		for (const file of connectFileContent) {
			if ((await fs.stat(path.join(connectRuntimeDirPath, file))).isDirectory()) {
				connectedDevices.push(file);
			}
		}
	}
	return connectedDevices;
}

export async function createAppletZip (
		deviceUid: string,
) {
	const archive = archiver('zip');
	const deviceConnectDir = path.join(connectRuntimeDirPath, deviceUid);
	const output = fs.createWriteStream(path.join(deviceConnectDir, "package.zip" + `${deviceUid}`));
	archive.pipe(output);
	const actualDirectory = process.cwd();
	const filesInDir = await getAllFiles(actualDirectory);
	for (const fileAbsolutePath of filesInDir) {
		const fileRelativePath = getAppletFileRelativePath(fileAbsolutePath, actualDirectory);
		archive.file(fileRelativePath, {name: fileRelativePath});
	}
	archive.finalize();
	return archive;
}

export async function getAllFiles(directory: string) {
	let fileList: string[] = [];

	const files = await fs.readdir(directory);
	for (const file of files) {
		if (!ignoredFiles.includes(file)) {
			const p = path.join(directory, file);
			if ((await fs.stat(p)).isDirectory()) {
				fileList = [...fileList, ...(await getAllFiles(p))];
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
