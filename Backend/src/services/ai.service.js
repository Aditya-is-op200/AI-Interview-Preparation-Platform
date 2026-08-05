// const { GoogleGenAI } = require("@google/genai")

// const ai = new GoogleGenAI({
//     apiKey: process.env.GOOGLE_GENAI_API_KEY
// })

// async function invokeGeminiAi() {

//     const response = await ai.models.generateContent({
//         model: "gemini-2.5-flash",
//         contents: "Hello Gemini! Explain what is Interview?"
//     })

//     console.log(response.text)
// }

// module.exports = invokeGeminiAi

const { GoogleGenAI } = require("@google/genai")
const { z, toJSONSchema } = require("zod")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

//This is a completely different schema from the ones in the model , used to create output , read docs for more.
const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("An array of 8 to 10 comprehensive technical questions tailored specifically to the job role and tech stack, along with their intention and model answer"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question using the STAR technique, what points to cover, what approach to take etc.")
    })).describe("An array of 8 to 10 detailed behavioral and situational questions tailored to the candidate and role, along with their intention and model answer"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, from Day 1 to Day 20"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A comprehensive 20-day preparation plan (exactly 20 objects, Day 1 through Day 20) for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate a detailed and comprehensive interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

IMPORTANT MANDATORY REQUIREMENTS:
1. TECHNICAL QUESTIONS: Generate 8 to 10 detailed technical questions specific to the job requirements and tech stack.
2. BEHAVIORAL QUESTIONS: Generate 8 to 10 behavioral questions using the STAR framework tailored to the company context and candidate experience.
3. PREPARATION ROADMAP: Generate a full 20-day step-by-step preparation plan (Day 1 through Day 20) with specific, actionable tasks for each day.
`

    const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: toJSONSchema(interviewReportSchema),
        }
    })

    return JSON.parse(response.text)


}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: toJSONSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}


/* ==========================================================================
   Interview X-Ray v2 — Evidence-Based Resume Blind Spot Analysis
   ========================================================================== */

const interviewXRaySchema = z.object({
    blindSpots: z.array(z.object({
        technology: z.string().describe("The specific technology, project, claim, or achievement from the resume being analyzed"),
        resumeEvidence: z.string().describe("The EXACT sentence or bullet point from the resume that triggers this blind spot. Must be a direct quote from the resume."),
        whyItAttractsAttention: z.string().describe("Why an experienced interviewer would notice and want to probe this specific claim"),
        interviewerThought: z.string().describe("The interviewer's internal thought when reading this resume line, written in first person as a direct quote"),
        expectedDepth: z.enum(["beginner", "intermediate", "advanced"]).describe("How deep the interviewer expects the candidate's knowledge to be based on how the resume presents this"),
        blindSpotExplanation: z.string().describe("What the candidate likely cannot explain despite having this on their resume, and why most candidates fall short here"),
        followUpProbability: z.number().describe("A percentage between 1 and 100 representing the probability that an interviewer will ask follow-up questions about this specific topic"),
        likelyQuestions: z.array(z.string()).describe("4 to 8 specific follow-up questions the interviewer is likely to ask, ordered by probability"),
        revisionChecklist: z.array(z.string()).describe("Specific topics and concepts the candidate should review to close this blind spot"),
        whyItMatters: z.string().describe("A direct, honest statement about what happens if the candidate cannot answer these questions. Should feel like advice from a mentor.")
    })).describe("An array of 6 to 10 evidence-based blind spots, each backed by a specific resume claim. Ordered by followUpProbability descending."),

    conversationDrivers: z.array(z.object({
        section: z.string().describe("The resume section or project that will drive interview conversation"),
        probability: z.number().describe("Percentage probability (1-100) that this section will dominate discussion time"),
    })).describe("Resume sections most likely to drive the interview conversation, ordered by probability descending"),

    highestRiskDiscussion: z.object({
        topic: z.string().describe("The single topic with the highest interview risk"),
        reason: z.string().describe("Why this topic is the highest risk for the candidate"),
        estimatedFollowUps: z.string().describe("Estimated number of follow-up questions, e.g. '6-8'"),
    }).describe("The single highest-risk discussion topic from the entire resume"),

    safestDiscussion: z.object({
        topic: z.string().describe("The topic where the candidate is most likely to succeed"),
        reason: z.string().describe("Why this is safe — what resume evidence demonstrates sufficient practical experience"),
    }).describe("The safest discussion topic where the candidate has the strongest evidence"),

    surpriseQuestion: z.object({
        question: z.string().describe("One unexpected question a senior interviewer might ask that the candidate is unlikely to have prepared for"),
        reason: z.string().describe("Why this specific question would come up based on what the resume emphasizes or omits"),
    }).describe("A single surprise question prediction — something a senior interviewer would unexpectedly ask based on resume patterns"),
})

async function generateInterviewXRay({ resume, jobDescription, existingReport }) {

    const contextSummary = existingReport ? `
EXISTING ANALYSIS CONTEXT (use this to avoid repeating the same insights):
- Match Score: ${existingReport.matchScore}%
- Skill Gaps Already Identified: ${existingReport.skillGaps?.map(g => g.skill).join(", ") || "None"}
- Technical Questions Already Generated: ${existingReport.technicalQuestions?.length || 0} questions
- Job Title: ${existingReport.title || "Unknown"}
` : ""

    const prompt = `You are a Senior Software Engineering Hiring Manager with 15+ years of interview experience at companies like Google, Meta, and Stripe.

You are reviewing a candidate's resume for the FIRST time. Your task is to perform an EVIDENCE-BASED interview blind spot analysis.

CANDIDATE'S RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

${contextSummary}

CRITICAL RULES:
- You MUST NOT invent weaknesses. Every blind spot MUST be backed by a specific sentence or bullet from the resume.
- You MUST NOT generate generic interview questions. These are FOLLOW-UP questions that arise from specific resume claims.
- You MUST NOT repeat skill-gap analysis. Focus on what IS on the resume that creates interviewer expectations.
- You MUST NOT suggest courses or explain technologies.
- You MUST think like an interviewer reading this resume, not like an AI tutor.

PERFORM THESE 5 ANALYSIS PASSES IN ORDER:

PASS 1 — TECHNOLOGY EXTRACTION
Extract every technology, framework, tool, and platform mentioned in the resume.

PASS 2 — CLAIM EXTRACTION
Find every significant project claim, achievement, or strong adjective (scalable, optimized, production-ready, enterprise, expert, advanced).

PASS 3 — EXPECTATION MAPPING
For each claim, estimate what depth of knowledge an interviewer would EXPECT based on how the resume presents it.

PASS 4 — GAP IDENTIFICATION
Find the gap between the resume claim → the expected knowledge → what the candidate likely actually knows.
This gap = a blind spot. A blind spot exists ONLY when all three conditions are true:
  1. Resume evidence exists (exact quote)
  2. The evidence creates interviewer expectations
  3. There are likely follow-up areas the candidate may not be prepared for

PASS 5 — PROBABILITY RANKING
Rank every blind spot by INTERVIEW PROBABILITY (how likely the interviewer is to ask about it), NOT by importance.
Use specific percentages (e.g., 92%, 78%, 65%).

Generate 6 to 10 blind spots ordered by followUpProbability descending.
For each blind spot, the "resumeEvidence" field MUST contain the exact sentence or phrase from the resume.
The "interviewerThought" MUST be written in first person as if the interviewer is thinking aloud.
The "whyItMatters" MUST be honest and direct, like advice from a mentor who genuinely wants the candidate to succeed.
`

    const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: toJSONSchema(interviewXRaySchema),
        }
    })

    return JSON.parse(response.text)
}


module.exports = { generateInterviewReport, generateResumePdf, generateInterviewXRay }