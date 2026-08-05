import React, { useState, useRef, useEffect } from 'react';
import "../style/home.scss";
import { useInterview } from '../hooks/useInterview.js';
import { useNavigate } from 'react-router';
import Navbar from '../../../components/Navbar';
import { SparklesIcon, BriefcaseIcon, UserIcon, UploadCloudIcon, AlertCircleIcon, ZapIcon, ArrowRightIcon } from '../../../components/Icons';

/* ── AI Generation Steps config ── */
const GEN_STEPS = [
  { id: 1, label: 'Parsing job description' },
  { id: 2, label: 'Analyzing your profile' },
  { id: 3, label: 'Generating technical questions' },
  { id: 4, label: 'Generating behavioral questions' },
  { id: 5, label: 'Building preparation roadmap' },
  { id: 6, label: 'Calculating match score' },
];

/* ── Inline SVGs for overlay (no external deps needed) ── */
const BrainSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
  </svg>
);

const CheckSvg = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* ── AI Generating Overlay Component ── */
const GeneratingOverlay = ({ currentStep }) => (
  <div className="ai-generating-overlay">

    {/* Orbital animation */}
    <div className="ai-orb">
      <div className="ai-orb__track ai-orb__track--outer" />
      <div className="ai-orb__track ai-orb__track--inner" />
      <div className="ai-orb__ring ai-orb__ring--1" />
      <div className="ai-orb__ring ai-orb__ring--2" />
      <div className="ai-orb__core">
        <BrainSvg />
      </div>
    </div>

    {/* Text body */}
    <div className="ai-gen-body">
      <h2 className="ai-gen-body__title">
        Generating your strategy
        <span className="dot-loader">
          <span /><span /><span />
        </span>
      </h2>
      <p className="ai-gen-body__subtitle">
        Our AI is analyzing your profile against the job requirements. This takes about 20–40 seconds.
      </p>
    </div>

    {/* Step tracker */}
    <div className="ai-steps-list">
      {GEN_STEPS.map((step) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;
        return (
          <div
            key={step.id}
            className={`ai-step-item ${isDone ? 'ai-step-item--done' : ''} ${isActive ? 'ai-step-item--active' : ''}`}
          >
            <div className="ai-step-item__check">
              {isDone && <CheckSvg />}
            </div>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>

  </div>
);

/* ── Main Component ── */
const Home = () => {
  const { loading, generateReport, reports, getReports } = useInterview();
  const [jobDescription, setJobDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(1);
  const resumeInputRef = useRef();
  const stepTimerRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    getReports();
  }, []);

  /* Advance the step indicator while generating */
  const startStepTimer = () => {
    setGenStep(1);
    let step = 1;
    stepTimerRef.current = setInterval(() => {
      step += 1;
      if (step <= GEN_STEPS.length) {
        setGenStep(step);
      } else {
        clearInterval(stepTimerRef.current);
      }
    }, 5500); // advances every ~5.5s so it completes in ~33s
  };

  const stopStepTimer = () => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  };

  const handleGenerateReport = async () => {
    const resumeFile = resumeInputRef.current?.files?.[0];
    if (!jobDescription.trim()) return;

    setGenerating(true);
    startStepTimer();

    try {
      const data = await generateReport({ jobDescription, selfDescription, resumeFile });
      stopStepTimer();
      setGenerating(false);
      if (data?._id) {
        navigate(`/interview/${data._id}`);
      }
    } catch (err) {
      stopStepTimer();
      setGenerating(false);
    }
  };

  return (
    <div className="home-page">
      <Navbar />

      {/* AI Generation Overlay — rendered on top of everything */}
      {generating && <GeneratingOverlay currentStep={genStep} />}

      <div className="home-container animate-entrance">

        {/* Page Header */}
        <header className="page-header">
          <div className="hero-pill">
            <SparklesIcon size={14} className="sparkle-icon" />
            <span>Series A Intelligence Engine</span>
          </div>
          <h1>Create Your Custom <span className="highlight">Interview Strategy</span></h1>
          <p>Let our AI analyze job requirements and your unique background to build a winning prep plan.</p>
        </header>

        {/* Main Form Card */}
        <div className="interview-card">
          <div className="interview-card__body">

            {/* Left Panel - Job Description */}
            <div className="panel panel--left">
              <div className="panel__header">
                <span className="panel__icon">
                  <BriefcaseIcon size={18} />
                </span>
                <h2>Target Job Description</h2>
                <span className="badge badge--required">Required</span>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="panel__textarea"
                placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                maxLength={5000}
              />
              <div className="char-counter">{jobDescription.length} / 5000 chars</div>
            </div>

            {/* Vertical Divider */}
            <div className="panel-divider" />

            {/* Right Panel - Profile */}
            <div className="panel panel--right">
              <div className="panel__header">
                <span className="panel__icon">
                  <UserIcon size={18} />
                </span>
                <h2>Your Profile</h2>
              </div>

              {/* Upload Resume Dropzone */}
              <div className="upload-section">
                <label className="section-label">
                  <span>Upload Resume</span>
                  <span className="badge badge--best">Best Results</span>
                </label>
                <label className="dropzone" htmlFor="resume">
                  <span className="dropzone__icon">
                    <UploadCloudIcon size={26} />
                  </span>
                  {selectedFileName ? (
                    <p className="file-name-pill">Selected: {selectedFileName}</p>
                  ) : (
                    <>
                      <p className="dropzone__title">Click to upload or drag &amp; drop</p>
                      <p className="dropzone__subtitle">PDF or DOCX (Max 5MB)</p>
                    </>
                  )}
                  <input
                    ref={resumeInputRef}
                    onChange={handleFileChange}
                    hidden
                    type="file"
                    id="resume"
                    name="resume"
                    accept=".pdf,.docx"
                  />
                </label>
              </div>

              {/* OR Divider */}
              <div className="or-divider"><span>OR</span></div>

              {/* Quick Self-Description */}
              <div className="self-description">
                <label className="section-label" htmlFor="selfDescription">Quick Self-Description</label>
                <textarea
                  value={selfDescription}
                  onChange={(e) => setSelfDescription(e.target.value)}
                  id="selfDescription"
                  name="selfDescription"
                  className="panel__textarea panel__textarea--short"
                  placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                />
              </div>

              {/* Info Box */}
              <div className="info-box">
                <span className="info-box__icon">
                  <AlertCircleIcon size={16} />
                </span>
                <p>Either a <strong>Resume</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</p>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="interview-card__footer">
            <span className="footer-info">
              <ZapIcon size={14} style={{ color: 'var(--amber-text)' }} />
              AI-Powered Strategy Generation &bull; ~30s execution time
            </span>
            <button
              onClick={handleGenerateReport}
              className="btn-primary generate-btn"
              disabled={generating || !jobDescription.trim()}
            >
              {generating ? (
                <>
                  <span className="dot-loader" style={{ marginRight: 4 }}>
                    <span /><span /><span />
                  </span>
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={16} />
                  <span>Generate My Interview Strategy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent Reports List */}
        {reports.length > 0 && (
          <section className="recent-reports">
            <div className="section-title-wrap">
              <h2>My Recent Interview Plans</h2>
              <span className="report-count">{reports.length} saved strategies</span>
            </div>
            <ul className="reports-grid">
              {reports.map((report) => (
                <li
                  key={report._id}
                  className="report-card"
                  onClick={() => navigate(`/interview/${report._id}`)}
                >
                  <div className="card-top">
                    <h3>{report.title || 'Untitled Position'}</h3>
                    <ArrowRightIcon size={16} className="card-arrow" />
                  </div>
                  <p className="card-meta">
                    Generated on {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="card-bottom">
                    <span className={`match-score-pill ${report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>
                      Match Score: {report.matchScore}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Page Footer */}
        <footer className="page-footer">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Help Center</a>
        </footer>

      </div>
    </div>
  );
};

export default Home;