import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import CameraView from './components/CameraView';
import ControlPanel from './components/ControlPanel';

export default function App() {
  const [telemetry, setTelemetry] = useState(null);

  const handleTelemetryUpdate = useCallback((data) => {
    setTelemetry(data);
  }, []);

  return (
    <div className="app-container">
      <Header />
      <main className="main-grid">
        <CameraView onTelemetryUpdate={handleTelemetryUpdate} />
        <ControlPanel telemetry={telemetry} />
      </main>
    </div>
  );
}
