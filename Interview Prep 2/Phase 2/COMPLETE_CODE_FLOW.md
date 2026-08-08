# Vyakta AI — Complete Code Flow Walkthrough

> A full-stack AI-powered Interview Preparation Platform built with **React + Vite** (Frontend) and **Node.js + Express** (Backend), powered by **Google Gemini AI**.

---

## Project Structure at a Glance

```
Gen AI FullStack Project/
├── Backend/
│   ├── server.js                   <- Entry point
│   └── src/
│       ├── app.js                  <- Express app setup
│       ├── config/
│       │   └── database.js         <- MongoDB connection
│       ├── routes/
│       │   ├── auth.routes.js      <- Auth route definitions
│       │   └── interview.routes.js <- Interview route definitions
│       ├── controllers/
│       │   ├── auth.controller.js  <- Auth business logic
│       │   └── interview.controller.js <- Interview business logic
│       ├── middlewares/
│       │   ├── auth.middleware.js  <- JWT verification
│       │   └── file.middleware.js  <- Multer file upload
│       ├── models/
│       │   ├── user.model.js       <- User schema
│       │   ├── blacklist.model.js  <- Token blacklist schema
│       │   └── interviewReport.model.js <- Interview report schema
│       └── services/
│           └── ai.service.js       <- Google Gemini AI calls
│
├── Frontend/
│   └── src/
│       ├── main.jsx                <- React entry point
│       ├── App.jsx                 <- Root component + providers
│       ├── app.routes.jsx          <- React Router config
│       ├── components/
│       │   ├── Navbar.jsx          <- Top navigation bar
│       │   ├── SkeletonLoader.jsx  <- Loading skeletons
│       │   └── Icons.jsx           <- SVG icon components
│       └── features/
│           ├── auth/
│           │   ├── auth.context.jsx        <- Auth global state
│           │   ├── hooks/useAuth.js        <- Auth logic hook
│           │   ├── services/auth.api.js    <- Auth API calls
│           │   ├── components/Protected.jsx <- Route guard
│           │   └── pages/
│           │       ├── Login.jsx           <- Login page
│           │       └── Register.jsx        <- Register page
│           └── interview/
│               ├── interview.context.jsx   <- Interview global state
│               ├── hooks/useInterview.js   <- Interview logic hook
│               ├── services/interview.api.js <- Interview API calls
│               └── pages/
│                   ├── Home.jsx            <- Report creation page
│                   └── Interview.jsx       <- Report view page
│
└── docker-compose.yml              <- Deployment config
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7, Axios, SCSS |
| Backend | Node.js, Express v5, Mongoose, JWT, bcryptjs |
| Database | MongoDB Atlas |
| AI Engine | Google Gemini (gemini-flash-latest) via @google/genai |
| Schema Validation | Zod (AI output schema enforcement) |
| PDF Generation | Puppeteer (headless Chromium) |
| File Upload | Multer (in-memory storage) |
| PDF Parsing | pdf-parse |
| Deployment | Docker + Docker Compose + Nginx |

---

## BACKEND — Complete Code Flow

---

### Step 1: Application Bootstrap — server.js

This is where everything starts.

```
server.js
  |-- require('dotenv').config()  --> Load .env variables into process.env
  |-- connectDB()                 --> Connect to MongoDB
  |-- app.listen(PORT)            --> Start HTTP server on port 3000
```

**Exact execution order:**

1. `dotenv` loads environment variables: `MONGO_URI`, `JWT_SECRET`, `GOOGLE_GENAI_API_KEY`, `PORT`, `NODE_ENV`, `CLIENT_URL`
2. `connectDB()` is called — it is an `async` function, so `await` ensures we don't start the server until DB is connected
3. If DB connection fails, `process.exit(1)` shuts down immediately — no broken server running without a DB
4. `app.listen(PORT)` starts accepting HTTP requests

```js
// server.js
async function startServer() {
    await connectDB();         // MUST succeed first
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
startServer();
```

---

### Step 2: Database Connection — src/config/database.js

```js
const connectDB = async () => {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
};
```

- Uses **Mongoose** to connect to MongoDB Atlas
- `MONGO_URI` is a full connection string from `.env`
- Mongoose handles connection pooling internally — you call `connect()` once and all models share that connection

---

### Step 3: Express App Configuration — src/app.js

This file creates and configures the Express application.

```
app.js
  |-- express.json()         --> Parse JSON request bodies
  |-- express.urlencoded()   --> Parse URL-encoded form data
  |-- cookieParser()         --> Parse cookies from requests (needed to read JWT tokens)
  |-- cors()                 --> Cross-Origin Resource Sharing configuration
  |-- /api/auth              --> authRouter (auth routes)
  |-- /api/interview         --> interviewRouter (interview routes)
```

**CORS Logic (important):**

```js
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true)   // Allow Postman/curl (no origin header)

        if (process.env.NODE_ENV === "production") {
            if (origin === process.env.CLIENT_URL) {
                return callback(null, true)        // Only allow configured URL in prod
            }
            return callback(new Error(`CORS blocked`), false)
        }

        // In dev: allow any localhost origin
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true)
        }

        return callback(new Error(`CORS blocked`), false)
    },
    credentials: true   // CRITICAL: allows cookies to be sent cross-origin
}))
```

> `credentials: true` is essential — without it, the browser will NOT send the JWT cookie automatically with each request. This is what makes the HttpOnly cookie auth system work.

---

### Step 4: Routes — How URLs Map to Handlers

#### Auth Routes (/api/auth)

| Method | Path | Middleware | Controller |
|---|---|---|---|
| POST | /api/auth/register | none | registerUserController |
| POST | /api/auth/login | none | loginUserController |
| GET | /api/auth/logout | none | logoutUserController |
| GET | /api/auth/get-me | authUser | getMeController |

#### Interview Routes (/api/interview)

| Method | Path | Middleware | Controller |
|---|---|---|---|
| POST | /api/interview/ | authUser, upload.single("resume") | generateInterViewReportController |
| GET | /api/interview/report/:interviewId | authUser | getInterviewReportByIdController |
| GET | /api/interview/ | authUser | getAllInterviewReportsController |
| POST | /api/interview/resume/pdf/:interviewReportId | authUser | generateResumePdfController |
| POST | /api/interview/:interviewReportId/xray | authUser | generateInterviewXRayController |

---

### Step 5: Middleware — Auth and File

#### auth.middleware.js — JWT Verification

```
Every protected request flows through:

