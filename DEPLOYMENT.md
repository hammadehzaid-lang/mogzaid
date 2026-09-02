# Deployment

GitHub Pages only hosts the files in `public`; it cannot run `server.js`. To make registrations visible to everyone, deploy this repository's Node server on a Node host such as Render, Railway, or Fly.io.

Set these environment variables on the API service:

```text
PORT=10000
ALLOWED_ORIGIN=https://hammadehzaid-lang.github.io
```

After deployment, copy the service URL into `public/config.js`:

```js
window.MOG_API_URL = 'https://your-api-service.example.com';
```

Commit and push `public/config.js`. The Pages site will then load `/leaderboard` from the API and send new snapshots to `/upload`.

The API needs persistent storage for production. This prototype stores `leaderboard.json` and uploaded images on disk; use a database and object storage on hosts whose filesystem is temporary. Obtain explicit consent before publishing face images.
