import { ApiVersions } from '@signageos/sdk/dist/RestApi/apiVersions';
import IRestApiOptions from '@signageos/sdk/dist/RestApi/IOptions';
import IRestApiAccountOptions from '@signageos/sdk/dist/RestApi/IOptions';
import RestApi from "@signageos/sdk/dist/RestApi/RestApi";
import { loadConfig } from "@signageos/sdk/dist/SosHelper/sosControlHelper";
import * as parameters from '../../config/parameters';

export async function createOrganizationRestApi(
	organizationUid: string,
) {
	const config = await loadConfig();
	const clientVersions = {
		signageOS_WebpackPlugin: parameters.version,
	};
	const accountAuth: IRestApiOptions = {
		url: config.apiUrl,
		auth: {
			clientId: config.identification!,
			secret: config.apiSecurityToken!,
		},
		version: ApiVersions.V1,
		clientVersions,
	};
	const accountOptions: IRestApiAccountOptions = {
		...accountAuth,
	};
	const organization = await new RestApi(accountAuth, accountOptions).organization.get(organizationUid!);
	const organizationAuth: IRestApiOptions = {
		url: config.apiUrl,
		auth: {
			clientId: organization.oauthClientId!,
			secret: organization.oauthClientSecret!,
		},
		version: ApiVersions.V1,
		clientVersions,
	};
	const organizationOptions: IRestApiAccountOptions = {
		...organizationAuth,
	};
	return new RestApi(organizationAuth, organizationOptions);
}
