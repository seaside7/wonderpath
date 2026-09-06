# WonderPath Web

The browser app for WonderPath parents, built with Next.js 16 App Router,
React 19, and Tailwind v4.

## Running

The web app talks to the WonderPath API. By default it assumes the API is at:

```
http://localhost:3001
```

Override it with the `NEXT_PUBLIC_API_URL` environment variable.

Start the API (`apps/api`) first, then run the web app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth token storage

The API currently returns the JWT in the response body of `POST /auth/register`
and `POST /auth/login` (no httpOnly cookie support yet). To keep the token out
of persistent storage, the web app stores it in `sessionStorage` under the key
`wonderpath_token`, which is cleared when the browser tab closes.

Moving to an httpOnly cookie set by the API is a fast-follow: the API would set
the cookie on login, the web app would send it automatically, and
`sessionStorage` handling could be removed. This is not deferred indefinitely —
it is a deliberate next step once the API auth setup is extended.

## Routes

- `/` — landing
- `/login`, `/register` — public auth screens
- `/dashboard` — protected parent dashboard (route group `(dashboard)`)