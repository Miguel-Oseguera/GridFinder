<!-- Copilot instructions for GridFinder repository -->
# Copilot / AI agent instructions — GridFinder

This file contains short, actionable instructions to help AI coding agents be productive in this repository.

1. Big picture
   - This is a Next.js (App Router) frontend project located under `src/app`. The app is client-heavy and uses React 19 with Tailwind CSS.
   - Data layer: Prisma is configured in `prisma/schema.prisma` and the generated client is under `src/generated/prisma`. Expect server-side DB access via `@prisma/client` in future backend routes.
   - Mapping/UI: map-related code and helpers live in `src/components` (e.g., `gridFinderHelper.tsx` — a client widget simulating an AI helper). Look for map and clustering libs in `package.json` (`leaflet`, `maplibre-gl`, `supercluster`).

2. Important files & conventions
   - `package.json` scripts:
     - `npm run dev` — starts Next.js dev server (uses Turbopack by default).
     - `npm run build` — builds the Next.js app.
     - `npm run start` — runs production server.
     - `npm run lint` — runs `eslint`.
   - `src/app/page.tsx` — main landing page; small example components live here.
   - `src/app/layout.tsx` — root layout and global font/css imports.
   - `src/components/gridFinderHelper.tsx` — client component that toggles a floating chat UI; useful example of client state patterns and CSS module usage (`GridFinderHelper.module.css` expected).
   - `prisma/schema.prisma` — Prisma generator and `DATABASE_URL` env are expected; generated client output is `src/generated/prisma` in the repo.

3. Coding patterns to follow (based on repository)
   - Files under `src/app` use the App Router with server/client components. If you see `'use client'` at the top, treat the file as a client component and keep browser-only APIs.
   - Prefer importing the generated Prisma client from `src/generated/prisma` for DB work.
   - Styling: Tailwind CSS is used; global CSS is `src/app/globals.css`. Some components use CSS modules alongside Tailwind (see `GridFinderHelper.module.css` referenced in `gridFinderHelper.tsx`).
   - Small simulated AI integrations exist (placeholder text in `gridFinderHelper.tsx`) — preserve placeholder comments when wiring real APIs.

4. Build & run notes for the agent
   - To run locally use:
     ```bash
     npm install
     npm run dev
     ```
   - Prisma: the project expects `DATABASE_URL` in environment. The schema generator outputs into `src/generated/prisma` — do not delete this folder. If you need to regenerate, run:
     ```bash
     npx prisma generate
     ```

5. Tests & linters
   - There are no test scripts in `package.json` by default. Use `npm run lint` to run ESLint.

6. Common tasks and examples
   - Add a client-only helper: add `'use client'` to the top of a component, keep state with React hooks, and import CSS module alongside Tailwind classes (see `src/components/gridFinderHelper.tsx`).
   - Server data fetching: create a server component under `src/app` (no `'use client'`) and call the generated Prisma client there.

7. Integration & external deps
   - Map libraries: `leaflet`, `maplibre-gl`, `react-leaflet`, and `supercluster` are present; follow their client-only usage patterns (wrap map code in client components).
   - Prisma: `@prisma/client` + `prisma` are dependencies. `DATABASE_URL` env var required for migrations or runtime DB access.

8. Safety & constraints for AI edits
   - Do not remove `src/generated/prisma` or other generated files. If regenerating Prisma client, run `npx prisma generate` and commit only code changes.
   - Keep `next` and React versions aligned with `package.json` (Next 15 / React 19).
   - Preserve placeholder comments about future integrations (e.g., Gemini wiring in `gridFinderHelper.tsx`) when making changes.

If anything in this file is unclear or you want more detail (tests, CI, or backend routes), ask and I will update these instructions.
