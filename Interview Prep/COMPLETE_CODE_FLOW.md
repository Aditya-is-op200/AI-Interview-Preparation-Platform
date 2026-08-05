# AI Interview Preparation Platform — Complete Code Flow

> A full-stack application using **React (Vite) + Node.js/Express + MongoDB + Google Gemini AI**  
> that generates personalized interview preparation reports from a user's resume and job description.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v8, Axios, SCSS, Vite |
| Backend | Node.js, Express 5, Mongoose 9 |
| Database | MongoDB Atlas |
| AI | Google Gemini Flash (`@google/genai`) |
| Auth | JWT (jsonwebtoken) + bcryptjs + HTTP-only cookies |
| File Upload | Multer (memory storage) |
| PDF Parsing | pdf-parse |
| PDF Generation | Puppeteer |
| Schema Validation | Zod (for AI output shape enforcement) |

---

## 1. Project Structure

```
Gen AI FullStack Project/
├── Backend/
│   ├── server.js                   ← Entry point
│   ├── .env                        ← Secrets (PORT, MONGO_URI, JWT_SECRET, GOOGLE_GENAI_API_KEY)
│   └── src/
│       ├── app.js                  ← Express app setup + middleware + route mounting
│       ├── config/
│       │   └── database.js         ← MongoDB connection
│       ├── models/
│       │   ├── user.model.js       ← User schema
│       │   ├── blacklist.model.js  ← JWT blacklist schema
│       │   └── interviewReport.model.js ← Interview report schema
│       ├── middlewares/
│       │   ├── auth.middleware.js  ← JWT verification guard
│       │   └── file.middleware.js  ← Multer file upload config
│       ├── routes/
│       │   ├── auth.routes.js      ← /api/auth/*
│       │   └── interview.routes.js ← /api/interview/*
│       ├── controllers/
│       │   ├── auth.controller.js  ← register, login, logout, getMe
│       │   └── interview.controller.js ← generateReport, getById, getAll, generatePdf
│       └── services/
│           └── ai.service.js       ← Gemini AI calls + Puppeteer PDF generation
└── Frontend/
    ├── index.html                  ← HTML shell
    └── src/
        ├── main.jsx                ← React root renderer
        ├── App.jsx                 ← Context providers + RouterProvider
        ├── app.routes.jsx          ← Route definitions
        ├── style.scss              ← Global styles
        └── features/
            ├── auth/
            │   ├── auth.context.jsx       ← AuthContext (user, loading state)
            │   ├── auth.form.scss         ← Form styles
            │   ├── hooks/useAuth.js       ← Auth logic hook
            │   ├── services/auth.api.js   ← Axios API calls for auth
            │   ├── pages/Login.jsx        ← Login page
            │   ├── pages/Register.jsx     ← Register page
            │   └── components/Protected.jsx ← Protected route guard
            └── interview/
                ├── interview.context.jsx  ← InterviewContext (report, reports, loading)
                ├── hooks/useInterview.js  ← Interview logic hook
                ├── services/interview.api.js ← Axios API calls for interview
                ├── pages/Home.jsx         ← Dashboard + form to generate report
                └── pages/Interview.jsx    ← Report display page
```

---

## 2. Backend Boot-Up Flow

### Step 1 — `server.js` (Entry Point)

```js
require("dotenv").config();          // Load .env variables into process.env
const connectDB = require("./src/config/database.js");
const app = require("./src/app.js");
const PORT = process.env.PORT || 3000;

async function startServer() {
    await connectDB();               // Connect to MongoDB first
    app.listen(PORT, () => { ... }); // Then start the HTTP server
}
startServer();
```

**Why this order?** The DB must be connected before accepting requests, so the server only starts after `connectDB()` resolves.

---

### Step 2 — `config/database.js`

```js
const conn = await mongoose.connect(process.env.MONGO_URI);
```

