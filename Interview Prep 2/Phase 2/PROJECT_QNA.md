# Vyakta AI — Complete Project Interview Q&A

> Everything you need to answer any question about this project. Read this once and you own every answer.

---

## TABLE OF CONTENTS

1. [Project Overview Questions](#1-project-overview-questions)
2. [Architecture & Design Questions](#2-architecture--design-questions)
3. [Backend — Node.js & Express Questions](#3-backend--nodejs--express-questions)
4. [Authentication & Security Questions](#4-authentication--security-questions)
5. [Database & MongoDB Questions](#5-database--mongodb-questions)
6. [AI Integration — Gemini & Zod Questions](#6-ai-integration--gemini--zod-questions)
7. [PDF Generation — Puppeteer Questions](#7-pdf-generation--puppeteer-questions)
8. [File Upload — Multer Questions](#8-file-upload--multer-questions)
9. [Frontend — React Questions](#9-frontend--react-questions)
10. [State Management Questions](#10-state-management-questions)
11. [React Router & Navigation Questions](#11-react-router--navigation-questions)
12. [API Communication & Axios Questions](#12-api-communication--axios-questions)
13. [CORS Questions](#13-cors-questions)
14. [UX & Design Decision Questions](#14-ux--design-decision-questions)
15. [Docker & Deployment Questions](#15-docker--deployment-questions)
16. [Performance & Optimization Questions](#16-performance--optimization-questions)
17. [Tricky / Gotcha Questions](#17-tricky--gotcha-questions)
18. [What Would You Improve Questions](#18-what-would-you-improve-questions)

---

## 1. PROJECT OVERVIEW QUESTIONS

---

**Q: Tell me about this project in 2 minutes.**

A: Vyakta AI is a full-stack AI-powered interview preparation platform. The core idea is: a user pastes a job description, optionally uploads their resume PDF, and our AI generates a personalized interview preparation report. That report includes 8-10 tailored technical questions with model answers, 8-10 behavioral questions with STAR-method answers, a skill gap analysis with severity ratings, a full 20-day day-by-day preparation roadmap, and a match score from 0 to 100. There's also an on-demand "Interview X-Ray" feature that does a deeper evidence-based analysis of the resume — it identifies blind spots where the resume creates expectations the candidate may not be prepared to meet.

On the technical side: the backend is Node.js + Express with MongoDB for persistence. The AI uses Google Gemini with Zod schema enforcement to guarantee structured JSON output. PDF resume generation uses Puppeteer to headlessly render HTML to PDF. The frontend is React 19 with Vite, feature-based folder structure, React Context for state, and custom hooks for business logic. Everything is containerized with Docker and served behind Nginx in production.

---

**Q: What problem does this project solve?**

A: Most job seekers prepare for interviews generically — they study common questions from lists online. This is inefficient because interviews are heavily tailored to the specific role, tech stack, and company. Vyakta AI solves this by analyzing the actual job description you're applying for against your actual resume or background, and generating questions that the specific company for that specific role would realistically ask. It also shows you skill gaps you need to close and a structured plan to close them before the interview. The X-Ray feature goes even further — it reads your resume the way an interviewer reads it and shows you the exact points that will attract follow-up questions, which most candidates are completely unprepared for.

---

**Q: What are the main features of the project?**

A:
1. **User Authentication** — Register, login, logout with JWT HttpOnly cookies and token blacklisting for proper logout
2. **Interview Report Generation** — AI-generated tailored report: technical questions, behavioral questions, skill gaps, 20-day roadmap, match score, job title extraction
3. **Resume Upload** — Optional PDF resume upload (parsed to text server-side using pdf-parse)
4. **Interview X-Ray** — On-demand 5-pass evidence-based resume blind spot analysis using Gemini
5. **AI Resume PDF Generation** — Gemini generates a tailored HTML resume, Puppeteer converts it to a downloadable PDF
6. **Dashboard** — Home page listing all past interview reports with match scores and dates
7. **Protected Routes** — Frontend guards routes so unauthenticated users are redirected to login
8. **Session Persistence** — JWT cookie persists session across browser close/reopen

---

**Q: How long did it take to build? What was the hardest part?**

A: The hardest part technically was getting the AI output to be consistently structured. Initially, Gemini would return JSON that was sometimes missing fields or had inconsistent nesting. The solution was using Zod + `toJSONSchema` + Gemini's `responseSchema` config — this forces the model to output JSON that exactly matches the schema on every call. The X-Ray prompt engineering was also complex — getting Gemini to do proper evidence-based analysis (not just generic advice) required the 5-pass instruction structure and strict rules like "you MUST NOT invent weaknesses" and "every blind spot MUST be backed by an exact resume quote."

Another challenge was the PDF generation pipeline — Puppeteer in Docker requires specific Chromium flags (`--no-sandbox`, `--disable-setuid-sandbox`) and the correct executable path via environment variable, which took iteration to get right.

---

## 2. ARCHITECTURE & DESIGN QUESTIONS

---

**Q: Explain the overall architecture of the project.**

A: The project follows a standard client-server architecture with three layers:

1. **Frontend** (React/Vite) — serves the UI, manages state with React Context + custom hooks, communicates with backend via Axios over HTTP
2. **Backend** (Node.js/Express) — REST API server, handles auth, business logic, AI orchestration, file parsing
3. **Database** (MongoDB/Mongoose) — stores users, token blacklist, interview reports

In production, both layers are Docker containers. The frontend container runs Nginx which serves static files AND proxies `/api/*` requests to the backend container on port 3000. This means the browser only ever talks to one origin (port 80), which eliminates cross-origin cookie issues in production.

The backend itself follows a 4-layer architecture: Routes → Middleware → Controllers → Services/Models. Each layer has a single responsibility.

---

**Q: Why did you choose a monorepo structure with separate Backend and Frontend folders?**

A: It's a pragmatic middle ground. A true monorepo would use workspaces (npm/yarn/turborepo) with shared packages. Separate repos would make local development more complex. Having both in one Git repo with separate folders means: you can clone once and run both services, Docker Compose can build both from relative paths, environment variables are co-located, and the README can document the whole system. It also keeps the CI/CD pipeline simple — one repo push, one pipeline, build both containers.

**Alternative considered:** Full monorepo with Turborepo and shared types. That would be overkill for a project of this size but would be the right move if the team grew or you needed shared TypeScript interfaces between frontend and backend.

---

**Q: Why did you choose a feature-based folder structure in the frontend instead of a layer-based one?**

A: Layer-based would look like: `/components`, `/hooks`, `/services`, `/pages`, `/context`. Feature-based looks like: `/features/auth/{components,hooks,services,pages,context}`, `/features/interview/{...}`.

The feature-based approach wins because:
- **Co-location**: Everything related to auth is in one place. You don't jump between 5 folders to understand one feature.
- **Scalability**: Adding a new feature (e.g., `profile`, `settings`) is just adding a new feature folder without touching existing code.
- **Encapsulation**: The auth feature's `Protected.jsx` lives inside auth because it's an auth concern. In layer-based, it would be lost in a general `/components` folder.
- **Cognitive load**: When you work on interview feature, you only care about `/features/interview`. Everything else is invisible.

The trade-off is slight redundancy (both features have their own `services`, `hooks` folders) but the benefits far outweigh it at any real scale.

---

**Q: Why Express v5 over v4? What changed?**

A: Express v5 (which was in release candidate for a long time before stable) introduced several improvements:
- **Async error handling**: In v4, if an async route handler threw an error, you had to manually call `next(err)`. In v5, if an `async` route handler returns a rejected promise, Express automatically passes it to error handlers. This is why the controllers don't have explicit `next(err)` calls in many places.
- **Stricter routing**: Some path matching edge cases were fixed.
- **Removed deprecated APIs**: Cleans up the API surface.

The choice was made because v5 is now stable and the automatic async error propagation reduces boilerplate.

---

**Q: Why did you separate the entry point (server.js) from the Express app (app.js)?**

A: This is a critical separation for testability and clarity.

`server.js` owns: environment loading, DB connection, HTTP server creation (`.listen()`).
`app.js` owns: Express instance, middleware registration, route mounting.

Benefits:
1. **Testing**: In tests, you can `require('./src/app.js')` and test the Express app in isolation without starting a real HTTP server or connecting to a real DB. Tools like `supertest` inject requests directly into the Express app object.
2. **Clarity of responsibility**: The app.js is "what does my API do?" The server.js is "how do I run it in this environment?"
3. **Startup ordering**: `server.js` ensures DB connects FIRST, then starts listening. This prevents the app from accepting requests before the DB is ready.

---

**Q: What is the 4-layer backend architecture you used?**

A: Every incoming request passes through exactly 4 layers:

**Layer 1 — Routes** (`auth.routes.js`, `interview.routes.js`): Only maps HTTP methods + paths to middleware chains and controllers. Contains zero business logic.

**Layer 2 — Middleware** (`auth.middleware.js`, `file.middleware.js`): Cross-cutting concerns that apply before the controller runs. Auth middleware verifies JWT, file middleware handles multipart parsing. Results are attached to `req` (req.user, req.file) for the next layer.

**Layer 3 — Controllers** (`auth.controller.js`, `interview.controller.js`): Owns the business logic flow — extracts data from req, calls models/services, sends responses. Does not interact directly with the database schema or raw AI SDK — those are delegated.

**Layer 4 — Models/Services** (`user.model.js`, `ai.service.js`, etc.): The deepest layer. Models define database schemas and provide query methods. The AI service encapsulates all Gemini SDK calls and Puppeteer logic.

This layering means: changing the AI provider only affects `ai.service.js`. Changing the database only affects models. Changing auth logic only affects its middleware and controller.

---

## 3. BACKEND — NODE.JS & EXPRESS QUESTIONS

---

**Q: How does the server start up? Walk me through server.js.**

A:
```
1. require('dotenv').config()   -> loads .env variables into process.env
2. connectDB()                  -> async: opens Mongoose connection to MongoDB Atlas
3. await ensures step 2 completes before step 4
4. app.listen(PORT)             -> starts accepting HTTP connections
```

The `await connectDB()` before `app.listen()` is critical. If you listen first, the server could receive requests and try to query the database before the connection is open, causing crashes. If `connectDB()` throws (e.g., wrong MONGO_URI), `process.exit(1)` kills the process cleanly instead of running a broken server.

---

**Q: What middlewares does the Express app use and why?**

A: In `app.js`, four global middlewares are registered before routes:

1. `express.json()` — Parses requests with `Content-Type: application/json` into `req.body`. Without this, `req.body` is `undefined` for JSON requests.

2. `express.urlencoded({ extended: true })` — Parses traditional HTML form submissions (`application/x-www-form-urlencoded`). The `extended: true` allows nested objects using the `qs` library.

3. `cookieParser()` — Parses the `Cookie` HTTP header into a `req.cookies` object. Without this, `req.cookies.token` would be `undefined` and the entire JWT-cookie auth system breaks.

4. `cors()` — Handles Cross-Origin Resource Sharing. Without this, the browser blocks all responses from a different origin (localhost:3000 vs localhost:5173 in dev). Also enables `credentials: true` so cookies travel cross-origin.

---

**Q: Why is the order of middleware registration important?**

A: Express runs middleware in the order it's registered. The rules:
- `cookieParser()` MUST be before auth middleware — otherwise `req.cookies.token` doesn't exist when authUser runs
- `express.json()` MUST be before controllers — otherwise `req.body` is undefined
- `cors()` MUST be before routes — otherwise CORS headers are set too late, after the browser has already rejected the response
- Route handlers MUST be after all global middleware — they're the final destination

If you put `express.json()` after a route, POST requests to that route would have no body. This order dependency is a common Express gotcha.

---

**Q: How does cookieParser() work? Why do you need it?**

A: The browser sends cookies as a raw string in the HTTP `Cookie` header: `Cookie: token=eyJhbGci....; other_cookie=value`. Without `cookieParser()`, Express gives you this raw string in `req.headers.cookie` — you'd have to parse it manually. `cookieParser()` does the parsing and gives you `req.cookies.token = "eyJhbGci..."` — a clean JS object. Since the entire auth system reads `req.cookies.token`, this middleware is non-negotiable.

---

**Q: Explain the CORS configuration in detail. Why the function form instead of a simple origin string?**

A: A simple origin string (`origin: "http://localhost:5173"`) is fine for a single environment, but this app needs to work in two environments with different rules:

**Production**: Only `CLIENT_URL` (from env) is allowed — strict security.
**Development**: Any `localhost:*` is allowed — developer convenience (port changes frequently with Vite, Webpack, etc.).

Using a function gives you runtime logic:
```
if no origin (Postman, curl, server-to-server) → always allow
if production environment → strictly check CLIENT_URL
if development environment → regex match any localhost port
```

The regex `/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/` matches:
- `http://localhost` (no port)
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:4000`
- etc.

`credentials: true` is mandatory to allow cookies. If this is `false` (the default), the browser strips all cookies from cross-origin requests regardless of `withCredentials` on the client.

---

**Q: What does `credentials: true` in CORS mean? What breaks if you remove it?**

A: The browser has a security rule: for cross-origin requests, cookies are NOT sent by default. To opt in to sending cookies cross-origin, BOTH sides must agree:
- **Server**: `Access-Control-Allow-Credentials: true` header (set by `credentials: true` in cors config)
- **Client**: `withCredentials: true` in the Axios request config

If you remove `credentials: true` from CORS:
1. The server sends `Access-Control-Allow-Credentials: false` (or omits the header)
2. The browser sees this and refuses to send the `Cookie` header with requests
3. `req.cookies.token` on the backend is always `undefined`
4. Every protected endpoint returns 401 "Token not provided"
5. The entire auth system breaks

---

## 4. AUTHENTICATION & SECURITY QUESTIONS

---

**Q: How does authentication work in this project? Full flow.**

A: The project uses **JWT stored in an HttpOnly cookie**. Here's the complete flow:

**Registration/Login:**
1. User submits credentials
2. Backend validates, creates/finds user, hashes password with bcrypt
3. `jwt.sign({ id, username }, JWT_SECRET, { expiresIn: "1d" })` creates a signed token
4. Token is set as a cookie: `res.cookie("token", token, { httpOnly: true, ... })`
5. Browser stores the cookie automatically

**Subsequent Requests:**
1. Browser automatically includes cookie in every request to the domain
2. `cookieParser()` middleware parses `Cookie` header → `req.cookies.token`
3. `authUser` middleware extracts, verifies the token
4. `req.user = decoded` attaches user identity for the controller

**Logout:**
1. Token is added to blacklist collection in MongoDB
2. Cookie is cleared with `res.clearCookie("token")`
3. Even if someone copied the token, it now fails the blacklist check

---

**Q: Why JWT in a cookie instead of JWT in localStorage?**

A: This is the most important security question about this project.

**localStorage vulnerabilities:**
- Accessible via JavaScript: `localStorage.getItem('token')`
- If an XSS (Cross-Site Scripting) attack injects malicious JS into the page, it can read the token and send it to an attacker's server
- Session hijacking becomes trivial with XSS

**HttpOnly cookie benefits:**
- `httpOnly: true` makes the cookie inaccessible to ALL JavaScript, including injected malicious code
- `document.cookie` doesn't show it, `localStorage` doesn't have it
- Even successful XSS cannot steal the token
- The browser automatically handles sending it with every request (you don't manage it in JS)

**The trade-off:**
- HttpOnly cookies are vulnerable to CSRF (Cross-Site Request Forgery) — a malicious site can trick the browser into making authenticated requests to your server because cookies are sent automatically
- Mitigation: `SameSite: "lax"` (dev) or `SameSite: "none"` with HTTPS (prod) limits when cookies are sent. A CSRF token could further harden this.

**Why not session tokens?**
- Sessions require server-side storage — every request needs a DB lookup to validate the session ID
- JWTs are self-contained — the server validates by verifying the signature, no DB lookup required for EVERY request (only for blacklist checks on logout-sensitive endpoints)

---

**Q: Why did you use bcryptjs and not the native crypto module?**

A: Two reasons:

1. **Designed for passwords**: `bcrypt` is specifically designed for password hashing. It's intentionally SLOW (CPU-intensive) which makes brute-force attacks expensive. The native `crypto` module's `pbkdf2` or `scrypt` can do the same, but `bcrypt` is the community standard with a simpler API.

2. **Salt factor**: `bcrypt.hash(password, 10)` — the `10` is the cost factor (rounds). It means 2^10 = 1024 iterations of the hash function. This takes ~100ms on a modern CPU. If an attacker gets the hash database, they can only try ~10 passwords/second with a GPU instead of billions. The higher the factor, the more secure but slower registration/login.

**Why bcryptjs (JS pure) over bcrypt (native)?**
`bcryptjs` is pure JavaScript — no native bindings, no build step required, works on any platform including Alpine Linux Docker containers without extra packages. `bcrypt` (the C binding) is faster but requires `node-gyp` and build tools in the Docker image, increasing image size and build complexity.

---

**Q: How does the token blacklist work? Why do you need it?**

A: JWTs are **stateless** — the server doesn't store them. Once issued, a JWT is valid until its expiry (`expiresIn: "1d"`). This means if a user clicks logout, the token hasn't actually expired — it's still valid for up to 24 hours. If someone captured that token (network sniffing, etc.), they could still use it post-logout.

The blacklist solves this: when a user logs out, the current token is saved to the `blacklistTokens` MongoDB collection. Every protected request now checks: "is this token in the blacklist?" If yes, reject it even if the JWT signature is mathematically valid.

**The blacklist check in authUser:**
```js
const isBlacklisted = await tokenBlackListModel.findOne({token})
if (isBlacklisted) return res.status(401).json({ message: "Unauthorized: Token is blacklisted." })
```

**The trade-off:**
This adds one DB query per protected request (the blacklist check). This partially defeats the "no DB lookup" benefit of JWTs. In a high-traffic production system, you'd use Redis to store the blacklist in memory (O(1) lookup vs MongoDB's O(log n) index lookup).

**Why not just use shorter JWT expiry (e.g., 5 minutes) instead of a blacklist?**
Short-lived tokens require refresh token mechanisms — more complexity. The blacklist approach is simpler for this project scale while achieving proper logout security.

---

**Q: Why does login give the same error message for wrong email AND wrong password?**

A: This is a deliberate security pattern to prevent **username enumeration**.

If you returned "User not found" for wrong email vs "Wrong password" for wrong email+password:
- Attacker submits email: `target@example.com`
- Server says "User not found" → attacker knows this email is NOT registered
- Server says "Wrong password" → attacker knows this email IS registered
- Now attacker can brute-force specifically registered users

By returning the same message "Invalid email or password" for both cases, the attacker learns nothing about which emails exist in the system.

This is why every login form from Google, GitHub, etc. says "Incorrect username or password" rather than specifying which part is wrong.

---

**Q: Why is the blacklist check BEFORE jwt.verify() in the middleware?**

A: At first it seems like you should verify the JWT first (to make sure it's a valid token) before doing the DB lookup. But there's a subtle reason to check the blacklist first:

`jwt.verify()` is a synchronous CPU operation (signature verification). If you put it first, you're doing CPU work on EVERY request including from attackers sending garbage tokens just to trigger DB queries. If the token is clearly expired, malformed, or invalid, `jwt.verify()` throws before the DB lookup.

Actually, looking at the actual code — the blacklist check IS before `jwt.verify()`. Here's why this is CORRECT:

1. Extract token from cookie
2. Check blacklist (DB query) — this catches logged-out tokens that are still technically valid
3. `jwt.verify()` — this catches expired, malformed, or tampered tokens

The reason to check blacklist before verify: if the token is blacklisted, we know it's a logged-out session and can reject fast without even verifying the cryptographic signature.

In practice, both orderings work — the answer that matters is: you need BOTH checks. The signature check (verify) alone doesn't handle logout. The blacklist check alone doesn't handle tampered/expired tokens.

---

**Q: What is the JWT payload structure? What's in it?**

A:
```js
jwt.sign(
    { id: user._id, username: user.username },  // payload
    process.env.JWT_SECRET,                       // secret key
    { expiresIn: "1d" }                           // options
)
```

The payload contains `id` (the MongoDB ObjectId as string) and `username`. After `jwt.verify()`, the decoded payload is attached as `req.user`:
```js
req.user = { id: "...", username: "...", iat: 1234567890, exp: 1234654290 }
```

The controller then uses `req.user.id` to query the database:
```js
userModel.findById(req.user.id)
interviewReportModel.find({ user: req.user.id })
```

**Why not put email in the payload?**
Less is more in JWT payloads. The payload is base64-encoded (NOT encrypted — it can be read by anyone). Only put what you need for authorization decisions, not sensitive PII. `id` is enough to identify and look up the full user.

**Why not put the whole user object in the JWT?**
The JWT payload is sent with every request. Larger payloads = larger cookies = more bandwidth. Also, if you store the user's role/email in the JWT and then change it in the DB, the JWT still has the old value until it expires. Keeping just the `id` means you always fetch fresh data.

---

**Q: How does getMeController work and why is it needed?**

A: `getMeController` is the session restoration endpoint — it answers the question "is my current cookie still valid?".

Flow:
1. Frontend loads → `useAuth` hook fires `useEffect([], ...)` → calls `getMe()`
2. `GET /api/auth/get-me` → `authUser` middleware runs → verifies JWT cookie
3. If valid: `userModel.findById(req.user.id)` → returns `{ id, username, email }`
4. Frontend: `setUser(data.user)` → user is "logged in" without re-entering credentials

Without this: every browser refresh would show the user as "not logged in" even if they logged in yesterday. The cookie is still there but the React state (`user`) was reset because JS memory is wiped on page reload. `getMe` re-hydrates the state from the persistent cookie.

---

**Q: What is `sameSite` on the cookie and why does it change between dev and production?**

A:
- **Development** (`sameSite: "lax"`): Cookies are sent with same-site requests AND top-level cross-site navigation (like clicking a link). Blocks cookies on cross-site AJAX/fetch requests. Works when frontend (localhost:5173) and backend (localhost:3000) are both on `localhost`.

- **Production** (`sameSite: "none"`): Cookie is sent on ALL cross-origin requests. This is REQUIRED when frontend (vyakta.ai) and backend (api.vyakta.ai) are on different domains. BUT `sameSite: "none"` requires `secure: true` — the cookie must travel over HTTPS only.

**Why `secure: true` only in production?**
`secure` means the cookie is only sent over HTTPS connections. In development, you're on HTTP (localhost). If you set `secure: true` in dev, the cookie is NEVER sent (because localhost is HTTP) and auth breaks completely.

---

## 5. DATABASE & MONGODB QUESTIONS

---

**Q: Why MongoDB over a relational database like PostgreSQL?**

A: For this specific use case, MongoDB is a good fit because:

1. **Schema flexibility**: The interview report document has deeply nested, variable-length arrays (technicalQuestions, blindSpots, preparationPlan tasks). In SQL, this would require 4-5 tables with JOINs. In MongoDB, it's one document.
2. **Document model matches the domain**: An interview report is naturally a document — you always access the whole report together, never just "give me all technical questions across all reports."
3. **AI output fits perfectly**: Gemini returns a JSON object. That JSON maps directly to a MongoDB document with zero transformation.
4. **Speed of development**: Mongoose schemas are optional validation layers, not rigid constraints. You can iterate the data shape without migrations.

**Where PostgreSQL would be better:**
- Complex reporting queries (e.g., "average match score by job title across all users") — SQL aggregations are more powerful
- Strong relational data with many-to-many relationships
- ACID transactions across multiple tables (though MongoDB 4+ has multi-document transactions)
- If type safety across the whole stack was critical, PostgreSQL + Prisma + TypeScript gives end-to-end types

---

**Q: Explain the interviewReport model schema design.**

A: The schema has several nested sub-schemas, each defined separately with `{ _id: false }` on embedded documents:

```
technicalQuestionSchema — { question, intention, answer }  (_id: false)
behavioralQuestionSchema — same shape                      (_id: false)
skillGapSchema — { skill, severity: Enum["low","medium","high"] } (_id: false)
preparationPlanSchema — { day, focus, tasks: [String] }    (HAS _id)
blindSpotSchema — complex nested schema                    (_id: false)
interviewXRaySchema — { blindSpots[], conversationDrivers[], ... } (_id: false)
```

**Why `_id: false` on embedded schemas?**
By default, Mongoose adds an `_id` field to every sub-document. For arrays of embedded documents (like `technicalQuestions`), this creates unnecessary `_id` fields on each question object — they'll never be queried individually. `_id: false` removes this overhead and keeps the document clean.

**Why is `interviewXRay` nullable/optional?**
X-Ray is generated on-demand, separately from the main report. Most reports will NEVER have an X-Ray (users might not want it, or they didn't trigger it). Making it optional means the main report generation stays fast and cheap.

**Why `timestamps: true` on the main schema?**
This auto-adds `createdAt` and `updatedAt` fields managed by Mongoose. `createdAt` is used to sort reports on the home dashboard (newest first). You get this for free with `timestamps: true` — no manual date management.

---

**Q: Why does getAllInterviewReports use .select() to exclude fields?**

A: The home dashboard shows a list of report cards. Each card only needs:
- `_id` (for navigation to `/interview/:id`)
- `title` (display name)
- `matchScore` (shown as a pill)
- `createdAt` (formatted date)

But each interview report document also contains:
- `resume` — potentially thousands of characters of PDF text
- `selfDescription` — more text
- `jobDescription` — full job posting (can be very long)
- `technicalQuestions` — array of 8-10 objects with long answer strings
- `behavioralQuestions` — same
- `preparationPlan` — 20 objects each with multiple task strings
- `skillGaps` — smaller but still unnecessary
- `interviewXRay` — potentially the largest sub-document

Sending all this data for a list of 20 reports would be enormous. The `.select("-resume -selfDescription ...")` tells MongoDB to exclude these fields from the query result, sending only the lightweight fields needed for list display.

**Alternative**: Pagination. Instead of fetching all 20 reports at once, fetch 10 at a time. This is a scalability improvement that would matter at higher user counts.

---

**Q: How does Mongoose handle the connection? Is a new connection created for each request?**

A: No. `mongoose.connect(MONGO_URI)` called ONCE in `database.js` creates a connection pool (default: 5 connections). Mongoose reuses these connections for all subsequent queries. This is called connection pooling.

When a query comes in:
1. Mongoose takes an available connection from the pool
2. Executes the query
3. Returns the connection to the pool

If all 5 connections are busy (high traffic), new queries queue until a connection frees up. You can configure the pool size: `mongoose.connect(uri, { maxPoolSize: 20 })`.

This is why you only call `connectDB()` once at startup — calling it on every request would create thousands of connections and overwhelm MongoDB.

---

**Q: What is the `user` field on InterviewReport and why use ObjectId reference?**

A: `user: { type: mongoose.Schema.Types.ObjectId, ref: "users" }` creates a reference (foreign key in SQL terms) from the interview report to the user who created it.

**Why store a reference instead of embedding user data?**
- The same user can have many interview reports — embedding user data in each report would mean duplicating the username/email everywhere and updating all records when user info changes
- References normalize the data — user info lives in one place

**How the reference is used in queries:**
```js
interviewReportModel.find({ user: req.user.id })
```
This finds all reports WHERE the `user` ObjectId matches the logged-in user's ID. This is the core data isolation mechanism — users can only see their own reports.

**The ownership check in X-Ray and report fetch:**
```js
interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })
```
This double-condition query ensures: (1) the report exists AND (2) it belongs to the requesting user. If someone passes someone else's `interviewReportId` in the URL, this query returns null → 404, not the report.

---

## 6. AI INTEGRATION — GEMINI & ZOD QUESTIONS

---

**Q: How do you integrate Google Gemini AI? What SDK are you using?**

A: Using `@google/genai` (Google's official JS SDK for the Gemini API). The SDK is initialized once at module load:

```js
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })
```

Each AI call uses `ai.models.generateContent(...)` with:
- `model: "gemini-flash-latest"` — uses the latest flash model (fast, cost-effective)
- `contents: prompt` — the text prompt
- `config: { responseMimeType: "application/json", responseSchema: ... }` — forces structured output

The response is always `response.text` which is a JSON string, and `JSON.parse(response.text)` gives the structured JS object.

---

**Q: What is Zod and why is it used here?**

A: Zod is a TypeScript-first schema declaration and validation library. In this project, it serves a different purpose than typical validation — it's used to define the SHAPE of AI output and enforce it at the Gemini API level.

`toJSONSchema(zodSchema)` converts a Zod schema to a JSON Schema object (the industry standard format). Gemini's `responseSchema` option accepts JSON Schema and uses it as a constraint on the model's output — it forces the model to produce JSON that exactly matches the schema on every call.

**Without Zod + responseSchema:**
- Gemini might return a 7-item array when you asked for 8-10
- Fields might be missing or renamed
- Numbers might come back as strings
- The `JSON.parse()` would succeed but the data would be broken
- `interviewReportModel.create()` might fail on validation

**With Zod + responseSchema:**
- Gemini's API enforces the schema server-side before returning
- `JSON.parse(response.text)` always gives a correctly-shaped object
- You can safely spread it into `interviewReportModel.create()` without field-by-field validation

---

**Q: Why `gemini-flash-latest` instead of `gemini-pro` or `gemini-ultra`?**

A: The trade-off is cost vs. quality:
- `gemini-ultra` / `gemini-pro` — highest quality, best reasoning, most expensive, slower
- `gemini-flash-latest` — fast (sub-5s for most requests), much cheaper, good quality for structured generation tasks

For this use case (generating interview questions and analysis from a prompt with schema enforcement), `flash` provides sufficient quality. The schema enforcement via `responseSchema` compensates for any quality gap in structure — the model just needs to fill in reasonable content, not perform complex reasoning.

**Alternative**: Use `gemini-pro` for X-Ray (more reasoning-intensive) and `flash` for the main report (more templated). This was not implemented to keep the code simple, but would be a valid optimization.

---

**Q: How does the Zod schema map to what Gemini actually returns?**

A: The mapping is:
1. Zod schema is defined in `ai.service.js` (e.g., `interviewReportSchema`)
2. `toJSONSchema(interviewReportSchema)` converts it to a JSON Schema object
3. This JSON Schema is passed to Gemini as `config.responseSchema`
4. Gemini's API uses this schema as a grammar constraint — the model MUST produce output that validates against this schema
5. The response text is a JSON string guaranteed to match
6. `JSON.parse(response.text)` gives a JS object with exactly the typed structure

The Zod `.describe()` calls add descriptions to each field — Gemini uses these descriptions as additional context for WHAT to generate, improving output quality.

---

**Q: What does `responseMimeType: "application/json"` do?**

A: This tells Gemini to return ONLY valid JSON (no markdown, no prose, no code fences like ` ```json ``` `). Without it, even with `responseSchema`, the model might wrap the JSON in markdown formatting which would break `JSON.parse()`. Combined with `responseSchema`, you get: valid JSON guaranteed to match your schema.

---

**Q: What is the Interview X-Ray feature technically? How does the 5-pass prompt work?**

A: X-Ray is a separate AI call that performs evidence-based blind spot analysis of the resume. The prompt instructs Gemini to perform 5 sequential analysis passes in one call:

**Pass 1 — Technology Extraction**: List every technology, tool, framework in the resume  
**Pass 2 — Claim Extraction**: Find project claims, achievements, strong descriptors ("scalable", "expert")  
**Pass 3 — Expectation Mapping**: For each claim, determine the depth an interviewer would expect  
**Pass 4 — Gap Identification**: Where is the gap between what's claimed and what the candidate likely knows?  
**Pass 5 — Probability Ranking**: Order blind spots by how likely the interviewer actually asks about each  

The prompt has strict rules: "You MUST NOT invent weaknesses" (every blind spot needs a resume quote), "You MUST NOT generate generic questions" (only follow-up questions from specific claims), "You MUST think like an interviewer, not an AI tutor."

The `existingReport` context is passed so Gemini doesn't repeat the skill gap analysis already done in the main report — X-Ray should be COMPLEMENTARY, not duplicative.

---

**Q: Why is X-Ray a separate API call instead of being part of the initial report generation?**

A: Three reasons:

1. **Cost**: X-Ray is an additional Gemini API call. Not every user will want it. If included in the main report, every user pays for it whether they use it or not.

2. **Performance**: The initial report already takes 20-40 seconds. Adding X-Ray would double the wait to 40-80 seconds, which would make the initial generation feel broken.

3. **UX Design**: X-Ray is positioned as a "deep dive" feature the user explicitly requests — it has its own section, its own "Run X-Ray Analysis" button, and its own scanning animation. This makes it feel premium and intentional rather than just part of the standard output.

The result is saved to the existing report document (not a new document) because it's supplementary to the same interview session. Once generated, it's persisted — the user never has to wait again.

---

**Q: What is `toJSONSchema` and why import it from zod?**

A: `toJSONSchema` is a utility from the `zod` package that converts a Zod schema object into a standard JSON Schema (draft-07) format. JSON Schema is the universal schema standard supported by many tools and APIs. Gemini's `responseSchema` accepts JSON Schema format, not Zod format directly. So the conversion is:

```
Zod Schema (TypeScript/JS format) → toJSONSchema() → JSON Schema (JSON format) → Gemini API
```

This is imported as `const { z, toJSONSchema } = require("zod")`.

---

## 7. PDF GENERATION — PUPPETEER QUESTIONS

---

**Q: How does the AI-generated resume PDF work end-to-end?**

A: A 2-step pipeline:

**Step 1 — AI generates HTML**: Gemini is prompted to generate an ATS-friendly HTML resume tailored to the specific job description. The schema forces the response to be `{ html: string }`. The prompt instructs: "professional design with some color, ATS-friendly, 1-2 pages, not obviously AI-generated."

**Step 2 — Puppeteer converts HTML to PDF**:
```js
const browser = await puppeteer.launch({ args: ["--no-sandbox", ...] })
const page = await browser.newPage()
await page.setContent(htmlContent, { waitUntil: "networkidle0" })
const pdfBuffer = await page.pdf({ format: "A4", margin: { top: "20mm", ... } })
await browser.close()
return pdfBuffer
```

The raw binary `pdfBuffer` is sent directly as the HTTP response body with appropriate headers. The browser downloads it.

---

**Q: Why Puppeteer for PDF generation instead of a PDF library like PDFKit or jsPDF?**

A: Puppeteer renders HTML in a real Chromium browser and exports to PDF. PDF libraries build PDFs programmatically.

**Why Puppeteer wins here:**
- The AI generates HTML — Puppeteer renders that HTML natively. No translation needed.
- HTML/CSS gives unlimited design flexibility — fonts, colors, layouts, tables
- The result looks EXACTLY like what you'd see in a browser — no rendering artifacts
- Complex layouts (two-column resume, bullet lists, custom fonts) just work

**Why PDFKit/jsPDF would lose:**
- You'd need to parse the AI's HTML output and translate it to PDFKit's programmatic API (draw text at x,y coordinates)
- Complex layouts require manual calculation
- Design flexibility is limited to what the library supports

**Trade-off with Puppeteer:**
- Heavy — Chromium is a ~300MB dependency
- Memory-intensive — a Chromium instance for each PDF generation
- Requires special Docker flags (no sandbox in container)
- Cold start time (~2-3 seconds)

In a high-traffic production system, you'd run a dedicated PDF generation service (separate container) with a pool of warm Chromium instances instead of launching/killing one per request.

---

**Q: What do the Puppeteer launch arguments mean?**

A:
```js
args: [
    "--no-sandbox",           // Disable Chrome's sandbox
    "--disable-setuid-sandbox", // Disable setuid sandbox
    "--disable-dev-shm-usage",  // Use /tmp instead of /dev/shm (small by default in Docker)
    "--disable-gpu"            // No GPU (servers don't have GPUs)
]
```

**Why `--no-sandbox`?**: Chrome's sandbox isolates processes for security. Inside a Docker container, the container itself provides isolation. The sandbox requires kernel features (like user namespaces) that may not be available in all container environments. Running without sandbox is acceptable inside a container.

**Why `--disable-dev-shm-usage`?**: Chrome uses `/dev/shm` (shared memory) by default. In Docker containers, `/dev/shm` is only 64MB by default. Large pages can exceed this, causing crashes. This flag makes Chrome use `/tmp` (disk) instead.

**Why `--disable-gpu`?**: Servers don't have GPUs for rendering. Without this flag, Chrome might try GPU acceleration and fail.

---

**Q: What is `waitUntil: "networkidle0"` in Puppeteer?**

A: `page.setContent(html, { waitUntil: "networkidle0" })` tells Puppeteer to wait until there are zero active network connections for at least 500ms before considering the page loaded.

**Why this matters for PDFs**: The AI-generated HTML may reference external fonts (Google Fonts), external CSS, or external images. If you generate the PDF immediately after setting content, external resources haven't loaded yet — the PDF might use fallback fonts or be missing styles. `networkidle0` ensures all external resources are fetched and rendered before the PDF is captured.

**Trade-off**: This adds latency (waiting for network resources). For fully inline HTML (no external dependencies), `{ waitUntil: "load" }` would be faster.

---

**Q: Why does the PDF endpoint use `PUPPETEER_EXECUTABLE_PATH` from environment?**

A: In development, Puppeteer downloads and manages its own Chromium binary. In Docker (production), you don't want Puppeteer to download Chromium during the build (it's large and slow). Instead, the Dockerfile installs system Chromium: `apt-get install -y chromium`. Then:
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` — don't download Chromium during npm install
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` — use the system-installed Chromium

The code uses this: `executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined`. In development (`undefined`), Puppeteer uses its bundled Chromium. In production, it uses the system Chromium at the specified path. This keeps Docker images smaller (no duplicate Chromium) and the dev experience clean.

---

## 8. FILE UPLOAD — MULTER QUESTIONS

---

**Q: How is the resume PDF uploaded and processed?**

A: The upload uses Multer middleware configured with `memoryStorage()`. The flow:

1. Frontend sends `multipart/form-data` POST request with the PDF file + text fields
2. Multer intercepts the request on the route: `upload.single("resume")`
3. Multer reads the file into RAM as a `Buffer` → available as `req.file.buffer`
4. Controller receives `req.file.buffer`
5. `new pdfParse.PDFParse(Uint8Array.from(req.file.buffer)).getText()` extracts text
6. Text is included in the Gemini prompt as the resume content

---

**Q: Why `memoryStorage()` instead of `diskStorage()`?**

A: `memoryStorage()` keeps the uploaded file in RAM as a Buffer. `diskStorage()` writes it to disk first, then you read it back.

**Why memory storage wins:**
1. **Speed**: No disk I/O. The Buffer is immediately available.
2. **Docker compatibility**: You can't guarantee writable disk paths in containers without mounted volumes. Memory storage works everywhere.
3. **Simplicity**: No cleanup needed. When the request ends, the Buffer is garbage collected.
4. **The file is transient**: The PDF is only needed for text extraction. Once extracted to `resumeText`, the PDF binary is never needed again. No reason to persist it.

**Trade-off**: 3MB file limit (configured in Multer) is enforced to prevent memory exhaustion. If you allowed 50MB uploads, 100 simultaneous uploads would use 5GB of RAM.

**When diskStorage would be better**: If you needed to serve the uploaded file later (e.g., show the user their original resume). Then you'd save to disk or S3/GCS and store the path.

---

**Q: Why is the file size limited to 3MB?**

A: A practical PDF resume is almost never larger than 3MB — they typically range from 50KB to 500KB. The 3MB limit:
- Prevents malicious users from uploading huge files to exhaust server memory
- A 3MB PDF would take forever to read anyway — if someone's resume is 3MB it's full of images (which don't help text extraction)
- pdf-parse only extracts TEXT from PDFs — images are ignored, so a large image-heavy PDF gives the same text output as a small one

For a production hardening, you'd also validate `mimetype` (ensure it's actually `application/pdf`, not a renamed .exe) and limit file count.

---

**Q: What happens if the user doesn't upload a resume?**

A: The upload is optional. The code handles this:
```js
let resumeText = ""
if (req.file && req.file.buffer) {
    const resumeContent = await new pdfParse.PDFParse(...).getText()
    resumeText = resumeContent.text
}
```

If no file: `req.file` is `undefined`, `resumeText` stays `""`. The AI prompt still runs with `Resume: ` (empty string). Gemini can still generate a report using only the `selfDescription` and `jobDescription`. The report quality will be lower (no resume context) but the feature still works.

This is why the frontend shows "Either a Resume OR a Self Description is required" — one of them must have content for meaningful AI output.

---

**Q: How does `upload.single("resume")` work? What does "resume" refer to?**

A: `upload.single("resume")` tells Multer to look for a file in the multipart form data with the field name `"resume"`. The `"resume"` string must match the `name` attribute of the file input on the frontend:

```jsx
<input type="file" name="resume" accept=".pdf,.docx" />
```

And the FormData append on the API call:
```js
formData.append("resume", resumeFile)
```

If there's a mismatch (e.g., frontend uses `name="cv"` but Multer listens for `"resume"`), `req.file` will be `undefined` and no file is processed.

---

## 9. FRONTEND — REACT QUESTIONS

---

**Q: Why React 19 with Vite instead of Next.js?**

A: Next.js is a full-stack framework optimized for Server-Side Rendering (SSR) and Static Site Generation. For this project, those features provide no benefit:
- All meaningful content is user-specific (interview reports) — you can't pre-render them server-side
- The app is behind authentication — public SEO doesn't matter for authenticated pages
- SSR would add complexity (managing what runs on server vs client) with zero benefit

Vite + React (pure client-side SPA) is the right choice because:
- **Simple**: Just HTML/CSS/JS served statically by Nginx
- **Fast dev experience**: Vite's HMR (Hot Module Replacement) is instant
- **Lighter deployment**: Build once → static files → serve from Nginx or any CDN
- **No server needed for frontend**: The Nginx container just serves files

**When Next.js would be better**: Landing page (public SEO matters), blog, e-commerce (indexable products).

---

**Q: Why React 19 specifically? What's new in React 19?**

A: React 19 introduced:
- **React Actions**: Better form handling with `useActionState`
- **`use()` hook**: Read promises and context in render
- **Server Actions**: (only relevant in Next.js/RSC context)
- **Improved error handling**: Better error boundaries
- **`useDeferredValue` improvements**

For this project, the main benefits are stability and the improved TypeScript support. The core React patterns used (Context, hooks, component composition) are the same across React 16-19.

---

**Q: Why did you use React Context over Redux or Zustand for state management?**

A: The state in this app is simple:
- Auth state: `{ user, loading }` — shared across the app
- Interview state: `{ report, reports, loading }` — shared across interview pages

Redux is designed for complex state with many actions, middleware (thunks/sagas), and time-travel debugging. Zustand is a lightweight alternative to Redux. Both add complexity that isn't warranted here.

React Context (built-in) is sufficient because:
- The state is simple
- State updates are infrequent (login, logout, fetch report)
- There are only 2 contexts — easy to reason about
- No external dependency needed

**When Redux/Zustand would be better**: Many features sharing complex interdependent state, frequent state updates (real-time data), need for middleware (offline sync, logging), very large app where Context re-render performance becomes an issue.

**The performance concern with Context**: Context causes all consumers to re-render when ANY value changes. For this app with 2-3 consumer components per context, this is fine. For 100+ components, you'd split contexts by update frequency or use Zustand's selective subscriptions.

---

**Q: Why separate Context and Hook? Why not put all logic directly in Context?**

A: The Context just holds state and provides it:
```js
// auth.context.jsx — ONLY state
const [user, setUser] = useState(null)
const [loading, setLoading] = useState(true)
// Provides: user, setUser, loading, setLoading
```

The Hook contains all business logic:
```js
// useAuth.js — logic that uses Context + API calls
const handleLogin = async ({ email, password }) => {
    setLoading(true)
    const data = await login({ email, password })
    setUser(data?.user || null)
    setLoading(false)
}
```

**Why separate?**
1. **Reusability**: Multiple components can `useAuth()` without re-implementing the login logic
2. **Testability**: You can test the hook logic independently
3. **Single Responsibility**: Context = storage, Hook = behavior
4. **Code colocation**: All auth behavior is in one hook, not scattered across components

**Alternative**: Put everything in Context. This works but makes the Context file large, couples state management with API calls, and makes testing harder.

---

**Q: Why does `useAuth` have a `useEffect` with an empty dependency array?**

A: `useEffect(() => { ... }, [])` runs once after the first render. The timing:

1. `App` renders → `AuthProvider` renders → `user = null, loading = true`
2. React commits to DOM
3. `useEffect` fires (after paint) → `getMe()` → network request
4. Response arrives → `setUser(data.user)` or `setUser(null)` → `setLoading(false)`
5. React re-renders all consumers with new values

The empty `[]` dependency array is critical — without it, `useEffect` runs after EVERY render, causing infinite loops (setUser triggers re-render → useEffect fires again → network request → setUser → re-render → ...).

**Why not `useLayoutEffect`?** `useLayoutEffect` fires synchronously after DOM mutations but before paint. Using it would block the initial paint while the network request completes — bad UX. The user would see nothing until `getMe()` resolves. `useEffect` fires after paint, so the skeleton loads first, then the auth state updates.

---

**Q: Explain the `useInterview` hook and its `generateXRay` function.**

A: `useInterview` is a custom hook that wraps all interview-related API calls and connects them to the `InterviewContext`. The `generateXRay` function:

```js
const generateXRay = async (interviewReportId) => {
    try {
        const response = await generateInterviewXRay(interviewReportId)
        setReport(response.interviewReport)  // Update global state with new report
        return response.interviewReport
    } catch (error) {
        console.log(error)
        return null
    }
}
```

Notice it doesn't set `loading` here. The `XRaySection` component manages its own local `scanning` state and scan pass animation. This is an exception to the normal pattern where the hook sets loading — it's done this way because X-Ray needs a custom animated overlay that's different from the standard loading state.

---

## 10. STATE MANAGEMENT QUESTIONS

---

**Q: How does state flow from a user action to a UI update?**

A: Let's trace "User clicks Login button":

```
1. Login.jsx: handleSubmit() -> calls handleLogin({ email, password })
2. useAuth.js: handleLogin() -> setLoading(true) -> login() API call
3. auth.api.js: login() -> POST /api/auth/login -> returns response.data
4. useAuth.js: setUser(data.user) -> setLoading(false)
5. AuthContext re-renders all consumers
6. Login.jsx: receives new data from handleLogin() -> if data.user -> navigate('/')
7. Protected.jsx: reads user from useAuth() -> user is set -> renders <Home>
8. Home.jsx: reads user info from Navbar via useAuth()
```

Key insight: `AuthContext` is at the top of the tree. When `user` changes, every component that calls `useAuth()` (which reads from `AuthContext`) re-renders with the new value. This is React's one-directional data flow — state flows DOWN through the component tree.

---

**Q: How does the interview report get from the backend to the Interview page?**

A:
```
1. URL: /interview/abc123
2. Interview.jsx: useParams() -> { interviewId: "abc123" }
3. useEffect -> getReportById("abc123")
4. useInterview.js: getReportById() -> setLoading(true) -> getInterviewReportById("abc123")
5. interview.api.js: GET /api/interview/report/abc123 -> returns response.data
6. useInterview.js: setReport(response.interviewReport) -> setLoading(false)
7. InterviewContext re-renders
8. Interview.jsx: const { report } = useInterview() -> now has report data
9. Renders 4-tab layout with report data
```

---

**Q: How does report state persist between the Home page and the Interview page?**

A: `InterviewContext` holds `report` in global state. When you navigate from Home to Interview:
- Home generates a report → `setReport(data)` in `generateReport()` hook call
- React Router navigates to `/interview/:id`
- `Interview.jsx` mounts → `useEffect` calls `getReportById(interviewId)` → `setReport(freshData)`

The `setReport(data)` in `generateReport()` gives instant data access for the INITIAL load. Then `getReportById` fetches the canonical data from the DB. This is slightly redundant but ensures fresh data (in case the browser back/forward between reports).

---

**Q: What local state vs global state choices did you make?**

A: The rule applied: **if state is only needed by one component (or its direct children), it's local state. If it's shared across unrelated components, it's global.**

**Global (Context) state:**
- `user` — needed by Navbar, Protected, Home, Interview, useAuth
- `loading` (auth) — needed by Protected, Login, Register
- `report` — needed by Interview page and its sub-components
- `reports` — needed by Home page list
- `loading` (interview) — needed by Home and Interview pages

**Local state:**
- `jobDescription`, `selfDescription`, `selectedFileName`, `generating`, `genStep` in Home.jsx — only used within the Home page
- `email`, `password`, `showPw`, `errorMsg` in Login.jsx — only within Login
- `open` in QuestionCard — each card independently tracks if it's expanded
- `scanning`, `scanPass` in XRaySection — X-Ray's own loading state

**The key insight**: QuestionCard's `open` state being LOCAL is intentional. Each card is independent — clicking Q3 open doesn't collapse Q1. If `open` were in global state, it would require an array indexed by question number — needless complexity.

---

## 11. REACT ROUTER & NAVIGATION QUESTIONS

---

**Q: Why React Router v7 (v8.x package)?**

A: React Router v7 (shipped as package version 8.x — yes, confusing naming) unified React Router with Remix's data loading patterns. It introduced:
- Framework mode (file-based routing like Next.js)
- Library mode (what this project uses — manual route definitions with `createBrowserRouter`)
- Better TypeScript support
- Loader functions for data fetching at the route level

This project uses **library mode** — `createBrowserRouter` with explicit route definitions. This was chosen over framework mode because the project doesn't need Remix-style data loading patterns (data is fetched in `useEffect` within components, which is fine for this app's needs).

---

**Q: How does `Protected.jsx` work as a route guard?**

A: Protected is a wrapper component that conditionally renders its children based on auth state:

```jsx
const Protected = ({ children }) => {
    const { loading, user } = useAuth();

    if (loading) return <FullPageSkeleton />;      // Checking auth
    if (!user)   return <Navigate to="/login" />;   // Not authenticated
    return children;                                // Authenticated
};
```

**Three state machine:**
1. `loading=true` → Show skeleton (prevents premature redirect while checking cookie)
2. `loading=false, user=null` → Redirect to `/login`
3. `loading=false, user=object` → Render children

**The FullPageSkeleton is crucial**: Without it, when the app first loads, the user would flash to `/login` for ~300ms while `getMe()` runs, then redirect back to `/`. The skeleton prevents this "flash of wrong content" and provides a smooth experience.

**Why `<Navigate>` instead of manual `window.location.href = '/login'`?**: `<Navigate>` uses React Router's client-side navigation — no full page reload, history stack is managed properly, other React state persists.

---

**Q: How does `useParams()` work in the Interview page?**

A: `createBrowserRouter` defines the route as `/interview/:interviewId`. The `:interviewId` is a URL parameter.

```js
// Route definition
{ path: "/interview/:interviewId", element: <Protected><Interview /></Protected> }

// Inside Interview.jsx
const { interviewId } = useParams()
// For URL /interview/abc123def456:
// interviewId === "abc123def456"
```

This `interviewId` is the MongoDB ObjectId of the interview report. It's used in:
- `getReportById(interviewId)` → `GET /api/interview/report/:interviewId`
- `getResumePdf(interviewId)` → `POST /api/interview/resume/pdf/:interviewId`
- `generateXRay(interviewId)` → `POST /api/interview/:interviewId/xray`

---

**Q: Why is `useEffect([interviewId])` used in Interview instead of `useEffect([])`?**

A: `useEffect(() => { getReportById(interviewId) }, [interviewId])` — the `interviewId` is in the dependency array.

If the user has the Interview page open for report A and navigates to report B (via React Router, same component renders with different params), `interviewId` changes. The `useEffect` re-fires because its dependency changed, fetching the new report.

With `useEffect([], ...)`, navigating from `/interview/abc` to `/interview/xyz` while the Interview component is already mounted would NOT refetch — the user would keep seeing report A's data with report B's URL.

This is a common React gotcha with parameterized routes — always include URL parameters in the dependency array if the component reads them.

---

**Q: How does `navigate()` work after report generation?**

A: In `Home.jsx`:
```js
const navigate = useNavigate()
// ...
const data = await generateReport({...})
if (data?._id) {
    navigate(`/interview/${data._id}`)
}
```

`useNavigate()` returns an imperative navigation function. After the async report generation completes and returns the MongoDB document (with `_id`), `navigate()` programmatically changes the URL to `/interview/<id>`. React Router unmounts `<Home>` and mounts `<Interview>` — the Interview component then `useEffect`s to fetch the report.

---

## 12. API COMMUNICATION & AXIOS QUESTIONS

---

**Q: Why Axios over the native Fetch API?**

A: Fetch is built-in but Axios has several advantages:

1. **Automatic JSON parsing**: Axios automatically parses JSON responses. With Fetch, you need `response.json()` every time.
2. **Error handling**: Axios throws for any non-2xx status code. Fetch only throws for network errors — a 401 or 500 response is NOT an error for Fetch, you have to manually check `response.ok`.
3. **Request/response interceptors**: Axios lets you add middleware-like functions (e.g., auto-add auth headers, log every request). Not in Fetch without wrappers.
4. **Cancel requests**: Axios has built-in request cancellation.
5. **`withCredentials`**: Works identically in Axios. With Fetch, it's `fetch(url, { credentials: 'include' })` — less memorable.
6. **Blob response type**: `responseType: "blob"` in Axios automatically wraps the binary response in a Blob. With Fetch, you'd call `response.blob()`.

**The trade-off**: Axios is a ~12KB external dependency. For this project, it's worth it for the developer experience and features.

---

**Q: Why does each feature have its own axios instance instead of sharing one?**

A: Both `auth.api.js` and `interview.api.js` create their own `axios.create()`:
```js
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true
})
```

Currently the config is identical. This is a **design decision for future extensibility**:
- The auth API might need different timeouts (login shouldn't hang for 60 seconds)
- The interview API might need interceptors for retry logic (AI calls can fail transiently)
- Different error handling logic per feature
- If the API splits into microservices, each feature would point to a different baseURL

Having separate instances means you can customize each independently without a conditional in a shared instance. It follows the Open/Closed Principle — open for extension, no need to modify the shared instance.

---

**Q: Explain `responseType: "blob"` in the PDF download API call.**

A: The server responds to `POST /api/interview/resume/pdf/:id` with:
- `Content-Type: application/pdf`
- Body: raw binary PDF data

Axios by default parses responses as strings or JSON. Binary data parsed as a string gets corrupted (encoding issues). `responseType: "blob"` tells Axios:
1. Don't try to parse the response body as text/JSON
2. Return the raw binary data as a JavaScript `Blob` object

Then in `useInterview.js`:
```js
const url = window.URL.createObjectURL(new Blob([response], { type: "application/pdf" }))
const link = document.createElement("a")
link.setAttribute("download", "resume.pdf")
link.click()
```

`URL.createObjectURL(blob)` creates a temporary in-memory URL (like `blob:http://localhost:5173/abc123`) pointing to the binary data. The browser navigates to this URL and, because of the `download` attribute on the `<a>` tag, triggers the native save dialog instead of displaying the PDF.

---

**Q: Why do you use FormData for the interview report submission?**

A: `multipart/form-data` is the only way to send binary file data (PDF) alongside text data in a single HTTP request. 

`application/json` cannot encode binary — you'd have to base64-encode the file and embed it in JSON, which is:
- ~33% larger (base64 overhead)
- Requires the server to decode back to binary
- Non-standard for file uploads

`multipart/form-data` encodes each field separately with boundaries:
```
--boundary123
Content-Disposition: form-data; name="jobDescription"
Senior React Developer...
--boundary123
Content-Disposition: form-data; name="resume"; filename="resume.pdf"
Content-Type: application/pdf
<binary PDF data>
--boundary123--
```

Multer on the server reads these parts and makes text fields available in `req.body` and the file in `req.file`.

---

**Q: What is `import.meta.env.VITE_API_URL`? How does it work?**

A: Vite (the build tool) exposes environment variables to client-side code via `import.meta.env`. Variables must be prefixed with `VITE_` to be exposed (security: prevents accidentally leaking backend secrets like DB passwords to the browser).

In the Frontend `.env` file:
```
VITE_API_URL=https://api.vyakta.ai
```

In development (no `.env` or local override): `import.meta.env.VITE_API_URL` is `undefined`, so the fallback `"http://localhost:3000"` is used.

**Why not hardcode `http://localhost:3000`?**
In production, the backend is at a different URL. The environment variable allows the same code to work in both environments — just change the `.env` file.

---

## 13. CORS QUESTIONS

---

**Q: What is CORS and why do you get CORS errors?**

A: CORS (Cross-Origin Resource Sharing) is a browser security mechanism. An "origin" is the combination of protocol + domain + port: `http://localhost:5173` is a different origin from `http://localhost:3000`.

The browser blocks cross-origin requests by default (the Same-Origin Policy). CORS is the mechanism to relax this: the server tells the browser "I trust this other origin, it's OK to share my responses with it."

Without CORS configured on the backend, when the frontend on `:5173` calls the backend on `:3000`, the browser:
1. Sends the request (it goes through)
2. Gets the response back
3. Reads the `Access-Control-Allow-Origin` header
4. If missing or wrong → blocks the response and throws a CORS error

**Common misconception**: CORS errors are enforced by the BROWSER, not the server. The server receives and processes the request. Postman (no browser) never gets CORS errors.

---

**Q: What is a preflight request?**

A: For "non-simple" requests (like POST with `Content-Type: application/json` or any request with custom headers), the browser sends a "preflight" `OPTIONS` request FIRST to ask the server "do you accept this kind of cross-origin request?"

The server responds with:
- `Access-Control-Allow-Origin: http://localhost:5173`
- `Access-Control-Allow-Methods: GET, POST, DELETE`
- `Access-Control-Allow-Headers: Content-Type`
- `Access-Control-Allow-Credentials: true`

Only if the server says "yes" (correct headers) does the browser send the actual request.

The `cors()` middleware in Express handles OPTIONS preflight requests automatically — it intercepts them and responds with the appropriate headers before they reach your route handlers.

---

**Q: Why does `credentials: true` require a specific origin, not a wildcard `*`?**

A: Browser security: if you set `Access-Control-Allow-Origin: *` (allow ALL origins), you cannot ALSO set `Access-Control-Allow-Credentials: true`. The browser blocks this combination because it would be a severe security risk — ANY website could make authenticated requests to your API using the user's cookies.

This is why the CORS origin function returns a SPECIFIC origin string (or uses the callback pattern) rather than `*`. When credentials are involved, you must explicitly list trusted origins.

---

## 14. UX & DESIGN DECISION QUESTIONS

---

**Q: Why does the loading state during auth check show a skeleton instead of a spinner or null?**

A: Three options existed:
1. **Null/blank screen**: Terrible — page flashes white, then suddenly content appears. Jarring.
2. **Spinner**: Better, but a spinner in the center of a blank page gives no context of what's loading.
3. **Skeleton**: Best — renders a dimmed version of the ACTUAL layout (Navbar placeholder + content placeholder). The user sees the page structure immediately, loading is perceived as "content filling in" rather than "app starting up."

Skeleton loaders are a UX pattern used by LinkedIn, Facebook, YouTube, etc. Research shows they reduce perceived loading time and feel more responsive even when actual load time is the same.

The `FullPageSkeleton` in `Protected.jsx` specifically renders a skeleton that matches the Navbar height and content area, so when real content loads, there's no layout shift.

---

**Q: Why is the AI generation step animation purely cosmetic?**

A: The 6-step animation (Parsing job description → Analyzing your profile → ...) advances every 5.5 seconds and completes in ~33 seconds. In reality, Gemini processes ALL steps simultaneously in a single API call that takes ~20-40 seconds.

**Why fake it?**
1. **Perceived wait time reduction**: Psychology research shows that progress indicators reduce perceived wait time even when they don't reflect actual progress. A blank loading spinner for 30 seconds feels like much longer than a step-by-step animation.
2. **Expectation setting**: Users see WHAT is being done and understand the value they're waiting for. "Generating behavioral questions" is more meaningful than a generic spinner.
3. **Confidence building**: The specific steps make the AI feel thorough and systematic, not like a random black box.

**The risk**: If the real generation completes in 5 seconds (very fast) or takes 60 seconds (very slow), the animation is out of sync. The code handles this: `stopStepTimer()` is called immediately when the API responds (fast case). For the slow case, the timer stops at step 6 and stays there until the response comes.

---

**Q: Why is X-Ray on-demand instead of automatically generated with the main report?**

A: Design decision with multiple reasons:

1. **Cost**: Two Gemini API calls instead of one. X-Ray is an extra charge. Not all users will want it or use it. On-demand means only users who click the button pay for it.

2. **Wait time**: The main report already takes ~30 seconds. Making users wait 60 seconds for both would feel broken. Splitting creates a more manageable experience.

3. **Value perception**: Positioning X-Ray as a premium "deep scan" that you explicitly request makes it feel more valuable than if it were just part of the standard output. The dedicated "Run X-Ray Analysis" button with its scanning animation makes it feel like a distinct, powerful action.

4. **Backend architecture**: The X-Ray endpoint can be scaled or priced separately from the main report endpoint if needed.

---

**Q: Why does the Interview page show a skeleton while loading instead of null?**

A: `if (loading || !report) return <InterviewSkeleton />` — the skeleton is shown while:
- `loading=true` (fetching from API)
- `report=null` (data hasn't arrived yet)

The `InterviewSkeleton` component renders placeholder blocks that match the layout of the actual content — a fake left nav, fake content cards, fake sidebar. This prevents layout shift (the page jumping from empty to full) and gives the user immediate visual feedback that content is incoming.

Without the skeleton: a white page with no content for ~500ms. The skeleton is better UX.

---

**Q: Why does the Home page use a `ref` for the file input instead of state?**

A: In React, file inputs are "uncontrolled" by default. You can't set `value` on a file input for security reasons — the browser doesn't allow JavaScript to programmatically set which file is selected (that would allow malicious sites to steal files).

So instead of:
```jsx
const [file, setFile] = useState(null)
<input value={file} onChange={...} />  // This doesn't work for files
```

The code uses:
```jsx
const resumeInputRef = useRef()
<input ref={resumeInputRef} onChange={handleFileChange} />
// Later:
const resumeFile = resumeInputRef.current?.files?.[0]
```

`handleFileChange` updates `selectedFileName` (for display purposes — showing the file name to the user), but the actual file object is read from `resumeInputRef.current.files[0]` at submit time.

This is the standard React pattern for file inputs — use a ref to access the DOM element's `files` property.

---

## 15. DOCKER & DEPLOYMENT QUESTIONS

---

**Q: Explain the Docker setup. What containers run and what does each do?**

A: `docker-compose.yml` defines two services:

**Backend container** (`vyakta-ai-backend`):
- Built from `./Backend/Dockerfile`
- Runs the Node.js + Express server on port 3000
- Has Chromium installed for Puppeteer PDF generation
- Environment variables: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`, `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`, plus all secrets from `./Backend/.env`
- `restart: unless-stopped` — auto-restarts on crash

**Frontend container** (`vyakta-ai-frontend`):
- Built from `./Frontend/Dockerfile`
- Stage 1: Node.js builds the React app (`npm run build` → `/dist` folder)
- Stage 2: Nginx serves the `/dist` static files on port 80
- Nginx also proxies `/api/*` requests to the backend container
- `depends_on: backend` — starts after backend

---

**Q: Why does the frontend container use Nginx? Couldn't you just serve the Vite build output with a simple static server?**

A: You could use `serve` or `http-server` npm packages to serve static files, but Nginx is far superior:

1. **Performance**: Nginx is written in C, handles thousands of concurrent connections with minimal memory. Node.js `serve` is an order of magnitude less efficient for static files.
2. **Reverse proxy**: Nginx can proxy `/api/*` requests to the backend container. Without this, the browser would need to make requests to two different ports — causing CORS issues and requiring different origins.
3. **Gzip compression**: Nginx compresses responses automatically, reducing transfer size by 60-80% for JS/HTML files.
4. **Caching headers**: Nginx serves static assets with proper `Cache-Control` headers — browsers cache JS/CSS files and only re-download when changed.
5. **Production-ready**: Nginx handles connection timeouts, request buffering, load balancing if needed.

The Nginx proxy is key: it means the browser always talks to `http://yourdomain.com/api/...` (port 80, same origin). No CORS needed between frontend and backend in production. Nginx internally routes to `http://backend:3000/api/...` on the Docker network.

---

**Q: What is the Docker build multi-stage pattern in the frontend?**

A: The Frontend Dockerfile uses a multi-stage build:

**Stage 1 (builder):**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```
This produces the `/app/dist` folder with optimized static files.

**Stage 2 (runner):**
```dockerfile
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```
This copies ONLY the built files into a clean Nginx image.

**Why multi-stage?**
- The Node.js stage (with node_modules, source files) is hundreds of MB
- The final Nginx image only contains static files + Nginx — maybe 30MB
- Smaller images = faster pulls, less storage, smaller attack surface

---

**Q: How does Nginx proxy API calls to the backend?**

A: In `nginx.conf`:
```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

`try_files $uri $uri/ /index.html` — for any URL that doesn't match a file, serve `index.html`. This is required for React Router — when the user navigates directly to `/interview/abc`, Nginx doesn't have a file for that path. It falls back to `index.html`, React Router reads the URL and renders the correct component.

`location /api/ { proxy_pass http://backend:3000; }` — any request starting with `/api/` is forwarded to the backend container. The `backend` hostname resolves because Docker Compose puts both containers on the same network with their service names as hostnames.

---

**Q: How are secrets managed in this project?**

A: Secrets are stored in `.env` files that are in `.gitignore` — they're never committed to the repository.

**Backend `.env`:**
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — random secret for JWT signing
- `GOOGLE_GENAI_API_KEY` — Gemini API key
- `PORT` — server port
- `NODE_ENV` — environment (development/production)
- `CLIENT_URL` — allowed frontend URL in production

In Docker Compose: `env_file: - ./Backend/.env` loads these into the container's environment.

In the Node.js code: `require('dotenv').config()` loads `.env` into `process.env`. In Docker, `dotenv` finds nothing (no `.env` file in container) — but the variables were already set by Docker Compose's `env_file`, so `process.env` has them either way.

**`.env.example`** files are committed — they show the structure without values, so other developers know what to configure.

---

## 16. PERFORMANCE & OPTIMIZATION QUESTIONS

---

**Q: What performance optimizations are in this project?**

A:
1. **`.select()` in getAllInterviewReports**: Excludes heavy fields from list query — saves network bandwidth and DB read overhead
2. **On-demand X-Ray**: Expensive AI call only when explicitly requested, not on every report generation
3. **memoryStorage for uploads**: No disk I/O for file processing
4. **Vite build**: Tree-shaking, code splitting, minification of the React app
5. **Nginx gzip**: Static assets compressed in transit
6. **Nginx caching headers**: Browser caches JS/CSS — repeat visits load instantly
7. **Skeleton loaders**: Parallel visual feedback while data loads (perceived performance)
8. **Mongoose connection pool**: Reuses DB connections instead of reconnecting per request

---

**Q: What would you do to scale this application to 10,000 users?**

A:
1. **Redis for token blacklist**: Replace MongoDB blacklist lookup with Redis (in-memory, O(1) lookup). Every protected request currently does a MongoDB query for blacklist check — Redis would be 100x faster.
2. **Redis session cache**: Cache user sessions in Redis so `getMeController` hits Redis instead of MongoDB.
3. **Puppeteer worker pool**: Instead of launching Chromium per request, maintain a pool of 3-5 pre-warmed Chromium instances.
4. **Background job queue**: PDF generation and report generation are slow (30-60s). Move them to a queue (Bull/BullMQ + Redis). User gets a job ID immediately, polls for completion. Prevents HTTP timeout issues.
5. **Horizontal backend scaling**: Run multiple backend replicas behind a load balancer (Nginx or AWS ALB). JWT is stateless so any replica can handle any request.
6. **CDN for frontend**: Serve static files from CloudFront/Fastly instead of a single Nginx container.
7. **MongoDB indexing**: Add indexes on `{ user: 1, createdAt: -1 }` for the getAllReports query (already sorted by createdAt).
8. **Rate limiting**: Prevent users from generating 100 reports/minute (AI API cost control).

---

**Q: Are there any MongoDB indexes that should be added?**

A: The current schema would benefit from:

```js
// For getAllInterviewReports query:
interviewReportSchema.index({ user: 1, createdAt: -1 })
// Finds all reports by user, sorted by newest first

// For getInterviewReportById:
interviewReportSchema.index({ _id: 1, user: 1 })
// MongoDB _id has an index by default, but compound index speeds up ownership check

// For auth middleware blacklist check:
blacklistTokenSchema.index({ token: 1 })
// Fast lookup by token string

// For login:
userSchema.index({ email: 1 }, { unique: true })
// MongoDB creates this automatically because email has unique: true
```

Without indexes, each `find()` query does a full collection scan (O(n)). With indexes, it's O(log n).

---

## 17. TRICKY / GOTCHA QUESTIONS

---

**Q: What happens if the Gemini API is down? How does the app handle it?**

A: Currently, not gracefully. If Gemini is down:
1. `generateInterviewReport()` in `ai.service.js` will throw (the API call fails)
2. `generateInterViewReportController` catches it in the try/catch and returns `500 { message: "Failed to generate interview report.", error: error.message }`
3. Frontend shows the error state but there's no retry UI — the user just sees the button re-enable after the overlay disappears

**Better handling (improvement):**
- Retry logic: Try the AI call 3 times with exponential backoff before failing
- User-facing error message on the Home page after failed generation
- A loading state that doesn't time out the frontend while the server is still trying

---

**Q: What if the PDF is not text-based (it's a scanned image)? What does pdf-parse return?**

A: `pdf-parse` (and its underlying `pdfjs-dist` library) extracts text from PDFs that have embedded text data. A scanned PDF is just an image inside a PDF container — there's no text data, only pixel data.

In this case, `resumeText` would be an empty string or contain very little text (maybe just headers if OCR was applied). The AI prompt would receive `Resume: ` (effectively empty) and generate a generic report based only on the job description and self-description.

**The fix**: Integrate OCR (Optical Character Recognition) — services like AWS Textract, Google Vision API, or Tesseract.js can extract text from scanned PDFs. This would significantly improve the use case for users with scanned resumes.

**Current mitigation**: The UI shows "Either Resume OR Self Description is required" — users with non-text PDFs can fall back to writing a self-description.

---

**Q: Can a user access another user's interview report by guessing the ID?**

A: No. MongoDB ObjectIds are 24-character hex strings (e.g., `507f1f77bcf86cd799439011`). They're essentially random — guessing one in a trillion-scale keyspace is practically impossible.

But more importantly, even if someone guessed an ID, the ownership check prevents access:
```js
interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })
```
This query returns `null` if the `_id` doesn't belong to the requesting `user`. The controller returns 404. The report is never exposed.

This "confused deputy" vulnerability is a common security mistake (checking only `_id` but not ownership). The project correctly uses the compound `{ _id, user }` query.

---

**Q: What happens to the JWT after it expires after 1 day?**

A: After 24 hours:
1. The browser still has the cookie (it hasn't been cleared)
2. User loads the app → `getMe()` → `GET /api/auth/get-me` → `authUser` middleware
3. `jwt.verify(token, JWT_SECRET)` throws `TokenExpiredError`
4. `catch(err)` returns `401 { message: "Invalid token" }`
5. `getMe()` in frontend gets null/error response → `setUser(null)` → `setLoading(false)`
6. `Protected.jsx` sees `user=null` → `<Navigate to="/login" />`

The expired cookie stays in the browser until it's overwritten (new login) or the `maxAge` expires. `maxAge: 24 * 60 * 60 * 1000` (1 day) on the cookie should align with the JWT expiry, but if they're slightly out of sync, the cookie might still be sent even after the JWT expires.

**The blacklist and expired tokens**: An expired token fails `jwt.verify()` — it never even reaches the blacklist check. The blacklist is only relevant for VALID but should-be-revoked tokens (logged out within the 24h window).

---

**Q: Could there be a race condition in the login flow?**

A: Theoretically yes. The flow:
```
1. User submits login form
2. setLoading(true)
3. await login() → network request
4. (network request completes)
5. setUser(data.user)
6. setLoading(false)
7. Component checks data.user → navigate('/')
```

In React Strict Mode (dev only), effects run twice. This means `getMe()` in `useAuth` might run twice on mount. If both calls complete and both call `setUser(data.user)`, the second one just sets the same value — no real race condition.

In production, `useEffect([], ...)` runs only once. The login function itself uses `setLoading(true/false)` around the async call, ensuring correct sequencing.

The subtle race: if the user double-clicks "Sign in," two concurrent `login()` calls could run. Both would succeed and both would call `setUser()`. This is benign — the second call just sets the same user. Adding debouncing or disabling the button while `loading=true` (which the code does: `disabled={loading}` implied) prevents this.

---

**Q: What does `$or` in the register controller do?**

A: In `registerUserController`:
```js
const isUserAlreadyExists = await userModel.findOne({
    $or: [{ username }, { email }]
})
```

`$or` is a MongoDB query operator that matches documents where AT LEAST ONE condition is true. This finds users where `username` matches OR `email` matches.

This prevents two types of conflicts with one query:
- Username already taken by someone else
- Email already registered by someone else

Without `$or`, you'd need two separate `findOne` calls. One query is faster.

---

**Q: Why does the `useEffect` in `useAuth` call `getMe()` even after register/login?**

A: After login, `handleLogin()` calls `setUser(data.user)` directly — the user state is set from the login response. The `useEffect` with `getMe()` runs once on MOUNT (app startup). They serve different purposes:

- `getMe()` in `useEffect([])`: Restores session when the page is RELOADED (user already logged in, refreshing the browser)
- `setUser(data.user)` in `handleLogin`: Sets user state after a fresh login

They don't interfere because `useEffect([])` has already completed (on mount) by the time the user submits the login form. The `useEffect` only runs once per component lifetime (per mount).

If you reload the page AFTER logging in, `getMe()` runs on mount and restores the session. If you log in fresh, `handleLogin()` sets the user state directly.

---

**Q: Why is `resumeInputRef` a `useRef` and not a `useState`?**

A: Two reasons:
1. **File inputs can't be controlled**: React controlled inputs need `value` and `onChange` to work. File inputs reject the `value` prop — browsers don't let JavaScript set the selected file (security).
2. **No re-render needed**: Changing which file is selected doesn't need to trigger a React re-render. The ref gives direct access to the DOM element's `.files` property when needed (at submit time), without React being involved.

The `selectedFileName` state is separate — it stores just the display name (string) for showing "Selected: resume.pdf" in the UI. This IS state because it needs to trigger a re-render to update the UI.

---

**Q: What is `Uint8Array.from(req.file.buffer)` and why is it needed?**

A: `req.file.buffer` from Multer is a Node.js `Buffer` object. `pdf-parse`'s `PDFParse` constructor expects a `Uint8Array` (a typed array). 

Node.js `Buffer` IS a `Uint8Array` (Buffer extends Uint8Array), but `Uint8Array.from()` creates a proper typed array view of the data. In some versions of the library, passing a `Buffer` directly causes issues — `Uint8Array.from()` ensures compatibility.

This is a technical compatibility shim between Node.js types (Buffer) and browser-compatible Web APIs (Uint8Array).

---

## 18. WHAT WOULD YOU IMPROVE QUESTIONS

---

**Q: What are the biggest weaknesses of the current implementation?**

A:
1. **No input validation on backend**: The controllers don't validate string lengths, SQL injection patterns (not relevant for MongoDB but NoSQL injection is), etc. A library like `express-validator` or `joi` should validate all inputs.

2. **No rate limiting**: A user could generate 1000 reports/minute, racking up huge Gemini API bills. `express-rate-limit` middleware would cap requests per user per window.

3. **No refresh token mechanism**: JWTs expire after 24 hours and users are forced to re-login. Refresh tokens would allow silent token renewal.

4. **Blacklist doesn't clean up**: Blacklisted tokens accumulate in MongoDB forever. A TTL index (`{ token: 1 }` with `expireAfterSeconds: 86400`) would auto-delete entries after 24h (matching JWT expiry — after that, the token is invalid anyway, no need to keep it blacklisted).

5. **No error boundary in React**: If any component throws during render, the entire app crashes with a blank screen. React Error Boundaries would catch errors and show a fallback UI.

6. **PDF generation is synchronous/blocking**: PDF generation could fail with `504 Gateway Timeout` on slow connections or large resumes. Background job processing (Bull queue) would be more resilient.

7. **No CSRF protection**: The HttpOnly cookie + SameSite provides partial protection, but a dedicated CSRF token would fully protect against CSRF attacks.

---

**Q: If you were to add a new feature, what would it be and how would you implement it?**

A: **Interview Practice Mode** — a real-time simulated interview where:

1. The AI asks generated questions one by one (from the existing report)
2. The user types or speaks their answer
3. The AI evaluates the answer in real-time and gives feedback: "Good use of STAR. You could add quantifiable outcomes."
4. After all questions, a session summary with scores

**Implementation:**
- **Frontend**: A new route `/practice/:interviewId`, new feature folder `/features/practice`
- **Backend**: New route `POST /api/interview/:id/evaluate-answer` — takes `{ question, answer }`, calls Gemini with an evaluation prompt, returns `{ score, feedback, improvements }`
- **Streaming**: Use Gemini's streaming API for real-time feedback typing effect
- **State**: A `PracticeContext` with current question index, answers array, overall score
- **Speech**: Web Speech API for voice input (browser built-in, no external service needed)

---

**Q: How would you add TypeScript to this project?**

A: Incrementally, not all at once:

**Backend:**
1. `npm install -D typescript @types/node @types/express @types/jsonwebtoken @types/bcryptjs @types/multer`
2. Rename `.js` files to `.ts`
3. Add `tsconfig.json`
4. Add types for `req.user` (Express augmentation): `declare namespace Express { interface Request { user?: { id: string; username: string } } }`
5. Add types for Mongoose models using Mongoose's TypeScript generics

**Frontend:**
1. Already has `@types/react` and `@types/react-dom` in devDependencies
2. Rename `.jsx` to `.tsx`, `.js` to `.ts`
3. Define types for API response shapes
4. Add types for context values
5. The Zod schemas in `ai.service.js` already define the shape — `z.infer<typeof interviewReportSchema>` gives the TypeScript type for free

**The biggest win**: TypeScript would catch the `req.user.id` access (currently might be undefined if authMiddleware wasn't applied) and ensure API response types match between frontend and backend.

---

**Q: What would you use instead of Context + custom hooks if the app grew significantly?**

A: **Zustand** is the most practical upgrade for this project:

```js
// Instead of AuthContext + useAuth:
const useAuthStore = create((set) => ({
    user: null,
    loading: true,
    setUser: (user) => set({ user }),
    handleLogin: async ({ email, password }) => {
        set({ loading: true })
        const data = await login({ email, password })
        set({ user: data?.user || null, loading: false })
        return data
    }
}))
```

**Benefits over Context:**
- No Provider wrapping required
- Only components that use specific slices re-render (selective subscriptions)
- Supports middleware (devtools, immer, persist)
- Simpler to add new state without restructuring the component tree
- Built-in devtools for debugging state changes

**When to use Redux Toolkit**: If you need complex derived state, normalized data (like a cache of all reports keyed by ID), or complex action sequences that need to be tracked/replayed.

---

**Q: How would you add real-time updates if the AI generation was queued?**

A: Currently the HTTP request hangs for 30+ seconds while Gemini processes. A better pattern for production:

1. **Client**: `POST /api/interview/` → immediate `202 Accepted` response with `{ jobId: "xyz" }`
2. **Server**: Job added to Bull queue → worker picks it up → calls Gemini → saves to DB
3. **Client**: Polls `GET /api/interview/job/:jobId/status` every 2 seconds
4. **Alternative**: WebSocket or Server-Sent Events (SSE) — server pushes update when done

**SSE implementation:**
```js
app.get('/api/interview/job/:id/status', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    // Worker emits events → server forwards to this SSE stream
    // When done: res.write('data: {"status":"done","reportId":"..."}\n\n')
})
```

SSE is simpler than WebSockets for this use case (one-way server → client push).

---

**Q: How would you write tests for this project?**

A: 

**Backend Unit Tests (Jest + Supertest):**
```js
// Test auth controller
describe('POST /api/auth/register', () => {
    it('should create a user and set cookie', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({ username: 'test', email: 'test@test.com', password: '123456' })
        expect(response.status).toBe(201)
        expect(response.headers['set-cookie']).toBeDefined()
    })
    it('should reject duplicate email', async () => {
        // create user first, then try again
        expect(response.status).toBe(400)
    })
})
```

**Backend Integration Tests:**
- Use a test MongoDB (MongoDB Memory Server) — `@mongodb-memory-server`
- Mock the Gemini AI calls (don't actually call the API in tests)
- Mock Puppeteer

**Frontend Tests (Vitest + React Testing Library):**
```js
// Test Protected component
it('redirects to /login when user is null', () => {
    // Mock useAuth to return { user: null, loading: false }
    render(<Protected><div>Protected Content</div></Protected>)
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
})
```

**E2E Tests (Playwright):**
- Full user journey: register → fill form → generate report → view X-Ray → download PDF
- Run against a staging environment with seeded data

---

*This document covers every significant technical decision in the project. If a question isn't here, apply the framework: what does this code do, why this approach vs alternatives, what are the trade-offs, and what would you improve.*

