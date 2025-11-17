import { Configuration } from "meteor/service-configuration"

type IdentityCallbackParams<Identity> = {
  id_token: string
  access_token: string
  identity: Identity,
  claims: { [ k : string ] : any }
}

type AsyncOrNot<T> = Promise<T> | T;

type OIDC = {
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
   *         `.services.oidc.id` (See @link getNewUserProfile for
   *         additional details on why this matters); and then the
   *         entire return value will be either merged into (for an
   *         existing user), or used as (for a new user being created)
   *         the user document's `.services.oidc` sub-field in
   *         MongoDB.
   *
   * @locus Server
   */
  getUserServiceData<Identity = unknown>
  (opts : IdentityCallbackParams<Identity>) :
  AsyncOrNot<{ id: string, [ k : string ] : any }>;

  /**
   * Returns the `profile` structure in case a user will be created.
   *
   * This function is called upon every successful login, but its
   * return value is only used when creating a new user in MongoDB
   * (otherwise, it is discarded). This function is an internal helper
   * of `epfl:accounts-oidc`, exposed publicly so that application
   * authors may replace it with their own implementation. Obviously,
   * they may also stash its original (function) value first, and then
   * call it from the replacement implementation e.g.
   *
   *   const getNewUserProfileDefaultImpl = OIDC.getNewUserProfile;
   *
   *   OIDC.getNewUserProfile = async function(opts) {
   *     return {
   *       ...await getNewUserProfileDefaultImpl(opts),
   *       myNewField: "value"
   *     }
   *   }
   *
   * The default implementation copies any and all Standard Claims (in
   * the sense of section 5.1 of the OpenID Connect Core 1.0
   * specification) present in either the `identity` or `claims`
   * parameters, into its return value — except for `sub`.
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
   * @return The data structure to be used as the `profile` field of a
   *         new MongoDB document in `Meteor.Users`, if this is the
   *         first login for this user; discarded otherwise.
   *
   * @locus Server
   */
  getNewUserProfile<Identity = unknown>
  (opts : IdentityCallbackParams<Identity>) :
  AsyncOrNot<{[ k : string] : any}>;
};

export type LoginStyleString = 'popup' | 'redirect';

export const OIDC = {} as OIDC;

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
