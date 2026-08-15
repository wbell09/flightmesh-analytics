# FlightMeshAir Analytics Preview

A public, read-only analytics preview for FlightMeshAir. The current dashboard uses synthetic values only and contains no Databricks credentials, real feeder locations, personal information, or live aircraft data.

## Run locally

```sh
python3 -m http.server 4175
```

Open `http://localhost:4175`.

## Deploy

Create a new Vercel project from this directory and use the default static-site settings. Add `analytics.flightmeshair.com` under **Settings → Domains**, then create the exact `analytics` CNAME record requested by Vercel in GoDaddy.

## Production boundary

Keep Databricks credentials and queries on a protected backend. Never add Databricks access tokens, personal feeder coordinates, or private receiver credentials to this static frontend or to variables prefixed with `VITE_`.
