import { Meteor } from "meteor/meteor"
import { ServiceConfiguration } from "meteor/service-configuration"
import { Configuration } from "./config"

function snakeToCamel(str : string) {
  return str.replace(/_([a-z0-9])/g, (match, p1) => p1.toUpperCase());
}

export function URIs (of : string | Configuration) {
  const { config, slug } =
        typeof(of) === "string" ?
        { config : Configuration(of), slug: of } :
          {config : of, slug : of.slug };

  const cachedWellKnown : { [ wellKnownUri : string ] : {
    token_endpoint ?: string
    user_info_endpoint ?: string
    authorization_endpoint ?: string
  } } = {};

  return {
    /**
     * @return The URL of the `user_info` OAuth2 endpoint found in either
     * the `service-configuration` data or
     * `.well-known/openid-configuration`, with priority to the former.
     *
     * @locus client, server
     */
    getUserInfoEndpoint() : Promise<string> {
      return getEndpoint("userinfo");
    },

    /**
     * @return The URL of the `user_info` OAuth2 endpoint found in either
     * the `service-configuration` data or
     * `.well-known/openid-configuration`, with priority to the former.
     *
     * @locus client, server
     */
    getTokenEndpoint () : Promise<string> {
      return getEndpoint("token");
    },

    /**
     * @return The URL of the `authorization` OAuth2 endpoint found in either
     * the `service-configuration` data or
     * `.well-known/openid-configuration`, with priority to the former.
     *
     * @locus client, server
     */
    getAuthorizationEndpoint () : Promise<string> {
      return getEndpoint("authorization");
    },

    /**
     * @return The URI to pass to the IdP as the OAuth redirection URI.
     *
     * ⚠ **This is not a configurable option.** The implementation of
     * the `meteor/oauth` package dictates that the return value be
     * `$ROOT_URL/ oauth/oidc` (or `$ROOT_URL/ oauth/yourSlug`),
     * regardless of even the `loginStyle` configuration parameter.
     *
     * @locus client, server
     */
    getRedirectionUri () : string {
      return Meteor.absoluteUrl(`/_oauth/${slug}`);
    }
  }

  async function fetchWellKnown () {
    const { baseUrl } = await config.getConfiguration();
    if (! baseUrl) {
      throw new ServiceConfiguration.ConfigError("`baseUrl` is not set in service configuration; unable to auto-detect endpoints.");
    }
    if (! cachedWellKnown[baseUrl]) {
      const response = await fetch(`${baseUrl}${baseUrl.endsWith("/") ? "": "/" }.well-known/openid-configuration`);
      cachedWellKnown[baseUrl] = await response.json();
    }
    return cachedWellKnown[baseUrl];
  }

  async function getEndpoint (
    endpointName : "token" | "userinfo" | "authorization"
  ) {
    const endpointNameFull = `${endpointName}_endpoint`;

    const conf = await config.getConfiguration();
    const endpointNameInConfig = snakeToCamel(endpointNameFull);
    if (conf[endpointNameInConfig]) {
      return conf[endpointNameInConfig];
    }

    const wellKnown = await fetchWellKnown();
    const uri = wellKnown[endpointNameFull];
    if (uri.startsWith("/")) {
      if (conf.baseUrl.endsWith("/")) {
        return `${conf.baseUrl}${uri.substr(1)}`;
      } else {
        return `${conf.baseUrl}${uri}`;
      }
    } else {
      return uri;
    }
  }
}

export function getMeteorUri (): string {
  return Meteor.absoluteUrl("");
}