- Connects to **MongoDB Atlas** using the URI from `.env`
- If it fails, the error is caught and logged (server doesn't crash silently)

---

### Step 3 — `app.js` (Express Setup)

```js
app.use(express.json());                         // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (forms)
app.use(cookieParser());                         // Read cookies from requests
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
// ↑ Allow frontend (Vite on 5173) to send cookies cross-origin

app.use("/api/auth",      authRouter);
app.use("/api/interview", interviewRouter);
```

> **Key: `credentials: true`** in CORS is required so the browser sends/receives the JWT cookie across origins.

---

## 3. Database Models

### `user.model.js`

| Field | Type | Notes |
|---|---|---|
| `username` | String | Required, Unique |
| `email` | String | Required, Unique |
| `password` | String | Stored as bcrypt hash |

---

### `blacklist.model.js`

| Field | Type | Notes |
|---|---|---|
| `token` | String | Required |
| `createdAt` | Date | Auto (timestamps: true) |

**Purpose:** When a user logs out, their JWT is stored here. The `authMiddleware` checks this collection on every protected request, rejecting any blacklisted token. This is how **stateless JWT logout** is implemented.

---

### `interviewReport.model.js`

This is the most complex model. It stores everything generated by AI:

| Field | Type | Notes |
|---|---|---|
| `jobDescription` | String | Required |
| `resume` | String | Extracted text from PDF |
| `selfDescription` | String | User's typed description |
| `matchScore` | Number | 0–100 |
| `technicalQuestions` | `[{question, intention, answer}]` | Array of sub-docs |
| `behavioralQuestions` | `[{question, intention, answer}]` | Array of sub-docs |
| `skillGaps` | `[{skill, severity: low/medium/high}]` | Array of sub-docs |
| `preparationPlan` | `[{day, focus, tasks:[]}]` | Day-wise plan |
| `user` | ObjectId (ref: User) | Foreign key |
| `title` | String | Job title |
| `createdAt / updatedAt` | Date | Auto (timestamps: true) |

Sub-documents use `_id: false` to keep the document clean (no auto-generated IDs for each question).

---

## 4. Authentication Flow

### 4.1 — Register

**Frontend → `Register.jsx`**
1. User fills username, email, password → clicks Submit
2. `handleSubmit` calls `handleRegister({ username, email, password })` from `useAuth` hook
3. `handleRegister` calls `register()` in `auth.api.js`
4. Axios sends `POST /api/auth/register` with JSON body + `withCredentials: true`

**Backend → `auth.routes.js` → `registerUserController`**
1. Validates all 3 fields are present
2. Checks if user already exists by `username` OR `email` (`$or` query)
3. Hashes the password: `bcrypt.hash(password, 10)` (10 salt rounds)
4. Creates user in DB with hashed password
5. Signs JWT: `jwt.sign({ id, username }, JWT_SECRET, { expiresIn: "1d" })`
6. Sets the token in a cookie: `res.cookie("token", token)`
7. Returns 201 with `{ message, user: { id, username, email } }`

**Frontend ← Response**
1. `useAuth.handleRegister` receives `data`, sets `user` in `AuthContext`
2. `Register.jsx` calls `navigate("/")` → redirects to Home

---

### 4.2 — Login

**Frontend → `Login.jsx`**
1. User fills email + password → clicks Login
2. `handleSubmit` → `handleLogin({ email, password })` from `useAuth`
3. Axios `POST /api/auth/login` + `withCredentials: true`

**Backend → `loginUserController`**
1. Finds user by email
2. If not found → 400 "Invalid email or password"
3. `bcrypt.compare(password, user.password)` — compare plain vs hash
4. If invalid → 400 (same generic message to prevent user enumeration)
5. Signs JWT, sets cookie, returns 200 with user info

**Frontend ← Response**
1. Sets user in context, navigates to `/`

---

### 4.3 — Logout

**Frontend → `useAuth.handleLogout`**
1. Calls `logout()` in `auth.api.js`
2. Axios `GET /api/auth/logout` + `withCredentials: true`

**Backend → `logoutUserController`**
1. Reads `token` from `req.cookies.token`
2. If token exists → saves it to `tokenBlackListModel` (blacklisted)
3. Clears the cookie: `res.clearCookie("token")`
4. Returns 200

**Frontend ← Response**
1. Sets `user = null` in `AuthContext`

---

### 4.4 — Session Persistence (`getMe`)

This is the auto-login mechanism on app load.

**Where it runs:** `useAuth.js` has a `useEffect([], [])` that runs once on mount.

```js
useEffect(() => {
    const getAndSetUser = async () => {
        const data = await getMe()        // GET /api/auth/get-me
        if (data?.user) setUser(data.user) // restore session
        else setUser(null)
    }
    getAndSetUser()
    // loading starts as true, set to false in finally block
}, [])
```

**Backend → `authUser` middleware → `getMeController`**
1. Middleware reads token from cookie
2. Checks it's not blacklisted
3. Verifies JWT → attaches `req.user = decoded`
4. Controller does `userModel.findById(req.user.id)` and returns user

**This is why `loading` starts as `true`** — the app checks if you're logged in before rendering anything.

---

### 4.5 — `auth.middleware.js` (JWT Guard)

Every protected route passes through `authUser`:

```
Request comes in
    → Read req.cookies.token
    → If no token → 401
    → Check blacklist (tokenBlackListModel.findOne({token}))
    → If blacklisted → 401
    → jwt.verify(token, JWT_SECRET)
    → If invalid/expired → 401
    → Attach decoded payload to req.user
    → next() — proceed to controller
```

---

### 4.6 — `Protected.jsx` (Frontend Route Guard)

```jsx
const Protected = ({children}) => {
    const { loading, user } = useAuth()

    if (loading) return <Loading />        // Wait for getMe() to finish
    if (!user) return <Navigate to='/login' /> // Not logged in → redirect
    return children                        // Logged in → show the page
}
```

This wraps the `/` and `/interview/:id` routes. It ensures:
- Pages don't flash before auth check completes
- Unauthenticated users are redirected to login

---

## 5. Frontend State Architecture

### Context Layer

```
App.jsx
├── AuthProvider  (AuthContext)
│   └── state: { user, setUser, loading, setLoading }
└── InterviewProvider  (InterviewContext)
    └── state: { loading, setLoading, report, setReport, reports, setReports }
```

Both contexts use plain React `useState` — no Redux needed.

### Hook Layer (Business Logic)

- **`useAuth.js`** — wraps AuthContext, exposes `{ user, loading, handleLogin, handleRegister, handleLogout }`  
  Also contains the `useEffect` that runs `getMe()` on mount for session persistence.

- **`useInterview.js`** — wraps InterviewContext, exposes `{ loading, report, reports, generateReport, getReportById, getReports, getResumePdf }`

### Service Layer (API Calls)

- **`auth.api.js`** — Axios instance to `localhost:3000`, `withCredentials: true`  
  Functions: `register`, `login`, `logout`, `getMe`

- **`interview.api.js`** — Same Axios instance  
  Functions: `generateInterviewReport`, `getInterviewReportById`, `getAllInterviewReports`, `generateResumePdf`

---

## 6. Interview Report Generation Flow (Core Feature)

This is the most important feature. Here's the complete end-to-end flow:

### Step 1 — User fills Home page form

In `Home.jsx`:
- Left panel: Job Description textarea (max 5000 chars)
- Right panel: Resume upload (PDF/DOCX, uses `useRef` to read file) OR Self-Description textarea
- Click "Generate My Interview Strategy"

### Step 2 — `handleGenerateReport` in `Home.jsx`

```js
const handleGenerateReport = async () => {
    const resumeFile = resumeInputRef.current.files[0]  // File object from input
    const data = await generateReport({ jobDescription, selfDescription, resumeFile })
    if (data?._id) navigate(`/interview/${data._id}`)   // Navigate to report page
}
```

### Step 3 — `useInterview.generateReport`

```js
const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
    setLoading(true)
    const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
    setReport(response.interviewReport)
    return response.interviewReport   // Returns the saved DB doc
}
```

### Step 4 — `interview.api.js: generateInterviewReport`

```js
const formData = new FormData()
formData.append("jobDescription", jobDescription)
formData.append("selfDescription", selfDescription)
formData.append("resume", resumeFile)          // File object → multipart/form-data

await api.post("/api/interview/", formData, {
    headers: { "Content-Type": "multipart/form-data" }
})
```

**Why FormData?** Because we're uploading a binary file (PDF) alongside text fields. JSON can't carry binary data.

### Step 5 — Backend Route: `POST /api/interview/`

```
→ authMiddleware.authUser   (verify JWT from cookie)
→ upload.single("resume")   (Multer processes the file)
→ generateInterViewReportController
```

**`file.middleware.js` (Multer)**:
```js
const upload = multer({
    storage: multer.memoryStorage(),  // Store file in RAM as Buffer, NOT disk
    limits: { fileSize: 3 * 1024 * 1024 }  // 3MB limit
})
```
After Multer runs, `req.file.buffer` contains the PDF bytes in memory.

### Step 6 — `interview.controller.js: generateInterViewReportController`

```js
// 1. Extract text from PDF buffer
let resumeText = ""
if (req.file && req.file.buffer) {
    const resumeContent = await (new pdfParse.PDFParse(
        Uint8Array.from(req.file.buffer)
    )).getText()
    resumeText = resumeContent.text   // Plain text from PDF
}

// 2. Get form fields
const { selfDescription, jobDescription } = req.body

// 3. Call AI service
const interViewReportByAi = await generateInterviewReport({
    resume: resumeText,
    selfDescription,
    jobDescription
})

// 4. Save to MongoDB (merging user input + AI output)
const interviewReport = await interviewReportModel.create({
    user: req.user.id,     // From JWT decoded payload
    resume: resumeText,
    selfDescription,
    jobDescription,
    ...interViewReportByAi  // matchScore, technicalQuestions, behavioralQuestions, skillGaps, preparationPlan, title
})

// 5. Return 201
res.status(201).json({ message: "...", interviewReport })
```

### Step 7 — `ai.service.js: generateInterviewReport`

This is where **Gemini AI** is called with **structured output** using Zod:

```js
// 1. Define the expected output shape using Zod
const interviewReportSchema = z.object({
    matchScore: z.number(),
    technicalQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })),
    behavioralQuestions: z.array(z.object({ ... })),
    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum(["low", "medium", "high"])
    })),
    preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        tasks: z.array(z.string())
    })),
    title: z.string()
})

// 2. Build the prompt
const prompt = `Generate an interview report for a candidate with:
    Resume: ${resume}
    Self Description: ${selfDescription}
    Job Description: ${jobDescription}`

// 3. Call Gemini API with JSON-constrained output
const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: toJSONSchema(interviewReportSchema),  // Zod → JSON Schema
    }
})

// 4. Parse and return
return JSON.parse(response.text)
```

**Why Zod + `responseSchema`?**  
Gemini supports constrained decoding. By passing a JSON Schema, we guarantee the AI **always returns valid, structured JSON** matching our exact shape — no prompt engineering tricks needed.

### Step 8 — Frontend Receives Response & Navigates

```js
// Home.jsx
if (data?._id) navigate(`/interview/${data._id}`)
```

User is redirected to `/interview/<mongodb-id>`

---

## 7. Interview Report Display Flow

### Route: `/interview/:interviewId`

`app.routes.jsx`:
```jsx
{ path: "/interview/:interviewId", element: <Protected><Interview /></Protected> }
```

### `Interview.jsx` on mount

```js
const { interviewId } = useParams()      // From URL
useEffect(() => {
    if (interviewId) getReportById(interviewId)
}, [interviewId])
```

### `useInterview.getReportById`

```js
const response = await getInterviewReportById(interviewId)
setReport(response.interviewReport)
```

### Backend: `GET /api/interview/report/:interviewId`

```js
const interviewReport = await interviewReportModel.findOne({
    _id: interviewId,
    user: req.user.id   // Security: only the report's owner can view it
})
```

### What `Interview.jsx` renders

The page has a **3-panel layout**:

**Left Nav** — Tabs: "Technical Questions" | "Behavioral Questions" | "Road Map"  
- Also has a "Download Resume" button

**Center Content** — Switches based on active tab:
- `technical` → List of `QuestionCard` components (accordion: click to expand Intention + Model Answer)
- `behavioral` → Same `QuestionCard` component reused
- `roadmap` → List of `RoadMapDay` components (Day badge + Focus title + Tasks list)

**Right Sidebar**:
- **Match Score Ring** — Color-coded: ≥80 = high (green), ≥60 = mid (yellow), <60 = low (red)
- **Skill Gaps** — Colored tags: `skill-tag--low`, `skill-tag--medium`, `skill-tag--high`

**`QuestionCard` Component** (accordion):
```jsx
const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false)
    return (
        <div onClick={() => setOpen(o => !o)}>
            Q{index+1}: {item.question}  [chevron icon]
            {open && (
                <>
                    <tag>Intention</tag> <p>{item.intention}</p>
                    <tag>Model Answer</tag> <p>{item.answer}</p>
                </>
            )}
        </div>
    )
}
```

---

## 8. Get All Reports (Dashboard) Flow

### On `Home.jsx` mount

```js
useEffect(() => { getReports() }, [])
```

`useInterview.getReports` → `getAllInterviewReports()` → `GET /api/interview/`

### Backend: `getAllInterviewReportsController`

```js
const interviewReports = await interviewReportModel
    .find({ user: req.user.id })
    .sort({ createdAt: -1 })            // Newest first
    .select("-resume -selfDescription -jobDescription -__v 
             -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")
```

**Key:** Heavy fields (resume text, all questions, plan) are **excluded** with `.select()` — only `title`, `matchScore`, `createdAt`, `_id` come back. This makes the list lightweight.

### Rendered in `Home.jsx`

```jsx
{reports.length > 0 && (
    <ul>
        {reports.map(report => (
            <li onClick={() => navigate(`/interview/${report._id}`)}>
                <h3>{report.title}</h3>
                <p>Generated on {new Date(report.createdAt).toLocaleDateString()}</p>
                <p className={`match-score ${score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low'}`}>
                    Match Score: {report.matchScore}%
                </p>
            </li>
        ))}
    </ul>
)}
```

---

## 9. Resume PDF Generation Flow

### Triggered from `Interview.jsx`

```jsx
<button onClick={() => getResumePdf(interviewId)}>Download Resume</button>
```

### `useInterview.getResumePdf`

```js
const getResumePdf = async (interviewReportId) => {
    const response = await generateResumePdf({ interviewReportId })
    // Response is a Blob (binary PDF)
    const url = window.URL.createObjectURL(new Blob([response], { type: "application/pdf" }))
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `resume_${interviewReportId}.pdf`)
    document.body.appendChild(link)
    link.click()   // Triggers browser download
}
```

### `interview.api.js: generateResumePdf`

```js
const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
    responseType: "blob"    // Tell Axios to receive binary data
})
```

### Backend: `POST /api/interview/resume/pdf/:interviewReportId`

1. Find the report by ID
2. Extract `resume`, `jobDescription`, `selfDescription`
3. Call `ai.service.generateResumePdf(...)`

### `ai.service.js: generateResumePdf`

```js
// Step 1: Ask Gemini to generate resume HTML
const resumePdfSchema = z.object({
    html: z.string()   // Just one field — the HTML string
})
const prompt = `Generate resume for a candidate...
    (tailored for job description, ATS-friendly, 1-2 pages, professional HTML)`

