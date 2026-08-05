import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router';

/* Full-page skeleton for Protected routes loading */
const FullPageSkeleton = () => (
  <div style={{
    minHeight: '100vh',
    background: 'var(--bg-root)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  }}>
    {/* Navbar skeleton */}
    <div style={{
      height: 'var(--navbar-h)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 12,
    }}>
      <div className="skeleton" style={{ width: 26, height: 26, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: 64, height: 16 }} />
    </div>

    {/* Content skeleton */}
    <div style={{ padding: '48px 24px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <div className="skeleton" style={{ width: 140, height: 22, borderRadius: 9999 }} />
        <div className="skeleton" style={{ width: '60%', maxWidth: 480, height: 40 }} />
        <div className="skeleton" style={{ width: '40%', maxWidth: 320, height: 18 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 18 }} />
    </div>
  </div>
);

const Protected = ({ children }) => {
  const { loading, user } = useAuth();

  if (loading) return <FullPageSkeleton />;
  if (!user) return <Navigate to="/login" />;

  return children;
};

export default Protected;