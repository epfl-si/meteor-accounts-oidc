# `epfl:accounts-oidc` Atmosphere package

Connect your Meteor application to one or more identity provider (IdPs) using the modern and popular OpenID-Connect (OIDC) protocol.

## Features

- Fully compatible with the [Meteor accounts API](https://docs.meteor.com/api/accounts)
- Supports the OIDC “Authorization Code Flow”, in both [“popup” and “redirect” flavors](https://docs.meteor.com/api/accounts#popup-vs-redirect-flow)¹

¹ It is a bit unfortunate that the Meteor terminology sometimes uses “popup flow” and “redirect flow”, while they are one and the same flow in the OpenID-Connect sense 🤷‍♂️ In this documentation, we use “login style” instead.

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

The OIDC base URL is the one that returns JSON when you paste it into your browser's URL bar, append `/.well-known/openid-configuration` at the end of it, and press Enter. If your IdP doesn't provide such an auto-configuration JSON document, you will have to use advanced configuration (documented below) to provide each REST endpoint by hand.

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
           "secret": { "clientSecret": "CLIENT-SECRET" }
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

Like all `accounts-*` Meteor packages, `epfl:accounts-tequila` can
synchronize personal and other information received from the IdP at
login time into the [`Meteor.users`
collection](https://docs.meteor.com/api/accounts#Meteor-users) in
MongoDB. A generally useful default behavior is provided
out-of-the-box, which the Meteor application may override.

`epfl:accounts-tequila` directs Meteor to implement the following, default behavior:

1. Discern whether the user logging in already exists, by searching by `.services.oidc.id` in MongoDB using the user's email address as the search key.
2. If the search is unsuccessful (meaning that a new user needs to be created), populate the  `.profile` field of new user's MongoDB document with any and all the information present in either the `UserInfo` callback results, or the JWT claims. Here, “personal information” means any field mentioned in [the relevant section](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims) of the OpenID-Connect spec, excluding “technical“ fields i.e. `sub` and `updated_at`.
3. In all cases (new and existing users alike), create or update the `.services.oidc` structure thusly:
   - `.services.oidc.id` is set to the email address for new users (dovetailing with step 1), and
   - `.services.oidc.claims` is set from the decoded JWT claims — All of them this time, including `sub`, `aud` and more.


Note that `epfl:accounts-oidc` does not check the [JWKS signature](https://datatracker.ietf.org/doc/html/rfc7517) in steps 2 and 3, because it doesn't need to. Read up on that in the [API documentation](api/API.md#claims).

You may alter the default behavior described above, by providing your own callback(s) and/or method overrides in server code as described below:

- Calling [`Accounts.onCreateuser`](https://docs.meteor.com/api/accounts#AccountsServer-onCreateUser), lets you override step 2 altogether. More on this below;
- calling [`Accounts.setAdditionalFindUserOnExternalLogin`](https://docs.meteor.com/api/accounts#AccountsServer-setAdditionalFindUserOnExternalLogin), lets you control what happens when step 1 doesn't find the user, even though it should (i.e., a false negative). For instance, your will need to make use of this hook in order to “merge” users between multiple IdPs;
- and finally, overwriting `OIDC.getUserServiceData` on the server with your own implementation, lets you change the behavior for steps 1 and 3 at will. See [the API documentation](api/API.md#getuserservicedata) for full details.

Regarding `Accounts.onCreateuser` (the “easiest” of these), the personal information that `epfl:accounts-oidc` prepared for the default behavior (i.e. without your hook callback), is available as `options.profile` in that call; meaning that you can get started by writing

```typescript
import { CreateUserOptions } from 'meteor/epfl:accounts-oidc'

Accounts.onCreateUser((options : CreateUserOptions, user : any) => {
  user.profile = options.profile;

  return user;
});
```

which will behave exactly as if you didn't use a `Accounts.onCreateUser` hook at all. To improve from there, you can use the other stuff in `options` (besides `options.profile`) that `epfl:accounts-oidc` prepared for this exact purpose; again, consult [the API documentation](api/API.md#createuseroptions) for the full story.

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


### Multiple Providers

Suppose, for instance, that you want your users to be able to log in
using either their GitHub account, or their Google account.

If so, the function
[`newOIDCProvider(slug)`](api/API.md#newoidcprovider) should be called
on both client and server. It returns an object that works just like
`OIDC`, except that it consumes a separate configuration named after
`slug`. That is, you should re-read “Configure the Meteor app,” above,
mentally replacing `oidc` with the chosen value of `slug` (i.e. in
`settings.json` or in your `upsertAsync` call). For instance:

```typescript
// imports/authProviders.ts

import { newOIDCProvider } from 'meteor/epfl:accounts-oidc'

export const Google = newOIDCProvider('google');
export const GitHub = newOIDCProvider('github');

```

```typescript
// server/auth.ts

import '../imports/authProviders'

// See above on why (or whether) you want an `onCreateUser` callback:
Accounts.onCreateUser((options, user : any) => {
    user.profile = options.profile;
    if (options.service === "google") {
        // ...
    } else if (options.service === "github") {
        // ...
    }
    return user;
}
```

```typescript
// client/components/multilogin.tsx

import React from "react"
import { Meteor } from "meteor/meteor"
import { useTracker } from 'meteor/react-meteor-data'
import { OIDC } from "meteor/epfl:accounts-oidc"
import { Google, GitHub } from "../../imports/authProviders"

function LoginLogoutClicky () {
    const isLoggedIn = useTracker(() => !! Meteor.userId());

    return isLoggedIn ?
          <div><a href="#" onClick={() => Meteor.logout()}>Logout</a></div> :
          <>
              <div><a href="#" onClick={() => Google.login()}>Log in with Google</a></div>
              <div><a href="#" onClick={() => GitHub.login()}>Log in with GitHub</a></div>
          </>;
}
```

```typescript
// settings.json
{
    "packages": {
        "service-configuration": {
            "google": {
                // ...
            },
            "github": {
                // ...
            }
    }
}
```

⚠ As briefly mentioned above, this will cause users from either IdP to live in entirely different namespaces, even if they happen e.g. to have the same email address as disclosed by both IdPs. In many cases, this is not what you want; see § “User synchronization”, above to figure out what you should do about that.

# Configuration Reference

| Option name           | Purpose                                                                                                                                                                                       | Example value(s)                                                                                 | Default                                                                                               |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| `loginStyle`          | Choose the UX for the login operation in the browser                                                                                                                                          | `"popup"` or `"redirect"`                                                                        | `"popup"`                                                                                             |
| `scope`               | A list of strings (with IdP-specific meaning) stipulating which personal information to retrieve at login time                                                                                | `"openid email"` or `["openid", "email"]`                                                        | `"openid"`                                                                                            |
| `clientId`            | The OpenID-Connect Client ID                                                                                                                                                                  | `SomethingThatLooksLikeTheCatWalkedOnYourKeyboard`                                               | N/A                                                                                                   |
| `secret.clientSecret` | The OpenID-Connect Client Secret. Note that that key is not at the top level like all the others; it is nested inside a `secret` dict, so as not to be transmitted (published) to the client. | `More-C@t-Typ1ng,//butWithL33tCh^rsMaybe.ItDepends`                                              | N/A                                                                                                   |
| `loginUrlParameters`  | IdP-specific additional query parameters to pass at login time                                                                                                                                | `{"prompt": "consent"}`                                                                          | `{}`                                                                                                  |
| `baseUrl`             | The base URL to resolve OpenID-Connect endpoints from                                                                                                                                         | `https://login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/v2.0`                  | N/A                                                                                                   |
| `tokenEndpoint`       | The URL of the [OIDC Token Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint)                                                                                     | `https://login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/oauth2/v2.0/token`     | `token_endpoint` JSON response field at URL: `baseUrl + "/.well-known/openid-configuration"`          |
| `authorizeEndpoint`   | The URL of the [Authorization Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#AuthorizationEndpoint) (the one that the server calls to finish the OAuth login process)        | `https://login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/oauth2/v2.0/user_info` | `authorization_endpoint` JSON response field  at URL: `baseUrl + "/.well-known/openid-configuration"` |
| `userinfoEndpoint`    | The URL of the [UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)                                                                                            | `https://login.microsoftonline.com/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeeee/oauth2/v2.0/user_info` | `userinfo_endpoint` JSON response field at URL: `baseUrl + "/.well-known/openid-configuration"`       |
| `popupOptions`        | Any options to pass to the popup window, if `loginStyle === "popup"`                                                                                                                          | `{ height: 800, width: 600 }`                                                                    | `{}`                                                                                                  |

See also: [`OIDCConfiguration` in the API docs](api/API.md#oidcconfiguration)