Request arrives with Cookie: token=<jwt>
    |
    v
authUser()
    |-- Extract token from req.cookies.token
    |-- Check if token exists in blacklistTokens collection
    |       -> If blacklisted: 401 "Token is blacklisted"
    |-- jwt.verify(token, JWT_SECRET)
    |       -> If invalid/expired: 401 "Invalid token"
    |       -> If valid: attach decoded payload to req.user
    |-- next() --> pass control to controller
```

**Key insight:** The blacklist check happens BEFORE `jwt.verify()`. This is because `jwt.verify()` alone only checks if the signature is valid — not if the user has logged out. The blacklist stores tokens that were invalidated during logout so they cannot be reused even if they haven't expired yet.

```js
async function authUser(req, res, next) {
    const token = req.cookies.token
    const isBlacklisted = await tokenBlackListModel.findOne({token})

    if (!token) return res.status(401).json({ message: "Token not provided." })
    if (isBlacklisted) return res.status(401).json({ message: "Unauthorized: Token is blacklisted." })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded   // { id: user._id, username: user.username }
    next()
}
```

#### file.middleware.js — Multer Upload

```js
const upload = multer({
    storage: multer.memoryStorage(),  // Store file in RAM as Buffer, not on disk
    limits: { fileSize: 3 * 1024 * 1024 }  // 3MB limit
})
```

- `memoryStorage()` means the PDF is never written to disk — it stays as a `Buffer` in `req.file.buffer`
- The controller accesses it via `req.file.buffer`
- This is simpler and safer for Docker environments where you can't guarantee writable disk paths

---

### Step 6: Database Models

#### user.model.js

```
{
    username: String (unique, required),
    email:    String (unique, required),
    password: String (required)   // Stored as bcrypt hash, NEVER plain text
}
```

#### blacklist.model.js

```
{
    token:     String (required),
    createdAt: Date (auto via timestamps),
    updatedAt: Date (auto via timestamps)
}
```

Used to invalidate JWT tokens on logout. Since JWTs are stateless (valid until expiry), you need this collection to force-expire them before their natural expiration time.

#### interviewReport.model.js

This is the most complex model. It stores everything the AI generates:

```
InterviewReport
|-- jobDescription    String      (the job posting text)
|-- resume            String      (parsed text from uploaded PDF)
|-- selfDescription   String      (user's own description)
|-- matchScore        Number      (0-100 match percentage)
|-- title             String      (job title extracted by AI)
|-- user              ObjectId    (reference to User._id)
|
|-- technicalQuestions  [Array of 8-10 objects]
|       question    String
|       intention   String
|       answer      String
|
|-- behavioralQuestions [Array of 8-10 objects, same shape]
|
|-- skillGaps [Array]
|       skill       String
|       severity    Enum("low" | "medium" | "high")
|
|-- preparationPlan [Array of 20 objects]
|       day     Number
|       focus   String
|       tasks   [String]
|
|-- interviewXRay (optional, generated on-demand)
    |-- blindSpots [Array of 6-10 objects]
    |       technology             String
    |       resumeEvidence         String  (EXACT QUOTE from resume)
    |       whyItAttractsAttention String
    |       interviewerThought     String  (first-person thought)
    |       expectedDepth          Enum("beginner"|"intermediate"|"advanced")
    |       blindSpotExplanation   String
    |       followUpProbability    Number (1-100)
    |       likelyQuestions        [String]  (4-8 questions)
    |       revisionChecklist      [String]
    |       whyItMatters           String
    |-- conversationDrivers [{section, probability}]
    |-- highestRiskDiscussion {topic, reason, estimatedFollowUps}
    |-- safestDiscussion {topic, reason}
    |-- surpriseQuestion {question, reason}
```

---

### Step 7: Auth Controllers — auth.controller.js

#### registerUserController

```
POST /api/auth/register
  Body: { username, email, password }
     |
     |-- Validate: all fields present?
     |       -> No: 400 "Please provide username, email and password"
     |-- Check: user exists with same username OR email?
     |       -> Yes: 400 "Account already exists"
     |-- bcrypt.hash(password, 10)     <- Hash with 10 salt rounds
     |-- userModel.create({...})       <- Save to MongoDB
     |-- jwt.sign({ id, username }, JWT_SECRET, { expiresIn: "1d" })
     |-- res.cookie("token", jwt, { httpOnly, secure, sameSite, maxAge })
     |-- 201 JSON { message, user: { id, username, email } }
```

**Cookie settings explained:**

```js
res.cookie("token", token, {
    httpOnly: true,                          // JS cannot read this cookie (XSS protection)
    secure: isProduction,                    // Only sent over HTTPS in production
    sameSite: isProduction ? "none" : "lax", // "none" required for cross-origin in prod
    maxAge: 24 * 60 * 60 * 1000             // 1 day in milliseconds
})
```

- `httpOnly: true` is the critical security flag — it means client-side JavaScript cannot access this cookie, so even if an XSS attack injects malicious JS, it cannot steal the JWT token
- `sameSite: "none"` is required in production when the frontend and backend are on different domains/ports

#### loginUserController

```
POST /api/auth/login
  Body: { email, password }
     |
     |-- userModel.findOne({ email })
     |       -> Not found: 400 "Invalid email or password"
     |-- bcrypt.compare(password, user.password)
     |       -> Doesn't match: 400 "Invalid email or password"
     |-- jwt.sign(...)    <- New token generated every login
     |-- Set cookie
     |-- 200 JSON { message, user }
```

> Notice the SAME error message for both "user not found" and "wrong password" — this is intentional. Using different messages would let attackers know which emails are registered (username enumeration attack).

#### logoutUserController

```
GET /api/auth/logout
     |
     |-- Read token from req.cookies.token
     |-- If token exists: tokenBlacklistModel.create({ token })
     |-- res.clearCookie("token")
     |-- 200 { message: "User logged out successfully" }
```

The token is added to the blacklist BEFORE clearing the cookie. This means:
1. Even if someone has copied the token value, it won't work anymore
2. The cookie is then cleared from the browser

#### getMeController

```
GET /api/auth/get-me  [Protected by authUser middleware]
     |
     |-- req.user.id is available (set by authUser middleware after JWT verification)
     |-- userModel.findById(req.user.id)
     |-- 200 { message, user: { id, username, email } }
```

This endpoint is used by the frontend on every page load to check if the user's session is still valid.

---

### Step 8: Interview Controllers — interview.controller.js

#### generateInterViewReportController — The Core Feature

```
POST /api/interview/
  Middleware chain: authUser -> upload.single("resume")
  FormData: { jobDescription, selfDescription, resume (PDF file) }

     |
     |-- STEP 1: Parse PDF (if uploaded)
     |   const resumeContent = await new pdfParse.PDFParse(Uint8Array.from(req.file.buffer)).getText()
     |   resumeText = resumeContent.text
     |   (if no file uploaded, resumeText stays empty string "")
     |
     |-- STEP 2: Call AI Service
     |   const aiReport = await generateInterviewReport({ resume, selfDescription, jobDescription })
     |   <- Returns structured JSON (validated against Zod schema by Gemini)
     |
     |-- STEP 3: Save to MongoDB
     |   await interviewReportModel.create({
     |       user: req.user.id,
     |       resume: resumeText,
     |       selfDescription,
     |       jobDescription,
     |       ...aiReport    // Spread all AI fields: matchScore, technicalQuestions, etc.
     |   })
     |
     |-- 201 { message, interviewReport }
```

**Why spread `...aiReport`?** The AI service returns an object with exactly the same field names as the Mongoose model schema (`matchScore`, `technicalQuestions`, `behavioralQuestions`, `skillGaps`, `preparationPlan`, `title`). Spreading it directly into the model create call is clean and avoids repetitive field mapping.

#### getAllInterviewReportsController

```
GET /api/interview/  [Protected]
     |
     |-- interviewReportModel
     |       .find({ user: req.user.id })
     |       .sort({ createdAt: -1 })          <- Newest first
     |       .select("-resume -selfDescription -jobDescription -__v
     |                -technicalQuestions -behavioralQuestions
     |                -skillGaps -preparationPlan -interviewXRay")
     |                                         <- Strip heavy fields
     |-- 200 { interviewReports }
```

The `.select()` with excluded fields is a smart performance optimization. The list view (Home page dashboard) only needs `title`, `matchScore`, `createdAt`, and `_id`. Not fetching the heavy AI-generated content (which can be several KB per report) makes the list load much faster.

#### generateResumePdfController

```
POST /api/interview/resume/pdf/:interviewReportId  [Protected]
     |
     |-- interviewReportModel.findById(interviewReportId)
     |-- Extract { resume, selfDescription, jobDescription } from report
     |-- const pdfBuffer = await generateResumePdf({ resume, selfDescription, jobDescription })
     |-- Set response headers:
     |       Content-Type: application/pdf
     |       Content-Disposition: attachment; filename=resume_<id>.pdf
     |-- res.send(pdfBuffer)  <- Send raw binary PDF
```

The `Content-Disposition: attachment` header tells the browser to download this response as a file rather than trying to display it inline.

#### generateInterviewXRayController

```
POST /api/interview/:interviewReportId/xray  [Protected]
     |
     |-- interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })
     |   NOTE: ownership check! user field ensures you can't run X-Ray on someone else's report
     |-- Extract context for AI: { resume, jobDescription, matchScore, skillGaps, technicalQuestions, title }
     |-- const xRayResult = await generateInterviewXRay({ resume, jobDescription, existingReport })
     |-- interviewReport.interviewXRay = xRayResult  <- Mutate the document
     |-- await interviewReport.save()                 <- Persist to MongoDB
     |-- 200 { message, interviewReport }             <- Return full updated report
