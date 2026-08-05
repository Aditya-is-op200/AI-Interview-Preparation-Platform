/**
 * - job description schema : String
 * - resume text : String
 * - Self description : String
 *
 * - matchScore : Number
 *
 * - Technical questions :
 *   [{
 *      question : "",
 *      intention : "",
 *      answer : "",
 *   }]
 *
 * - Behavioral questions : [
 *   {
 *      question : "",
 *      intention : "",
 *      answer : "",
 *   }
 * ]
 *
 * - Skill gaps : [{
 *      skill : "",
 *      severity : {
 *          type : String,
 *          enum : ["low", "medium", "high"]
 *      }
 * }]
 *
 * - preparation plan : [{}]
 */

const mongoose = require('mongoose');


const technicalQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [ true, "Technical question is required" ]
    },
    intention: {
        type: String,
        required: [ true, "Intention is required" ]
    },
    answer: {
        type: String,
        required: [ true, "Answer is required" ]
    }
}, {
    _id: false
})

const behavioralQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [ true, "Technical question is required" ]
    },
    intention: {
        type: String,
        required: [ true, "Intention is required" ]
    },
    answer: {
        type: String,
        required: [ true, "Answer is required" ]
    }
}, {
    _id: false
})

const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [ true, "Skill is required" ]
    },
    severity: {
        type: String,
        enum: [ "low", "medium", "high" ],
        required: [ true, "Severity is required" ]
    }
}, {
    _id: false
})

const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [ true, "Day is required" ]
    },
    focus: {
        type: String,
        required: [ true, "Focus is required" ]
    },
    tasks: [ {
        type: String,
        required: [ true, "Task is required" ]
    } ]
})

/* ── Interview X-Ray Schemas ── */
const blindSpotSchema = new mongoose.Schema({
    technology: { type: String, required: true },
    resumeEvidence: { type: String, required: true },
    whyItAttractsAttention: { type: String, required: true },
    interviewerThought: { type: String, required: true },
    expectedDepth: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
    blindSpotExplanation: { type: String, required: true },
    followUpProbability: { type: Number, min: 1, max: 100, required: true },
    likelyQuestions: [{ type: String }],
    revisionChecklist: [{ type: String }],
    whyItMatters: { type: String, required: true }
}, { _id: false })

const interviewXRaySchema = new mongoose.Schema({
    blindSpots: [blindSpotSchema],
    conversationDrivers: [{
        section: { type: String },
        probability: { type: Number }
    }],
    highestRiskDiscussion: {
        topic: { type: String },
        reason: { type: String },
        estimatedFollowUps: { type: String }
    },
    safestDiscussion: {
        topic: { type: String },
        reason: { type: String }
    },
    surpriseQuestion: {
        question: { type: String },
        reason: { type: String }
    }
}, { _id: false })

const interviewReportSchema = new mongoose.Schema({
    jobDescription: {
        type: String,
        required: [ true, "Job description is required" ]
    },
    resume: {
        type: String,
    },
    selfDescription: {
        type: String,
    },
    matchScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    technicalQuestions: [ technicalQuestionSchema ],
    behavioralQuestions: [ behavioralQuestionSchema ],
    skillGaps: [ skillGapSchema ],
    preparationPlan: [ preparationPlanSchema ],
    interviewXRay: interviewXRaySchema,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    title: {
        type: String,
        required: [ true, "Job title is required" ]
    }
}, {
    timestamps: true
})


const interviewReportModel = mongoose.model("InterviewReport", interviewReportSchema);

module.exports = interviewReportModel;