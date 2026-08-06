# 🐳 Docker Deep Dive — Vyakta AI
> **Complete Line-by-Line Study Guide**  
> Written for: Full end-to-end understanding, zero doubts

---

## Table of Contents

- [Part 0 — What is Docker and Why Are We Using It?](#part-0--what-is-docker-and-why-are-we-using-it)
- [Part 1 — Backend/Dockerfile](#part-1--file-1--backenddockerfile)
- [Part 2 — Backend/.dockerignore](#part-2--file-2--backenddockerignore)
- [Part 3 — Frontend/Dockerfile](#part-3--file-3--frontenddockerfile)
- [Part 4 — Frontend/.dockerignore](#part-4--file-4--frontenddockerignore)
- [Part 5 — Frontend/nginx.conf](#part-5--file-5--frontendnginxconf)
- [Part 6 — docker-compose.yml](#part-6--file-6--docker-composeyml)
- [Part 7 — The Puppeteer Fix](#part-7--the-puppeteer-fix--aiservicejs)
- [Part 8 — How It All Fits Together](#part-8--how-it-all-fits-together--the-full-flow)
- [Part 9 — Common Questions and Doubts](#part-9--common-questions-and-doubts)
- [Summary Table](#summary-table)

---

## Part 0 — What is Docker and Why Are We Using It?

Before reading a single line of code, understand the problem Docker solves.

### ❌ The Problem Without Docker

When you run your app locally, it works because **your machine** has:
- Node.js installed
- The right version of npm
- Chromium (the browser Puppeteer uses to make PDFs)
- All the Linux/Windows system libraries Chromium depends on

When you push your code to a server (Render, AWS, Railway), that server is a **blank Linux machine**. It has **NONE** of the above. Your app will crash.

**The specific danger for YOUR project:**
- Puppeteer needs Chromium to generate PDFs
- Chromium on Linux needs 15-20 low-level system libraries (`libnss3`, `libgbm1`, `libx11` etc). These are **NOT Node packages** — they are Linux C libraries
- A blank server does not have them. Puppeteer crashes with:
  ```
  error while loading shared libraries: libnss3.so: cannot open shared object file
  ```

### ✅ The Solution With Docker

Docker lets you create a **"container"** — basically a mini Linux computer inside your computer, with **EVERYTHING** pre-installed:
- The exact Node.js version
- Chromium
- All 15+ system libraries Chromium needs
- Your app code

You package this into an **"image"** (like a zip file of the whole system). Then you can run it anywhere — local machine, Render, AWS, DigitalOcean — and it works **identically every single time**.

> ❌ Without Docker: *"It works on my machine"*  
> ✅ With Docker: *"It works in a box. The box goes everywhere."*

### 📖 Key Docker Vocabulary

| Term | Meaning |
|---|---|
| `Dockerfile` | A recipe file. Instructions to BUILD the box |
| `Image` | The built box (read-only). A frozen snapshot |
| `Container` | A running box (live instance of an image) |
| `docker-compose` | A tool to run MULTIPLE boxes together and connect them |
| `Layer` | Each instruction in a Dockerfile creates a layer. Docker caches layers — if nothing changed, it reuses them. This is why **order** of instructions matters hugely |
| `Build context` | The folder Docker reads files from when building |

---

## Part 1 — File 1 — `Backend/Dockerfile`

### What This File Does

This file is the recipe for building the backend container. It:
1. Starts from an official Linux + Node.js base image
2. Installs Chromium and all the system libraries it needs
3. Tells Puppeteer to use that system Chromium instead of downloading its own
4. Copies your Node.js app into the container
5. Installs your npm dependencies
6. Tells the container to start the server when it runs

### Full File

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

---

### Line-by-Line Explanation

#### `FROM node:20-slim`

`FROM` is the most important Dockerfile instruction. It says: *"Start building from this pre-made image."*

`node:20-slim` means:
- `node` — The official Node.js Docker image from hub.docker.com
- `:20` — Use Node.js version 20 (LTS = Long Term Support)
- `-slim` — The "slim" variant. Debian Linux base with minimum packages. Smaller than `node:20` but still has the `apt` package manager

> **Why NOT `node:20-alpine`?**  
> Alpine Linux uses `apk` as its package manager. Most Chromium system libraries are only available in Debian/Ubuntu via `apt-get`. If we used Alpine, installing Chromium would be very difficult.  
> `slim` = Debian-based = `apt-get` available = Chromium installs cleanly.

---

#### `RUN apt-get update && apt-get install -y \ ... && rm -rf /var/lib/apt/lists/*`

`RUN` executes a shell command inside the container **during BUILD time**.

**`apt-get update`**  
Refreshes the package list from Debian servers. Like "checking for updates" before installing anything. **Required** before every `apt-get install`.

**`&&`**  
Shell operator meaning "if the left command succeeds, run the right one." Without `&&`, if update failed, install would run anyway on a stale list.

**`apt-get install -y`**  
Installs packages. `-y` means "answer yes to all prompts automatically" (non-interactive mode). Without this, `apt-get` would ask `Do you want to install? [Y/n]` and the Docker build would **hang forever** waiting for input.

**The backslash `\` at the end of each line**  
Line continuation. Tells the shell "this command continues on the next line." Just formatting for readability.

**`--no-install-recommends`**  
`apt-get` by default also installs "recommended" packages (optional extras). This flag disables that, keeping the image smaller.

**`&& rm -rf /var/lib/apt/lists/*`**  
After installing, `apt-get` leaves behind its downloaded package list cache. This can be 50–100MB. We delete it because it is useless after installation — reducing the final image size significantly.

> **⚠️ Important Docker Layer Concept:**  
> All of this is ONE `RUN` instruction, chained with `&&`. This is intentional.  
> Each `RUN` instruction creates a new layer. If you wrote three separate `RUN` commands, the `rm -rf` would be in a **separate layer** from the `apt-get`, but the package list files would still exist in the apt-get layer, making the image **LARGER**.  
> By doing it all in one `RUN` with `&&`, the cleanup happens in the **SAME layer**, so the deleted files never appear in the final image.

---

#### Why Are All These Libraries Needed?

Chromium is a massive C++ application. When it runs, it **dynamically links** to system libraries — think of these like DLLs on Windows.

| Library | Purpose |
|---|---|
| `chromium` | The actual Chromium browser binary. Puppeteer controls this to render HTML → PDF |
| `libglib2.0-0` | GLib — fundamental C library from GNOME. Chromium uses it for data structures, file I/O, threading |
| `libnss3` | Network Security Services. Handles SSL/TLS. Chromium uses it for HTTPS requests. Without it: SSL error |
| `libatk1.0-0`, `libatk-bridge2.0-0` | Accessibility Toolkit. Even in headless mode, Chromium loads these. Without them: crash |
| `libcups2` | Common Unix Printing System. Chromium links against this because it was originally built to print. Still loaded at startup |
| `libdrm2` | Direct Rendering Manager. GPU/display driver interface. Even with `--disable-gpu`, Chromium initializes DRM. Without it: crash |
| `libxkbcommon0` | X Keyboard extension. Chromium loads it at startup even if no keyboard is attached |
| `libxcomposite1`, `libxdamage1`, `libxfixes3` | X11 extension libraries for compositing, damage tracking, and fixes. Chromium rendering pipeline uses these |
| `libxrandr2` | X11 Resize and Rotate extension. Chromium checks for this at init. Without it: crash |
| `libgbm1` | Generic Buffer Management. Used by GPU rendering. Even with `--disable-gpu`, parts of Chromium call into libgbm |
| `libasound2` | ALSA — Audio library. Yes, a PDF generator needs the audio library. Chromium is a full browser engine and loads audio subsystems at startup regardless |
| `libpango-1.0-0`, `libpangocairo-1.0-0` | Pango — text layout and rendering engine. **CRITICAL** for PDF export. This is what Chromium uses to render text/fonts into pixels. Without it, text in your PDF would be invisible or corrupt |
| `libx11-6`, `libx11-xcb1`, `libxcb1`, `libxext6` | Core X Window System libraries. Even in headless mode (no monitor), Chromium links against X11 at startup. Without these: crash |
| `fonts-liberation` | Open-source fonts (Liberation Sans, Serif, Mono) — metric-compatible replacements for Arial, Times New Roman, Courier New. Without fonts, text appears as boxes in the PDF |

---

#### `ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \ PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`

`ENV` sets environment variables available both **during build** and **when the container runs**.

**`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`**  
Puppeteer, when installed via npm, normally downloads its **own copy** of Chromium (~170MB) into `node_modules/puppeteer/.local-chromium/`. We do NOT want that because:
1. We already installed system Chromium above
2. Downloading 170MB during build is slow and wasteful
3. The downloaded Chromium might not have the right system libraries

This tells Puppeteer: *"Do not download Chromium during npm install."*

**`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`**  
Tells Puppeteer **where** to find Chromium since it is not in the default location. `/usr/bin/chromium` is where `apt-get` installed it. Now when your code calls `puppeteer.launch()`, Puppeteer reads this variable and launches `/usr/bin/chromium` instead of its bundled download.

---

#### `WORKDIR /app`

`WORKDIR` sets the working directory inside the container for all subsequent instructions (`COPY`, `RUN`, `CMD`).

`/app` creates a folder called `app` at the root of the container filesystem. All your code will live here. If `/app` does not exist, Docker creates it automatically.

Think of it as: `mkdir /app && cd /app` — all subsequent commands run from inside `/app`.

---

#### `COPY package*.json ./` then `RUN npm ci --omit=dev`

This is the most important **caching trick** in Dockerfile writing.

**`COPY package*.json ./`**  
The glob `package*.json` matches BOTH:
- `package.json` (your dependency list)
- `package-lock.json` (exact locked versions)

We ONLY copy these two files first — **NOT** the whole source code.

**`RUN npm ci --omit=dev`**  
`npm ci` = "clean install":
- **Requires** `package-lock.json` to exist (reproducible installs)
- Deletes `node_modules` first before installing (clean slate)
- Installs **exactly** the versions in `package-lock.json` (no surprises)
- Faster than `npm install` for CI/CD environments

`--omit=dev` = Do not install devDependencies (like `nodemon`). In a production Docker container, you do not need nodemon.

> **Why do this in two steps?**  
> Docker layer caching. When you run `docker build` again:
> - If `package.json` and `package-lock.json` have **NOT** changed → Docker skips both COPY and RUN npm ci (uses cache). **Saves 2–3 minutes every build.**
> - If your **source code** changed but `package.json` did not → still uses cached `node_modules` layer
> - Only if `package.json` changes does Docker re-run `npm ci`
>
> If you wrote `COPY . .` first, then `RUN npm ci`: **ANY** change to any source file would trigger a full npm install. Very slow.

---

#### `COPY . .`

- First `.` = everything in the build context (`Backend/` folder)
- Second `.` = current directory inside the container (`/app`)

This copies your entire `Backend/` source code into `/app`.

**Why does this not copy `.env` or `node_modules`?**  
Because of `.dockerignore`! Those are excluded before `COPY` even sees them.

---

#### `EXPOSE 3000`

`EXPOSE` is a **documentation** instruction. It tells Docker (and humans) that this container listens on port 3000.

> **Important:** `EXPOSE` does NOT actually publish the port to your host machine. That is done by the `ports` directive in `docker-compose.yml`. `EXPOSE` is purely informational.

---

#### `CMD ["node", "server.js"]`

`CMD` is the command to run when the container **starts**. When Docker starts this container, it runs: `node server.js`.

**Why JSON array format `["node", "server.js"]` instead of just `"node server.js"`?**  
The JSON array format (called **exec form**) runs the command **directly** without a shell. The string form would wrap it in `sh -c 'node server.js'`. The exec form is preferred because:
- Signals (like `SIGTERM` from `docker stop`) go **directly** to the node process
- With shell form, the signal goes to `sh`, not `node`. Node might not shut down gracefully

---

## Part 2 — File 2 — `Backend/.dockerignore`

### What This File Does

This file tells Docker which files/folders to **exclude** from the build context. Think of it like `.gitignore` but for Docker.

### Full File

```
node_modules
.env
.git
*.log
npm-debug.log*
```

### Line-by-Line

**`node_modules`**  
Your `node_modules/` can contain hundreds of megabytes. **NEVER** copy it into Docker because:
1. We install fresh dependencies inside the container with `npm ci`
2. Some packages compile native binaries for the current OS — your Windows `node_modules` will **NOT** work on Linux (the container)
3. It would make Docker builds enormously slow (copying 200MB+)

**`.env`**  
Your `.env` file contains **SECRET API keys** (`GOOGLE_GENAI_API_KEY`, `JWT_SECRET`, `MONGO_URI` with password). If this was baked into the image, anyone who got the image could extract your secrets.

> **Security Rule:** Never bake secrets into a Docker image. Env vars are passed at **RUNTIME** via docker-compose's `env_file` instead.

**`.git`**  
Your git repository history. Not needed inside the container.

**`*.log`, `npm-debug.log*`**  
Log files. Not needed in the image.

### How `.dockerignore` Works

When you write `COPY . .` in the Dockerfile, Docker collects all files from the build context to send to the Docker daemon. **BEFORE** sending them, it strips out everything listed in `.dockerignore`. So `.` actually means *"everything EXCEPT what is in `.dockerignore`"*.

---

## Part 3 — File 3 — `Frontend/Dockerfile`

### What This File Does

This file builds the frontend container using a technique called **Multi-Stage Build**:

- **Stage 1:** Use Node.js to build the Vite React app into static files (HTML, CSS, JS) — the production files in the `dist/` folder
- **Stage 2:** Take ONLY those static files and serve them with Nginx

The final production image has **NO Node.js, no node_modules, no source code** — just 3–4 tiny compiled static files and a lightweight Nginx web server. **~15MB total instead of ~500MB.**

### Full File

```dockerfile
# Stage 1: Build the Vite app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

### Line-by-Line Explanation

#### `FROM node:20-alpine AS builder`

**`FROM node:20-alpine`**  
Alpine Linux variant of Node 20. Alpine is a tiny Linux distro (~5MB vs Debian ~150MB). For Stage 1 we only need Node.js to run `npm run build` — no Chromium, no system libraries. Alpine is fine and fast.

**`AS builder`**  
Names this stage `"builder"`. We reference this name in Stage 2 to copy files FROM this stage.

---

#### `WORKDIR /app`
Same as Backend. Sets working directory to `/app`.

---

#### `COPY package*.json ./` then `RUN npm ci`

Same caching trick. Copy only package files first.

`RUN npm ci` (no `--omit=dev`) installs **ALL** dependencies including devDependencies, because Vite itself is a devDependency needed for the build step.

---

#### `COPY . .` then `RUN npm run build`

Copies all frontend source code. Then runs `vite build` which compiles:
- JSX → JavaScript
- SCSS → CSS
- Multiple JS files → bundled, minified single JS file
- HTML template → `index.html` with correct asset references

Output goes into `/app/dist/`:
```
dist/
  index.html
  assets/
    index-abc123.js    ← your entire React app, minified
    index-def456.css   ← all your styles, minified
```

---

#### `FROM nginx:1.27-alpine`

**This starts a brand new stage.** A completely clean slate.  
The Node.js image from Stage 1 is **completely discarded**. The final image will NOT contain Node.js at all.

`nginx:1.27-alpine` — the official Nginx image, Alpine-based. Nginx is a high-performance web server that serves static files. The Alpine variant is tiny (~5MB).

---

#### `RUN rm /etc/nginx/conf.d/default.conf`

Nginx comes with a default config file that serves a placeholder "Welcome to Nginx!" page. We delete it because we are replacing it with our own `nginx.conf`.

---

#### `COPY nginx.conf /etc/nginx/conf.d/default.conf`

Copies our custom `nginx.conf` into the exact location where Nginx looks for its server configuration.

---

#### `COPY --from=builder /app/dist /usr/share/nginx/html`

**This is the magic of multi-stage builds.**

- `--from=builder` → Copy FROM the `"builder"` stage (Stage 1 above)
- `/app/dist` → The folder in Stage 1 containing the compiled React app
- `/usr/share/nginx/html` → Nginx's default web root — whatever is here gets served as the website

We copy just 3–4 small compiled files from the Node.js build environment into the clean Nginx environment.

**What the final image contains:**
- ✅ Nginx web server
- ✅ Compiled React app (`index.html` + `assets/`)
- ✅ Our `nginx.conf`
- ❌ NO Node.js
- ❌ NO `node_modules`
- ❌ NO source code
- ❌ NO `package.json`

**Result: ~15MB image.**

---

#### `CMD ["nginx", "-g", "daemon off;"]`

- `nginx` — Start the Nginx web server
- `-g` — Pass a global config directive
- `daemon off;` — By default, Nginx forks itself to run as a background daemon process. Docker needs the **main process (PID 1)** to stay in the **foreground**. If Nginx daemonizes, PID 1 exits and Docker thinks the container crashed and stops it. `daemon off;` forces Nginx to run in the foreground.

---

## Part 4 — File 4 — `Frontend/.dockerignore`

### Full File

```
node_modules
dist
.env
.git
*.log
npm-debug.log*
```

Same reasons as Backend's `.dockerignore`, plus one addition:

**`dist`**  
The `dist/` folder is your locally-built output from `npm run build` on your development machine. We **NEVER** copy this into Docker because:
1. The Dockerfile rebuilds it fresh inside the container (Stage 1)
2. The local `dist` might have been built with a different configuration
3. It could be stale (old build)

Docker generates its own fresh `dist/` in Stage 1.

---

## Part 5 — File 5 — `Frontend/nginx.conf`

### What This File Does

This is the configuration file for Nginx inside the frontend container. It does **two critical things**:
1. Serves the React SPA static files
2. **Proxies all `/api/*` requests to the backend container**

### The Core Problem It Solves

Your frontend Axios is hardcoded to `"http://localhost:3000"` as the base URL. In Docker, `"localhost"` inside the frontend container means **the frontend container itself** — NOT the backend container. There is no port 3000 in the frontend container. So all API calls would fail.

**Solution — The Reverse Proxy Trick:**

```
Browser hits http://localhost (port 80)
     ↓
Nginx in frontend container answers on port 80
     ↓
React app makes API call to /api/auth/login
     ↓
Nginx sees /api/ prefix → proxies to http://backend:3000/api/auth/login
     ↓                    ("backend" is resolved by Docker's internal DNS)
Backend processes request → returns response + Set-Cookie header
     ↓
Nginx passes response back to browser
     ↓
Cookie stored. User logged in. ✅
```

**Result: Zero changes to your frontend code needed.**

### Full File

```nginx
server {
    listen 80;

    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass         http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_pass_header  Set-Cookie;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### Line-by-Line Explanation

#### `server { ... }`
In Nginx config, a **server block** defines one virtual server (one website). Everything inside `{}` applies to this server.

---

#### `listen 80;`
Tell Nginx to listen for incoming HTTP connections on port 80. Port 80 is the default HTTP port — when you go to `http://localhost`, the browser automatically uses port 80. The semicolon is **required** in Nginx config. Every directive ends with `;`.

---

#### `root /usr/share/nginx/html;`
Sets the base folder for serving static files. This is exactly where we copied the `dist/` files in the Dockerfile.

---

#### `index index.html;`
When a request comes in for `/` (no specific file), serve `index.html`. This is the entry point of the React app.

---

#### `location /api/ { ... }`
A location block matches incoming request URLs. `/api/` means: apply these rules to **any request whose URL starts with `/api/`**. This is a **prefix match** — catches `/api/auth/login`, `/api/interview/`, etc.

---

#### `proxy_pass http://backend:3000;`
Forward the request to this address instead of serving a local file.
- `backend` — The service name from `docker-compose.yml`. Docker Compose internal DNS resolves `"backend"` to the backend container IP address automatically
- `:3000` — The backend Express server listens on port 3000

---

#### `proxy_http_version 1.1;`
Use HTTP/1.1 between Nginx and the backend container. HTTP/1.0 does not support keep-alive connections or chunked transfers. HTTP/1.1 is required for proper connection reuse.

---

#### `proxy_set_header Host $host;`
When Nginx forwards the request, add a `"Host"` header. `$host` contains the original host from the browser request (e.g., `"localhost"`). The backend needs this to know which domain it is serving.

---

#### `proxy_set_header X-Real-IP $remote_addr;`
Add an `X-Real-IP` header with the client's actual IP address. `$remote_addr` is the IP of whoever connected to Nginx. Without this, the backend sees all requests coming from Nginx's IP, not the client's real IP.

---

#### `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
`X-Forwarded-For` is a standard header listing all proxies a request went through. `$proxy_add_x_forwarded_for` appends Nginx's IP to any existing value. Express apps check this header to get the real client IP.

---

#### `proxy_set_header X-Forwarded-Proto $scheme;`
Tells the backend which protocol the browser used — `"http"` or `"https"`. `$scheme` is the Nginx variable for this. Important when the backend generates redirects or links.

---

#### `proxy_pass_header Set-Cookie;`

> **⚠️ THE MOST CRITICAL LINE FOR YOUR APP**

Your backend sets JWT tokens as HTTP-Only cookies using `res.cookie()`. The `Set-Cookie` header in the response tells the browser to store the cookie.  
By default, some Nginx configurations **strip** certain headers from proxied responses. This line **forces** Nginx to always pass `Set-Cookie` headers through unchanged.

| Without this line | With this line |
|---|---|
| Login appears to succeed | Cookie is stored correctly |
| No cookie is stored | Auth works perfectly |
| User appears logged out immediately | User stays logged in |

---

#### `location / { try_files $uri $uri/ /index.html; }`

**`location /`** matches ALL requests that do not match the `/api/` block. This is the "catch-all" for the React app routes.

**`try_files $uri $uri/ /index.html;`**
1. `$uri` — First try to serve the exact file requested (e.g., `/assets/index-abc123.js` → serves that file)
2. `$uri/` — Then try to serve it as a directory
3. `/index.html` — If neither exists, serve `index.html`

**Why fall back to `index.html`?**  
React Router handles URLs like `/interview/123` on the **client side**. But Nginx does not know about React Router. If a user directly navigates to `http://localhost/interview/123` or refreshes the page:
- Without `try_files` → **404 Not Found** error
- With `try_files` → Nginx serves `index.html`, React loads, React Router reads the URL and renders the correct component

This is the **standard way to configure Nginx for Single Page Applications**.

---

## Part 6 — File 6 — `docker-compose.yml`

### What This File Does

Docker Compose is the **orchestrator**. It defines:
- Which containers to run (services)
- How to build each one (which Dockerfile)
- Which ports to expose to your host machine
- Which environment variables each container gets
- Which containers depend on which others
- What to do if a container crashes

Without Compose, you would have to manually run 4+ commands and manage networking yourself. Compose does all of this with **one command: `docker compose up --build`**

### Full File

```yaml
services:

  backend:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    container_name: vyakta-ai-backend
    ports:
      - "3000:3000"
    environment:
      - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
    env_file:
      - ./Backend/.env
    restart: unless-stopped

  frontend:
    build:
      context: ./Frontend
      dockerfile: Dockerfile
    container_name: vyakta-ai-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

---

### Line-by-Line Explanation

#### `services:`
The top-level key in `docker-compose.yml`. Everything under `services:` defines individual containers. We have two: `backend` and `frontend`.

---

#### `backend:`
The name of this service. This name becomes a **DNS hostname** inside Docker's internal network. Other containers reach this service by the name `"backend"`. This is exactly how `nginx.conf`'s `proxy_pass http://backend:3000` works.

---

#### `build: context: ./Backend  dockerfile: Dockerfile`
- `build` — Tells Compose to BUILD the image from a Dockerfile
- `context: ./Backend` — The build context folder (relative to `docker-compose.yml` location)
- `dockerfile: Dockerfile` — The Dockerfile to use. Docker finds it at `./Backend/Dockerfile`

---

#### `container_name: vyakta-ai-backend`
When the container runs, give it this human-readable name. Without this, Docker generates a random name like `project-backend-1`. Makes it easy to find in `docker ps` output and Docker Desktop.

---

#### `ports: - "3000:3000"`
Map host port to container port. Format: `"HOST:CONTAINER"`.  
`"3000:3000"` — your laptop's port 3000 maps to the container's port 3000. This lets you directly hit the backend API at `http://localhost:3000/api/auth/login` and also allows Postman/curl to test the API directly.

---

#### `environment:` block
```yaml
- PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
- PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```
Set environment variables in the **running container** (not just during build). These two were already set in the Dockerfile's `ENV` instruction, but setting them here too ensures they are always set at runtime.

---

#### `env_file: - ./Backend/.env`
Load environment variables from this file into the container. Every line in `.env` becomes an environment variable in the container (`PORT`, `MONGO_URI`, `JWT_SECRET`, `GOOGLE_GENAI_API_KEY`).

> **Security:** The `.env` file is **NEVER** baked into the image (it is in `.dockerignore`). It is read at **RUNTIME** from your local disk and injected into the container.

---

#### `restart: unless-stopped`
If the backend crashes, Docker restarts it automatically.

| Value | Behavior |
|---|---|
| `unless-stopped` | Restart on crash ✅, restart on daemon restart ✅, restart after manual `docker stop` ❌ |
| `no` | Never restart |
| `always` | Always restart, even if manually stopped |
| `on-failure` | Only restart on non-zero exit codes |

---

#### `frontend:` service
Same pattern as backend. Builds from `./Frontend/Dockerfile`.

---

#### `ports: - "80:80"`
Maps host port 80 to container port 80. When you open `http://localhost` in a browser, it hits port 80 (implied by `http://`) which goes to the Nginx inside this container.

---

#### `depends_on: - backend`
Do not start the frontend container until the backend container has started.

> **Important nuance:** `"started"` does NOT mean `"ready to accept connections"`. It just means the backend container process has launched. If the backend takes 5 seconds to connect to MongoDB, the frontend might get API errors for those 5 seconds. For a simple local setup this is fine.

---

## Part 7 — The Puppeteer Fix — `ai.service.js`

### What We Changed

**Before (broken in Docker):**
```javascript
const browser = await puppeteer.launch()
```

**After (works in Docker):**
```javascript
const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
    ]
})
```

---

### Line-by-Line

#### `executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined`
Tells Puppeteer which Chromium binary to use.

| Environment | Value | Result |
|---|---|---|
| Inside Docker | `/usr/bin/chromium` | Uses system Chromium we installed |
| Local Windows | Not set (undefined) | Falls back to Puppeteer's bundled Chromium |

This **one line** makes the code work BOTH locally AND in Docker.

---

#### `"--no-sandbox"`

**The most critical flag for running Chromium in Docker.**

Chromium's security model uses OS-level sandboxing. This sandbox requires special Linux kernel permissions (user namespaces and seccomp filters). Docker containers by default run **without** these special permissions.  
Without `--no-sandbox`, Chromium tries to set up its sandbox, fails, and crashes with:
```
Failed to move to new namespace: errno = Operation not permitted
```
`--no-sandbox` tells Chromium: *"Skip the sandbox. I accept the risk."* This is safe in Docker because Docker itself provides isolation at the container level.

---

#### `"--disable-setuid-sandbox"`
A companion to `--no-sandbox`. Disables the setuid sandbox binary (another sandboxing mechanism). **Required** when `--no-sandbox` is used. Without it, Chromium might try to fall back to setuid sandbox and crash.

---

#### `"--disable-dev-shm-usage"`
`/dev/shm` is "shared memory" in Linux — a tmpfs filesystem for fast inter-process communication. Docker containers have a tiny `/dev/shm` by default (64MB). Chromium uses `/dev/shm` heavily for GPU and rendering shared memory. If Chromium tries to allocate more than 64MB and fails, it crashes.  
This flag tells Chromium: *"Use `/tmp` instead of `/dev/shm`."* `/tmp` has no size limit in Docker.

---

#### `"--disable-gpu"`
Docker containers do not have GPUs. Chromium's GPU process would fail to initialize and either crash or emit constant error logs. This flag disables GPU acceleration — everything renders using the CPU (software rendering). Fine for PDF generation since we just need HTML → PDF.

---

## Part 8 — How It All Fits Together — The Full Flow

```
docker compose up --build
         │
         ▼
Step 1: Reads docker-compose.yml → sees "backend" and "frontend" services
         │
         ▼
Step 2: Builds backend image
  [node:20-slim] → apt-get Chromium + 15 libs → ENV → WORKDIR → npm ci → COPY src
         │
         ▼
Step 3: Builds frontend image
  Stage 1: [node:20-alpine] → npm ci (all deps) → COPY src → npm run build → /app/dist
  Stage 2: [nginx:1.27-alpine] → nginx.conf → COPY dist → tiny 15MB image
         │
         ▼
Step 4: Docker creates internal network
  "backend" DNS resolves to backend container IP
  This is how proxy_pass http://backend:3000 works
         │
         ▼
Step 5: Backend container starts
  Reads Backend/.env → PORT, MONGO_URI, JWT_SECRET, GOOGLE_GENAI_API_KEY
  Runs: node server.js → connects to MongoDB Atlas → listens on :3000
         │
         ▼
Step 6: Frontend container starts (after backend, depends_on)
  Nginx reads nginx.conf → listens on port 80 → serves compiled React app
         │
         ▼
Step 7: You open http://localhost
  Browser → :80 → Nginx → serves index.html → React app loads
  React makes API call: POST http://localhost:3000/api/auth/login
  Docker exposed :3000 → goes directly to backend container
  Express processes login → sets JWT cookie → returns response
  Cookie stored. User is logged in. ✅
         │
         ▼
Step 8: User uploads resume PDF
  POST /api/interview/ (multipart form with PDF)
  Multer parses PDF → pdf-parse extracts text
  Text → Gemini AI API → structured JSON returned
  Report saved in MongoDB Atlas → response sent to frontend
         │
         ▼
Step 9: User clicks "Download ATS Resume PDF"
  POST /api/interview/resume/pdf/{id}
  Puppeteer launches /usr/bin/chromium
    with: --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu
  Chromium renders HTML resume template → PDF buffer generated
  Returned to frontend as blob → browser downloads PDF 📄
```

---

## Part 9 — Common Questions and Doubts

**Q: Why is there no MongoDB container in `docker-compose.yml`?**  
A: Because your project uses **MongoDB Atlas** (cloud-hosted). Atlas is accessed via a connection string URL in your `.env` `MONGO_URI`. Your app connects to it over the internet — no local MongoDB needed. If you were running local MongoDB, you would add a `mongo` service with `image: mongo:latest`.

---

**Q: What is `npm ci` vs `npm install`?**

| | `npm install` | `npm ci` |
|---|---|---|
| Reads from | `package.json` | `package-lock.json` |
| Updates lock file | Yes | No |
| Speed | Slower | Faster |
| Reproducibility | Lower | Higher |
| Requires lock file | No | Yes |

`npm ci` is for **reproducible builds** — the same result every time, everywhere. Critical in Docker.

---

**Q: What happens to MongoDB data if containers restart?**  
A: Since you use MongoDB Atlas (cloud), the data is **NOT inside Docker**. It is in MongoDB cloud infrastructure. Container restarts do not affect it at all.

---

**Q: What is layer caching and why does order matter?**  

```
✅ Correct order (fast):
  COPY package*.json ./    ← Layer A (rarely changes)
  RUN npm ci               ← Layer B (only rebuilt if package.json changes)
  COPY . .                 ← Layer C (changes with every source change)

❌ Wrong order (slow):
  COPY . .                 ← Layer A (changes with EVERY source change)
  RUN npm ci               ← Layer B (rebuilt on EVERY source change!)
```

If layer N changes, ALL layers after N are rebuilt. Put things that change rarely at the top.

---

**Q: Why `node:20-slim` for backend but `node:20-alpine` for frontend builder?**

| | Backend | Frontend builder |
|---|---|---|
| Base image | `node:20-slim` (Debian) | `node:20-alpine` (Alpine) |
| Why | Need `apt-get` to install Chromium system libraries | Only running `npm run build` — pure Node.js |
| Size | Larger (has Debian) | Smaller |

---

**Q: Is it safe to have `--no-sandbox` in Puppeteer?**  
A: In a Docker container, yes. Chromium's sandbox protects the HOST system from malicious web content. In our case, we render **our own HTML templates** (the resume HTML). There is no untrusted user-supplied HTML that could attack us. Docker itself provides process isolation. This is the standard approach used in production for PDF generation.

---

## Summary Table

| File | Purpose |
|---|---|
| `Backend/Dockerfile` | Build Node.js + Chromium + all system libs for backend |
| `Backend/.dockerignore` | Exclude `node_modules`, `.env`, `.git` from Docker build |
| `Frontend/Dockerfile` | Multi-stage: Build Vite app → Serve with Nginx |
| `Frontend/.dockerignore` | Exclude `node_modules`, `dist`, `.env` from Docker build |
| `Frontend/nginx.conf` | Serve SPA + proxy `/api/*` to backend container |
| `docker-compose.yml` | Orchestrate both containers, wire networking, inject env |
| `ai.service.js` (modified) | Fixed `puppeteer.launch()` with Docker-safe flags |

---

## Key Concepts Learned

| Concept | What It Does |
|---|---|
| `FROM` | Base image selection |
| `RUN` | Execute commands during build (creates layers) |
| `ENV` | Set environment variables baked into image |
| `WORKDIR` | Set working directory in container |
| `COPY` | Copy files into image |
| `EXPOSE` | Document which port the container uses |
| `CMD` | Default command when container starts |
| `AS` (stages) | Multi-stage builds to create tiny final images |
| Layer caching | Copy `package.json` BEFORE source for fast rebuilds |
| `.dockerignore` | Exclude files from build context |
| `services` | Compose services = containers |
| `ports` | `HOST:CONTAINER` port mapping |
| `environment` | Inject env vars into running container |
| `env_file` | Load `.env` file into container at runtime |
| `depends_on` | Service startup ordering |
| `restart` | Auto-restart policy |
| Nginx `proxy_pass` | Forward `/api/*` requests to backend container |
| `try_files` | SPA fallback for React Router |
| `proxy_pass_header Set-Cookie` | Pass JWT cookie header through proxy — critical for auth |
| `--no-sandbox` | Required for Chromium in Docker containers |
| `--disable-dev-shm-usage` | Fix Chromium shared memory limits in Docker |
| `--disable-gpu` | Disable GPU (containers have no GPU) |
| `--disable-setuid-sandbox` | Required companion to `--no-sandbox` |
