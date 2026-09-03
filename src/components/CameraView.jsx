import React from 'react';

export default function CameraView() {
  return (
    <div className="card">
      <div className="card-title">
        <span>Camera & Pose Feed</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Inactive</span>
      </div>
      <div className="camera-placeholder">
        <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574v9.176A2.25 2.25 0 0 0 4.5 21h15a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316A2.192 2.192 0 0 0 14.46 3.75h-4.92c-.73 0-1.4.364-1.796.958l-.917 1.466ZM12 15.75a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
        <p>Camera feed placeholder</p>
      </div>
    </div>
  );
}
