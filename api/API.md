**meteor/epfl:accounts-oidc**

***

# meteor/epfl:accounts-oidc

## Type Aliases

### OIDC

> **OIDC**\<`Identity`\> = `object`

Defined in: [index.ts:10](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L10)

The main API for `meteor/epfl:accounts-tequila`

#### Type Parameters

##### Identity

`Identity` = `unknown`

The type of the JSON that your IdP's
                    `UserInfo` REST call returns.

#### Methods

##### login()

> **login**(...`args`): `Promise`\<`void`\>

Defined in: [index.ts:25](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L25)

Start the login process with the configured OpenID server.

###### Parameters

###### args

...`any`[]

Passed as the second argument to
            [`Accounts.applyLoginFunction`](https://docs.meteor.com/api/accounts.html#AccountsClient-applyLoginFunction)

###### Returns

`Promise`\<`void`\>

a promise that resolves (to void) once the popup closes,
        if `loginStyle` is `"popup"`. Never resolves when
        `loginStyle` is `"redirect"`, as the browser will destroy
        the entire JavaScript execution context upon navigating
        away from the Meteor application.

###### Locus

Client

##### getUserServiceData()

> **getUserServiceData**(`opts`): `UserServiceData` \| `Promise`\<`UserServiceData`\>

Defined in: [index.ts:92](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L92)

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

Defined in: [index.ts:106](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L106)

The type of the `OIDC` object on the client.

Also the return type of [newOIDCProvider](#newoidcprovider) on the client.

***

### OIDCServer

> **OIDCServer**\<`Identity`\> = `Pick`\<[`OIDC`](#oidc-1)\<`Identity`\>, `"getUserServiceData"`\>

Defined in: [index.ts:113](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L113)

The type of the `OIDC` object on the server.

Also the return type of [newOIDCProvider](#newoidcprovider) on the server.

#### Type Parameters

##### Identity

`Identity` = `unknown`

***

### LoginStyleString

> **LoginStyleString** = `"popup"` \| `"redirect"`

Defined in: [index.ts:162](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L162)

***

### OIDCConfiguration

> **OIDCConfiguration** = `object`

Defined in: [index.ts:168](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L168)

The structure of the `meteor/service-configuration` MongoDB document
that `meteor/epfl:accounts-oidc` consumes as a configuration source.

#### Properties

##### loginStyle

> **loginStyle**: [`LoginStyleString`](#loginstylestring)

Defined in: [index.ts:170](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L170)

Either `popup` (the default), or `redirect`

##### scope

> **scope**: `string` \| `string`[]

Defined in: [index.ts:176](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L176)

OpenID-Connect scope or scopes.

###### Default Value

`["openid"]`

##### loginUrlParameters

> **loginUrlParameters**: `object`

Defined in: [index.ts:178](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L178)

Any additional parameters to pass into the login URL. (IdP-specific)

###### Index Signature

\[`k`: `string`\]: `string`

##### clientId

> **clientId**: `string`

Defined in: [index.ts:180](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L180)

the OpenID-Connect client ID

##### secret?

> `optional` **secret**: `object`

Defined in: [index.ts:189](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L189)

The secret value (or struct), per a
[barely-documented](https://guide.meteor.com/security#api-keys-oauth)
Meteor feature, is kept server-side only; it is not transmitted
(DDP-published) to the client.

###### clientSecret

> **clientSecret**: `string`

`secret.clientSecret` is the OpenID-Connect client secret (if your IdP wants one)

###### See

https://github.com/search?q=repo%3Ameteor%2Fmeteor%20%22Publish%20all%20login%20service%20configuration%20fields%20other%20than%20secret%22&type=code

##### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [index.ts:202](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L202)

The base URL for your OpenID-Connect compatible IdP's services.

A GET query to `${baseUrl}/.well-known/openid-configuration`
ought to return JSON that will be used as the source of default
values for all the `fooEndpoint` configuration options.

##### tokenEndpoint?

> `optional` **tokenEndpoint**: `string`

Defined in: [index.ts:206](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L206)

The URL of the [OIDC Token Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint)

##### userinfoEndpoint?

> `optional` **userinfoEndpoint**: `string`

Defined in: [index.ts:210](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L210)

The URL of the [UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)

##### authorizeEndpoint?

> `optional` **authorizeEndpoint**: `string`

Defined in: [index.ts:216](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L216)

The URL of the [Authorization Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#AuthorizationEndpoint)

This is the one that the server calls to finish the OAuth login process.

##### popupOptions?

> `optional` **popupOptions**: `any`

Defined in: [index.ts:226](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L226)

Any options to pass to the popup window, if `loginStyle === "popup"`

###### Example

```typescript
{ height: 800, width: 600 }
```

***

### CreateUserOptions

> **CreateUserOptions**\<`Identity`\> = `object`

Defined in: [index.ts:246](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L246)

The type of the `options` (first) parameter that will be passed to
your `Accounts.onCreateUser` callback, if your app has one.

The default behavior (if your app doesn't call
`Accounts.onCreateUser`) is to create users that are made as if
by the following code:

```typescript
const user = {};

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

Defined in: [index.ts:251](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L251)

`"oidc"` by default, or whatever parameter you passed to [newOIDCProvider](#newoidcprovider)

##### id\_token

> **id\_token**: `string`

Defined in: [index.ts:255](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L255)

The raw (un-decoded) OpenID-Connect JWT token

##### access\_token

> **access\_token**: `string`

Defined in: [index.ts:259](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L259)

The “old-school” OAuth2 access token

##### claims

> **claims**: `object`

Defined in: [index.ts:265](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L265)

The decoded content of `id_token`

⚠ JWKS signature is *not* checked, see [OIDC#getUserServiceData](#getuserservicedata)

###### Index Signature

\[`name`: `string`\]: `any`

##### identity

> **identity**: `Identity`

Defined in: [index.ts:269](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L269)

Whatever was returned by the REST call to the [`UserInfo` endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)

##### profile

> **profile**: `Object`

Defined in: [index.ts:278](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L278)

The union of all well-known personal information fields (as per
the [OIDC
spec](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims))
found in `claims` and `identity`. Would also be the value set as
the user's `profile`, if one had not set up an
`Accounts.onCreateUser` callback.

## Variables

### OIDC

> **OIDC**: [`OIDCClient`](#oidcclient) \| [`OIDCServer`](#oidcserver)\<`unknown`\>

Defined in: [index.ts:10](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L10)

The main entry point for `meteor/epfl:accounts-tequila`.

See documenttaion for member methods in the [OIDC](#oidc) type.

## Functions

### newOIDCProvider()

> **newOIDCProvider**\<`Identity`\>(`slug`): [`OIDCClient`](#oidcclient) \| [`OIDCServer`](#oidcserver)\<`Identity`\>

Defined in: [index.ts:152](https://github.com/epfl-si/meteor-accounts-oidc/blob/cbdcb58eb6b553d295b092717450ea1d8230eddf/index.ts#L152)

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