const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: toJSONSchema(resumePdfSchema)
    }
})

const { html } = JSON.parse(response.text)

// Step 2: Convert HTML to PDF using Puppeteer
const pdfBuffer = await generatePdfFromHtml(html)
return pdfBuffer
```

### `generatePdfFromHtml(html)` (Puppeteer)

```js
const browser = await puppeteer.launch()
const page = await browser.newPage()
await page.setContent(html, { waitUntil: "networkidle0" })  // Wait for all resources
const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
})
await browser.close()
return pdfBuffer  // Binary PDF bytes
```

### Backend sends back

```js
res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
})
res.send(pdfBuffer)  // Send binary
```

Frontend receives it as a Blob, creates an object URL, and programmatically clicks a download link.

---

## 10. Frontend Routing

```
/login          → Login.jsx           (public)
/register       → Register.jsx        (public)
/               → Protected → Home.jsx
/interview/:id  → Protected → Interview.jsx
```

**`createBrowserRouter`** from React Router v8 is used (replaces the older `createBrowserRouter` from `react-router-dom`).

The `Protected` component is a wrapper that:
1. Shows loading state while `getMe` runs
2. Redirects to `/login` if unauthenticated
3. Renders `children` if authenticated

---

## 11. Key Design Patterns

### 1. Feature-based folder structure
Each feature (`auth`, `interview`) has its own `pages/`, `hooks/`, `services/`, `context/` — making it modular and scalable.

### 2. 4-Layer Frontend Architecture
```
Page (UI)
  ↓ calls
