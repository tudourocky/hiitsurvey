import React, { useRef, useEffect, useState, useCallback } from 'react';
import './VideoBox.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const VideoBox = ({ surveyId }) => {
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
  const [survey, setSurvey] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedExercise, setSelectedExercise] = useState(null);

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

  // Fetch survey when surveyId is provided
  useEffect(() => {
    if (!surveyId) return;

    const fetchSurvey = async () => {
      try {
        const response = await fetch(`${API_URL}/surveys/${surveyId}`);
        if (!response.ok) throw new Error('Failed to fetch survey');
        const data = await response.json();
        setSurvey(data);
      } catch (err) {
        setError('Failed to load survey: ' + err.message);
      }
    };

    fetchSurvey();
  }, [surveyId]);

  // Generate workout when survey loads (with empty answers to get all exercise mappings)
  useEffect(() => {
    if (!survey || !survey.questions) return;

    const generateWorkout = async () => {
      try {
        // Convert survey questions to workout format
        // Use empty answers so we can see all possible exercises
        const surveyQuestions = survey.questions.map(q => ({
          id: q.id,
          question: q.heading,
          type: q.type === 'open_ended' ? 'short_answer' : 'multiple_choice',
          options: q.options ? q.options.map(opt => opt.text) : null
        }));

        const response = await fetch(`${API_URL}/api/generate-workout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferences: {
              time: 30,
              intensity: 'medium',
              body_part: 'full',
              equipment_available: []
            },
            survey_questions: surveyQuestions
          })
        });

        if (!response.ok) throw new Error('Failed to generate workout');
        const data = await response.json();
        setWorkout(data);
      } catch (err) {
        console.error('Error generating workout:', err);
      }
    };

    generateWorkout();
  }, [survey]);

  // Update selected exercise based on current answer
  useEffect(() => {
    if (!workout || !survey) return;

    const currentQuestion = survey.questions[currentQuestionIndex];
    if (!currentQuestion || currentQuestion.type === 'open_ended') {
      setSelectedExercise(null);
      return;
    }

    const answer = answers[currentQuestion.id];
    if (!answer) {
      setSelectedExercise(null);
      return;
    }

    // Find the segment for this question
    const segment = workout.segments.find(s => s.question_id === currentQuestion.id);
    if (!segment || !segment.option_exercise_mapping) {
      setSelectedExercise(null);
      return;
    }

    // Find the exercise for the selected answer
    const mapping = segment.option_exercise_mapping.find(m => m.option === answer);
    setSelectedExercise(mapping ? mapping.exercise : null);
  }, [workout, survey, currentQuestionIndex, answers]);

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const nextQuestion = () => {
    if (survey && currentQuestionIndex < survey.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const currentQuestion = survey?.questions[currentQuestionIndex];

  // Get exercise for each option
  const getExerciseForOption = (optionText) => {
    if (!workout || !currentQuestion || currentQuestion.type === 'open_ended') return null;
    
    const segment = workout.segments.find(s => s.question_id === currentQuestion.id);
    if (!segment || !segment.option_exercise_mapping) return null;
    
    const mapping = segment.option_exercise_mapping.find(m => m.option === optionText);
    return mapping ? mapping.exercise : null;
  };

  return (
    <div className="video-box-container">
      <header className="video-box-header">
        <h1 className="neon-text-pink">EXERCISE MODE</h1>
        <p>CALIBRATING POSITION... READY PLAYER ONE</p>
      </header>

      <div className="video-box-content">
        <div className="video-section">
          <div className="video-wrapper-small">
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

          {/* Survey Questions Section */}
          {survey && currentQuestion && (
            <div className="survey-section neon-border-blue">
              <div className="question-header">
                <h3 className="neon-text-pink">QUESTION {currentQuestionIndex + 1} / {survey.questions.length}</h3>
                <h4 className="neon-text-blue">{currentQuestion.heading}</h4>
              </div>

              {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                <div className="options-grid">
                  {currentQuestion.options.map((option) => {
                    const exercise = getExerciseForOption(option.text);
                    return (
                      <button
                        key={option.id}
                        className={`option-btn ${answers[currentQuestion.id] === option.text ? 'active' : ''}`}
                        onClick={() => handleAnswer(currentQuestion.id, option.text)}
                      >
                        <div className="option-text">{option.text}</div>
                        {exercise && (
                          <div className="option-exercise">
                            <span className="exercise-badge">→ {exercise.name}</span>
                            {(exercise.sets || exercise.reps) && (
                              <span className="exercise-specs">
                                {exercise.sets && `${exercise.sets} sets`}
                                {exercise.sets && exercise.reps && ' • '}
                                {exercise.reps && `${exercise.reps} reps`}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'open_ended' && (
                <div className="open-ended-input">
                  <textarea
                    className="arcade-textarea"
                    placeholder="Type your response..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  />
                </div>
              )}

              {/* Selected Exercise Action */}
              {selectedExercise && (
                <div className="exercise-action neon-border-pink">
                  <div className="exercise-header">
                    <span className="exercise-label">CURRENT ACTION:</span>
                    <span className="exercise-name">{selectedExercise.name}</span>
                  </div>
                  <div className="exercise-details">
                    {selectedExercise.sets && <span>Sets: {selectedExercise.sets}</span>}
                    {selectedExercise.reps && <span>Reps: {selectedExercise.reps}</span>}
                    {selectedExercise.duration && <span>Duration: {selectedExercise.duration}s</span>}
                    {selectedExercise.equipment && <span>Equipment: {selectedExercise.equipment}</span>}
                  </div>
                </div>
              )}

              <div className="question-nav">
                <button onClick={prevQuestion} disabled={currentQuestionIndex === 0} className="nav-btn">
                  PREV
                </button>
                <button onClick={nextQuestion} disabled={currentQuestionIndex === survey.questions.length - 1} className="nav-btn">
                  NEXT
                </button>
              </div>
            </div>
          )}
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
