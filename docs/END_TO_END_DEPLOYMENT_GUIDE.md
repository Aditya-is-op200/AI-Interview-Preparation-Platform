# 🚀 Vyakta AI — Complete End-to-End Deployment Guide
> **Comprehensive Step-by-Step Documentation of all 8 Deployment Phases**  
> From Local Dockerization to Production Live Deployment on Vercel & Render.

---

## 📌 Executive Summary & Live Links

Vyakta AI is a full-stack AI-powered interview preparation platform. The application has been fully containerized using Docker and deployed into production with automated CI/CD pipelines.

| Service | Environment | Technology | Live URL |
|---|---|---|---|
| **Frontend** | Production | React (Vite) + Nginx SPA | [https://ai-interview-preparation-platform-eosin.vercel.app](https://ai-interview-preparation-platform-eosin.vercel.app) |
| **Backend API** | Production | Node.js (Express) + Docker + Puppeteer | [https://ai-interview-preparation-platform-xsss.onrender.com](https://ai-interview-preparation-platform-xsss.onrender.com) |
| **Database** | Cloud | MongoDB Atlas (ReplicaSet) | Cloud Infrastructure (`ResumeAiAnalyzer` DB) |
| **AI Engine** | API Service | Google Gemini AI | `gemini-1.5-flash` |
| **Source Code** | GitHub | Git Repository | [https://github.com/Aditya-is-op200/AI-Interview-Preparation-Platform](https://github.com/Aditya-is-op200/AI-Interview-Preparation-Platform) |

---

## 🏗️ Production Architecture Diagram

```text
                           User Browser
                                │
                                ▼
              ┌───────────────────────────────────┐
              │     Vercel Frontend Hosting       │
              │   (React SPA compiled with Vite)   │
              └─────────────────┬─────────────────┘
                                │
                        HTTPS API Requests
                 (Cross-Domain JWT Cookie Auth)
                                │
                                ▼
              ┌───────────────────────────────────┐
              │    Render Backend Cloud Service   │
              │  (Debian Docker Container + Node) │
              └─────────┬───────────────┬─────────┘
                        │               │
            ┌───────────┴───┐       ┌───┴───────────┐
            ▼               ▼       ▼               ▼
      MongoDB Atlas     Gemini AI  Puppeteer     System Chromium
      Cloud Database     API Engine PDF Exporter  Linux Binaries
```

---

## 📄 Phase 1 — Local Dockerization

### Goal
Containerize both backend and frontend applications so they run identically in any environment, ensuring Linux system-level Chromium dependencies for Puppeteer PDF generation are satisfied.

### Actions Taken

1. **Created `Backend/Dockerfile`**:
   - Used `node:20-slim` (Debian-based base image) to enable `apt-get` installation of Chromium.
   - Installed 15+ low-level C libraries (`libnss3`, `libgbm1`, `libpango-1.0-0`, `fonts-liberation`, etc.) required by headless Chromium.
   - Set environment variables `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
   - Used layer-caching pattern (`COPY package*.json ./` followed by `RUN npm ci --omit=dev`).

2. **Created `Backend/.dockerignore`**:
   - Excluded `node_modules`, `.env`, `.git`, and log files from the Docker build context.

3. **Created `Frontend/Dockerfile` (Multi-Stage Build)**:
   - **Stage 1 (Builder)**: `node:20-alpine` runs `npm ci` and `npm run build` to compile JSX/SCSS into static files (`dist/`).
   - **Stage 2 (Nginx)**: `nginx:1.27-alpine` copies only the compiled `/app/dist` static assets into `/usr/share/nginx/html`. Image size optimized to ~15MB.

4. **Created `Frontend/nginx.conf`**:
   - Serves React SPA static assets on port 80.
   - Configured `try_files $uri $uri/ /index.html;` to support React Router client-side routing.
   - Configured reverse proxy `location /api/` forwarding requests to `http://backend:3000`.
   - Preserved JWT cookie headers via `proxy_pass_header Set-Cookie;`.

5. **Created `docker-compose.yml`**:
   - Orchestrated `backend` (port 3000) and `frontend` (port 80) services.
   - Set internal Docker DNS networking (`backend:3000`).
   - Configured restart policy `restart: unless-stopped`.

6. **Updated Puppeteer Launch Options (`Backend/src/services/ai.service.js`)**:
   - Added Docker-compatible Chromium flags:
     ```javascript
     args: [
         "--no-sandbox",
         "--disable-setuid-sandbox",
         "--disable-dev-shm-usage",
         "--disable-gpu"
     ]
     ```

7. **Verification**:
   - Executed `docker compose up --build` and verified container startup on `http://localhost:80` and `http://localhost:3000`.

---

## 📄 Phase 2 — Production Environment Variables

### Goal
Eliminate hardcoded URLs (`http://localhost:3000`), secure JWT cookies for cross-domain HTTPS production, and restrict CORS to authorized domains.

### Actions Taken

1. **Updated Cookie Security in `Backend/src/controllers/auth.controller.js`**:
   - Applied production-aware cookie configuration:
     ```javascript
     const isProduction = process.env.NODE_ENV === "production"
     res.cookie("token", token, {
         httpOnly: true,
         secure: isProduction,
         sameSite: isProduction ? "none" : "lax",
         maxAge: 24 * 60 * 60 * 1000 // 1 day
     })
     ```
   - In production (`NODE_ENV=production`), `secure: true` and `sameSite: "none"` allow cross-domain cookie transmission between Vercel and Render over HTTPS.
   - `httpOnly: true` prevents XSS token theft via client-side JavaScript.

2. **Updated Dynamic CORS Configuration in `Backend/src/app.js`**:
   - Configured CORS middleware to dynamically evaluate incoming request origins:
     - In production: validates `origin === process.env.CLIENT_URL`.
     - In development: permits `localhost` and `127.0.0.1` origins.
     - Enforced `credentials: true` for cross-domain cookie authorization.

3. **Refactored Frontend Axios Service Instances**:
   - Modified `Frontend/src/features/auth/services/auth.api.js` and `Frontend/src/features/interview/services/interview.api.js`:
     ```javascript
     baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000"
     ```
   - Configured Vite build-time environment variable interpolation.

4. **Created Environment Configuration Files**:
   - `Backend/.env`: Added `NODE_ENV=development` and `CLIENT_URL=http://localhost:5173`.
   - `Frontend/.env`: Created with `VITE_API_URL=http://localhost:3000`.
   - `Backend/.env.example` & `Frontend/.env.example`: Created template files containing non-sensitive variable definitions.

5. **Updated `Frontend/.gitignore`**:
   - Added `.env` and `.env.*` rules while exempting `!.env.example` to prevent secret leakage.

---

## 📄 Phase 3 — MongoDB Atlas Cloud Configuration

### Goal
Ensure database persistence in cloud infrastructure independent of container lifecycles.

### Actions Taken

1. Utilized MongoDB Atlas Cloud Database (`ResumeAiAnalyzer`).
2. Set cluster network access to permit backend container IP communication (`0.0.0.0/0` access rule).
3. Injected encrypted connection string `MONGO_URI` into backend runtime environment.

---

## 📄 Phase 4 — GitHub Repository Synchronization

### Goal
Prepare source code and infrastructure configurations for cloud CI/CD deployment.

### Actions Taken

1. Executed `git status` audit verifying untracked files and gitignore exclusions.
2. Verified `.env` files were strictly excluded from staging.
3. Executed commit and push:
   ```bash
   git add .
   git commit -m "feat: dockerize project, rename to Vyakta AI, and add production env config"
   git push origin main
   ```
4. Code pushed to `https://github.com/Aditya-is-op200/AI-Interview-Preparation-Platform`.

---

## 📄 Phase 5 — Deploy Backend to Render

### Goal
Deploy the containerized Express backend onto Render Cloud Web Services.

### Actions Taken

1. Linked GitHub account to Render Dashboard.
2. Created a new **Web Service** connected to `AI-Interview-Preparation-Platform` repository.
3. Configured build parameters:
   - **Runtime**: `Docker`
   - **Build Context Directory**: `./Backend`
   - **Dockerfile Path**: `Backend/Dockerfile`
   - **Instance Type**: Free Tier
4. Injected Render Environment Variables:
   - `PORT` = `3000`
   - `NODE_ENV` = `production`
   - `MONGO_URI` = `mongodb://...`
   - `JWT_SECRET` = `...`
   - `GOOGLE_GENAI_API_KEY` = `...`
   - `CLIENT_URL` = `http://localhost:5173` *(temporary placeholder prior to Vercel deployment)*
5. Triggered deployment. Render built the Debian Docker container, installed system Chromium, and started the server.
6. Generated Live Backend API URL:
   `https://ai-interview-preparation-platform-xsss.onrender.com`

---

## 📄 Phase 6 — Deploy Frontend to Vercel

### Goal
Deploy the compiled React Single Page Application onto Vercel global CDN edge network.

### Actions Taken

1. Imported GitHub repository into Vercel Dashboard.
2. Configured project parameters:
   - **Root Directory**: `Frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` *(automated by Vite preset)*
   - **Output Directory**: `dist` *(automated by Vite preset)*
3. Injected Vercel Environment Variable:
   - `VITE_API_URL` = `https://ai-interview-preparation-platform-xsss.onrender.com`
4. Executed build. Vite compiled JSX/SCSS, substituted `import.meta.env.VITE_API_URL` with the Render API URL, and published assets to edge servers.
5. Generated Live Frontend Domain:
   `https://ai-interview-preparation-platform-eosin.vercel.app`

---

## 📄 Phase 7 — Cross-Domain Auth & CORS Wiring

### Goal
Connect production Frontend (Vercel) and Backend (Render) securely by finalizing CORS allowed origin.

### Actions Taken

1. Navigated to Render Dashboard -> **Environment Variables**.
2. Updated `CLIENT_URL` value:
   ```text
   CLIENT_URL = https://ai-interview-preparation-platform-eosin.vercel.app
   ```
3. Triggered **Save, rebuild, and deploy**.
4. Verified end-to-end handshake:
   - Browser hits `https://ai-interview-preparation-platform-eosin.vercel.app`.
   - React sends POST to `https://ai-interview-preparation-platform-xsss.onrender.com/api/auth/...`.
   - Render CORS validates origin `https://ai-interview-preparation-platform-eosin.vercel.app`.
   - Backend responds with `Set-Cookie: token=...; HttpOnly; Secure; SameSite=None`.
   - Browser stores cookie and authorizes session across domains.

---

## 📄 Phase 8 — Production Verification & Testing

### Goal
Validate full application lifecycle in live production environment.

### Verification Checklist

- [x] **Page Load**: `https://ai-interview-preparation-platform-eosin.vercel.app` renders Vyakta AI branded UI.
- [x] **Backend Health**: `https://ai-interview-preparation-platform-xsss.onrender.com/api/auth/get-me` returns JSON response `{"message":"Token not provided."}`.
- [x] **Database Connectivity**: Render logs confirm `MongoDB Connected: ac-pam82be-shard...`.
- [x] **Authentication Flow**: User registration and login generate cross-domain JWT cookies.
- [x] **AI Strategy & ATS Engine**: Resume parsing and Gemini API strategy generation operating in cloud.
- [x] **Puppeteer PDF Generation**: Linux system Chromium binary rendering resume HTML to downloadable PDF.

---

## 🔄 Future Maintenance & CI/CD Workflow

Your application is equipped with automatic deployment triggers. When making future updates:

1. Edit code locally in VS Code.
2. Commit and push:
   ```bash
   git add .
   git commit -m "feat: description of update"
   git push origin main
   ```
3. **Automated Pipeline**:
   - Vercel automatically detects the commit and updates the live frontend in **~30 seconds**.
   - Render automatically detects the commit, rebuilds the Docker image, and updates the live backend in **~2 minutes**.
4. No environment variables, URLs, or manual dashboard configurations ever need to be repeated!