Hook (business logic, state management)
  ↓ calls
Service (API layer, Axios)
  ↓ HTTP
Backend
```

### 3. Context → Hook separation
- **Context** (`auth.context.jsx`) only holds state (user, loading)
- **Hook** (`useAuth.js`) holds all business logic and returns functions to pages
- Pages only call hook functions — they never touch context directly

### 4. JWT Blacklist for Stateless Logout
Since JWTs are stateless (can't be invalidated from server side by default), the pattern here stores the token in a DB collection on logout. Every auth check queries this collection.

### 5. Structured AI Output (Zod + Gemini JSON Schema)
Instead of parsing free-form AI text, the app passes a Zod-derived JSON Schema to Gemini, forcing it to output exactly the right structure. This eliminates hallucination in format.

### 6. Memory Storage for File Uploads
Multer is configured with `memoryStorage()` — the PDF never touches the filesystem. It stays as a `Buffer` in RAM, is parsed to text, and discarded. This is simpler and works for small files (3MB limit).

### 7. Selective Field Projection
`getAllInterviewReports` uses `.select("-resume -technicalQuestions ...")` to exclude heavy fields from the list view. Full data is only loaded on the individual report page.

---

## 12. Environment Variables

| Variable | Used In | Purpose |
|---|---|---|
| `PORT` | `server.js` | Server port (default 3000) |
| `MONGO_URI` | `config/database.js` | MongoDB Atlas connection string |
| `JWT_SECRET` | `auth.controller.js`, `auth.middleware.js` | Sign and verify JWTs |
| `GOOGLE_GENAI_API_KEY` | `ai.service.js` | Gemini API authentication |

---

## 13. Data Flow Diagram

```
Browser (React)
    │
    │  HTTP (JSON / FormData / Blob)
    │  Cookies (JWT) auto-sent by browser
    ▼
