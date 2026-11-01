# Sportivo migration record

Source: https://github.com/Althaf-1717/Sportivo
Reference commit: 49ca5c8d32811acaec4c7097be16a5ca30881cd8
Also inspected the live Sportivo homepage, login, cricket programme and coaching directory.

## Implemented

- React 18, Vite 6, JavaScript/JSX, React Router 6 and responsive CSS. No Next.js, Auth.js or server component API imports.
- Redesigned ivory/forest-green editorial UI with local sports photography, local fonts, responsive navigation and dedicated workspace layouts.
- Home, sports listing and details, coaches listing/search/filter and details, membership listing/details, academy and contact.
- Student, coach and admin login; student registration; role guards; 8-hour per-tab sessions; logout; account activation and password/profile edits.
- Existing documented primary accounts and source demo accounts seeded locally. Existing production MongoDB accounts cannot be copied without the database.
- Plan → sport → coach → review → simulated payment → membership and downloadable/printable receipt.
- Membership history, multi-sport enrolments, duplicate active-sport prevention, cohort capacity enforcement and expiry display.
- Athlete attendance, evaluation history, skill charts, coach feedback, profile and payments.
- Coach squad search, athlete detail pages, attendance batch upserts, attendance edit/delete, skill evaluation creation/edit/delete, overall override and profile.
- Admin programme, coach, athlete, plan and enrolment CRUD; account activation, attendance/evaluations, payment records, enquiry inbox, CSV exports, data export and audit history.
- Notifications for new enrolments and evaluations, with read-all action.
- Local repository plus interchangeable HTTP service adapter and MongoDB DTO/API contract.

## Route compatibility

All original page paths are represented: `/`, `/sports`, `/sports/:id`, `/coaches`, `/coaches/:id`, `/membership`, `/membership/:planId`, `/about`, `/contact`, `/login`, `/register`, `/coach`, `/admin`, `/dashboard`, `/dashboard/coaches`, `/dashboard/student/*`, `/dashboard/coach/*`, `/dashboard/admin/*`, `/students/:studentId`.

Student `/enrollment` is retained and `/enroll` is an additional shortcut. `/dashboard/coaches` redirects to `/dashboard/coach`. Original membership plan query parameters are accepted. Unknown paths show a working 404 page.

## Deliberate local-mode differences

- Local data is per browser/origin; it is not shared across devices. Session state is per tab. The source database is untouched.
- Payments are explicitly simulated, never advertised as actual paid transactions. Real Razorpay payment gateway endpoints require a backend later.
- Google OAuth is not presented as a working option without an OAuth backend. The original source’s insecure no-password Google-like shortcut is not copied. Email/password onboarding works offline.
- Next.js API routes are replaced by service methods. The HTTP adapter is ready to target a server, but the backend must implement the contract before enabling it.
- The source’s public catalogue lists six coaches while the live cricket page additionally lists Coach Shaik. The local catalogue includes all seven and preserves source demo coach accounts.
- Local password hashes and role checks are appropriate only for this mock application. They do not provide server-enforced authorization. Do not use it as a production system for sensitive data.
- No transactional email/SMS is sent. Contact submissions appear in the local admin inbox.

## Verification

Run `npm test` for service invariants and `npm run check:routes` for render checks across 46 public/protected route cases. Run `npm run build` for the production bundle. Browser review covered desktop, 390px mobile and 768px tablet home layouts, mobile navigation, coach filtering, contact navigation, local enquiry submission and static dashboard render snapshots. Authenticated interactive browser workflows were not exhaustively exercised; auth/data flows are verified by service tests and protected pages by render tests.
