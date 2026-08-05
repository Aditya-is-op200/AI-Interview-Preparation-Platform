import React from 'react';

export const CardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text short" />
  </div>
);

export const HomeSkeleton = () => (
  <div className="skeleton-home">
    <div className="skeleton-hero">
      <div className="skeleton skeleton-badge" />
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-subheading" />
    </div>

    <div className="skeleton-main-card">
      <div className="skeleton-panel">
        <div className="skeleton skeleton-panel-header" />
        <div className="skeleton skeleton-panel-box" />
      </div>
      <div className="skeleton-panel">
        <div className="skeleton skeleton-panel-header" />
        <div className="skeleton skeleton-panel-box" />
      </div>
    </div>
  </div>
);

export const InterviewSkeleton = () => (
  <div className="skeleton-interview">
    <div className="skeleton-sidebar">
      <div className="skeleton skeleton-nav-item" />
      <div className="skeleton skeleton-nav-item" />
      <div className="skeleton skeleton-nav-item" />
    </div>

    <div className="skeleton-content">
      <div className="skeleton skeleton-header" />
      <div className="skeleton skeleton-q-card" />
      <div className="skeleton skeleton-q-card" />
      <div className="skeleton skeleton-q-card" />
    </div>

    <div className="skeleton-aside">
      <div className="skeleton skeleton-gauge" />
      <div className="skeleton skeleton-box" />
    </div>
  </div>
);

export default { CardSkeleton, HomeSkeleton, InterviewSkeleton };
