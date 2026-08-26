# FlightMeshAir Feeder Analytics

An authenticated, account-scoped analytics dashboard for approved FlightMeshAir feeders. The browser receives only station data authorized by the customer session; upload tokens, password hashes, and raw station coordinates are never exposed.

## Run locally

```sh
python3 -m http.server 4175
```

Open `http://localhost:4175`. Authentication requires a local `/api` proxy or a deployed Vercel preview.

## Deploy

The included `vercel.json` proxies `/api/*` to the FlightMeshAir API so the analytics session remains first-party. Create a Vercel project from this directory using the default static-site settings and attach `analytics.flightmeshair.com` under **Settings → Domains**.

## Production boundary

Keep database credentials and queries on the protected backend. Never add database credentials, personal feeder coordinates, or receiver upload tokens to this static frontend. Station ownership must continue to be verified by the `/account/stations/*` API routes.
