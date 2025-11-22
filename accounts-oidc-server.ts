import { Accounts } from "meteor/accounts-base"
import { OAuth } from "meteor/oauth"
import { Configuration } from "./config"
import { URIs } from "./uris"
import { _registerOIDCConstructFunction, OIDCServer } from "./index";

// Tell Meteor to add a few fields to `Meteor.user()` /
// `Meteor.users.findAsync({...})` in the client. Only in play when
// `autopublish` is installed (which it shouldn't, once your
// application is ready for shipping).
Accounts.addAutopublishFields({
    forLoggedInUser: ['services.oidc'],
    forOtherUsers: ['services.oidc.id']
});

// The default implementation assumes that the IdP returns at least
// `email` in its UserInfo REST call:
type DefaultImplIdentity = {email : string};

// A selection from
// https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
// that make sense to put into new users' `.profile`:
const personalInfoClaims = [
  'name', 'given_name', 'family_name', 'middle_name', 'nickname', 'preferred_username',
  'website', 'email', 'email_verified', 'gender', 'birthdate',
  'zoneinfo', 'locale', 'phone_number', 'phone_number_verified', 'address'
];

_registerOIDCConstructFunction(function newOIDCProviderServer (slug) {
  Accounts.oauth.registerService(slug);

  const self : OIDCServer<DefaultImplIdentity> = {
    // Overridable by app authors; see index.ts for details
    getUserServiceData :  ({ identity, claims }) => ({
      id: // used to check in Mongo whether the user already exists
         identity.email,
      claims
      })
  };

  const config = Configuration(slug);

  // What should happen once the IdP is happy and we have our `code=` and `state=` back
  //
  // “Documented” at https://guide.meteor.com/2.9-migration
  //
  // RTFS at https://github.com/search?q=repo%3Ameteor%2Fmeteor+symbol%3AregisterService+path%3Aoauth_common.js&type=code
  OAuth.registerService(slug, 2, null, async function(oauthResults) {
    const { id_token, access_token } = await getTokens(config, oauthResults);

    const claims = decodeJWT(id_token).payload,
          identity = await fetchIdentity(config, access_token),
          options = {
            id_token, access_token, claims, identity
          };

    // Accounts.updateOrCreateUserFromExternalService() will...
    return {
      // ... stuff this into the user's `.services.oidc` structure every
      // time (on both creations and updates). User may override this
      // behavior by overwriting the method:
      serviceData: await self.getUserServiceData(options),

      // ... create a new Mongo document for the user, but only if one
      // doesn't exist already (as determined by searching for a
      // document whose `.services.oidc.id` equals `serviceData.id`,
      // per above). The `user` struct to be inserted is returned by
      // the `Accounts.onCreateUser` set up by the app (as per
      // https://docs.meteor.com/api/accounts#AccountsServer-onCreateUser)
      // with the following `options` passed as a parameter; or if no
      // such callback was set up, just `{ profile : options.profile
      // }`:
      options: {
        service: slug,
        ...options,
        profile: Object.fromEntries(personalInfoClaims.flatMap((k) =>
          (identity[k] ? [[k, identity[k]]] :
            claims[k] ? [[k, claims[k]]] :
              [])))
      }
    };
  });

  return self;
});

type OauthResults = {code: string, state: string};

async function getTokens(config : Configuration, oauthResults: OauthResults) {
  const { clientId, secret } = await config.getConfiguration();
  const clientSecret = secret?.clientSecret;

  const uris = URIs(config),
        tokenEndpoint = await uris.getTokenEndpoint();

  const token_params = {
    grant_type: 'authorization_code',
    code: oauthResults.code,
    client_id: clientId,
    // Entra demands that as part of the `access_token` payload:
    redirect_uri: uris.getRedirectionUri()
  };
  if (clientSecret) {
    token_params["client_secret"] = clientSecret;
  }

  const response = await fetch(tokenEndpoint,
    {
      method: "POST",
      body: new URLSearchParams(token_params)
    });

  if (response.status !== 200) {
    throw new Error(await response.text());
  }

  return await response.json() as {
    id_token: string
    access_token: string
  };
}

async function fetchIdentity (config : Configuration, accessToken: string) {
  const userInfoEndpoint = await URIs(config).getUserInfoEndpoint();

  const response = await fetch(userInfoEndpoint,
    {
      method: "POST",
      body: new URLSearchParams({ access_token: accessToken })
    });

  return await response.json() as DefaultImplIdentity;
}

/**
 * Decode a JWT token **without** checking its signature.
 *
 * Fine to use here, because we were on the phone with the IdP (as
 * certified by the standard TLS security), so we know the ID token
 * wasn't forged.
 */
function decodeJWT(idToken : string) {
  function decodeJWTFragment(fragmentBase64Url : string) {
    const base64 = fragmentBase64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/') + '=='.slice(0, (4 - (fragmentBase64Url.length % 4)) % 4);

    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  }

  const [headerBase64Url, payloadBase64Url, signatureBase64Url] = idToken.split('.');
  return {
    header: decodeJWTFragment(headerBase64Url),
    payload: decodeJWTFragment(payloadBase64Url),
    signature: signatureBase64Url
  };
}
