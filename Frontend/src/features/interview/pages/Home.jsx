import React, { useState, useRef, useEffect } from 'react';
import "../style/home.scss";
import { useInterview } from '../hooks/useInterview.js';
import { useNavigate } from 'react-router';
import Navbar from '../../../components/Navbar';
import { HomeSkeleton } from '../../../components/SkeletonLoader';
import { SparklesIcon, BriefcaseIcon, UserIcon, UploadCloudIcon, AlertCircleIcon, ZapIcon, ArrowRightIcon } from '../../../components/Icons';

const Home = () => {
  const { loading, generateReport, reports, getReports } = useInterview();
  const [jobDescription, setJobDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const resumeInputRef = useRef();

  const navigate = useNavigate();

  useEffect(() => {
    getReports();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  };

  const handleGenerateReport = async () => {
    const resumeFile = resumeInputRef.current?.files?.[0];
    const data = await generateReport({ jobDescription, selfDescription, resumeFile });
    if (data?._id) {
      navigate(`/interview/${data._id}`);
    }
  };

  if (loading) {
    return (
      <div className="home-page">
        <Navbar />
        <HomeSkeleton />
      </div>
    );
  }

  return (
    <div className="home-page">
      <Navbar />

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
            <button onClick={handleGenerateReport} className="btn-primary generate-btn">
              <SparklesIcon size={16} />
              <span>Generate My Interview Strategy</span>
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