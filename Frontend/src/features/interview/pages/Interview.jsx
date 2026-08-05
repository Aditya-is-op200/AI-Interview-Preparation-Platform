import React, { useState, useEffect } from 'react';
import '../style/interview.scss';
import '../style/xray.scss';
import { useInterview } from '../hooks/useInterview.js';
import { useNavigate, useParams } from 'react-router';
import Navbar from '../../../components/Navbar';
import { InterviewSkeleton } from '../../../components/SkeletonLoader';
import { CodeIcon, MessageSquareIcon, CompassIcon, ChevronDownIcon, SparklesIcon, ScanIcon } from '../../../components/Icons';

const NAV_ITEMS = [
  { id: 'technical', label: 'Technical Questions', icon: <CodeIcon size={16} /> },
  { id: 'behavioral', label: 'Behavioral Questions', icon: <MessageSquareIcon size={16} /> },
  { id: 'roadmap', label: 'Road Map', icon: <CompassIcon size={16} /> },
  { id: 'xray', label: 'Interview X-Ray', icon: <ScanIcon size={16} /> },
];

const SCAN_PASSES = [
  'Extracting technologies',
  'Analyzing project claims',
  'Mapping interviewer expectations',
  'Identifying blind spots',
  'Ranking by probability',
];

// ── Sub-components ────────────────────────────────────────────────────────────
const QuestionCard = ({ item, index }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="q-card">
      <div className="q-card__header" onClick={() => setOpen((o) => !o)}>
        <span className="q-card__index">Q{index + 1}</span>
        <p className="q-card__question">{item.question}</p>
        <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
          <ChevronDownIcon size={16} />
        </span>
      </div>
      {open && (
        <div className="q-card__body">
          <div className="q-card__section">
            <span className="q-card__tag q-card__tag--intention">Intention</span>
            <p>{item.intention}</p>
          </div>
          <div className="q-card__section">
            <span className="q-card__tag q-card__tag--answer">Model Answer</span>
            <p>{item.answer}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const RoadMapDay = ({ day }) => (
  <div className="roadmap-day">
    <div className="roadmap-day__header">
      <span className="roadmap-day__badge">Day {day.day}</span>
      <h3 className="roadmap-day__focus">{day.focus}</h3>
    </div>
    <ul className="roadmap-day__tasks">
      {day.tasks.map((task, i) => (
        <li key={i}>
          <span className="roadmap-day__bullet" />
          <span>{task}</span>
        </li>
      ))}
    </ul>
  </div>
);

// ── Blind Spot Card ──
const getRiskLevel = (prob) => prob >= 80 ? 'high' : prob >= 50 ? 'medium' : 'low';

const BlindSpotCard = ({ spot, index }) => {
  const [open, setOpen] = useState(false);
  const risk = getRiskLevel(spot.followUpProbability);

  return (
    <div className={`blind-spot-card blind-spot-card--${risk}`}>
      <div className="blind-spot-card__header" onClick={() => setOpen(o => !o)}>
        <span className={`blind-spot-card__prob blind-spot-card__prob--${risk}`}>
          {spot.followUpProbability}%
        </span>
        <span className="blind-spot-card__title">{spot.technology}</span>
        <span className="blind-spot-card__depth">{spot.expectedDepth}</span>
        <span className={`blind-spot-card__chevron ${open ? 'blind-spot-card__chevron--open' : ''}`}>
          <ChevronDownIcon size={16} />
        </span>
      </div>

      {open && (
        <div className="blind-spot-card__body">
          {/* Resume Evidence */}
          <div className="blind-spot-card__section">
            <span className="blind-spot-card__label">Resume Evidence</span>
            <div className="evidence-quote">{spot.resumeEvidence}</div>
          </div>

          {/* Why it attracts attention */}
          <div className="blind-spot-card__section">
            <span className="blind-spot-card__label">Why It Attracts Attention</span>
            <p className="spot-text">{spot.whyItAttractsAttention}</p>
          </div>

          {/* Interviewer's thought */}
          <div className="blind-spot-card__section">
            <span className="blind-spot-card__label">Interviewer's Internal Thought</span>
            <div className="thought-bubble">"{spot.interviewerThought}"</div>
          </div>

          {/* Probability bar */}
          <div className="prob-bar-wrap">
            <span className="blind-spot-card__label">Follow-Up Probability</span>
            <div className="prob-bar">
              <div
                className={`prob-bar__fill prob-bar__fill--${risk}`}
                style={{ width: `${spot.followUpProbability}%` }}
              />
            </div>
          </div>

          {/* Blind spot explanation */}
          <div className="blind-spot-card__section">
            <span className="blind-spot-card__label">Blind Spot</span>
            <p className="spot-text">{spot.blindSpotExplanation}</p>
          </div>

          {/* Likely questions */}
          <div className="blind-spot-card__section">
            <span className="blind-spot-card__label">Likely Follow-Up Questions</span>
            <ul className="spot-questions">
              {spot.likelyQuestions?.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>

          {/* Revision checklist */}
          <div className="blind-spot-card__section">
            <span className="blind-spot-card__label">Revision Checklist</span>
            <div className="revision-tags">
              {spot.revisionChecklist?.map((item, i) => (
                <span key={i} className="rev-tag">{item}</span>
              ))}
            </div>
          </div>

          {/* Why it matters */}
          <div className="blind-spot-card__section">
            <span className="blind-spot-card__label">Why This Matters</span>
            <div className="matters-callout">{spot.whyItMatters}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Scanning Overlay ──
const ScanningOverlay = ({ currentPass }) => (
  <div className="xray-scanning">
    <div className="xray-scanning__icon">
      <ScanIcon size={28} />
    </div>
    <h3 className="xray-scanning__title">Scanning your resume…</h3>
    <p className="xray-scanning__subtitle">
      Performing evidence-based analysis from an interviewer's perspective. This takes 20–40 seconds.
    </p>
    <div className="xray-scanning__passes">
      {SCAN_PASSES.map((pass, i) => {
        const isDone = i < currentPass;
        const isActive = i === currentPass;
        return (
          <div key={i} className={`scan-pass ${isDone ? 'scan-pass--done' : ''} ${isActive ? 'scan-pass--active' : ''}`}>
            <span className="scan-pass__dot" />
            <span>{pass}</span>
          </div>
        );
      })}
    </div>
  </div>
);

// ── X-Ray Results ──
const XRayResults = ({ xray }) => (
  <div className="xray-results animate-fade">
    {/* Blind Spots */}
    <div className="content-header">
      <h2>Interview Blind Spots</h2>
      <span className="content-header__count">{xray.blindSpots?.length || 0} identified</span>
    </div>
    <div className="xray-blind-spots">
      {xray.blindSpots?.map((spot, i) => (
        <BlindSpotCard key={i} spot={spot} index={i} />
      ))}
    </div>

    <div className="xray-divider" />

    {/* Conversation Drivers */}
    <div className="content-header">
      <h2>Conversation Drivers</h2>
      <span className="content-header__count">Where time will be spent</span>
    </div>
    <div className="drivers-section">
      {xray.conversationDrivers?.map((driver, i) => (
        <div key={i} className="driver-row">
          <span className="driver-row__label">{driver.section}</span>
          <div className="driver-row__bar">
            <div className="driver-row__fill" style={{ width: `${driver.probability}%` }} />
          </div>
          <span className="driver-row__pct">{driver.probability}%</span>
        </div>
      ))}
    </div>

    <div className="xray-divider" />

    {/* Summary Cards */}
    <div className="xray-summary">
      {/* Highest Risk */}
      {xray.highestRiskDiscussion && (
        <div className="summary-card summary-card--risk">
          <span className="summary-card__label">Highest Risk Discussion</span>
          <span className="summary-card__topic">{xray.highestRiskDiscussion.topic}</span>
          <p className="summary-card__reason">{xray.highestRiskDiscussion.reason}</p>
          <span className="summary-card__meta">
            Estimated follow-ups: {xray.highestRiskDiscussion.estimatedFollowUps}
          </span>
        </div>
      )}

      {/* Safest Discussion */}
      {xray.safestDiscussion && (
        <div className="summary-card summary-card--safe">
          <span className="summary-card__label">Safest Discussion</span>
          <span className="summary-card__topic">{xray.safestDiscussion.topic}</span>
          <p className="summary-card__reason">{xray.safestDiscussion.reason}</p>
        </div>
      )}

      {/* Surprise Question */}
      {xray.surpriseQuestion && (
        <div className="summary-card summary-card--surprise">
          <span className="summary-card__label">Surprise Question Prediction</span>
          <span className="summary-card__topic">"{xray.surpriseQuestion.question}"</span>
          <p className="summary-card__reason">{xray.surpriseQuestion.reason}</p>
        </div>
      )}
    </div>
  </div>
);

// ── X-Ray Tab Content ──
const XRaySection = ({ report, interviewId, generateXRay }) => {
  const [scanning, setScanning] = useState(false);
  const [scanPass, setScanPass] = useState(0);

  const hasXRay = report?.interviewXRay?.blindSpots?.length > 0;

  const handleGenerateXRay = async () => {
    setScanning(true);
    setScanPass(0);

    // Advance scan passes on timer
    let pass = 0;
    const timer = setInterval(() => {
      pass += 1;
      if (pass < SCAN_PASSES.length) {
        setScanPass(pass);
      } else {
        clearInterval(timer);
      }
    }, 6000);

    try {
      await generateXRay(interviewId);
    } finally {
      clearInterval(timer);
      setScanning(false);
    }
  };

  if (scanning) {
    return <ScanningOverlay currentPass={scanPass} />;
  }

  if (hasXRay) {
    return <XRayResults xray={report.interviewXRay} />;
  }

  // CTA to generate
  return (
    <div className="xray-cta animate-fade">
      <div className="xray-cta__icon">
        <ScanIcon size={24} />
      </div>
      <h3 className="xray-cta__title">Interview X-Ray</h3>
      <p className="xray-cta__desc">
        Reveal the questions your resume invites before the interviewer asks them.
        Our AI simulates how an experienced hiring manager reads your resume and identifies
        evidence-backed blind spots you need to prepare for.
      </p>
      <button onClick={handleGenerateXRay} className="btn-primary generate-btn">
        <ScanIcon size={16} />
        <span>Run X-Ray Analysis</span>
      </button>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
  const [activeNav, setActiveNav] = useState('technical');
  const { report, getReportById, loading, getResumePdf, generateXRay } = useInterview();
  const { interviewId } = useParams();

  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId);
    }
  }, [interviewId]);

  if (loading || !report) {
    return (
      <div className="interview-page">
        <Navbar />
        <InterviewSkeleton />
      </div>
    );
  }

  const scoreColor =
    report.matchScore >= 80 ? 'score--high' :
      report.matchScore >= 60 ? 'score--mid' : 'score--low';

  return (
    <div className="interview-page">
      <Navbar />

      <div className="interview-layout animate-entrance">

        {/* ── Left Nav ── */}
        <nav className="interview-nav">
          <div className="nav-content">
            <p className="interview-nav__label">Sections</p>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="interview-nav__icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => { getResumePdf(interviewId); }}
            className="btn-primary download-resume-btn"
          >
            <SparklesIcon size={16} />
            <span>Download Resume</span>
          </button>
        </nav>

        <div className="interview-divider" />

        {/* ── Center Content ── */}
        <main className="interview-content">
          {activeNav === 'technical' && (
            <section className="animate-fade">
              <div className="content-header">
                <h2>Technical Questions</h2>
                <span className="content-header__count">{report.technicalQuestions?.length || 0} questions</span>
              </div>
              <div className="q-list">
                {report.technicalQuestions?.map((q, i) => (
                  <QuestionCard key={i} item={q} index={i} />
                ))}
              </div>
            </section>
          )}

          {activeNav === 'behavioral' && (
            <section className="animate-fade">
              <div className="content-header">
                <h2>Behavioral Questions</h2>
                <span className="content-header__count">{report.behavioralQuestions?.length || 0} questions</span>
              </div>
              <div className="q-list">
                {report.behavioralQuestions?.map((q, i) => (
                  <QuestionCard key={i} item={q} index={i} />
                ))}
              </div>
            </section>
          )}

          {activeNav === 'roadmap' && (
            <section className="animate-fade">
              <div className="content-header">
                <h2>Preparation Road Map</h2>
                <span className="content-header__count">{report.preparationPlan?.length || 0}-day plan</span>
              </div>
              <div className="roadmap-list">
                {report.preparationPlan?.map((day) => (
                  <RoadMapDay key={day.day} day={day} />
                ))}
              </div>
            </section>
          )}

          {activeNav === 'xray' && (
            <section className="animate-fade">
              <XRaySection
                report={report}
                interviewId={interviewId}
                generateXRay={generateXRay}
              />
            </section>
          )}
        </main>

        <div className="interview-divider" />

        {/* ── Right Sidebar ── */}
        <aside className="interview-sidebar">

          {/* Match Score */}
          <div className="match-score">
            <p className="match-score__label">Match Score</p>
            <div className={`match-score__ring ${scoreColor}`}>
              <span className="match-score__value">{report.matchScore}</span>
              <span className="match-score__pct">%</span>
            </div>
            <p className="match-score__sub">Strong match for this role</p>
          </div>

          <div className="sidebar-divider" />

          {/* Skill Gaps */}
          <div className="skill-gaps">
            <p className="skill-gaps__label">Skill Gaps</p>
            <div className="skill-gaps__list">
              {report.skillGaps?.map((gap, i) => (
                <span key={i} className={`skill-tag skill-tag--${gap.severity}`}>
                  {gap.skill}
                </span>
              ))}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
};

export default Interview;