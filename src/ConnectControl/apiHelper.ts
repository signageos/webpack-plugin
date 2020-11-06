import IRestApiOptions from '@signageos/sdk/dist/RestApi/IOptions';
import IRestApiAccountOptions from '@signageos/sdk/dist/RestApi/IOptions';
import RestApi from "@signageos/sdk/dist/RestApi/RestApi";
import { loadConfig } from "@signageos/sdk/dist/SosHelper/sosControlHelper";
import * as parameters from '../../config/parameters';

export const API_URL = parameters.apiUrl;

export async function createOrganizationRestApi(
) {
	const config = await loadConfig();
	const accountAuth: IRestApiOptions = {
		url: API_URL,
		auth: {
			clientId: config.identification!,
			secret: config.apiSecurityToken!,
		},
		version: 'v1' as 'v1',
	};
	const accountOptions: IRestApiAccountOptions = {
		...accountAuth,
	};
	const organization = await new RestApi(accountAuth, accountOptions).organization.get(config.defaultOrganizationUid!);
	const organizationAuth: IRestApiOptions = {
		url: API_URL,
		auth: {
			clientId: organization.oauthClientId!,
			secret: organization.oauthClientSecret!,
		},
		version: 'v1' as 'v1',
	};
	const organizationOptions: IRestApiAccountOptions = {
		...organizationAuth,
	};
	return new RestApi(organizationAuth, organizationOptions);
}
