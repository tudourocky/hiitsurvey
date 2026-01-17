import { useState } from 'react';
import "./PreferenceForm.css";
import Navbar from "../components/Navbar"

export default function WorkoutForm() {
  const [formData, setFormData] = useState({
    workoutType: '',
    duration: '',
    intensity: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async() => {
    if (formData.workoutType && formData.duration && formData.intensity) {
        const workout = await fetch("http://127.0.0.1:8000/generate-workout", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              preferences: {
                time: parseInt(formData.duration),
                intensity: formData.intensity,
                body_part: formData.workoutType,
              },
              survey_questions: []
            })
        })
        .then((res) => res.json())
        .catch((err) => console.log(err));
      
      setSubmitted(true);
    } else {
      alert('Please fill out all fields');
    }
  };

  const handleReset = () => {
    setFormData({ workoutType: '', duration: '', intensity: '' });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="arcade-container scanlines">
        <Navbar />
        <div className="arcade-frame neon-border-blue">
          <div className="screen-content">
            <h2 className="neon-text-pink">LEVEL SAVED!</h2>
            <div className="summary">
              <div className="summary-item">
                <span className="label">MODE:</span>
                <span className="value">{formData.workoutType.toUpperCase()} BODY</span>
              </div>
              <div className="summary-item">
                <span className="label">TIME:</span>
                <span className="value">{formData.duration} MIN</span>
              </div>
              <div className="summary-item">
                <span className="label">INTENSITY:</span>
                <span className="value">{formData.intensity.toUpperCase()}</span>
              </div>
            </div>
            <button onClick={handleReset} className="reset-btn">
              RECONFIGURE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arcade-container scanlines">
      <Navbar />
      <div className="arcade-frame neon-border-pink">
        <h1 className="title">Workout Config</h1>
        
        <div className="form-group">
          <label className="section-label neon-text-blue">SELECT BODY PART</label>
          <div className="radio-grid">
            {['full', 'upper', 'lower', 'core', 'arms', 'legs'].map((type) => (
              <label
                key={type}
                className={`radio-option ${formData.workoutType === type ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, workoutType: type })}
              >
                <input type="radio" name="workoutType" value={type} className="hidden" />
                <span className="option-text">{type.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="section-label neon-text-blue">DURATION</label>
          <select
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="arcade-select"
          >
            <option value="">-- MIN --</option>
            <option value="15">15:00</option>
            <option value="30">30:00</option>
            <option value="45">45:00</option>
            <option value="60">60:00</option>
          </select>
        </div>

        <div className="form-group">
          <label className="section-label neon-text-blue">DIFFICULTY</label>
          <div className="intensity-group">
            {[
              { value: 'low', label: 'EASY' },
              { value: 'medium', label: 'NORMAL' },
              { value: 'high', label: 'HARD' }
            ].map((intensity) => (
              <button
                key={intensity.value}
                className={`intensity-btn ${formData.intensity === intensity.value ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, intensity: intensity.value })}
              >
                {intensity.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSubmit} className="start-btn">
          LOCK IN SETTINGS
        </button>
      </div>
    </div>
  );
}
