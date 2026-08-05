# Interview X-Ray v2 — Feature Specification & Technical Architecture

> **Tagline**: Reveal the questions your resume invites before the interviewer asks them.

---

## 🎯 Feature Overview & Philosophy

**Interview X-Ray v2** is an AI-powered resume review system that simulates how a **Senior Software Engineering Hiring Manager** (15+ years experience at Tier-1 tech companies like Google, Meta, and Stripe) evaluates a candidate's resume.

Unlike generic AI tutors or standard interview question generators, **Interview X-Ray does NOT invent weaknesses or suggest courses**. Instead, it identifies **evidence-backed blind spots** — technologies, claims, or achievements present on the candidate's resume that create expectations they may not be prepared to defend under deep technical probing.

---

## 🔍 Core Technical Principles

1. **Evidence-Based Rule**: Every identified blind spot MUST contain a direct quote (`resumeEvidence`) from the candidate's resume. A blind spot is only created when:
   - Direct resume evidence exists.
   - The evidence creates interviewer expectations.
   - There are likely follow-up technical areas where candidates commonly fall short.
2. **Probability-Driven Ranking**: Follow-up risks are quantified with explicit percentage probabilities (1–100%) rather than vague qualitative tags like "High/Medium/Low".
3. **Structured 5-Pass AI Reasoning**:
   - **Pass 1 — Technology Extraction**: Identifies every listed language, framework, database, and cloud tool.
   - **Pass 2 — Claim Extraction**: Pinpoints strong adjectives (*scalable, optimized, production-ready, enterprise*).
   - **Pass 3 — Expectation Mapping**: Maps claims to expected technical depth (*beginner, intermediate, advanced*).
   - **Pass 4 — Gap Identification**: Finds the gap between resume claim → expected knowledge → likely depth.
   - **Pass 5 — Probability Ranking**: Ranks blind spots by interview probability (likelihood of being probed).
4. **Context-Aware Second Opinion**: Generated on-demand using existing interview report analysis (match score, skill gaps, technical questions) as context, ensuring complementary rather than redundant feedback.
5. **Resource-Oriented REST Design**: Exposed as an analysis action on existing reports via `POST /api/interview/:interviewReportId/xray`.

---

## 🛠️ Detailed File Changes

### Backend Components

#### 1. `Backend/src/services/ai.service.js`
- **`interviewXRaySchema` (Zod Schema)**:
  - `blindSpots[]`: Array of 6–10 objects containing `technology`, `resumeEvidence`, `whyItAttractsAttention`, `interviewerThought`, `expectedDepth`, `blindSpotExplanation`, `followUpProbability` (1–100), `likelyQuestions[]`, `revisionChecklist[]`, and `whyItMatters`.
  - `conversationDrivers[]`: Array of `{ section, probability }` objects for time-spending predictions.
  - `highestRiskDiscussion`: Object containing `{ topic, reason, estimatedFollowUps }`.
  - `safestDiscussion`: Object containing `{ topic, reason }`.
  - `surpriseQuestion`: Object containing `{ question, reason }` predicting an unexpected senior interviewer question.
- **`generateInterviewXRay()` Function**:
  - Configured with `gemini-flash-latest` and `responseSchema` set to `interviewXRaySchema`.
  - Enforces the 5-pass reasoning prompt and passes existing report metadata to prevent repetition.

#### 2. `Backend/src/models/interviewReport.model.js`
- Added Mongoose sub-schemas `blindSpotSchema` and `interviewXRaySchema`.
- Embedded `interviewXRay` subdocument into `interviewReportSchema`.

#### 3. `Backend/src/controllers/interview.controller.js`
- **`generateInterviewXRayController()`**: Loads existing report by ID, calls `generateInterviewXRay()`, saves result to MongoDB, and returns the updated document.
- Updated `getAllInterviewReportsController` to project out `interviewXRay` for light list loading.

#### 4. `Backend/src/routes/interview.routes.js`
- Added authenticated endpoint: `POST /api/interview/:interviewReportId/xray`.

---

### Frontend Components

#### 5. `Frontend/src/features/interview/services/interview.api.js`
- Added `generateInterviewXRay(interviewReportId)` API service.

#### 6. `Frontend/src/features/interview/hooks/useInterview.js`
- Added `generateXRay(interviewReportId)` method to context hook.

#### 7. `Frontend/src/components/Icons.jsx`
- Added custom SVG icons: `ScanIcon`, `EyeIcon`, `TargetIcon`, `QuoteIcon`.

#### 8. `Frontend/src/features/interview/style/xray.scss` (New File)
- Custom Vercel/Linear-inspired SCSS styling for:
  - Blind spot cards with probability-coded left borders (Red ≥80%, Amber ≥50%, Indigo <50%).
  - Quote blocks for resume evidence.
  - Indigo thought bubbles for internal interviewer thoughts.
  - Horizontal CSS bar charts for conversation drivers.
  - Risk / Safe / Surprise question summary cards.
  - 5-pass live scanning overlay.

#### 9. `Frontend/src/features/interview/pages/Interview.jsx`
- Integrated **"Interview X-Ray"** as the 4th sidebar navigation tab (`ScanIcon`).
- Implemented state handling for CTA, 5-pass scanning overlay, and comprehensive results view.
