# Lovable.dev Editing & Preview Audit

This document captures the current blockers that prevent the application from supporting code editing and live preview when deployed in the Lovable.dev environment.

## 1. Server boot fails without `DATABASE_URL`

* `server/db.ts` throws during module evaluation if `DATABASE_URL` is not defined. In Lovable.dev sandboxes we do not have a Neon/PostgreSQL database provisioned by default, so the process terminates before Express or Vite start. 【F:server/db.ts†L1-L14】
* Because the server never binds to the Lovable preview port, both the editor UI and the preview iframe stay blank.

## 2. No authenticated session means the WebSocket gets rejected

* The frontend opens a WebSocket to `/ws` as soon as the IDE loads. 【F:client/src/hooks/useWebSocket.ts†L4-L57】
* The backend only accepts upgrades when `req.session.user` is populated, otherwise it returns HTTP 401 and closes the socket. 【F:server/routes.ts†L95-L116】
* There is no route in the project that ever sets `req.session.user`, so every connection attempt is rejected. This breaks save notifications and any future real-time preview refresh logic.

## 3. Missing REST endpoints for projects, files, and preview assets

* The IDE relies on `/api/projects/:id`, `/api/projects/:id/files`, and `/api/projects/:id/preview` to load metadata, persist file changes, and render the preview iframe. 【F:client/src/pages/ide.tsx†L46-L85】【F:client/src/components/preview/LivePreview.tsx†L21-L75】
* The Express router currently exposes only `CSRF`, `health`, and `session` endpoints—none of the project/file routes exist, so every fetch call returns 404. 【F:server/routes.ts†L48-L78】
* As a result, the editor cannot load any file tree, create files, or resolve the preview URL that the iframe expects.

## Summary of required fixes

1. Provide a development-friendly fallback for `DATABASE_URL` (e.g., skip the Neon pool locally or allow an in-memory store) so the Lovable preview server can boot.
2. Implement authentication that populates `req.session.user`, or relax the WebSocket guard while in Lovable sandboxes to keep real-time features working.
3. Build out the `/api/projects`, `/api/projects/:id/files`, and `/api/projects/:id/preview` endpoints (and matching persistence) to power the editor and preview flows expected by the React client.

Until these issues are addressed, Lovable.dev will continue to block editing and preview for this application.