Express Server (Node.js)
    │
    ├── Middleware Stack:
    │     json() → urlencoded() → cookieParser() → cors()
    │
    ├── Route: /api/auth/*
    │     └── authController → userModel / bcrypt / jwt / blacklistModel
    │
    └── Route: /api/interview/*
          └── authMiddleware → upload (Multer) → interviewController
                └── pdfParse (PDF→text)
                └── ai.service (Gemini AI → structured JSON)
                └── interviewReportModel (save to MongoDB)
                └── generateResumePdf (Gemini HTML → Puppeteer → PDF Buffer)
    │
    ▼
MongoDB Atlas
    ├── users collection
    ├── blacklistTokens collection
    └── InterviewReport collection
```

---

## 14. Common Interview Questions About This Project

**Q: Why do you use cookies instead of localStorage for JWT?**  
A: Cookies with `httpOnly` flag prevent XSS attacks from stealing the token. However in this codebase `res.cookie()` is called without `httpOnly: true` — that's a known improvement.

**Q: How do you handle logout if JWT is stateless?**  
A: By maintaining a blacklist in MongoDB. On every request, the middleware checks if the token is blacklisted. Trade-off: DB query on every request. Could be optimized with Redis.

**Q: Why Zod for AI output?**  
A: Gemini's constrained decoding with `responseSchema` guarantees valid JSON in the exact shape we need. Zod's `toJSONSchema()` converts the Zod definition to a standard JSON Schema that Gemini accepts.

**Q: Why `memoryStorage` for Multer instead of disk?**  
A: No need to manage temp files. The PDF is transient — we only need its text content.  The buffer is garbage-collected after the request completes.

**Q: What is `withCredentials: true` in Axios?**  
A: It tells the browser to include cookies in cross-origin requests. Without it, the JWT cookie would not be sent, and every request to the backend would appear unauthenticated.

**Q: How does session persist across page refresh?**  
A: `useAuth` has a `useEffect` that runs `getMe()` on mount. This hits `/api/auth/get-me` which reads the cookie (still in browser). If valid, the user is restored to context.
