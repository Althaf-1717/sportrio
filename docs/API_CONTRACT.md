# MongoDB integration boundary

The default application is fully local. It does not open a database connection or contact the original website. UI components call the `Academy` interface through `AppContext`. Set `VITE_API_URL` only after implementing this contract in an independent Node.js/Express (or equivalent) server. The included `HttpAcademy` adapter switches the same UI to that API. No Next.js dependency is needed.

## Responses and sessions

`GET /bootstrap` returns `{ user: null | UserDTO, data: AcademySnapshot }`. Return public sports, coaches and plans to signed-out clients. Students receive only their records; coaches receive only assigned athletes; admins receive academy records. Never send password hashes or security codes. Use HTTP-only, Secure, SameSite session cookies, server-side expiry, CSRF protection and rate limiting. For cross-origin hosting, permit only the frontend origin with credentialed CORS. Prefer a same-origin reverse proxy at `/api`.

Errors return an appropriate HTTP status plus `{ message: string }`. All mutations are followed by `/bootstrap` to refresh the frontend. Logout should still permit public bootstrap.

| Method | Path | Input / behavior |
| --- | --- | --- |
| POST | /auth/login | `{email,password,role,code?}` → `{user}`; verify role and admin code server-side |
| POST | /auth/register | `{name,email,password}` → `{user}`; always create a student |
| POST | /auth/logout | Revoke session |
| POST | /enrollments | `{sportId,coachId,planId}`; validate ownership, cohort capacity, plan and dates |
| PUT | /attendance | `{date,time,drill,records:[{studentId,status,remarks}]}`; transactional upsert within coach assignment |
| POST | /evaluations | `{studentId,date,fitness,technique,composure,override?,notes,trainingNotes,skillLevel}` |
| PATCH / DELETE | /attendance/:id | Update training fields or delete; coach ownership or admin required |
| PATCH / DELETE | /evaluations/:id | Update scores/date/notes or delete; coach ownership or admin required |
| POST | /admin/:resource | Create `sports`, `plans`, `coaches`, `users`, `subscriptions` |
| PATCH / DELETE | /admin/:resource/:id | Update/delete allowed fields; preserve referential integrity |
| PATCH | /admin/users/:id/status | `{active}`; prevent self-deactivation |
| PATCH | /profile | Name, phone, birth date, gender, address; coaching specialty/bio; optional current/new password |
| PATCH | /notifications | `{markAll:true}`; update only caller’s notifications |
| POST | /contact | `{name,email,message}`; validate, rate-limit and persist inquiry |

## Collections and field mapping

IDs in the UI are string `id` values. Serialize MongoDB `_id` to `id`, and map references to string IDs. Dates use YYYY-MM-DD except audit/notification timestamps, which use ISO 8601.

| UI data | MongoDB collection | Key fields / original source mapping |
| --- | --- | --- |
| users | users | `id`, name, email (unique lowercase index), role, active (`isActive`), profile fields; server-only bcrypt/Argon2 password |
| coaches | coaches | `id` corresponds to the coach’s user ID; sportId (`sports`), specialty (`specialization`), experience, bio |
| sports | sports | id/slug, name, description, skills (comma-separated focus list), schedule, capacity |
| plans | membershipplans | id/slug, name, price, months (`duration`), description, features (comma-separated in UI) |
| subscriptions | enrollments | studentId (`student`), coachId (`coach`), sportId (`sport`), planId (`membershipPlan`), startDate, endDate, status |
| attendance | attendances | studentId, coachId, sportId, date, time, drill (`work`), status, remarks |
| evaluations | progresses | fitness (`fitnessScore`), technique (`technicalScore`), composure (`performanceScore`), overall (`overallProgress`), notes (`remarks`), trainingNotes, skillLevel |
| payments | payments | studentId, subscriptionId, plan/sport display names, amount, date, status |
| notifications | notifications | userId, message, date, read |
| messages | contactinquiries | name, email, message, date, status |
| audit | auditlogs | actor, action, date; extend with actor ID and old/new values on server |

Status normalization: local `Active/Expired/Cancelled` maps to original lowercase enums; local `Present/Absent` maps to lowercase attendance enums. Local `Simulated` must never map to a successful real payment.

## Migration sequence

1. Build server DTO mappers and role-enforced `/bootstrap` from the original MongoDB models. Reuse existing user password hashes on the server to preserve real accounts.
2. Implement and test the routes above with schema validation, ownership checks and protected fields. Use bcrypt or Argon2 on the server. The client’s local hashes are demo-only, not a production credential system.
3. Use MongoDB transactions for payment verification, enrolment activation, cohort capacity checks and receipt creation. Add unique email and attendance indexes; prevent duplicate activation/payment replay.
4. Configure `MONGODB_URI`, session secret, payment keys and optional Google OAuth values only on the backend. Do not import a MongoDB driver into the Vite bundle.
5. Implement real Razorpay order creation/signature verification and Google OAuth separately. The current checkout deliberately collects no money, and there is no fake Google sign-in button.
6. Set `VITE_API_URL=/api` (or the deployed backend origin), then restart/build the client. Test all roles against staging before using real academy data.

The adapter and contract are supplied; an implemented MongoDB server and live OAuth/payment integration are not included in this local-first delivery. The existing database is neither read nor changed.
