# `epfl:accounts-oidc` Atmosphere package

Connect your Meteor application to an identity provider (IdP) using the modern and popular OpenID-Connect (OIDC) protocol.

## Features

- Fully compatible with the [Meteor accounts API](https://docs.meteor.com/api/accounts)
- Supports the OIDC “Authorization Code Flow”, in both [“popup” and “redirect” flavors](https://docs.meteor.com/api/accounts#popup-vs-redirect-flow)¹

¹ It is a bit unfortunate that the Meteor terminology sometimes uses “popup flow” and “redirect flow”, while they are one and the same flow in the OpenID-Connect sense 🤷‍♂️ In this documentation, we use “login style” instead.

## Planned Features

- PKCE ([RFC7636](https://datatracker.ietf.org/doc/html/rfc7636))

## Non-features

- Support for Meteor versions prior to 3
- “Older” OpenID-Connect or OAuth flows (implicit, hybrid, and so on)
- Client-side OAuth token redeeming. `epfl:accounts-oidc` assumes that the *server*, not the browser, will be [fetching the tokens from the IdP](https://openid.net/specs/openid-connect-core-1_0.html#TokenRequest) at the end of a successful authentication. That is, you should *not* set “single-page Web app” mode in Entra, in spite of what you believe you know about Meteor and single-page Web apps. This is in contrast to, say, [`@epfl-si/react-appauth`](https://www.npmjs.com/package/@epfl-si/react-appauth).

# Install

In your Meteor v3 project, say

```
meteor add epfl:accounts-oidc
```

# Configure the Identity Provider

The goal of this step is to obtain the **client ID**, **client secret** and **OIDC base URL** for use below. Consult the documentation of your IdP to find out how to do that.

The OIDC base URL is the one that returns JSON when you paste it into your browser's URL bar, append `/.well-known/openid-configuration` at the end of it, and press Enter. If your IdP doesn't provide such an auto-configuration JSON document, you will have to use advanced configuration (documented below) to provide each OAuth 2 entry point by hand.

For security reasons, many OIDC-compliant IdPs, including Keycloak and Entra, want to know in advance (i.e. whitelist) which URLs the user's browser can be redirected to after logging in. *Meteor doesn't let you pick the URL here*; as [documented](https://guide.meteor.com/accounts#oauth-configuration), you need to use `$ROOT_URL/_oauth/oidc` where `$ROOT_URL` is the root URL of the Web app.

## Configure the Meteor app

Do *one* of the following:

- in  your `settings.json`:

   ```javascript
   { // ...
     "packages": {
       "service-configuration": {
         "oidc": {
           "loginStyle": "redirect",
           "baseUrl": "login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/",
           "clientId": "CLIENT-ID",
           "secret": { "clientSecret": "CLIENT-SECRET" }
         }
       }
     }
   }
   ```
- **OR** <br/> in some file under `server/`:

   ```typescript
   import { Meteor } from "meteor/meteor"
   import { ServiceConfiguration } from "meteor/service-configuration"

   Meteor.startup(async () => {
     await ServiceConfiguration.configurations.upsertAsync(
       { service: "oidc" },
       {
         $set: {
           loginStyle: "redirect",
           "baseUrl": "https://login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/",
           "clientId": "CLIENT-ID",
           "clientSecret": "CLIENT-SECRET"
         },
       }
     );
   });
   ```

## Use in your app

### Client-side API

The sole entry point for client code is `OIDC.login()`; it takes no arguments. (There is no logout function; use `Meteor.logout()` instead.)

If, for example, you use React and [`react-meteor-data`](https://docs.meteor.com/packages/react-meteor-data), your login / logout widget could look like this:

```typescript
import React from "react"
import { Meteor } from "meteor/meteor"
import { useTracker } from 'meteor/react-meteor-data'
import { OIDC } from "meteor/epfl:accounts-oidc"

function LoginLogoutClicky () {
    const isLoggedIn = useTracker(() => !! Meteor.userId());

    return <>
      { isLoggedIn ?
          <a href="#" onClick={() => Meteor.logout()}>Logout</a> :
          <a href="#" onClick={() => OIDC.login()}>Login</a> }
    </>;
}
```

### User synchronization

`OIDC.getNewUserData` and `OIDC.getUserServiceData` are two functions
that the server-side application code may override, so as to customize
how information is synchronized from the IdP responses into the
`Meteor.Users` MongoDB collection on the server.

The default implementation, which will suit most needs,

- matches the `email` field of the `UserInfo` IdP JSON response
  against the `.services.oidc.id` field of existing users, to avoid
  creating duplicates;
- creates and populates new users' `.profile` out of the personal
  information present in either the `userInfo` callback results, or
  the JWT claims;
- updates the `.services.oidc.claims` from the claims in the
  [JWT](https://jwt.io/) ID token upon each successful login.

Note that `epfl:accounts-oidc` does not check the [JWKS
signature](https://datatracker.ietf.org/doc/html/rfc7517) on said JWT
token, because it doesn't need to. Read up on that, as well as the API
that lets you alter the aforementioned default behavior, in the JSDoc
comments inside `index.ts` in the module's source code.

### RBAC example with the `groups` claim

Assuming your IdP is configured to disclose a `groups` claim in the
JWT token, here is how to securely use it on the server:

```typescript
export async function getGroups () {
  const user = await Meteor.userAsync();
  return user?.services?.oidc?.claims?.groups || [];
}

export async function ensureMemberOfGroup (groupName) {
  if ( -1 == (await getGroups()).index(groupName) ) {
    throw new Meteor::Error("Unauthorized")
  }
}
```

Use `await ensureMemberOfGroup("relevant-group");` as an opener in all
your server-side publications, methods etc. per the recommendations of
[the Meteor documentation](https://guide.meteor.com/security)) to
achieve a rudimentary, yet effective form of role-based access
control, or
[RBAC](https://en.wikipedia.org/wiki/Role-based_access_control).

# Configuration Reference

| Option name          | Purpose                                                                                                                                                                                | Example value(s)                                                                                 | Default                                                                                               |
|----------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| `loginStyle`         | Choose the UX for the login operation in the browser                                                                                                                                   | `"popup"` or `"redirect"`                                                                        | `"popup"`                                                                                             |
| `scope`              | A list of strings (with IdP-specific meaning) stipulating which personal information to retrieve at login time                                                                         | `"openid email"` or `["openid", "email"]`                                                        | `"openid"`                                                                                            |
| `loginUrlParameters` | IdP-specific additional query parameters to pass along with the initial browser redirect to the IdP                                                                                    | `{"foo": "bar"}`                                                                                 | `{}`                                                                                                  |
| `baseUrl`            | The base URL to resolve OpenID-Connect endpoints from                                                                                                                                  | `https://login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/v2.0`                  | N/A                                                                                                   |
| `tokenEndpoint`      | The URL of the [OIDC Token Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint)                                                                              | `https://login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/oauth2/v2.0/token`     | `token_endpoint` JSON response field at URL: `baseUrl + "/.well-known/openid-configuration"`          |
| `authorizeEndpoint`  | The URL of the [Authorization Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#AuthorizationEndpoint) (the one that the server calls to finish the OAuth login process) | `https://login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/oauth2/v2.0/user_info` | `authorization_endpoint` JSON response field  at URL: `baseUrl + "/.well-known/openid-configuration"` |
| `userinfoEndpoint`   | The URL of the [UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)                                         | `https://login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/oauth2/v2.0/user_info` | `userinfo_endpoint` JSON response field at URL: `baseUrl + "/.well-known/openid-configuration"`       |
