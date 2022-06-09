# Cloudflare Proxy Worker

Cloudflare Proxy Worker is a worker script that logs every request that goes through cloudflare and stores request meta data in azure table storage like a log table. It also caches response in cloudflare cache and is customizable.

env is an KV binding containing secrets of azure storage account and add the KV ID in wrangler.toml (or) Bind KV in Cloudflare Dashboard

You can add custom domain in Cloudflare Dashboard (or) through wrangler.toml 

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kushwanth/cloudflare-proxy-worker)

#### Get your Account ID and create a new API Token

To get your account ID:

-   Go to Cloudflare dashboard and copy your account ID

To create a new API Token:

-   Go to https://dash.cloudflare.com/profile/api-tokens > Create Token
-   Give your token a name (i.e. Github Actions)
-   Choose start with template
-   Select the "Edit Cloudflare Workers" template
-   Account Resources > Include > {your account}
-   Zone Resources > Include > All zones from account > {your account}

To add the secrets in GitHub
-   Navigate to your GitHub repository > Settings > Secrets
-   Add the following secrets:

```
- Name: CF_API_TOKEN
- Value: your-api-token

- Name: CF_ACCOUNT_ID
- Value: your-account-id
```
