import * as fs from 'fs-extra';
import * as ini from 'ini';
import * as path from 'path';
import * as os from 'os';

const RUN_CONTROL_FILENAME = '.sosrc';

export interface IConfig {
	identification?: string;
	apiSecurityToken?: string;
	defaultOrganizationUid?: string;
}

export async function saveConfig(config: IConfig) {
	const runControlFilePath = getConfigFilePath();
	const runControlFileContent = ini.encode(config);
	await fs.writeFile(runControlFilePath, runControlFileContent, {
		mode: 0o600,
	});
}

export async function updateConfig(partialConfig: Partial<IConfig>) {
	const currentConfig = await loadConfig();
	const newConfig = {
		...currentConfig,
		...partialConfig,
	};
	await saveConfig(newConfig);
}

export async function loadConfig(): Promise<IConfig> {
	const runControlFilePath = getConfigFilePath();
	if (!await fs.pathExists(runControlFilePath)) {
		return {};
	}
	const runControlFileContent = await fs.readFile(runControlFilePath);
	return ini.decode(runControlFileContent.toString()) as IConfig;
}

export function getConfigFilePath() {
	const homeDirectoryPath = os.homedir();
	const runControlFilePath = path.join(homeDirectoryPath, RUN_CONTROL_FILENAME);
	return runControlFilePath;
}