```

Why save X-Ray to the existing report instead of creating a new document? Because it's supplementary data to the same interview session. The user only generates it once per report and it's persisted so they don't have to wait again on next visit.

---

### Step 9: AI Service — src/services/ai.service.js

This is the most technically interesting file. It uses **Zod schemas** to enforce structured JSON output from Gemini AI.

#### How Structured AI Output Works

```
Zod Schema
    |
    v
toJSONSchema(zodSchema)   <- Convert Zod to JSON Schema format
    |
    v
Gemini config.responseSchema   <- Pass to Gemini as constraint
    |
    v
Gemini AI is FORCED to output JSON matching the schema exactly
    |
    v
JSON.parse(response.text)   <- Parse the guaranteed-structured response
    |
    v
Typed JS object ready for MongoDB
```

Without this pattern, Gemini might return markdown, prose, or inconsistently structured JSON. With `responseSchema`, you get a guarantee.

#### generateInterviewReport() — Detailed Flow

**Zod Schema definition:**

```js
const interviewReportSchema = z.object({
    matchScore: z.number().describe("Score 0-100 of how well candidate matches the job"),

    technicalQuestions: z.array(z.object({
        question:  z.string().describe("The technical question"),
        intention: z.string().describe("Why the interviewer asks this"),
        answer:    z.string().describe("How to answer it effectively")
    })).describe("Array of 8-10 technical questions"),

    behavioralQuestions: z.array(z.object({
        question:  z.string(),
        intention: z.string(),
        answer:    z.string().describe("Answer using STAR technique")
    })).describe("Array of 8-10 behavioral questions"),

    skillGaps: z.array(z.object({
        skill:    z.string(),
        severity: z.enum(["low", "medium", "high"])
    })),

    preparationPlan: z.array(z.object({
        day:   z.number().describe("Day number 1 through 20"),
        focus: z.string(),
        tasks: z.array(z.string())
    })).describe("Exactly 20-day preparation plan"),

    title: z.string().describe("Job title from the job description")
})
```

**Prompt construction:**

```
Generate a detailed interview report for:
  Resume: <parsed PDF text or empty string>
  Self Description: <user text>
  Job Description: <full job posting>

