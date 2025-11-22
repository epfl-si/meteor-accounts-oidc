**meteor/epfl:accounts-oidc**

***

# meteor/epfl:accounts-oidc

## Type Aliases

### OIDC

> **OIDC**\<`Identity`\> = `object`

Defined in: [index.ts:10](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L10)

The main entry point for `meteor/epfl:accounts-tequila`

#### Type Parameters

##### Identity

`Identity` = `unknown`

The type of the JSON that your IdP's
                    `UserInfo` REST call returns.

#### Methods

##### login()

> **login**(...`args`): `void`

Defined in: [index.ts:20](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L20)

Start the login process with the configured OpenID server.
Does not return (but may throw)

###### Parameters

###### args

...`any`[]

Passed as the second argument to
            [`Accounts.applyLoginFunction`](https://docs.meteor.com/api/accounts.html#AccountsClient-applyLoginFunction)

###### Returns

`void`

###### Locus

Client

##### getUserServiceData()

> **getUserServiceData**(`opts`): `UserServiceData` \| `Promise`\<`UserServiceData`\>

Defined in: [index.ts:87](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L87)

What information to store as, or update into, the users's `.service.oidc` field.

This function is called upon every successful login. It is an
internal helper of `epfl:accounts-oidc`, exposed publicly so that
application authors may replace it with their own implementation.
Obviously, they may also stash its original (function) value
first, and then call it from the replacement implementation e.g.

  ```typescript
  const getUserServiceDataDefaultImpl = OIDC.getUserServiceData;

  OIDC.getUserServiceData = async function(opts) {
    return {
      ...await getUserServiceDataDefaultImpl(opts),
      myServicefield: "value"
    }
  }
  ```

The default implementation returns an `{ id, claims }` object
where

- `id` is the `email` field in the `UserInfo` response (meaning
  that by default, the email address is the “foreign key” to tell
  apart users who authenticate via OpenID-Connect),

- `claims` is `opts.claims`.

###### Parameters

###### opts

###### id_token

`string`

The raw JSON Web token (JWT) string.

###### access_token

`string`

The “old-school” OAuth2 access token, as a
                          string. Beware that although *some* IdP
                          implementations (i.e. Keycloak) encode
                          their access tokens with JWT, not all
                          do; making that assumption in your app
                          would make it non-portable between
                          IdPs.

###### identity

`Identity`

Whatever data structure the IdP returned
                          (in JSON) from the `UserInfo` REST API call.

###### claims

\{\[`k`: `string`\]: `any`; \}

The decoded claims. Note that the JWKS
                          signature (if present) is *not*
                          checked; it needs not be, as the Meteor
                          server was a “witness” to the IdP
                          issuing said token during the OIDC
                          Authentication Request (and after that,
                          the token was supposedly protected en
                          route either by the TLS protocol, or by
                          the fact that your development Keycloak
                          runs on localhost).

###### Returns

`UserServiceData` \| `Promise`\<`UserServiceData`\>

The data structure that will (ultimately) be set or
        merged as the `.services.oidc` field of the user's
        MongoDB document in the `Meteor.Users` collection. The
        `.id` of the return value will first be used to search
        for an already-existing user having the same
        `.services.oidc.id`; and then the entire return value
        will be either merged into (for an existing user), or
        used as (for a new user being created) the user
        document's `.services.oidc` sub-field in MongoDB.

###### Locus

Server

***

### OIDCClient

> **OIDCClient** = `Pick`\<[`OIDC`](#oidc-1), `"login"`\>

Defined in: [index.ts:96](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L96)

***

### OIDCServer

> **OIDCServer**\<`Identity`\> = `Pick`\<[`OIDC`](#oidc-1)\<`Identity`\>, `"getUserServiceData"`\>

Defined in: [index.ts:97](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L97)

#### Type Parameters

##### Identity

`Identity` = `unknown`

***

### LoginStyleString

> **LoginStyleString** = `"popup"` \| `"redirect"`

Defined in: [index.ts:141](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L141)

***

### OIDCConfiguration

> **OIDCConfiguration** = `object`

Defined in: [index.ts:147](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L147)

The structure of the `meteor/service-configuration` MongoDB document
that `meteor/epfl:accounts-oidc` consumes as a configuration source.

#### Properties

##### loginStyle

> **loginStyle**: [`LoginStyleString`](#loginstylestring)

Defined in: [index.ts:149](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L149)

Either `popup` (the default), or `redirect`

##### scope

> **scope**: `string` \| `string`[]

Defined in: [index.ts:155](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L155)

OpenID-Connect scope or scopes.

###### Default Value

`["openid"]`

##### loginUrlParameters

> **loginUrlParameters**: `object`

Defined in: [index.ts:157](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L157)

Any additional parameters to pass into the login URL. (IdP-specific)

###### Index Signature

\[`k`: `string`\]: `string`

##### clientId

> **clientId**: `string`

Defined in: [index.ts:159](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L159)

the OpenID-Connect client ID

##### secret?

> `optional` **secret**: `object`

Defined in: [index.ts:166](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L166)

The secret struct is a Meteor feature that is guaranteed not to
be transmitted (DDP-published) to the client.

###### clientSecret

> **clientSecret**: `string`

The OpenID-Connect client secret (if your IdP wants one)

###### See

https://github.com/search?q=repo%3Ameteor%2Fmeteor%20%22Publish%20all%20login%20service%20configuration%20fields%20other%20than%20secret%22&type=code

##### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [index.ts:179](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L179)

The base URL for your OpenID-Connect compatible IdP's services.

A GET query to `${baseUrl}/.well-known/openid-configuration`
ought to return JSON that will be used as the source of default
values for all the `fooEndpoint` configuration options.

##### tokenEndpoint?

> `optional` **tokenEndpoint**: `string`

Defined in: [index.ts:183](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L183)

The URL of the [OIDC Token Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint)

##### userinfoEndpoint?

> `optional` **userinfoEndpoint**: `string`

Defined in: [index.ts:187](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L187)

The URL of the [UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)

##### authorizeEndpoint?

> `optional` **authorizeEndpoint**: `string`

Defined in: [index.ts:193](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L193)

The URL of the [Authorization Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#AuthorizationEndpoint)

This is the one that the server calls to finish the OAuth login process.

##### popupOptions?

> `optional` **popupOptions**: `any`

Defined in: [index.ts:203](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L203)

Any options to pass to the popup window, if `loginStyle === "popup"`

###### Example

```typescript
{ height: 800, width: 600 }
```

***

### CreateUserOptions

> **CreateUserOptions**\<`Identity`\> = `object`

Defined in: [index.ts:223](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L223)

The type of the `options` (first) parameter that will be passed to
your `Accounts.onCreateUser` callback, if your app sets up one.

The default behavior (if your app doesn't call
`Accounts.onCreateUser`) is to create users that are made like
this:

```typescript
const newUser = {};

user.profile = options.profile;
```

#### Type Parameters

##### Identity

`Identity` = `unknown`

The type of the JSON that your IdP's
                    `UserInfo` REST call returns.

#### Properties

##### service

> **service**: `string`

Defined in: [index.ts:228](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L228)

`"oidc"` by default, or whatever parameter you passed to [newOIDCProvider](#newoidcprovider)

##### id\_token

> **id\_token**: `string`

Defined in: [index.ts:232](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L232)

The raw (un-decoded) OpenID-Connect JWT token

##### access\_token

> **access\_token**: `string`

Defined in: [index.ts:236](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L236)

The “old-school” OAuth2 access token

##### claims

> **claims**: `object`

Defined in: [index.ts:242](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L242)

The decoded content of `id_token`

⚠ JWKS signature is *not* checked, see [OIDC#getUserServiceData](#getuserservicedata)

###### Index Signature

\[`name`: `string`\]: `any`

##### identity

> **identity**: `Identity`

Defined in: [index.ts:246](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L246)

Whatever was returned by the REST call to the `[UserInfo endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)`

##### profile

> **profile**: `Object`

Defined in: [index.ts:255](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L255)

The union of all well-known personal information fields (as per
the [OIDC
spec](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims))
found in `claims` and `identity`. Would also be the value set as
the user's `profile`, if one had not set up an
`Accounts.onCreateUser` callback.

## Variables

### OIDC

> **OIDC**: [`OIDCClient`](#oidcclient) \| [`OIDCServer`](#oidcserver)\<`unknown`\>

Defined in: [index.ts:10](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L10)

## Functions

### newOIDCProvider()

> **newOIDCProvider**\<`Identity`\>(`slug`): [`OIDCClient`](#oidcclient) \| [`OIDCServer`](#oidcserver)\<`Identity`\>

Defined in: [index.ts:131](https://github.com/epfl-si/meteor-accounts-oidc/blob/35721c82daf7ab4372f2e2fae0ff596f3fb6fff1/index.ts#L131)

Create a new object like `OIDC`

Use this (rather than the default `OIDC` object) in case your app
wants to use more than one OpenID-Connect compatible IdP.

#### Type Parameters

##### Identity

`Identity` = `unknown`

The type of the JSON that your IdP's
                    `UserInfo` REST call returns.

#### Parameters

##### slug

`string`

The nickname for your new instance. From then on, you
must read the documentation as if `"oidc"` was replaced by the
value of `slug`, in particular as far as configuration is concerned
(i.e. your settings or your call to
`ServiceConfiguration.configurations.upsertAsync` should use
`service.myslug` resp. `upsertAsync` the `{ service: slug }`
document)

#### Returns

[`OIDCClient`](#oidcclient) \| [`OIDCServer`](#oidcserver)\<`Identity`\>

#### Locus

Anywhere
