import React from 'react';
import Header from './components/Header';
import CameraView from './components/CameraView';
import ControlPanel from './components/ControlPanel';

export default function App() {
  return (
    <div className="app-container">
      <Header />
      <main className="main-grid">
        <CameraView />
        <ControlPanel />
      </main>
    </div>
  );
}
