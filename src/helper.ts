import { stringify } from "ini";
import { loadConfig, loadConnectFile } from "./RunControl/runControlHelper";
import RestApi from '@signageos/sdk/dist/RestApi/RestApi';
import IRestApiOptions from '@signageos/sdk/dist/RestApi/IOptions';
import IRestApiAccountOptions from '@signageos/sdk/dist/RestApi/IOptions';
import { DevicePowerAction } from "@signageos/sdk/dist/RestApi/Device/PowerAction/IPowerAction";
import fetch from 'node-fetch';
import { RequestInit } from "node-fetch";

export const globalApiUrl  = "https://api.signageos.io";
export const AUTH_HEADER = 'X-Auth';

export interface IOptions {
	url: string;
	auth: {
		clientId: string | undefined;
		secret: string | undefined;
	};
	version: 'v1';
	headers?: { [name: string]: string };
}

export interface IOrganization {
	uid: string;
	name: string;
	title: string;
	createdAt: string;
	oauthClientId: string;
	oauthClientSecret: string;
}

export interface IDevice {
	uid: string;
	duid: string;
}

export async function reloadDevice() {
	const sosConfig = await loadConfig();
	const organization = await getOrganization(
		sosConfig.defaultOrganizationUid!,
	);
	const restApi = await createOrganizationRestApi(organization);
	const deviceUid = await (await loadConnectFile()).deviceUid;
	console.log("deviceUid", deviceUid);
	await restApi.device.powerAction.set(deviceUid!, {
		devicePowerAction: DevicePowerAction.AppletReload,
	}).finally(() => {
		console.log("reques proccesef");
	}).catch(() => {
		console.log("nepovedlo se");
	});
}

export async function getOrganization(organizationUid: string) {
	const ORGANIZATION_RESOURCE = 'organization';
	const config = await loadConfig();
	const options = {
		url: globalApiUrl,
		auth: {
			clientId: config.identification,
			secret: config.apiSecurityToken,
		},
		version: 'v1' as 'v1',
	};
	const responseOfGet = await getResource(options, ORGANIZATION_RESOURCE + '/' + organizationUid);
	const bodyOfGet = JSON.parse(await responseOfGet.text(), deserializeJSON);
	console.log("organizace jde ");
	if (responseOfGet.status === 200) {
		return bodyOfGet;
	} else if (responseOfGet.status === 403) {
		throw new Error(`Authentication error. Try to login using 'sos login'`);
	} else {
		throw new Error('Unknown error: ' + (bodyOfGet && bodyOfGet.message ? bodyOfGet.message : responseOfGet.status));
	}
}

export function createOrganizationRestApi(
	organization: IOrganization,
) {
	const options: IRestApiOptions = {
		url: globalApiUrl,
		auth: {
			clientId: organization.oauthClientId,
			secret: organization.oauthClientSecret,
		},
		version: 'v1' as 'v1',
	};
	const accountOptions: IRestApiAccountOptions = {
		...options,
	};

	return new RestApi(options, accountOptions);
}

export function createOptions(method: 'POST' | 'GET' | 'PUT' | 'DELETE', options: IOptions, data?: any): RequestInit {
	return {
		headers: {
			'Content-Type': 'application/json',
			[AUTH_HEADER]: options.auth.clientId + ':' + options.auth.secret,
			...options.headers || {},
		},
		method,
		body: typeof data !== 'undefined' ? JSON.stringify(data) : undefined,
	};
}

export function createUri(options: IOptions, resource: string, queryParams?: any) {
	return [options.url, options.version, resource].join('/')
		+ (typeof queryParams !== 'undefined' ? '?' + stringify(queryParams) : '');
}

export function getResource(options: IOptions, path: string, query?: any) {
	return fetch(createUri(options, path, query), createOptions('GET', options));
}

export function deserializeJSON(_key: string, value: any) {
	if (typeof value === 'string') {
		const regexp = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ$/.exec(value);
		if (regexp) {
			return new Date(value);
		}
	}
	return value;
}