MANDATORY:
  - 8 to 10 technical questions specific to the tech stack
  - 8 to 10 behavioral questions using STAR framework
  - Full 20-day preparation plan (Day 1 through Day 20)
```

**API call:**

```js
const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: toJSONSchema(interviewReportSchema),
    }
})
return JSON.parse(response.text)
```

#### generateResumePdf() — AI + Puppeteer Pipeline

```
Step 1: Ask Gemini to generate an HTML resume
    Schema: z.object({ html: z.string() })
    Prompt: "Generate ATS-friendly HTML resume for this candidate
             tailored to this job description.
             Return JSON with single 'html' field."

    Gemini returns: { html: "<html>...</html>" }

Step 2: Convert HTML to PDF using Puppeteer
    browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ["--no-sandbox", "--disable-setuid-sandbox",
               "--disable-dev-shm-usage", "--disable-gpu"]
    })
    page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })
    pdfBuffer = await page.pdf({ format: "A4", margin: {...} })
    await browser.close()

    Return: pdfBuffer (raw binary PDF data)
```

The `--no-sandbox` flags are required in Docker containers where Chromium cannot run with full sandbox isolation (the container itself provides isolation). `waitUntil: "networkidle0"` ensures all fonts and styles are loaded before PDF generation.

#### generateInterviewXRay() — 5-Pass Evidence Analysis

This is the most sophisticated AI prompt in the entire system. It simulates how an experienced senior engineering interviewer reads a resume:

```
PASS 1: TECHNOLOGY EXTRACTION
  -> Find every technology, framework, tool, platform in resume

PASS 2: CLAIM EXTRACTION
  -> Find every project claim, achievement, strong adjective
     ("scalable", "optimized", "production-ready", "expert", "advanced")

PASS 3: EXPECTATION MAPPING
  -> For each claim, determine what depth of knowledge an interviewer
     would EXPECT based on how the resume presents it
  -> Resume says "built scalable microservices"? Interviewer expects
     deep knowledge of service discovery, load balancing, fault tolerance

PASS 4: GAP IDENTIFICATION
  -> Find the gap between: resume claim -> expected knowledge -> likely actual knowledge
  -> A blind spot ONLY exists when ALL 3 are true:
       1. Resume evidence exists (exact quote)
       2. The evidence creates interviewer expectations
       3. There are likely areas the candidate is not prepared for

PASS 5: PROBABILITY RANKING
  -> Rank every blind spot by INTERVIEW PROBABILITY
     (how likely the interviewer actually asks about it)
  -> Use specific percentages: 92%, 78%, 65%, etc.
  -> Order by probability descending
