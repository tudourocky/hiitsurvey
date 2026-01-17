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

        // Send mock to api
        const workout = await fetch("http://127.0.0.1:8000/generate-workout", {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              preferences: {
                time: parseInt(formData.duration),
                intensity: formData.intensity,
                body_part: formData.workoutType,
              },
              survey_questions: []
            })
        })
        .then((res) => {return res.json();})
        .catch((err) => {console.log(err);})
      console.log(workout);
        
      setSubmitted(true);
    } else {
      alert('Please fill out all fields');
    }
  };


  const handleReset = () => {
    setFormData({
      workoutType: '',
      duration: '',
      intensity: ''
    });
    setSubmitted(false);
  };

  // Form has been filled out
  if (submitted) {
    return (
      <div className="body">
        <Navbar />
        <div className="container">
          <div className="confirmation">
            <div className="checkmark">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="checkmark-svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="confirmation-title">Preferences Saved!</h2>
            <p className="confirmation-text">Your workout plan is ready.</p>

            <div className="summary">
              <div className="summary-item">
                <div className="summary-label">Workout Type</div>
                <div className="summary-value">{formData.workoutType} body</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Duration</div>
                <div className="summary-value">{formData.duration} minutes</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Intensity</div>
                <div className="summary-value">{formData.intensity}</div>
              </div>
            </div>

            <button onClick={handleReset} className="submit-btn">
              Create Another Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Non filled out form
  return (
    <div className="body">
      <Navbar />
      <div className="container">
        <h1 className="title">Workout Preferences</h1>
        <p className="subtitle">Customize your workout plan</p>

        <div className="form-group">
          <label className="section-label">Workout Type</label>
          <div className="radio-group">
            {['full', 'upper', 'lower', 'core', 'arms', 'legs'].map((type) => (
              <label
                key={type}
                className={`radio-option ${formData.workoutType === type ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, workoutType: type })}
              >
                <input
                  type="radio"
                  name="workoutType"
                  value={type}
                  checked={formData.workoutType === type}
                  onChange={() => {}}
                  className="radio-input"
                />
                <span className="radio-text">{type} Body</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="section-label">Duration (minutes)</label>
          <select
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="select"
          >
            <option value="">Select duration</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
          </select>
        </div>

        <div className="form-group">
          <label className="section-label">Intensity Level</label>
          <div className="radio-group">
            {[
              { value: 'low', label: 'Low - Light exercise' },
              { value: 'medium', label: 'Moderate - Challenging' },
              { value: 'high', label: 'High - Intense' }
            ].map((intensity) => (
              <label
                key={intensity.value}
                className={`radio-option ${formData.intensity === intensity.value ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, intensity: intensity.value })}
              >
                <input
                  type="radio"
                  name="intensity"
                  value={intensity.value}
                  checked={formData.intensity === intensity.value}
                  onChange={() => {}}
                  className="radio-input"
                />
                <span className="radio-text">{intensity.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleSubmit} className="submit-btn">
          Generate Workout Plan
        </button>
      </div>
    </div>
  );
}