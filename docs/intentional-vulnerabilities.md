# Intentional vulnerability fixtures — private developer reference

This source document is an answer key for the local disposable environment. It is outside `public/`, is not linked by the application UI, and must not be copied into a browser bundle. All IDs, credentials, content, and diagnostics below are fictional. Never use external exfiltration payloads or scanner-name recognition to demonstrate these fixtures.

## Reproduction baseline

Stop the server, run `npm run db:reset`, then `npm run dev`. The only listener is `127.0.0.1:3000`. Use `http://localhost:3000` for manual testing or `http://127.0.0.1:3000` for the automated suite. All seeded accounts share `CoffeeAndChaos!42` for local development. User A is `alexm` (`u-alex`), User B is `dan.codes` (`u-dan`), and the administrator is `kevin_admin` (`u-kevin`). `jessp` participates with Alex in `convo-1`; Daniel and Mia own `convo-2`.

Tests in `tests/01-functional.spec.ts`, `tests/02-fixtures.spec.ts`, and `tests/03-browser.spec.ts` exercise actual HTTP/database/browser behavior. `tests/reset-check.mjs` independently verifies seed targets and restoration. Do not treat a fixture as verified unless its corresponding test passes in your environment.

## Injection and browser execution

| Feature / affected route | Preconditions and harmless verification | Vulnerable effect | Secure counterpart / expected effect |
| --- | --- | --- | --- |
| User search — `GET /api/search/users?q=` | Public. Supply URL-encoded `' OR 1=1 --` as `q`. | Concatenated SQLite SELECT changes its predicate and reveals the actual hidden seed record. | `/api/secure/search/users?q=` binds `q`; the payload is literal search text and returns no matching rows. |
| Post search — `GET /api/search/posts?q=` | Public. Use the same predicate payload. | The search returns the seed snapshot's posts rather than literal matches. | `/api/secure/search/posts?q=` uses bound parameters. |
| Account lookup — `GET /api/account/lookup?q=` | Any active account. Same predicate payload. | The fictional account projection returns rows beyond the intended lookup. | `/api/secure/account/lookup?q=` uses bound parameters and ordinary authentication. |
| Reflected HTML — `GET /search/preview?term=` | Public. URL-encode `<svg onload="window.__reflectedFixture=1"></svg>`. | Unescaped `term` enters an HTML response and sets the harmless browser marker. | `/search/preview-safe?term=` escapes the text and adds restrictive headers; no marker executes. |
| DOM HTML — `GET /discover?label=` | Public. URL-encode `<img src="/not-an-image" onerror="window.__domFixture=1">`. | Client rendering inserts untrusted navigation text with `innerHTML`. | `/discover-safe?label=` renders text without parsing markup. |
| Stored comments — `POST /api/posts/:id/comments`, read in a post's expanded comments | Alex creates a public post and stores `<img src="/not-a-real-image" onerror="window.__storedFixture=1">` as a comment. Jessica opens `/u/alexm` in a distinct browser session and expands that post's comments. | The exact database value is later interpreted as HTML in another account's browser. | `GET /api/secure/comments/:id` escapes the stored value and adds restrictive headers. Other profile and post text uses normal React text rendering. |

The injection database is a separate bounded, read-only projection created by the seed script. It contains fictional application rows only. There are no host-file, shell, external database, or outbound-request helpers. Ordinary CRUD uses Prisma queries. SQL errors may be observable, but a returned error string alone is not proof of injection; the tests require changed result sets and the hidden database row.

Explore normally searches live application data through parameterized `/api/users?query=` and `/api/posts/search?q=` routes, so newly registered users and new posts are searchable. Its “Search the founding archive” option selects the legacy seed-only search projection above. The snapshot is deliberately refreshed only by seeding/resetting; it never gives injection a connection to runtime user data.

## Authentication, authorization, privacy, and data exposure

| Feature / affected route | Preconditions and harmless verification | Vulnerable effect | Secure counterpart / expected effect |
| --- | --- | --- | --- |
| Message IDOR — `GET /api/messages/:conversationId` | Log in as Daniel and request `convo-1`. | A nonparticipant reads Alex/Jessica's stored conversation. | `/api/secure/messages/:id` and ordinary `/api/conversations/:id` return 403 to nonparticipants, 200 to participants. Message sends always check participation. |
| Photo IDOR — `GET /api/photos/:photoId` | Log in as Daniel and request `photo-1`. | The actual private seeded image is returned. | `/api/secure/photos/:id` checks privacy and ownership, rejecting Daniel and permitting Alex. |
| Missing authentication — `GET /api/account/export?userId=u-alex` | No login needed. Read the fictional export. | Another account's harmless account metadata is accessible publicly. | `/api/secure/account/export` requires login and ownership. |
| Function-level authorization — `GET /api/admin/overview` | Log in as a standard account. | Harmless simulated administrative records are returned without a role check. | `/api/secure/admin/overview` requires ADMIN. No dangerous administrative action is exposed. |
| Legacy session validation — `GET /api/account/activity` | Save an active session cookie, log out, then replay the saved cookie. | This read-only endpoint accepts an unexpired but revoked session. | `/api/secure/account/activity` and ordinary `/api/me` honor revocation. The browser's cookie is still cleared on ordinary logout. |
| Mass assignment — `PATCH /api/account/profile` | Any active account. Submit `isVerified`, `premiumStatus`, or `profileBadge`. | Application-owned cosmetic/subscription fixture state changes. | `/api/secure/account/profile` rejects these fields. `role`, credits, user ID, and arbitrary fields cannot gain administrative power through either route. |
| Excessive exposure — `GET /api/directory/:username` | Public. Read `alexm`. | The response includes unnecessary fictional account metadata. | `/api/secure/directory/:username` returns a public projection without email/internal metadata. Neither route exposes password hashes, session tokens, or real environment secrets. |
| Privacy/block bypass — `GET /api/profile/:username/archive` | Alex marks their account private and blocks Daniel; Daniel requests `alexm`. | The fixture ignores privacy/block relationships when retrieving stored posts. | `/api/secure/profile/:username/archive` rejects Daniel. Ordinary feed/profile behavior enforces privacy and blocks. |