```

**The prompt also includes existing report context:**

```js
const contextSummary = existingReport ? `
EXISTING ANALYSIS CONTEXT (use this to avoid repeating the same insights):
- Match Score: ${existingReport.matchScore}%
- Skill Gaps Already Identified: ${existingReport.skillGaps.map(g => g.skill).join(", ")}
- Technical Questions Already Generated: ${existingReport.technicalQuestions.length} questions
- Job Title: ${existingReport.title}
` : ""
```

This prevents Gemini from duplicating the analysis already done when the report was first generated — the X-Ray is supposed to provide NEW, complementary insights.

---

## FRONTEND — Complete Code Flow

---

### Step 1: Application Entry — main.jsx

```js
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
)
```

React mounts into the `<div id="root">` element in `index.html`. `StrictMode` runs effects twice in development to detect side effects and help identify bugs early.

---

### Step 2: Root Component — App.jsx

```jsx
function App() {
  return (
    <AuthProvider>          // Global auth state: user, setUser, loading, setLoading
      <InterviewProvider>   // Global interview state: report, reports, loading
        <RouterProvider router={router} />  // React Router v7
      </InterviewProvider>
    </AuthProvider>
  );
}
```

**Provider nesting order matters:**
- `AuthProvider` is outermost because interview features depend on the user being logged in
- `InterviewProvider` is inside `AuthProvider` so it can theoretically access auth state if needed
- `RouterProvider` is innermost because it renders pages that consume BOTH contexts

---

### Step 3: Routing — app.routes.jsx

```js
export const router = createBrowserRouter([
    { path: "/login",                  element: <Login /> },
    { path: "/register",               element: <Register /> },
    { path: "/",                       element: <Protected><Home /></Protected> },
    { path: "/interview/:interviewId", element: <Protected><Interview /></Protected> },
])
```

- `/login` and `/register` are **public** — no `Protected` wrapper, always accessible
- `/` (Home) and `/interview/:interviewId` are **protected** — wrapped in `<Protected>` which redirects to login if user is not authenticated

---

### Step 4: Global State — Contexts

#### auth.context.jsx

```js
export const AuthProvider = ({ children }) => {
    const [user, setUser]       = useState(null)   // null = not logged in
    const [loading, setLoading] = useState(true)   // true initially (checking session)

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading }}>
            {children}
        </AuthContext.Provider>
    )
}
```

**Why does `loading` start as `true`?**
On app startup, we don't know if the user is logged in or not. We need to call `/api/auth/get-me` to check their cookie. Until that request completes, `loading=true` tells components to show skeletons instead of redirecting to `/login` prematurely.

#### interview.context.jsx

```js
export const InterviewProvider = ({ children }) => {
    const [loading, setLoading] = useState(false)  // false (no operation happening yet)
    const [report, setReport]   = useState(null)   // the currently viewed single report
    const [reports, setReports] = useState([])     // list of all user's reports

    return (
        <InterviewContext.Provider value={{ loading, setLoading, report, setReport, reports, setReports }}>
            {children}
        </InterviewContext.Provider>
    )
}
```

---

### Step 5: Custom Hooks — Business Logic Layer

#### useAuth.js — The Auth Hook

```
What useAuth() returns:
  |-- user              <- Current user object or null
  |-- loading           <- Auth loading state
  |-- handleLogin()     <- Call this to log in
  |-- handleRegister()  <- Call this to register
  |-- handleLogout()    <- Call this to log out
```

**Auto-session restoration on app mount (useEffect with [] dependency):**

```js
useEffect(() => {
    const getAndSetUser = async () => {
        try {
            const data = await getMe()         // GET /api/auth/get-me
            if (data?.user) {
                setUser(data.user)             // Valid cookie -> restore session silently
            } else {
                setUser(null)
            }
        } catch (err) {
            setUser(null)
        } finally {
            setLoading(false)                  // Done checking, whatever happened
        }
    }
    getAndSetUser()
}, [])  // Empty array = runs once on mount only
```

This runs **once** when the app first loads. If the user closed the browser yesterday and opens it today, their JWT cookie is still in the browser. `getMe()` verifies it with the backend and restores their session — they don't need to log in again.

**Login flow step-by-step:**

```
User submits login form
    |
    handleLogin({ email, password }) in useAuth
    |-- setLoading(true)
    |-- login({ email, password })   <- POST /api/auth/login via Axios
    |       -> Server sets HttpOnly cookie on success
    |       -> Returns { message, user } or error
    |-- if success: setUser(data.user)  <- Store user in AuthContext
    |-- if failure: setUser(null)
    |-- setLoading(false)
    |-- return data  <- So Login.jsx can check if login succeeded
```

#### useInterview.js — The Interview Hook

```
What useInterview() returns:
  |-- loading           <- Interview loading state
  |-- report            <- Current single report (full data)
  |-- reports           <- List of all user's reports (lightweight)
  |-- generateReport()  <- Generate new interview report
  |-- getReportById()   <- Fetch single report by ID
  |-- getReports()      <- Fetch all user's reports
  |-- getResumePdf()    <- Download AI-generated PDF resume
  |-- generateXRay()    <- Trigger X-Ray analysis
