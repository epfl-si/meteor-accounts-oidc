# Implementation Notes

## Goals and Non-Goals

`epfl:accounts-oidc` aims for

- compatibility with all OIDC-compatible IdPs, including (but not limited to) the ones it actually gets tested against on the regular 😜:
  <ul>
   <li> Entra: because this is what we have at EPFL;</li>
   <li> Keycloak: for disconnected testing in development.</li>
  </ul>
  However, interoperability problems with other IdPs are considered as bugs; please raise issues and (if you feel so inclined) provide pull requests.
- **partial** (although faithful) implementation of the [OIDC specification](https://openid.net/specs/openid-connect-core-1_0.html) for those use-cases that are relevant to Meteor (as stated under §§ “Features” and “Non-features” in [README.md](./README.md))

## Modern Package

This Atmosphere package does

- TypeScript, thanks to `api.use("typescript")`
- provide (isometric) TypeScript types, the [`zodern:meteor-types`](https://github.com/zodern/meteor-types) way
- use all the bells and whistles of modern Meteor and JavaScript; first and foremost `async` / `await`
- rely on the built-in `accounts-oauth` and `oauth2` Meteor packages, in exactly the same way that [OpenID-Connect is compatible with OAuth2](https://openid.net/developers/how-connect-works/).

This Atmosphere package **does not**

- support Meteor versions prior to 3.x
- pollute the global namespace or the `Packages` array; it must be consumed the modern way, i.e.
  ```typescript

  import { OIDC } from "meteor/epfl:accounts-oidc"
  ```
- support backwards-compatible terminology or fields from the OAuth era, such as `requestPermissions` as a synonym for `scope`
- split itself arbitrarily into several Atmosphere packages for reasons shrouded in the mists of time
- expect callbacks as the last parameter to its entry points, like it is stuck in 2011; inasmuch as possible, said entry points are `Promise`-returning functions instead.

## Decisions Driven by the Meteor Ecosystem

### Deep dive into the Meteor OAuth implementation, or: why isn't the redirection URI configurable

The `meteor/oauth` package is opinionated on exactly how the OAuth protocol (both version 1, which is off-topic here, and version 2), a REST-based Web API, ought to integrate with Meteor's perennial [DDP](https://blog.meteor.com/introducing-ddp-6b40c6aff27d) protocol; and how to navigate the inherent hazards of OAuth 2 — most notably, the fact that your browser will forget (almost) everything about Meteor as it navigates away to the IdP to let you type in your password.

As far as OpenID-Connect (meaning OAuth 2) is concerned, Meteor offers two main so-called **login styles** as seen in in [README.md](./README.md). The OAuth 2 dance goes like this:

1. (Unless `loginStyle === "popup"`) In preparation of forgetting everything when the browser will navigate to the IdP in the next step, the Meteor client makes a note to itself of the state that matters (most notably, the value of `loginStyle`) using a combination of [`window.sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) and a JSON-serialized datum passed through the `state` [standard query parameter](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest) to the IdP (that will pass it back later)
2. The Meteor client tells the browser to navigate to the IdP using the `window.location` API (if `loginStyle === "redirect"`), or opens a pop-up window to same (if `loginStyle === "popup"`)
3. The IdP and the browser do their thing together, which can be very short (e.g. present session cookie, done), or longish (e.g. two-factor authentication, ask user to consent, and/or select which personal information is going to be disclosed to Meteor etc.)
4. Once the IdP is satisfied with all that, it redirects the browser back to `$ROOT_URL/_oauth/oidc` (and nothing else; see next step to find out why), passing back the same `?state=` query parameter that the client prepared on step 1, as well as other query parameters — most notably, `&code=` which is key for the remainder of the authentication process.
5. The Meteor server (specifically, the `meteor/oauth` package) provides a plain old `express` [middleware](https://github.com/search?q=repo%3Ameteor%2Fmeteor+%22middleware%22+path%3Apackages%2Foauth&type=code) that answers HTTP GET queries at `$ROOT_URL/_oauth/oidc` only — That URL is *not* configurable. That middleware
   - decodes `loginStyle` from the `state=` parameter;
   - forwards the `code=` parameter to the IdP's [Token Request](https://openid.net/specs/openid-connect-core-1_0.html#TokenRequest) endpoint;
   - passes the IdP's [Token Response](https://openid.net/specs/openid-connect-core-1_0.html#TokenResponse) to the per-service processing callback (called [`service.handleOauthRequest`](https://github.com/search?q=repo%3Ameteor%2Fmeteor%20handleOauthRequest&type=code) internally) to deduce the `serviceData` and `options`. This callback, passed as the last parameter to `OAuth.registerService()` is the first point where an OAuth-compatible `account-*` module such as ours has an opportunity to seize control (see § User synchronization, below, for further details on that);
   - serializes pretty much everything it got so far (even any exception that was raised!) into the so-called [pending credentials](https://github.com/meteor/meteor/blob/devel/packages/oauth/pending_credentials.js) Mongo collection;
   - cooks up a `(credentialToken, credentialSecret)` pair, forming a Meteor-proprietary [HMAC](https://en.wikipedia.org/wiki/HMAC) scheme in which `credentialToken` is a random nonce, acting as the key in the Mongo collection, and `credentialSecret` is the signature;
   - and finally, depending on `loginStyle`, serves one or the other piece of templated HTML (which itself calls out to one or the other static JavaScript asset), to cause the browser to prepare for the next step:

      | `loginStyle` value | Assets | Effect |
      | ------------------ | ----------------------- | ------ |
      | `"popup"` (or missing) | [`/packages/oauth/end_of_popup_response.html`](https://github.com/meteor/meteor/blob/master/packages/oauth/end_of_popup_response.html) <br/> [`/packages/oauth/end_of_popup_response.js`](https://github.com/meteor/meteor/blob/master/packages/oauth/end_of_popup_response.js) | Passes the credentials to the main window by [hook](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) or by [crook](https://developer.mozilla.org/en-US/docs/Web/API/Window/opener) |
      | `"redirect"` | [`/packages/oauth/end_of_redirect_response.html`](https://github.com/meteor/meteor/blob/master/packages/oauth/end_of_redirect_response.html) <br/> [`/packages/oauth/end_of_redirect_response.js`](https://github.com/meteor/meteor/blob/master/packages/oauth/end_of_redirect_response.js) | Saves the credentials into `window.sessionStorage` again (encapsulating it as a “Meteor migration” per the [`meteor/reload` package](https://github.com/meteor/meteor/blob/master/packages/reload/README.md)), and redirects the browser to the main app|

6. The Meteor client receives the `(credentialToken, credentialSecret)` pair one way or the other, as per the table above (i.e. from a window-to-window communication, respectively, from a `meteor/reload`-style “migration” in [`OAuth.getDataAfterRedirect`](https://github.com/search?q=repo%3Ameteor%2Fmeteor%20OAuth.getDataAfterRedirect&type=code)), and issues a DDP method call to the `login` method, passing a nested dict with main key `oauth`, and nested sub-keys `credentialToken` and `credentialSecret`, as the sole method parameter
7. The Meteor server validates the HMAC signature, looks up the remainder of the data from the pending credentials store, (deletes it from there,) and completes the login process [as per the normal `meteor/accounts` procedure](https://docs.meteor.com/api/accounts) — to wit:
   - it writes the details of the user that just logged in in the `Meteor.users` Mongo collection (through the [`Accounts.updateOrCreateUserFromExternalService` function](https://github.com/search?q=repo%3Ameteor%2Fmeteor+symbol%3AupdateOrCreateUserFromExternalService&type=code),
   - it marks the current DDP session as [belonging to](https://guide.meteor.com/accounts#userid-ddp) the user that just logged in,
   - ... which (combined with the update to `Meteor.users`, above) causes `Meteor.user()` etc. to promptly update over DDP,
   - and it finally causes the `Meteor.login` DDP call to succeed.

Security rests on the guarantee that step 7 *must not* be allowed to happen if an attacker presents a forged (`oauth.credentialToken`, `oauth.credentialSecret`) pair as part of a `login` Meteor DDP call — which anyone with network access to the Meteor server can attempt. Steps 5 and 7 provide that guarantee by ensuring that that pair is

- **unguessable**, per the randomness of the `credentialToken`,
- **unforgeable**, per the HMAC signature,
- and **a proof** of a prior, successful REST call to the IdP's Token Request entry point (because the `credentialToken` must exist in Mongo).

In conclusion:

- The good: **security is a core feature** of the Meteor OAuth framework — not removeable, not to be provided by IdP-specific implementations such as this here package — and it has been that way across decades, protocol major versions, and `loginStyle`s. **If it works, you can trust it.**
- The ugly: near as I can tell, **almost none of that stuff is documented anywhere**; it was all figured out through reverse-engineering.

### `meteor.loginServiceConfiguration` vs. the OIDC client secret

It is [well-known](https://docs.meteor.com/api/accounts#service-configuration) that whatever one puts in the [Meteor settings](https://docs.meteor.com/api/meteor.html#Meteor-settings) under `packages["service-configuration"]` gets upserted into the `meteor_accounts_loginServiceConfiguration` Mongo collection, which is auto-published (regardless of whether the `autopublish` package is in play — which it shouldn't, once once your application is headed for production).

What is less well-known, however, is that [the `meteor.loginServiceConfiguration` publication omits the `secret` top-level key](https://github.com/search?q=repo%3Ameteor%2Fmeteor%20%22Publish%20all%20login%20service%20configuration%20fields%20other%20than%20secret%22&type=code). Placing the OpenID-Connect client secret as `.secret.clientSecret`, rather than the top level of the service configuration (~~.clientSecret~~) results in it being concealed from the Meteor client, as it should.

### User synchronization

Meteor's built-in `accounts-base`, `accounts-oauth` and `oauth` packages together provide (somewhat crude) mechanisms for OAuth implementors like `epfl:accounts-oidc` to synchronize data from the IdP into the `Meteor.users` MongoDB collection; as well as (more recent and sophisticated) mechanisms for the application to override the former. Owing to the long history of this feature, and the requirements driven by backward compatibility, the resulting API in Meteor is honestly a bit of a mess.

The main entry point for OAuth implementors is `OAuth.registerService()`, whose fourth parameter is a calllback that takes the `{ id_token, access_token }` object obtained at the end of the OAuth process (described above) and shall return a `{ serviceData, options }` object (or a `Promise` of same). Later (after a full freeze / thaw cycle on the server, also as described above), these returned structures control Meteor's handling of the `login` method on the server, with the following steps happening in order:

1. Meteor must first decide whether the user currently logging in already exists, or a new one needs to be created. To this end, it performs a MongoDB search on `.service.oidc.id` (on which it [created a unique index](https://github.com/search?q=repo%3Ameteor%2Fmeteor+path%3Aoauth_common.js+createIndexAsync&type=code) ahead of time), searching for one that is equal to `serviceData.id`.
2. In the case of a new user, Meteor must populate it. By default it just copies `options.profile` into the new user document's `.profile` field.
3. Finally, Meteor creates resp. updates the `.service.oidc` field in the new resp. existing user's MongoDB document. To do that, it simply copies resp. merges the entire `serviceData` object into `.service.oidc`.

`epfl:accounts-oidc` has little leeway but to pick sensible defaults for its `serviceData` and `options` return values, using data from the IdP (and the email address as the unique key for step 1), as explained in [README.md](./README.md). On the other hand, the application enjoys access to the following callback hooks:

- [`Accounts.onCreateUser`](https://docs.meteor.com/api/accounts#AccountsServer-onCreateUser), as the name implies, lets the application author override step 2 entirely. It also obtains the `options` data structure mentioned above as a parameter, which gives `epfl:accounts-tequila` the opportunity to provide helpful data besides `options.profile` for `Accounts.onCreateUser` implementors;
- [`Accounts.setAdditionalFindUserOnExternalLogin`](https://docs.meteor.com/api/accounts#AccountsServer-setAdditionalFindUserOnExternalLogin), again as the name implies, lets the application author override step 1 only in part — That is, the app-provided callback only kicks in in case the MongoDB search turns up nothing.

Note that

- these hooks are *not* chainable (the way Express middleware are, for instance). Therefore, we really wand to leave them to the app's exclusive use, lest the app be impeded or outright unable to tune the user synchronization process;
- even postulating that the `.services.oidc` sub-structure of step 3 is “our” private data that the app needs not have the ability to tamper with, there is still a patch of inflexibility left in step 1, which especially problematic for IdPs that don't disclose emails at all. `epfl:accounts-oidc` is thus forced to provide its own plugin point for apps to tailor step 1 to their own liking — namely, the [overwriteable](./api/API.md#getuserservicedata) `OIDC.getUserServiceData` method;
- despite all of the above, the API intended for OAuth implementors is still more than enough for `epfl:accounts-oidc` to provide a “batteries-included” experience to app authors, at least in the simple cases (that is, when using only one IdP that discloses emails).

## Calls and Callbacks

Both client- and server-side code in `epfl:accounts-oidc` mesh with the polymorphic implementation of Meteor's accounts and OAuth subsystems, by calling the relevant (albeit often poorly documented, if at all) registration and action functions; some of which were mentioned above. Details (sometimes) appear next to the call sites in the source code.

Note that a bunch of these APIs are both indispensable *and* private, and there is not much we can do about that, save for closely managing the “permission” to call them from our own code by means of a few TypeScript pro-gamer moves.

Also note that these same APIs use callbacks a lot for continuation passing, like they are stuck in 2011, (which they kind of are.) As seen in § “Modern Package” above, we hoist that to `async` style in our callers wherever (and as soon as) possible.

## OpenID-Connect Specific Behavior

The behavior of OpenID-Connect diverges from OAuth's in two fundamental places in the [timing diagram](https://darutk.medium.com/diagrams-of-all-the-openid-connect-flows-6968e3990660):

- at the very beginning, i.e. at configuration-time: `epfl:accounts-oidc` supports (and even recommends) using the IdP's `.well-known/openid-configuration` as a configuration source, rather than having to set every single OAuth endpoint by hand in the configuration (which it does support too, FWIW). This code lives in `config.ts`;
- at the very end, i.e. once the OAuth2 token exchange completes: `accounts-oidc-server.ts` knows how to decode the JWT ID token that it receives in the same exchange. It also follows up with a call to [the UserInfo endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo).

# References

- https://docs.meteor.com/api/accounts
- A whole bucketful o' RTFS at https://github.com/meteor/meteor
