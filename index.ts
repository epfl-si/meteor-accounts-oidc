/** @internal */
export type UserServiceData = { id: string, [ k : string ] : any };

/**
 * The main API for `meteor/epfl:accounts-tequila`
 *
 * @typeParam Identity The type of the JSON that your IdP's
 *                     `UserInfo` REST call returns.
 */
export type OIDC<Identity = unknown> = {
  /**
   * Start the login process with the configured OpenID server.
   *
   * @locus Client
   *
   * @param args Passed as the second argument to
   *             [`Accounts.applyLoginFunction`](https://docs.meteor.com/api/accounts.html#AccountsClient-applyLoginFunction)
   *
   * @return a promise that resolves (to void) once the popup closes,
   *         if `loginStyle` is `"popup"`. Never resolves when
   *         `loginStyle` is `"redirect"`, as the browser will destroy
   *         the entire JavaScript execution context upon navigating
   *         away from the Meteor application.
   */
  login (...args: any[]) : Promise<void>

  /**
   * What information to store as, or update into, the users's `.service.oidc` field.
   *
   * This function is called upon every successful login. It is an
   * internal helper of `epfl:accounts-oidc`, exposed publicly so that
   * application authors may replace it with their own implementation.
   * Obviously, they may also stash its original (function) value
   * first, and then call it from the replacement implementation e.g.
   *
   *   ```typescript
   *   const getUserServiceDataDefaultImpl = OIDC.getUserServiceData;
   *
   *   OIDC.getUserServiceData = async function(opts) {
   *     return {
   *       ...await getUserServiceDataDefaultImpl(opts),
   *       myServicefield: "value"
   *     }
   *   }
   *   ```
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
  getUserServiceData(opts : {
    id_token: string
    access_token: string
    identity: Identity,
    claims: { [ k : string ] : any }
    }) :
  Promise<UserServiceData> | UserServiceData;
};

/**
 * The type of the `OIDC` object on the client.
 *
 * Also the return type of {@link newOIDCProvider} on the client.
 */
export type OIDCClient = Pick<OIDC, "login">;

/**
 * The type of the `OIDC` object on the server.
 *
 * Also the return type of {@link newOIDCProvider} on the server.
 */
export type OIDCServer<Identity = unknown> = Pick<OIDC<Identity>, "getUserServiceData">;

type OIDCConstructFunction = (slug : string) => OIDCClient | OIDCServer;

/**
 * The main entry point for `meteor/epfl:accounts-tequila`.
 *
 * See documenttaion for member methods in the {@link OIDC} type.
 */
export const OIDC : OIDCClient | OIDCServer = {} as OIDC;

let _OIDCConstructFunction : OIDCConstructFunction;
/** @internal */
export function _registerOIDCConstructFunction (f : OIDCConstructFunction) {
  _OIDCConstructFunction = f;
  Object.assign(OIDC, {... newOIDCProvider('oidc') });
}

const oidcProviders: { [slug : string] : Partial<OIDC> } = {}

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
 * @typeParam Identity The type of the JSON that your IdP's
 *                     `UserInfo` REST call returns.
 *
 * @locus Anywhere
 */
export function newOIDCProvider<Identity = unknown> (slug : string) {
  if (oidcProviders[slug]) {
    throw new Error(`slug ${slug} is already taken!`);
  }

  oidcProviders[slug] = _OIDCConstructFunction(slug);

  return oidcProviders[slug] as OIDCClient | OIDCServer<Identity>;
}

export type LoginStyleString = 'popup' | 'redirect';

/**
 * The structure of the `meteor/service-configuration` MongoDB document
 * that `meteor/epfl:accounts-oidc` consumes as a configuration source.
 */
export type OIDCConfiguration = Configuration & {
  /** Either `popup` (the default), or `redirect` */
  loginStyle: LoginStyleString;
  /**
   * OpenID-Connect scope or scopes.
   *
   * @defaultValue `["openid"]`
   */
  scope: string | string[];
  /** Any additional parameters to pass into the login URL. (IdP-specific) */
  loginUrlParameters: { [k : string] : string };
  /** the OpenID-Connect client ID */
  clientId: string;
  /**
   * The secret value (or struct), per a
   * [barely-documented](https://guide.meteor.com/security#api-keys-oauth)
   * Meteor feature, is kept server-side only; it is not transmitted
   * (DDP-published) to the client.
   *
   * @see https://github.com/search?q=repo%3Ameteor%2Fmeteor%20%22Publish%20all%20login%20service%20configuration%20fields%20other%20than%20secret%22&type=code
   */
  secret ?: {
    /**
     * `secret.clientSecret` is the OpenID-Connect client secret (if your IdP wants one)
     */
    clientSecret: string;
  }
  /**
   * The base URL for your OpenID-Connect compatible IdP's services.
   *
   * A GET query to `${baseUrl}/.well-known/openid-configuration`
   * ought to return JSON that will be used as the source of default
   * values for all the `fooEndpoint` configuration options.
   */
  baseUrl?: string;
  /**
   * The URL of the [OIDC Token Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint)
   */
  tokenEndpoint?: string;
  /**
   * The URL of the [UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
   */
  userinfoEndpoint?: string;
  /**
   * The URL of the [Authorization Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#AuthorizationEndpoint)
   *
   * This is the one that the server calls to finish the OAuth login process.
   */
  authorizeEndpoint?: string;
  /**
   * Any options to pass to the popup window, if `loginStyle === "popup"`
   *
   * @example
   *
   * ```typescript
   * { height: 800, width: 600 }
   * ```
   */
  popupOptions?: any;
}

/**
 * The type of the `options` (first) parameter that will be passed to
 * your `Accounts.onCreateUser` callback, if your app has one.
 *
 * The default behavior (if your app doesn't call
 * `Accounts.onCreateUser`) is to create users that are made as if
 * by the following code:
 *
 * ```typescript
 * const user = {};
 *
 * user.profile = options.profile;
 * ```
 *
 * @typeParam Identity The type of the JSON that your IdP's
 *                     `UserInfo` REST call returns.
 */
export type CreateUserOptions<Identity = unknown> = {
  /**
   * `"oidc"` by default, or whatever parameter you passed to {@link
   * newOIDCProvider}
   */
  service: string;
  /**
   * The raw (un-decoded) OpenID-Connect JWT token
   */
  id_token: string
  /**
   * The “old-school” OAuth2 access token
   */
  access_token: string;
  /**
   * The decoded content of `id_token`
   *
   * ⚠ JWKS signature is *not* checked, see {@link OIDC#getUserServiceData}
   */
  claims: { [ name : string ]  : any };
  /**
   * Whatever was returned by the REST call to the [`UserInfo` endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
   */
  identity: Identity;
  /**
   * The union of all well-known personal information fields (as per
   * the [OIDC
   * spec](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims))
   * found in `claims` and `identity`. Would also be the value set as
   * the user's `profile`, if one had not set up an
   * `Accounts.onCreateUser` callback.
   */
  profile: Object;
}