```

**PDF download flow (most technically interesting):**

```js
const getResumePdf = async (interviewReportId) => {
    // Step 1: Fetch PDF as binary blob from backend
    const response = await generateResumePdf({ interviewReportId })
    // response is an ArrayBuffer/Blob (raw binary PDF data)

    // Step 2: Create a temporary URL for the binary data
    const url = window.URL.createObjectURL(
        new Blob([response], { type: "application/pdf" })
    )

    // Step 3: Create invisible download link and click it
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `resume_${interviewReportId}.pdf`)
    document.body.appendChild(link)
    link.click()  // Triggers browser's native file download dialog

    // Step 4: Clean up (optional but good practice)
    // link.remove()
    // window.URL.revokeObjectURL(url)
}
```

Axios is configured with `responseType: "blob"` for this request. Without that, Axios would try to parse the binary PDF as text and corrupt it.

---

### Step 6: API Services — Axios Calls

Both `auth.api.js` and `interview.api.js` create their own `axios.create()` instances:

```js
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true   // CRITICAL: include cookies in every request
})
```

`withCredentials: true` tells Axios to include the `Cookie` header in cross-origin requests. Without this, the JWT cookie is silently dropped and every protected endpoint returns 401.

**Why does each feature file have its own axios instance?**
Both files use identical config right now, but this pattern allows each feature to have different base URLs, interceptors, or headers in the future without affecting the other.

**Interview report creation uses FormData (not JSON):**

```js
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile }) => {
    const formData = new FormData()
    formData.append("jobDescription", jobDescription)
    formData.append("selfDescription", selfDescription)
    formData.append("resume", resumeFile)  // File object from input[type="file"]

    const response = await api.post("/api/interview/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    })
    return response.data
}
```

`FormData` is required because you're uploading a binary file (PDF) alongside text fields. The `multipart/form-data` encoding handles the mixed content types. Pure `application/json` cannot encode binary file data.

---

### Step 7: Route Guard — Protected.jsx

```jsx
const Protected = ({ children }) => {
    const { loading, user } = useAuth();

    if (loading) return <FullPageSkeleton />;     // Auth check in progress
    if (!user)   return <Navigate to="/login" />;  // Not authenticated -> redirect
    return children;                               // Authenticated -> render page
};
```

**Three-state machine:**

```
loading = true
    -> Show FullPageSkeleton (dummy Navbar + content placeholder)
    -> This prevents the login redirect from flashing while checking auth

loading = false, user = null
    -> Navigate to /login
    -> User is not authenticated

loading = false, user = { id, username, email }
    -> Render children (the actual page: Home or Interview)
    -> User is authenticated
```

The `FullPageSkeleton` renders a realistic-looking layout skeleton (fake Navbar bar + content blocks) so the UI doesn't flash completely blank while checking auth. This provides a much smoother experience than a spinner or empty screen.

---

### Step 8: Home Page — features/interview/pages/Home.jsx

```
Home component mounts
    |
    |-- const { loading, generateReport, reports, getReports } = useInterview()
    |-- useEffect(() => { getReports() }, [])  <- Fetch past reports on mount
    |
    |-- Local state:
    |       jobDescription    (textarea value)
    |       selfDescription   (textarea value)
    |       selectedFileName  (display name of selected file)
    |       generating        (AI generation in progress flag)
    |       genStep           (current step in fake progress animation)
    |-- resumeInputRef        (ref to hidden file input DOM element)
    |
    |-- Renders:
    |       <Navbar />
    |       {generating && <GeneratingOverlay currentStep={genStep} />}
    |       Left panel: job description textarea
    |       Right panel: file upload dropzone + self description textarea
    |       Footer: "Generate My Interview Strategy" button
    |       Past reports list (if reports.length > 0)

User clicks "Generate My Interview Strategy":
    |
    handleGenerateReport()
    |-- Get file: resumeInputRef.current?.files?.[0]
    |-- If no jobDescription: return early (button is also disabled)
    |-- setGenerating(true)          <- Show AI overlay
    |-- startStepTimer()             <- Begin fake step animation
    |-- await generateReport({ jobDescription, selfDescription, resumeFile })
    |       |-- POST /api/interview/ with FormData
    |       |-- Server parses PDF, calls Gemini, saves to MongoDB
    |       |-- Takes ~20-40 seconds
    |-- stopStepTimer()
    |-- setGenerating(false)
    |-- if data._id: navigate(`/interview/${data._id}`)
```

**The fake step animation (UX psychology):**

```js
// Steps shown during AI generation:
const GEN_STEPS = [
  { id: 1, label: 'Parsing job description' },
  { id: 2, label: 'Analyzing your profile' },
  { id: 3, label: 'Generating technical questions' },
  { id: 4, label: 'Generating behavioral questions' },
  { id: 5, label: 'Building preparation roadmap' },
  { id: 6, label: 'Calculating match score' },
];

// Advance one step every 5.5 seconds = completes in ~33 seconds
stepTimerRef.current = setInterval(() => {
    step += 1;
    setGenStep(step);
}, 5500);
```

This creates an engaging "AI is thinking" experience. The real Gemini API does ALL these steps simultaneously in a single call — the fake animation is purely cosmetic UX. Research shows that progress indicators significantly reduce perceived wait time even when they don't reflect actual progress.

---

### Step 9: Interview Report Page — features/interview/pages/Interview.jsx

```
User navigates to /interview/:interviewId
    |
    |-- useParams() -> Extract interviewId from URL
    |-- const { report, getReportById, loading, getResumePdf, generateXRay } = useInterview()
    |-- useEffect(() => { getReportById(interviewId) }, [interviewId])
    |       |-- GET /api/interview/report/<id>
    |       |-- setReport(response.interviewReport)
    |
    |-- if (loading || !report): render <InterviewSkeleton /> <- placeholder while loading
    |
    |-- Main layout (3 columns):
    |       Left: Navigation (activeNav state controls which tab is shown)
    |             Sections: Technical | Behavioral | Road Map | Interview X-Ray
    |             "Download Resume" button -> getResumePdf(interviewId)
    |
    |       Center: Content area (changes based on activeNav)
    |             technical  -> <QuestionCard[]> (expandable accordions)
    |             behavioral -> <QuestionCard[]> (same component, different data)
    |             roadmap    -> <RoadMapDay[]>   (Day 1-20 with tasks)
    |             xray       -> <XRaySection>    (state machine, see below)
    |
    |       Right: Sidebar
    |             Match Score ring (color-coded by score)
    |             Skill Gaps (colored tags by severity)
```

**QuestionCard component - expandable accordion:**

```jsx
const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false);  // Local state, not in context

    return (
        <div className="q-card">
            <div className="q-card__header" onClick={() => setOpen(o => !o)}>
                <span>Q{index + 1}</span>
                <p>{item.question}</p>
                <ChevronDownIcon rotated={open} />
            </div>
            {open && (
                <div className="q-card__body">
                    <span>Intention</span>
                    <p>{item.intention}</p>
                    <span>Model Answer</span>
                    <p>{item.answer}</p>
                </div>
            )}
        </div>
    );
};
```

Each card has its own independent `open` state — clicking one doesn't affect others. This is intentional: the user may want multiple questions open for comparison.

**XRaySection state machine:**

```
XRaySection receives: { report, interviewId, generateXRay }
    |
    |-- hasXRay = report?.interviewXRay?.blindSpots?.length > 0
    |
    |-- State: scanning (bool), scanPass (number 0-4)
    |
    |-- if scanning: render <ScanningOverlay currentPass={scanPass} />
    |
    |-- else if hasXRay: render <XRayResults xray={report.interviewXRay} />
    |
    |-- else: render CTA ("Run X-Ray Analysis" button)
    |       |
    |       handleGenerateXRay()
    |       |-- setScanning(true)
    |       |-- Start pass timer (advances every 6s through 5 passes)
    |       |-- await generateXRay(interviewId)
    |               |-- POST /api/interview/<id>/xray
    |               |-- Gemini 5-pass analysis (~20-40s)
    |               |-- setReport(updated report with interviewXRay)
    |       |-- clearInterval(timer)
    |       |-- setScanning(false)
    |       |-- Component re-renders with hasXRay=true -> shows XRayResults
