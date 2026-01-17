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
        
        // Wait for video metadata to load
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        };
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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setIsActive(false);
    setDetecting(false);
  };

  const resetCounters = async () => {
    try {
      await fetch(`${API_URL}/api/reset-counters`, { method: 'POST' });
      setCounters(Object.keys(counters).reduce((acc, k) => ({ ...acc, [k]: 0 }), {}));
    } catch (err) {
      console.error('Error resetting counters:', err);
    }
  };

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isActive || detecting) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    setDetecting(true);
    
    try {
      // Draw current frame to canvas
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob and send to API
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setDetecting(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');

        try {
          const response = await fetch(`${API_URL}/api/process-frame`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          // Update counters
          if (data.exercises) {
            setCounters(data.exercises);
          }

          // Draw landmarks if detected
          if (data.detected && data.landmarks && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Draw pose landmarks
            if (data.landmarks.length > 0) {
              ctx.strokeStyle = '#00ffff';
              ctx.fillStyle = '#00ffff';
              ctx.lineWidth = 2;

              // Draw key points
              data.landmarks.forEach((lm, idx) => {
                if (lm.visibility > 0.5) {
                  const x = lm.x * canvas.width;
                  const y = lm.y * canvas.height;
                  ctx.beginPath();
                  ctx.arc(x, y, 4, 0, 2 * Math.PI);
                  ctx.fill();
                }
              });

              // Draw connections (simplified skeleton)
              const connections = [
                [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
                [11, 23], [12, 24], [23, 24], // Torso
                [23, 25], [25, 27], [24, 26], [26, 28], // Legs
                [0, 1], [0, 2], [1, 3], [2, 4], // Head
              ];

              connections.forEach(([start, end]) => {
                if (start < data.landmarks.length && end < data.landmarks.length) {
                  const startLm = data.landmarks[start];
                  const endLm = data.landmarks[end];
                  if (startLm.visibility > 0.5 && endLm.visibility > 0.5) {
                    ctx.beginPath();
                    ctx.moveTo(startLm.x * canvas.width, startLm.y * canvas.height);
                    ctx.lineTo(endLm.x * canvas.width, endLm.y * canvas.height);
                    ctx.stroke();
                  }
                }
              });
            }
          }
        } catch (err) {
          console.error('Error processing frame:', err);
          setError('PROCESSING ERROR: ' + err.message);
        } finally {
          setDetecting(false);
        }
      }, 'image/jpeg', 0.8);
    } catch (err) {
      console.error('Error capturing frame:', err);
      setDetecting(false);
    }
  }, [isActive, detecting, counters]);

  // Continuous frame processing
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (!detecting && videoRef.current && canvasRef.current) {
        processFrame();
      }
    }, 100); // Process ~10 frames per second

    return () => clearInterval(interval);
  }, [isActive, detecting, processFrame]);

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
