# 🔐 Phase 2 — Production Environment Variables
> **Complete Line-by-Line Study Guide**  
> Written for: Full end-to-end understanding, zero doubts

---

## Table of Contents

- [Why Phase 2 Exists](#why-phase-2-exists)
- [Files Changed](#files-changed-in-phase-2)
- [File 1 — auth.controller.js](#file-1--backendsrccontrollersauthcontrollerjs)
- [File 2 — app.js](#file-2--backendsrcappjs)
- [File 3 — interview.api.js](#file-3--frontendsrcfeaturesinterviewservicesinterviewapijs)
- [File 4 — auth.api.js](#file-4--frontendsrcfeaturesauthservicesauthapijs)
- [File 5 — Backend/.env](#file-5--backendenv-modified)
- [File 6 — Frontend/.env](#file-6--frontendenv-created)
- [Files 7 & 8 — .env.example](#files-7--8--envexample-files)
- [File 9 — Frontend/.gitignore](#file-9--frontendgitignore-modified)
- [Local Development Flow](#how-it-all-works-together--local-development-flow)
- [Production Flow](#how-it-all-works-together--production-flow)
- [Summary Table](#summary-table)
- [Common Questions](#common-questions-and-doubts)

---

## Why Phase 2 Exists

Phase 1 gave you Docker containers running locally. But there was a **massive problem** lurking in your code that would cause **COMPLETE FAILURE** in production.

### ❌ The Problem

**1. Hardcoded localhost in the frontend**

Both Axios instances had:
```javascript
baseURL: "http://localhost:3000"
```
`localhost` means *"this very computer"*. In production:
- Your frontend runs on **Vercel** (a server in San Francisco)
- Your backend runs on **Render** (a different server somewhere else)
- When a user's browser tries `http://localhost:3000` → it looks for a server on *the user's own laptop* — which doesn't exist

**Every API call fails with a network error.**

---

**2. Cookies had zero security options**

```javascript
res.cookie("token", token)  // ← no options at all
```

In production over HTTPS, browsers **refuse** to store cookies that do not have:
- `httpOnly: true` — prevents JavaScript from stealing the token (XSS protection)
- `secure: true` — only send over HTTPS, never plain HTTP
- `sameSite: "none"` — required for cross-domain cookies (Vercel → Render)

---

**3. CORS allowed everything — including attackers**

```javascript
} else {
    callback(null, true);  // ← this else branch ALSO allowed everything!
}
```
A random malicious website could make requests to your API pretending to be your frontend. **Security hole.**

### ✅ What Phase 2 Fixes

| Problem | Fix |
|---|---|
| Hardcoded `localhost` in Axios | `VITE_API_URL` env var with localhost fallback |
| Insecure cookies | `httpOnly`, `secure`, `sameSite`, `maxAge` driven by `NODE_ENV` |
| CORS allowed everything | Only allows `CLIENT_URL` in production |
| No `NODE_ENV` set | Added to `.env` — drives dev vs prod behavior |
| `CLIENT_URL` missing | Added to `.env` — controls allowed origin |
| `.env` could be committed | Fixed `Frontend/.gitignore` to exclude `.env` |

---

## Files Changed in Phase 2

| # | File | Action |
|---|---|---|
| 1 | `Backend/src/controllers/auth.controller.js` | Fixed `res.cookie()` — added security flags |
| 2 | `Backend/src/app.js` | Fixed CORS — reads `CLIENT_URL` in production |
| 3 | `Frontend/src/features/interview/services/interview.api.js` | Fixed `baseURL` — reads `VITE_API_URL` |
| 4 | `Frontend/src/features/auth/services/auth.api.js` | Fixed `baseURL` — same pattern |
| 5 | `Backend/.env` | Added `NODE_ENV=development`, `CLIENT_URL` |
| 6 | `Frontend/.env` | Created — `VITE_API_URL=http://localhost:3000` |
| 7 | `Backend/.env.example` | Created — safe template to commit |
| 8 | `Frontend/.env.example` | Created — safe template to commit |
| 9 | `Frontend/.gitignore` | Added `.env` exclusions (was missing!) |

---

## File 1 — `Backend/src/controllers/auth.controller.js`

### What This File Is

The auth controller handles all authentication logic:
- `registerUserController` — creates a new user account
- `loginUserController` — logs a user in
- `logoutUserController` — logs a user out
- `getMeController` — returns the logged-in user's data

After a successful register or login, the server sends a **JWT token** to the browser via a **cookie** — a small piece of data the browser stores and sends back automatically on every future request.

---

### What Was Wrong

Both `registerUserController` and `loginUserController` had:
```javascript
res.cookie("token", token)
```
This creates a cookie with **ZERO security options**. The browser stores it but:
- ❌ Can be read by JavaScript → XSS vulnerability
- ❌ Sent over HTTP and HTTPS → insecure
- ❌ Won't work cross-domain (Vercel → Render) → wrong `sameSite`
- ❌ No expiry time → session cookie, disappears on browser close

---

### The Fix

**Before:**
```javascript
res.cookie("token", token)
```

**After (in BOTH register and login):**
```javascript
const isProduction = process.env.NODE_ENV === "production"
res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000 // 1 day in ms
})
```

---

### Line-by-Line

#### `const isProduction = process.env.NODE_ENV === "production"`

`process.env.NODE_ENV` is an environment variable that tells your app which environment it is running in.

| Where | `NODE_ENV` value | `isProduction` |
|---|---|---|
| Local machine | `"development"` (from `.env`) | `false` |
| Render server | `"production"` (from Render dashboard) | `true` |

Same code. Different behavior. This is the correct pattern for production-ready apps.

---

#### `res.cookie("token", token, { ... })`

Express method to set a cookie in the HTTP response. The browser receives a `Set-Cookie` header and stores the cookie. On every subsequent request from that browser, it sends the cookie back automatically in the `Cookie` header. This is how JWT auth works without `localStorage`.

---

#### `httpOnly: true`

`httpOnly` means the cookie **CANNOT be read by JavaScript** running on the page.

```javascript
document.cookie  // ← normally returns all cookies
                 // ← with httpOnly: true, this cookie does NOT appear here
```

> **Why is this critical?**  
> XSS (Cross-Site Scripting) attacks inject malicious JavaScript into your page. If the attacker's JS can read `document.cookie`, they steal the JWT token and impersonate the user forever.  
> With `httpOnly: true`, JS cannot read the cookie. The JWT stays safe.  
> The **browser still sends** the cookie to your server on every request — only JavaScript is blocked.

---

#### `secure: isProduction`

`secure: true` means the browser **ONLY sends this cookie over HTTPS**.

> **Why not always `true`?**  
> Locally, your app runs on `http://localhost` (not `https://`). If `secure: true` was always on, the browser would never send the cookie locally — login would silently fail.

| Environment | `secure` value | Cookie behavior |
|---|---|---|
| Local (dev) | `false` | Works on `http://localhost` |
| Render (prod) | `true` | Only works on `https://` |

---

#### `sameSite: isProduction ? "none" : "lax"`

`sameSite` controls when the browser sends the cookie to a different domain.

| Value | Meaning |
|---|---|
| `"lax"` | Sends cookies for same-site navigations and GET requests. Does **NOT** send on cross-site POST requests. Safe for local dev. |
| `"none"` | Sends cookies on **ALL** cross-site requests, including POST. **Required** when frontend (Vercel) and backend (Render) are different domains. **Must be paired with `secure: true`** — browsers reject `SameSite=None` without `Secure`. |

**The production cross-domain situation:**
```
Frontend: https://vyakta-ai.vercel.app   ← domain: vercel.app
Backend:  https://vyakta-ai.onrender.com ← domain: onrender.com
```
These are **different domains**. The browser's default policy does not send cookies across different domains. `sameSite: "none"` + `secure: true` overrides this restriction.

---

#### `maxAge: 24 * 60 * 60 * 1000`

Sets cookie expiry in **milliseconds**.

```
24 hours × 60 minutes × 60 seconds × 1000 milliseconds = 86,400,000 ms = 1 day
```

Matches the JWT expiry: `{ expiresIn: "1d" }`.

Without `maxAge`, the cookie is a **session cookie** — disappears when the browser window closes. The user has to re-login after every browser restart. With `maxAge: 1 day`, the user stays logged in for 24 hours.

> **The fix appears in TWO places** — line ~45 in `registerUserController` and line ~91 in `loginUserController`. Both create a JWT and set it as a cookie, so both needed the same fix.

---

## File 2 — `Backend/src/app.js`

### What This File Is

`app.js` is where the Express application is created and configured. It sets up **middleware** (functions that run on every request) and mounts routes.

| Middleware | What it does |
|---|---|
| `express.json()` | Parses JSON request bodies |
| `express.urlencoded()` | Parses HTML form data |
| `cookieParser()` | Parses cookies from incoming requests |
| `cors()` | Handles Cross-Origin Resource Sharing |

---

### What is CORS and Why Does it Matter?

**CORS = Cross-Origin Resource Sharing.**

Browsers have a built-in security rule called the **Same-Origin Policy**:
> A web page at `https://vercel.app` **cannot** make API requests to `https://render.com` by default. The **browser** blocks it.

This is why you need CORS. The **server** tells the browser:
> "It is OK for `vercel.app` to send me requests."

The server does this via response headers:
```
Access-Control-Allow-Origin: https://your-project.vercel.app
Access-Control-Allow-Credentials: true
```

Without correct CORS, your browser shows:
```
CORS policy: No 'Access-Control-Allow-Origin' header is present
```
And blocks the response. Your app appears completely broken.

---

### What Was Wrong Before

```javascript
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            callback(null, true);
        } else {
            callback(null, true);   // ← BUG: ALWAYS ALLOWS EVERYTHING!
        }
    },
    credentials: true
}));
```

The `else` branch **also** called `callback(null, true)`. Every origin was allowed — `localhost`, Vercel, and any attacker's website. **Security bug.**

---

### The Fix — Full New CORS Config

```javascript
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin) return callback(null, true)

        // In production, only allow the configured CLIENT_URL
        if (process.env.NODE_ENV === "production") {
            if (origin === process.env.CLIENT_URL) {
                return callback(null, true)
            }
            return callback(new Error(`CORS: origin ${origin} not allowed`), false)
        }

        // In development, allow any localhost origin
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true)
        }

        return callback(new Error(`CORS: origin ${origin} not allowed`), false)
    },
    credentials: true
}))
```

---

### Line-by-Line

#### `origin: function (origin, callback) { ... }`

Instead of a simple string, we use a **function** that runs on every request.

| Parameter | Value |
|---|---|
| `origin` | The domain that sent the request, e.g. `"https://vercel.app"`. `undefined` if no `Origin` header (Postman, curl). |
| `callback` | Call with `(null, true)` to allow, `(Error, false)` to deny. |

---

#### `if (!origin) return callback(null, true)`

If `origin` is `undefined`, there is no browser involved (Postman, curl, a mobile app, server-to-server). These have no browser security restrictions. Always allow them.

---

#### `if (process.env.NODE_ENV === "production") { ... }`

In **production mode** (on Render with `NODE_ENV=production`):
- `if (origin === process.env.CLIENT_URL)` → allow **ONLY** the exact Vercel URL
- Otherwise → reject with a CORS error

`process.env.CLIENT_URL` on Render will be set to `"https://your-project.vercel.app"`. Only your Vercel frontend can make requests. **Secure.**

---

#### `callback(new Error(...), false)`

Rejects the CORS request. The browser blocks the response and shows a CORS error. Second argument `false` = deny this origin.

---

#### The localhost regex (development only)

```javascript
/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
```

This only runs when `NODE_ENV !== "production"`. Breakdown:

| Part | Meaning |
|---|---|
| `^` | Start of string |
| `http://` | Literal `http://` |
| `(localhost\|127\.0\.0\.1)` | Either `"localhost"` or the IP `"127.0.0.1"` |
| `(:\d+)?` | Optionally followed by `:` and a port number |
| `$` | End of string |

Allows `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`. Blocks `http://evil-site.com` even in development.

---

#### `credentials: true`

**REQUIRED for cookies to work with CORS.**

When the browser makes a cross-origin request, it does **NOT** include cookies by default. `credentials: true` tells Express to send the `Access-Control-Allow-Credentials: true` header, which tells the browser: *"Include cookies with cross-origin requests to this server."*

The frontend Axios also needs `withCredentials: true` — which was already set in your API files.

> **Important:** When `credentials: true` is set, the `Access-Control-Allow-Origin` header **cannot** be `"*"` (wildcard). It must be a specific origin. Our config always returns the specific origin string — so this rule is satisfied.

---

## File 3 — `Frontend/src/features/interview/services/interview.api.js`

### What This File Is

The **Axios instance** (a pre-configured HTTP client) used by the interview feature to make all API calls — upload resume, get interview results, generate PDFs, etc.

An Axios instance is like a *"pre-configured fetch"*. You configure it once with a base URL and settings, then call `api.get('/interview')` instead of the full URL every time.

---

### What Was Wrong

```javascript
const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
})
```

`"http://localhost:3000"` is hardcoded. When this code runs in a user's browser in production, `localhost:3000` goes nowhere.

---

### The Fix

```javascript
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true,
})
```

---

### Line-by-Line

#### `import.meta.env.VITE_API_URL`

In a Vite project, environment variables are accessed via `import.meta.env`. This is **Vite-specific** — not Node.js `process.env`.

> **Why `import.meta.env` instead of `process.env`?**  
> Vite compiles your React code to run in the **browser**. Browsers have no Node.js runtime, no `process` object, no file system. `import.meta.env` is Vite's browser-compatible replacement. During build, Vite replaces every `import.meta.env.VITE_*` with the actual string value. The final compiled JS has the values **hardcoded** at build time.

> **The `VITE_` prefix rule:**  
> Vite **ONLY** exposes variables prefixed with `VITE_` to the browser bundle. `API_URL` (no prefix) → Vite ignores it and it stays server-side only. This is a **security feature** that prevents accidental leakage of server secrets into the browser bundle.

---

#### `|| "http://localhost:3000"`

The **logical OR** fallback.

| Scenario | `VITE_API_URL` | Result |
|---|---|---|
| `.env` exists with `VITE_API_URL=http://localhost:3000` | `"http://localhost:3000"` | Uses that value |
| `.env` does NOT exist | `undefined` | Falls back to `"http://localhost:3000"` |
| Vercel production build | `"https://your-backend.onrender.com"` | Uses the Render URL |

Either way, local development works. Production uses the real backend URL.

---

#### `withCredentials: true`

Was already there and is **critical**. Tells Axios to include cookies in ALL requests made by this instance. Without it, the JWT cookie is never sent to the backend → every protected route returns `401 Unauthorized`.

---

## File 4 — `Frontend/src/features/auth/services/auth.api.js`

Same concept as `interview.api.js` but for the auth feature — login, register, logout, get-me API calls.

Your project has **two separate Axios instances** (one per feature). This is a clean architecture choice. But it means the **same fix needs to be applied to both files**.

**Before:**
```javascript
baseURL: "http://localhost:3000",
```

**After:**
```javascript
baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
```

Identical pattern, identical reasoning. See File 3 for the full explanation.

---

## File 5 — `Backend/.env` (Modified)

### What `.env` Files Are

A `.env` file stores environment variables as `key=value` pairs. When your Node.js server starts, the `dotenv` package reads this file and loads every variable into `process.env`.

In your `server.js`:
```javascript
require("dotenv").config()
```

This makes `MONGO_URI`, `JWT_SECRET`, etc. available as `process.env.MONGO_URI`, etc.

> **Why use `.env` instead of hardcoding?**
> 1. **Security** — Secrets (API keys, passwords) stay OUT of source code. The `.env` file is in `.gitignore` and never pushed to GitHub.
> 2. **Flexibility** — Same code, different behavior per environment. Locally: `.env` has dev values. On Render: set values in the Render dashboard. The code reads `process.env.X` and gets the right value automatically.

---

### What Was Added

```diff
PORT=3000
+NODE_ENV=development
MONGO_URI=mongodb://...
JWT_SECRET=...
GOOGLE_GENAI_API_KEY=...
+CLIENT_URL=http://localhost:5173
```

---

#### `NODE_ENV=development`

`NODE_ENV` is a convention in the Node.js ecosystem. Almost every library checks this.

Your code reads it in two places:
```javascript
// auth.controller.js
const isProduction = process.env.NODE_ENV === "production"

// app.js
if (process.env.NODE_ENV === "production") { ... }
```

| Location | `NODE_ENV` | Cookie `sameSite` | CORS |
|---|---|---|---|
| Local machine | `"development"` | `"lax"` (permissive) | Allows localhost |
| Render server | `"production"` | `"none"` (cross-domain) | Allows Vercel only |

You set `NODE_ENV=production` in the **Render dashboard** → Environment Variables section.

---

#### `CLIENT_URL=http://localhost:5173`

This is your frontend URL.
- **Locally:** Vite runs on `http://localhost:5173` (default Vite port)
- **On Render:** Change this to `https://your-project.vercel.app`

The CORS config reads it:
```javascript
if (origin === process.env.CLIENT_URL) { allow }
```

Updating `CLIENT_URL` on Render is enough to update CORS — **no code changes needed**.

---

## File 6 — `Frontend/.env` (Created)

```dotenv
# Local development — Vite reads this automatically
# In production (Vercel), set VITE_API_URL to your Render backend URL:
# VITE_API_URL=https://your-backend.onrender.com
VITE_API_URL=http://localhost:3000
```

When you run `npm run dev` in the `Frontend/` folder, **Vite automatically reads `.env`** and makes `VITE_API_URL` available as `import.meta.env.VITE_API_URL`.

Without this file, `import.meta.env.VITE_API_URL` would be `undefined` locally. The `||` fallback in the api files handles this, but having the `.env` file is cleaner and more explicit.

> **How Vite uses this at build time:**  
> At build time (when you run `npm run build`), Vite scans your source code for `import.meta.env.VITE_*` and replaces them with the actual string values. The final compiled JS in `dist/` has the URL **hardcoded** in it — not dynamically read at runtime.  
> This means: if you change `VITE_API_URL` on Vercel and redeploy, Vite rebuilds with the new URL embedded. You **must redeploy** for changes to take effect.

---

## Files 7 & 8 — `.env.example` Files

### `Backend/.env.example`

```dotenv
# Copy this to .env and fill in your values
# Never commit the actual .env file to Git

PORT=3000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
GOOGLE_GENAI_API_KEY=your_google_gemini_api_key_here

# Local dev: http://localhost:5173
# Production: https://your-project.vercel.app
CLIENT_URL=http://localhost:5173
```

### `Frontend/.env.example`

```dotenv
# Copy this to .env and fill in your values
# Never commit the actual .env file to Git

VITE_API_URL=https://your-backend.onrender.com
```

### Why Create `.env.example` Files?

`.env` files contain **REAL secrets** and are listed in `.gitignore` (never pushed to GitHub). But if someone clones your project — a hiring manager, a collaborator, your future self — they have **no idea what environment variables are needed**.

`.env.example` shows:
- The **names** of all required variables
- **Example placeholder** values (not real secrets)
- **Comments** explaining each variable

> **The convention in every professional project:**  
> `.env` → real secrets, **NEVER** commit  
> `.env.example` → template, **ALWAYS** commit  

Both files are **safe to commit** to GitHub because they have no real values.

---

## File 9 — `Frontend/.gitignore` (Modified)

### What `.gitignore` Is

A file that tells Git which files to **never** track, stage, or commit. If a file is in `.gitignore`, it is invisible to Git — `git add .` will not include it.

### The Problem Before

The `Frontend/.gitignore` had:
```
node_modules
dist
dist-ssr
*.local
```
But **no `.env`**. If you ran `git add .` and `git push`, your `Frontend/.env` would be pushed to GitHub for the world to see.

### The Fix — What Was Added

```diff
node_modules
dist
dist-ssr
*.local

+# Environment variables — never commit these
+.env
+.env.*
+!.env.example
```

---

#### `.env`
Excludes the main `.env` file.

---

#### `.env.*`
Excludes **ALL** `.env` files with any suffix: `.env.local`, `.env.development`, `.env.production`, etc. These are all environment-specific files that might contain secrets.

---

#### `!.env.example`

The `!` prefix means **"EXCEPTION — include this file"**. This overrides the `.env.*` rule for exactly `.env.example`.

| Rule | Effect |
|---|---|
| `.env.*` | Excludes `.env.example` (since it matches `*.example`) |
| `!.env.example` | Overrides — `.env.example` **CAN** be committed |

Without `!.env.example`: `.env.*` would also exclude `.env.example` → no one who clones the repo knows what variables are needed.  
With `!.env.example`: the template is committed, the real secrets are not.

---

## How It All Works Together — Local Development Flow

```
You run: npm run dev (Backend + Frontend separately)
         │
         ▼
Backend reads Backend/.env:
  PORT=3000, NODE_ENV=development, CLIENT_URL=http://localhost:5173, ...
         │
         ▼
CORS runs in DEVELOPMENT mode (NODE_ENV !== "production")
  → Allows any localhost origin (http://localhost:5173, http://localhost:3000)
  → Does NOT restrict to CLIENT_URL
         │
         ▼
Frontend reads Frontend/.env:
  VITE_API_URL=http://localhost:3000
  → Vite uses this during dev server hot reload
         │
         ▼
User opens http://localhost:5173/login
Browser sends: POST http://localhost:3000/api/auth/login
         │
         ▼
CORS check:
  origin = "http://localhost:5173"
  NODE_ENV = "development"
  Regex matches localhost → ALLOWED ✅
         │
         ▼
Cookie set (isProduction = false):
  res.cookie("token", token, {
      httpOnly: true,
      secure: false,      ← HTTP is fine locally
      sameSite: "lax",    ← same-site cookies work on localhost
      maxAge: 86400000
  })
         │
         ▼
Browser stores cookie. On next request it is sent back automatically. ✅
```

---

## How It All Works Together — Production Flow

```
After deploying to Render (backend) + Vercel (frontend):
         │
         ▼
Backend on Render reads env vars from Render dashboard:
  PORT=10000 (Render assigns its own port)
  NODE_ENV=production
  CLIENT_URL=https://your-project.vercel.app
  MONGO_URI, JWT_SECRET, GOOGLE_GENAI_API_KEY ...
         │
         ▼
CORS runs in PRODUCTION mode:
  → ONLY allows origin === "https://your-project.vercel.app"
  → All other origins → CORS error
         │
         ▼
Frontend on Vercel was built with env var from Vercel dashboard:
  VITE_API_URL=https://your-backend.onrender.com
  → Vite baked this URL into the compiled JS bundle at build time
         │
         ▼
User opens https://your-project.vercel.app/login
React sends: POST https://your-backend.onrender.com/api/auth/login
         │
         ▼
CORS check:
  origin = "https://your-project.vercel.app"
  NODE_ENV = "production"
  origin === CLIENT_URL → ALLOWED ✅
  Response headers set:
    Access-Control-Allow-Origin: https://your-project.vercel.app
    Access-Control-Allow-Credentials: true
         │
         ▼
Cookie set (isProduction = true):
  res.cookie("token", token, {
      httpOnly: true,
      secure: true,       ← HTTPS only. Works on Render's HTTPS ✅
      sameSite: "none",   ← Cross-domain allowed (Vercel ↔ Render) ✅
      maxAge: 86400000
  })
  Response header:
    Set-Cookie: token=eyJ...; HttpOnly; Secure; SameSite=None; Max-Age=86400
         │
         ▼
Browser receives Set-Cookie. Because Secure=true and SameSite=None are set,
and the page is HTTPS, the browser stores the cookie. ✅
On every future request to onrender.com, the cookie is automatically included.
```

---

## Summary Table

| Change | Local Effect | Production Effect |
|---|---|---|
| `NODE_ENV=development` | Cookies: `lax`/insecure; CORS: allows localhost | Set `NODE_ENV=production` on Render → cookies: `none`/secure; CORS: Vercel only |
| `CLIENT_URL=localhost:5173` | Dev fallback (unused in prod check) | Set to `vercel.app` on Render → only Vercel allowed by CORS |
| `VITE_API_URL=localhost:3000` | Axios calls `localhost:3000` | Set to `render.com` on Vercel → Axios calls Render backend |
| `httpOnly: true` | Protects cookie from JS theft | Same — always on |
| `secure: isProduction` | `false` — HTTP works locally | `true` — HTTPS required |
| `sameSite: lax/none` | `lax` — same-site cookies ok | `none` — cross-domain cookies ok |
| `.env.example` files | Documents required variables | Safe to push to GitHub |
| Frontend `.gitignore .env` | `.env` not committed to Git | Secrets stay out of GitHub |

---

## Common Questions and Doubts

**Q: Why does the cookie need `secure: true` in production?**

Modern browsers enforce: a cookie marked `SameSite=None` **MUST** also be `Secure`. If not, Chrome silently ignores the `Set-Cookie` header — the cookie is never stored, and the user appears logged out immediately after login. This is one of the most common production auth bugs.

---

**Q: What is the difference between `httpOnly`, `secure`, and `sameSite`?**

| Option | Controls |
|---|---|
| `httpOnly` | Who can **READ** the cookie — JS: ❌, Server: ✅ |
| `secure` | Which **connection** can send the cookie — HTTPS only |
| `sameSite` | Which **domains** can receive the cookie — same / different |

Three independent aspects of cookie behavior.

---

**Q: Why does Vite use `import.meta.env` instead of `process.env`?**

Vite compiles React to run in the **browser**. Browsers have no Node.js runtime, no `process` object, no file system access. `import.meta.env` is Vite's browser-compatible replacement. During build, Vite scans source code for `import.meta.env.VITE_*` and replaces them with actual values. The final JS has the values **hardcoded** — not dynamically read at runtime.

---

**Q: Why prefix env vars with `VITE_`?**

Security. Vite **ONLY** includes variables prefixed with `VITE_` in the browser bundle. If you have `SECRET_KEY` in your `.env` and accidentally wrote `import.meta.env.SECRET_KEY`, Vite ignores it. Only `VITE_API_URL` (with the prefix) gets embedded. This prevents accidental leakage of server-side secrets into the browser bundle.

---

**Q: Can users see `VITE_API_URL` in the browser?**

**YES.** Because Vite bakes it into the JS bundle, anyone can open Chrome DevTools → Sources → search for `onrender.com` and find it. This is why `VITE_` variables should only contain **public** information like URLs — **never** secrets like API keys. Never do `VITE_JWT_SECRET` or `VITE_MONGO_URI` in your frontend.

---

**Q: What happens if I set `NODE_ENV=production` locally by accident?**

Your cookies would require HTTPS (which `localhost` doesn't have) → cookies never stored → login always fails. CORS would only allow `CLIENT_URL` (your Vercel URL) → local Axios requests get CORS errors. Your local app would completely break. Keep `NODE_ENV=development` locally.

---

**Q: Why does `sameSite: "none"` require `secure: true`?**

Browser security policy introduced to prevent CSRF attacks. If you set `sameSite: "none"` but `secure: false`, Chrome prints:
```
Cookie 'token' rejected because it has the 'SameSite=None' attribute but is missing the 'Secure' attribute
```
The cookie is silently not stored.

---

**Q: How does CORS work with `credentials: true`?**

When `withCredentials: true` is set in Axios (frontend) **AND** `credentials: true` in CORS (backend), the browser follows a stricter protocol:
1. The `Access-Control-Allow-Origin` header **cannot** be `"*"` (wildcard) — it must be a specific origin
2. The response must include `Access-Control-Allow-Credentials: true`

Our CORS config returns the specific origin string (not `"*"`) when allowed — so both rules are satisfied. ✅