The IDOR records are independent from scanner identity. Delete the humorous message and the authorization flaw still exists. Changing one fixture's local state does not grant host privileges or access to real accounts.

## Files, diagnostics, headers, redirects, and workflows

| Feature / affected route | Preconditions and harmless verification | Vulnerable effect | Secure counterpart / expected effect |
| --- | --- | --- | --- |
| Upload validation — `POST /api/upload` multipart `file`; `GET /media/uploads/:id` | Login. Upload a small HTML file containing `<script>window.__uploadFixture=1</script>` and open its returned URL in a controlled browser. | Insufficient type validation permits active browser content to render inline. | `/api/secure/upload` accepts only bounded raster files with matching signatures; the same HTML, even labeled `image/png`, is rejected. |
| Metrics — `GET /metrics` | Public. Read the response without auth. | Prometheus-format application metrics are exposed. | `/metrics-safe` requires ADMIN and adds security headers. |
| Diagnostic configuration — `GET /api/diagnostics/config` | Public. Inspect fictional labels and notes. | Harmless development metadata is exposed. | `/api/secure/diagnostics/config` requires ADMIN. No process environment dump exists. |
| Diagnostic text — `GET /api/diagnostics/report` | Public. Read the static simulated audit text. | A private-looking report record is publicly accessible. | `/api/secure/diagnostics/report` requires ADMIN. Both use a fixed fictional resource; no arbitrary path or file listing is accepted. |
| Security headers — `GET /search/preview` and selected fixture responses | Compare response headers with the safe preview. | The unsafe page permits inline scripts in CSP and omits selected defensive headers. | `/search/preview-safe` and `/api/secure/*` set CSP, `X-Content-Type-Options: nosniff`, and referrer policy. |
| Open redirect — `GET /go?next=` | Public. Send `https://example.invalid/fixture-only`; inspect a response with redirects disabled. | A redirect response accepts an untrusted HTTP(S) destination. | `/go-safe?next=` accepts same-origin relative navigation only; external destinations are rejected. Tests never navigate to the external URL. |
| Premium amount trust — `POST /api/premium/checkout`, then `POST /api/premium/activate` | Login, request a LIFETIME order, submit its ID with `amount:0`. | Fictional premium activates without paying the expected local credit price. | `/api/secure/premium/activate` checks the price and order owner. Both paths reject using another account's order. Ordinary UI submits the quoted price. |
| Verification approval trust — `POST /api/verification/claim` | Login. Send `step:"start"`, then `step:"complete"`, the returned `requestId`, and `approved:true`. | Client approval advances a local verification workflow. | `/api/secure/verification/claim` refuses an unreviewed request. Ordinary `/api/verification` creates a pending request. |

Uploaded names are not interpreted as host paths. Retrieval accepts a bounded generated filename beneath `data/uploads`. Uploaded PHP, shell, JavaScript server files, and similar content are never passed to an interpreter or process. The test uploads harmless PHP text and confirms exact literal read-back, plus a traversal rejection. This fixture demonstrates browser-side unsafe rendering, not host code execution.

## Seeded Easter eggs

The following are ordinary data or fixed harmless diagnostic resources. They are not activated by scanner payload recognition or user agents.

1. Hidden user `definitely_not_a_hacker`: “If you're reading this through SQL injection, we need to talk about your hobbies.” The row is reachable via the user-search predicate flaw.
2. `convo-1`: Alex asks whether the conversation is private; Jessica says “Obviously.” Alex then asks why a random cybersecurity scanner is reading it.
3. Diagnostic configuration contains `security_level: "trust_me_bro"` and `developer_note: "We tested it once. It worked."`.
4. Administrative overview includes the reminder to change the admin password, pending since 2022. No actual password is present in the note.
5. Private `album-1`, “Evidence I was productive today,” contains three fictional cat pictures and an empty to-do list.
6. A fictional LIFETIME premium account has balance `999999999` and badge “Financially irresponsible.” There is no real payment integration.
7. `/metrics` includes `security_audits_completed 0`, `bugs_introduced_this_week 47`, and `developer_confidence 100`, using valid metric syntax.
8. `security-audit-final-FINAL-v7.txt` is the fictional report name, with “Security review postponed until further notice.”
9. Diagnostic `release_note`: “Our security team is currently on lunch break.”
10. Administrative notes: “Congratulations. You have more access than our developers.”
11. Public directory support note: “If this shows up in your scan report, please pretend you did not see it.”

Most feed posts, comments, profiles, and messages remain ordinary social content. The automated seed checks verify the canonical records; the HTTP/browser suite verifies that the flaws remain observable through actual application behavior.

## Reset and verification discipline

Security and functional tests mutate local state. A full `npm run db:reset` with the app stopped removes all sessions, generated orders/claims, runtime uploads, and test writes, recreates the seed state, and restores the injection snapshot. Restart the app afterward. Do this before comparing scanner runs or recording videos.

The secure routes are negative controls for individual tests. The existence of those routes does not secure the intentionally unsafe application globally. The repository is suitable for a private local development workflow, not public deployment.
