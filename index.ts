import { Configuration } from "meteor/service-configuration"

export type IdentityCallbackParams<Identity> = {
  id_token: string
  access_token: string
  identity: Identity,
  claims: { [ k : string ] : any }
}

export type UserServiceData = { id: string, [ k : string ] : any };

export type OIDC = {
  /**
   * Start the login process with the configured OpenID server.
   * Does not return (but may throw)
   *
   * @locus Client
   */
  login (...args: any[]) : void

  /**
   * What information to store as, or update into, the users's `.service.oidc` field.
   *
   * This function is called upon every successful login. It is an
   * internal helper of `epfl:accounts-oidc`, exposed publicly so that
   * application authors may replace it with their own implementation.
   * Obviously, they may also stash its original (function) value
   * first, and then call it from the replacement implementation e.g.
   *
   *   const getUserServiceDataDefaultImpl = OIDC.getUserServiceData;
   *
   *   OIDC.getUserServiceData = async function(opts) {
   *     return {
   *       ...await getUserServiceDataDefaultImpl(opts),
   *       myServicefield: "value"
   *     }
   *   }
   *
   * The default implementation returns an `{ id, claims }` object
   * where
   *
   * - `id` is the `email` field in the `UserInfo` response (meaning
   *   that by default, the email address is the “foreign key” to tell
   *   apart users who authenticate via OpenID-Connect),
   *
   * - `claims` is `opts.claims`.
   *
   * @param opts.id_token      The raw JSON Web token (JWT) string.
   *
   * @param opts.claims        The decoded claims. Note that the JWKS
   *                           signature (if present) is *not*
   *                           checked; it needs not be, as the Meteor
   *                           server was a “witness” to the IdP
   *                           issuing said token during the OIDC
   *                           Authentication Request (and after that,
   *                           the token was supposedly protected en
   *                           route either by the TLS protocol, or by
   *                           the fact that your development Keycloak
   *                           runs on localhost).
   *
   * @param opts.access_token  The “old-school” OAuth2 access token, as a
   *                           string. Beware that although *some* IdP
   *                           implementations (i.e. Keycloak) encode
   *                           their access tokens with JWT, not all
   *                           do; making that assumption in your app
   *                           would make it non-portable between
   *                           IdPs.
   *
   * @param opts.identity      Whatever data structure the IdP returned
   *                           (in JSON) from the `UserInfo` REST API call.
   *
   * @return The data structure that will (ultimately) be set or
   *         merged as the `.services.oidc` field of the user's
   *         MongoDB document in the `Meteor.Users` collection. The
   *         `.id` of the return value will first be used to search
   *         for an already-existing user having the same
   *         `.services.oidc.id`; and then the entire return value
   *         will be either merged into (for an existing user), or
   *         used as (for a new user being created) the user
   *         document's `.services.oidc` sub-field in MongoDB.
   *
   * @locus Server
   */
  getUserServiceData<Identity = unknown>
  (opts : IdentityCallbackParams<Identity>) :
  Promise<UserServiceData> | UserServiceData;
};

export type OIDCClient = Pick<OIDC, "login">;
export type OIDCServer = Pick<OIDC, "getUserServiceData">;

/**
 * Create a new object like `OIDC`
 *
 * Use this (rather than the default `OIDC` object) in case your app
 * wants to use more than one OpenID-Connect compatible IdP.
 *
 * @param slug The nickname for your new instance. From then on, you
 * must read the documentation as if `"oidc"` was replaced by the
 * value of `slug`, in particular as far as configuration is concerned
 * (i.e. your settings or your call to
 * `ServiceConfiguration.configurations.upsertAsync` should use
 * `service.myslug` resp. `upsertAsync` the `{ service: slug }`
 * document)
 *
 * @locus Anywhere
 */

type OIDCConstructFunction = (slug : string) => OIDCClient | OIDCServer;

export const OIDC : OIDCClient | OIDCServer = {} as OIDC;

let _OIDCConstructFunction : OIDCConstructFunction;
export function _registerOIDCConstructFunction (f : OIDCConstructFunction) {
  _OIDCConstructFunction = f;
  Object.assign(OIDC, {... newOIDCProvider('oidc') });
}

const oidcProviders: { [slug : string] : Partial<OIDC> } = {}
export function newOIDCProvider (slug : string) {
  if (oidcProviders[slug]) {
    throw new Error(`slug ${slug} is already taken!`);
  }

  oidcProviders[slug] = _OIDCConstructFunction(slug);

  return oidcProviders[slug];
}

export type LoginStyleString = 'popup' | 'redirect';

export type OIDCConfiguration = Configuration & {
  loginStyle: LoginStyleString;  // default 'popup'
  scope: string | string[];
  loginUrlParameters: { [k : string] : string };
  clientId: string;
  secret ?: {  // Not published to client; see
               // https://github.com/search?q=repo%3Ameteor%2Fmeteor%20%22Publish%20all%20login%20service%20configuration%20fields%20other%20than%20secret%22&type=code
    clientSecret: string;
  }
  baseUrl?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  authorizeEndpoint?: string;
  popupOptions?: any;
}
