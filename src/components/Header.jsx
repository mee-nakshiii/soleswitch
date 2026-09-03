import React from 'react';

export default function Header() {
  return (
    <header className="header">
      <h1>SoleSwitch</h1>
      <p>Browser-Based Contactless Music Controller</p>
      <div className="badge-status">
        <span className="pulse-dot"></span>
        <span>Foundation Ready</span>
      </div>
    </header>
  );
}
