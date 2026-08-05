import React, { useState, useEffect } from 'react';
import '../style/interview.scss';
import { useInterview } from '../hooks/useInterview.js';
import { useNavigate, useParams } from 'react-router';
import Navbar from '../../../components/Navbar';
import { InterviewSkeleton } from '../../../components/SkeletonLoader';
import { CodeIcon, MessageSquareIcon, CompassIcon, ChevronDownIcon, FileTextIcon, SparklesIcon } from '../../../components/Icons';

const NAV_ITEMS = [
  { id: 'technical', label: 'Technical Questions', icon: <CodeIcon size={16} /> },
  { id: 'behavioral', label: 'Behavioral Questions', icon: <MessageSquareIcon size={16} /> },
  { id: 'roadmap', label: 'Road Map', icon: <CompassIcon size={16} /> },
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

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
  const [activeNav, setActiveNav] = useState('technical');
  const { report, getReportById, loading, getResumePdf } = useInterview();
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