```

---

## Complete End-to-End User Journey

### Journey: Registration -> Report Generation -> PDF Download -> Logout

```
Browser              Frontend                Backend               External
───────              ────────                ───────               ──────

1. Visit /
                     Protected.jsx
                     loading=true -> skeleton
                     useAuth useEffect fires
                     getMe() called
                                      GET /api/auth/get-me
                                      authUser -> no cookie -> 401
                     user=null, loading=false
                     Navigate to /login

2. Click "Create one"
                     Navigate to /register

3. Fill form + submit
                     handleRegister()
                     setLoading(true)
                                      POST /api/auth/register
                                      { username, email, password }
                                                    Validate fields
                                                    Check duplicate user
                                                    bcrypt.hash(password, 10)
                                                    userModel.create()
                                                               -> MongoDB save
                                                    jwt.sign({ id, username })
                                                    Set-Cookie: token=<jwt>; HttpOnly
                                      <- 201 { user }
                     setUser(data.user)
                     setLoading(false)
                     navigate('/')

4. Home page loads
                     Protected: user exists -> render Home
                     useEffect: getReports()
                                      GET /api/interview/
                                      authUser -> valid JWT
                                      find(user=id) -> []
                     setReports([])
                     Render empty dashboard

5. User pastes job description, uploads PDF resume

6. Click "Generate My Interview Strategy"
                     handleGenerateReport()
                     setGenerating(true)
                     startStepTimer()
                                      POST /api/interview/
                                      multipart/form-data
                                      { jobDescription, selfDescription, resume: File }
                                      authUser -> JWT valid
                                      multer -> req.file.buffer
                                      pdfParse -> extract text
                                      generateInterviewReport()
                                                            <- Gemini API
                                                               Prompt with all data
                                                               ~20-40 second wait
                                                               Returns JSON (schema-enforced)
                                      interviewReportModel.create()
                                                 -> MongoDB save
                     <- 201 { interviewReport }
                     stopStepTimer()
                     setGenerating(false)
                     navigate('/interview/<id>')

7. Interview report page loads
                     Protected: user exists
                     useEffect: getReportById(id)
                                      GET /api/interview/report/<id>
                                      authUser
                                      findOne({ _id, user })
                     <- 200 { interviewReport }
                     setReport(data)
                     Render 4-tab layout (default: Technical tab)

