import { useState } from 'react';
// import './SignIn.css';
import { signInWithGoogle } from '../shared/supabase';

export default function SignIn() {
  return (
    <div className="arcade-container">
      <div className="signin-card">
        <div className="signin-header">
          <h1 className="signin-title">Welcome Back</h1>
          <p className="signin-subtitle">Sign in to continue</p>
        </div>

        {/* User Type Toggle */}
        <div className="user-type-toggle">
          <button
            className={`toggle-btn`}
            onClick={() => {
                window.location.href=`/surveys/?role=surveyor`
            } }
          >
            <svg className="toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Surveyor
          </button>
          <button
            className={`toggle-btn `}
            onClick={() => {signInWithGoogle();}}
          >
            <svg className="toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Surveyee
          </button>
        </div>

      </div>
    </div>
  );
}