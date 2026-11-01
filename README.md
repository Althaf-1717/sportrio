# Sportivo — React + Vite

A redesigned, local-first React version of Sportivo Athletic Academy, based on the supplied Next.js repository. JavaScript only; React Router; no Next.js runtime or APIs.

## Run locally

Use Node.js 20.19+ or 22.12+ (tested on Node 24).

```bash
npm install
npm run dev
```

Open the URL printed by Vite. No database connection, API keys or `.env` file is needed. After installation, images, fonts and app data are local.

```bash
npm test
npm run check:routes
npm run build
npm run preview
```

## Login

Your documented athlete, coach and admin credentials are preserved in the local demo. Use the matching portal:

- Athlete: `/login` — `student1@gmail.com`
- Coach: `/coach` — `coach1@gmail.com`
- Admin: `/admin` — `althafshaik1717@gmail.com` (same existing admin security code)

Use the passwords from your original project/README. The source seed accounts `student@sportivo.demo`, `admin@sportivo.demo` and each `<coach-slug>@sportivo.demo` are also supported with their source seed passwords. New students can create an account at `/register`. Admins can provision coaches and athletes. Password changes invalidate the previous local password and compatibility aliases.

## Workflows

**Athlete:** sign in → join a programme → choose plan/sport/coach → simulate payment → open receipt, membership, attendance and progress. Additional sports are supported; duplicate active enrolment in the same sport is prevented.

**Coach:** sign in → view squad → record attendance → create evaluations → review/edit/delete own training records. Students can see those changes after signing into the same browser origin.

**Admin:** sign in → manage athletes, coaches, programmes, plans and enrolments → review payments, attendance, evaluations and enquiries → export records and review activity history.

Payments and data are demonstrations. No money is collected. Data persists in localStorage on the current browser/origin. Logout does not erase it. Sessions expire after eight hours and are per tab. There are no live database connections and no copied production records.

## Structure

- `src/components`: navigation, dashboard shell, UI, record editing controls
- `src/pages`: public pages, auth, training workspaces and admin tools
- `src/context`: app data/auth state, loading, errors and feedback
- `src/services/academy.js`: local business rules, authorization checks, CRUD
- `src/services/repository.js`: persistent local storage and HTTP helper
- `src/services/httpAcademy.js`: drop-in future backend adapter
- `src/data`: original programme catalogue and hashed local demo accounts
- `public/images`, `public/fonts`: self-hosted assets
- `tests`: service/invariant regression tests
- `scripts/check-routes.mjs`: public and protected route render smoke tests
- `docs/API_CONTRACT.md`: MongoDB mapping and backend integration contract
- `docs/MIGRATION.md`: coverage, route compatibility, differences and test limits

## MongoDB later

Keep `VITE_API_URL` empty for local mode. Implement the documented API on your backend, keep `MONGODB_URI` and secrets there, and set `VITE_API_URL` only once that backend is ready. React components do not need rewriting. Existing production accounts can be preserved by reusing the original server-side password hashes.

Local authentication is a mock, not production security. Google OAuth and real Razorpay processing require backend integration; this version does not pretend those services are connected.

## Hosting

`npm run build` writes `dist`. Use an SPA history fallback to `index.html`. Vercel rewrites and Netlify `_redirects` are included. Serve over HTTP/HTTPS; do not open `index.html` directly from disk.

Original image assets belong to the supplied Sportivo repository. Fonts are DM Sans and Manrope (SIL Open Font License); attribution is in `public/fonts/ATTRIBUTION.md`.