8. User clicks "Interview X-Ray" tab, then "Run X-Ray Analysis"
                     handleGenerateXRay()
                     setScanning(true)
                     Start pass timer
                                      POST /api/interview/<id>/xray
                                      authUser
                                      findOne({ _id, user }) (ownership check)
                                      generateInterviewXRay()
                                                            <- Gemini API
                                                               5-pass analysis
                                                               ~20-40 second wait
                                                               Returns JSON (schema-enforced)
                                      report.interviewXRay = result
                                      report.save()
                     <- 200 { interviewReport }
                     setReport(updated)
                     setScanning(false)
                     -> XRayResults renders automatically

9. User clicks "Download Resume"
                     getResumePdf(interviewId)
                     setLoading(true)
                                      POST /api/interview/resume/pdf/<id>
                                      authUser
                                      findById(id) -> get { resume, jobDescription, selfDescription }
                                      generateResumePdf()
                                                 <- Gemini: generate HTML resume
                                                    Return { html: "..." }
                                                 <- Puppeteer: render HTML
                                                    page.pdf() -> pdfBuffer
                                      Set Content-Type: application/pdf
                                      Set Content-Disposition: attachment
                     <- Binary PDF blob (responseType: "blob")
                     createObjectURL(new Blob([data]))
                     createElement("a")
                     link.click()
                     -> Browser native download dialog opens
                     setLoading(false)

10. User clicks "Sign out"
                     Navbar onLogout()
                     handleLogout()
                                      GET /api/auth/logout
                                      tokenBlacklistModel.create({ token })
                                      res.clearCookie("token")
                                      <- 200 { message }
                     setUser(null)
                     navigate('/login')
```

---

## Security Design Decisions

| Concern | Solution | Why |
|---|---|---|
| Password storage | bcrypt.hash(password, 10) | One-way hash, never store plain text; 10 salt rounds = ~100ms compute time |
| Auth token storage | HttpOnly cookie | JavaScript cannot read it, preventing XSS token theft |
| Token invalidation on logout | Blacklist collection | JWTs are stateless; blacklist gives ability to force-expire before natural expiry |
| Cross-origin requests | credentials: true on CORS + Axios | Required for cookie transmission in cross-origin setups |
| Production CORS | Only CLIENT_URL allowed | Prevents unauthorized origins from making authenticated requests |
| Development CORS | Any localhost origin | Developer convenience without opening up to public internet |
| User enumeration | Same error message for wrong email and wrong password | Attacker can't determine which emails are registered |
| File size limit | Multer 3MB cap | Prevents memory exhaustion from large uploads |
| Report ownership | findOne({ _id, user: req.user.id }) | Prevents users from accessing or running X-Ray on others' reports |
| HTTPS-only cookies | secure: true in production | Cookie won't be sent over unencrypted HTTP connections |

---

## Deployment Architecture — Docker + Nginx

```
docker-compose.yml

Service: backend (Port 3000)
    Docker image: ./Backend/Dockerfile
    Node.js + Express + Mongoose
    Puppeteer using system Chromium
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    Reads: ./Backend/.env for secrets

Service: frontend (Port 80)
    Docker image: ./Frontend/Dockerfile
    Vite builds the React app into static files
    Nginx serves the static files
    Nginx proxies /api/* requests -> backend:3000
    depends_on: backend (waits for backend to start first)
```

**Why Nginx instead of serving from Node.js?**
Nginx is far more efficient at serving static files than Node.js. Nginx handles thousands of concurrent static file requests with minimal memory. Node.js should only handle dynamic API requests.

**Why does the frontend proxy /api/* to backend?**
In production, the frontend container (Nginx at port 80) proxies API calls to `http://backend:3000` internally within the Docker network. This means:
1. The browser only ever talks to port 80 (one origin)
2. No CORS issues between frontend and backend in production
3. The backend is not directly exposed to the internet

---

## Key Design Patterns Summary

| Pattern | Where Used | Why It Matters |
|---|---|---|
| Feature-based folder structure | /features/auth, /features/interview | Co-locates related files; easier to navigate than layer-based structure |
| Context + Custom Hook separation | auth.context.jsx + useAuth.js | Context owns the state storage; Hook owns the business logic and API calls |
| Zod schema for AI output | ai.service.js | Guarantees structured JSON from Gemini; no parsing errors or missing fields |
| memoryStorage for file uploads | file.middleware.js | No disk I/O; works in Docker without mounted volumes; file lives in req.file.buffer |
| Token blacklist for logout | blacklist.model.js + auth.controller.js | Stateless JWTs can be force-expired; proper logout behavior |
| Fake progress animation | Home.jsx step timer | Reduces perceived wait time during ~30s AI generation |
| Lazy X-Ray generation | Separate POST endpoint | Expensive operation; only runs when explicitly requested, result persisted |
| withCredentials on Axios | Both API service files | Without this, the browser strips cookies from cross-origin requests |
| HttpOnly cookie over localStorage | auth.controller.js | Immune to XSS; cannot be accessed by any JavaScript including injected malicious scripts |
| .select("-heavyFields") on list query | getAllInterviewReportsController | Prevents fetching several KB of AI content per card in list views |
| Spread operator for AI response | generateInterViewReportController | Clean mapping from AI JSON to Mongoose create() without repetitive field assignment |
| useEffect with [] for session check | useAuth.js | Runs once on mount to restore session from cookie without requiring re-login |

