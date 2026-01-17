import React, { useRef, useEffect, useState, useCallback } from 'react';
import './VideoBox.css';

const API_URL = 'http://localhost:8000';

const VideoBox = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [isActive, setIsActive] = useState(false);
  const [counters, setCounters] = useState({
    squat: 0, jumping_jack: 0, burpee: 0, mountain_climber: 0,
    high_knee: 0, push_up: 0, lunge: 0, plank: 0, jump_squat: 0, star_jump: 0
  });
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
        setError(null);
      }
    } catch (err) {
      setError('CAMERA ERROR: ' + err.message);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  };

  const resetCounters = () => setCounters(Object.keys(counters).reduce((acc, k) => ({ ...acc, [k]: 0 }), {}));

  return (
    <div className="video-box-container">
      <header className="video-box-header">
        <h1 className="neon-text-pink">EXERCISE MODE</h1>
        <p>CALIBRATING POSITION... READY PLAYER ONE</p>
      </header>

      <div className="video-box-content">
        <div className="video-section">
          <div className="video-wrapper">
            <video ref={videoRef} autoPlay playsInline muted className="video-element" />
            <canvas ref={canvasRef} className="canvas-overlay" />
            {!isActive && <div className="video-placeholder">WAITING FOR SIGNAL...</div>}
          </div>
          <div className="video-controls">
            {!isActive ? (
              <button onClick={startWebcam} className="btn-start">START CAMERA</button>
            ) : (
              <button onClick={stopWebcam} className="btn-stop">STOP CAMERA</button>
            )}
            <button onClick={resetCounters} className="btn-reset">RESET SCORE</button>
          </div>
        </div>

        <aside className="counters-section neon-border-blue">
          <h2>STATS</h2>
          <div className="counters-grid">
            {Object.entries(counters).map(([key, val]) => (
              <div key={key} className={`counter-card ${key}`}>
                <span className="counter-label">{key.replace('_', ' ').toUpperCase()}</span>
                <span className="counter-value">{val}</span>
              </div>
            ))}
          </div>
          <div className="total-section">
            <div className="total-label">TOTAL REPS</div>
            <div className="total-value">{Object.values(counters).reduce((a, b) => a + b, 0)}</div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default VideoBox;
