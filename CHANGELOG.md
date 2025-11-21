# Version 0.2.0

- Multiplicity of `OIDC`-like objects, for apps that want to support more than one provider (e.g. Google and GitHub)
- No more overridable `getNewUserProfile()` method; users ought to set up an `Accounts.onCreateuser()` callback in the server instead to override the behavior (otherwise unchanged from v0.1.0) when creating new users.

# Version 0.1.0

Initial release.
