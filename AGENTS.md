# Namayani Haulage — Base44 Dev Notes

## Project type
Static single-page site (`index.html`) for a cross-border haulage company. The contact form posts client-side to Formspree (`https://formspree.io/f/meaoorgb`) — no server-side backend needed for the page to render.

## What runs in the preview
nginx:alpine serves the repo root as static files on port 3000. A custom nginx config (`ops/nginx.base44.conf`) runs the worker as `root` because the repo directory has restrictive (700) permissions that would otherwise block nginx's default non-root worker.

## API routes (NOT served in preview)
`app/api/mcp/route.ts` and `app/.well-known/oauth-protected-resource/route.ts` are Next.js/Vercel serverless functions for an MCP endpoint. They are not part of the static site and require a Next.js runtime + env vars (`MCP_DEMO_TOKEN`, `MCP_AUTH_SERVER_ISSUER`, `MCP_RESOURCE_URL`) to function. The README confirms the public page is standalone static HTML.

## No external secrets needed
The static page has no server-side dependencies. The Formspree endpoint is hardcoded in the HTML form action and requires no credentials.

## Health
`docker compose -f docker-compose.base44.yml ps` should show `healthy`. Curl `http://localhost:3000/` returns 200 with the HTML page.
