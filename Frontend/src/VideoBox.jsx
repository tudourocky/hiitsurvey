import React, { useRef, useEffect, useState, useCallback } from 'react';
import './VideoBox.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const VideoBox = ({ surveyId }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [isActive, setIsActive] = useState(false);
  // Only track the 4 hardcoded exercises: push_up, squat, jumping_jack, arm_circle
  const [counters, setCounters] = useState({
    push_up: 0,
    squat: 0,
    jumping_jack: 0,
    arm_circle: 0
  });
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [currentExerciseReps, setCurrentExerciseReps] = useState(0);
  const [previousCounters, setPreviousCounters] = useState({});
  const [isExerciseComplete, setIsExerciseComplete] = useState(false);
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [landmarks, setLandmarks] = useState(null);

  const startWebcam = async () => {
    try {
      setError(null);
      setDetecting(true);
      
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video metadata to load before setting isActive
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current && videoRef.current.readyState >= 2) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            // Only set active after video is ready
            setIsActive(true);
            setDetecting(false);
          }
        };
        
        // Fallback: if onloadedmetadata doesn't fire, wait a bit then check
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2 && !isActive) {
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
            setIsActive(true);
            setDetecting(false);
          }
        }, 1000);
      }
    } catch (err) {
      setError('CAMERA ERROR: ' + err.message);
      setDetecting(false);
      setIsActive(false);
      console.error('Error starting camera:', err);
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
    setLandmarks(null);
  };

  const resetCounters = async () => {
    try {
      await fetch(`${API_URL}/api/reset-counters`, { method: 'POST' });
      setCounters(Object.keys(counters).reduce((acc, k) => ({ ...acc, [k]: 0 }), {}));
      setCurrentExerciseReps(0);
      setPreviousCounters({});
      setIsExerciseComplete(false);
    } catch (err) {
      console.error('Error resetting counters:', err);
    }
  };

  // Map exercise names from workout to backend counter keys
  const mapExerciseNameToCounter = (exerciseName) => {
    const nameMap = {
      'Squats': 'squat',
      'Jumping Jacks': 'jumping_jack',
      'Burpees': 'burpee',
      'Mountain Climbers': 'mountain_climber',
      'High Knee': 'high_knee',
      'Arm Circles': 'arm_circle',
      'Push-ups': 'push_up',
      'Lunges': 'lunge',
      'Plank': 'plank',
      'Jump Squat': 'jump_squat',
      'Star Jump': 'star_jump',
      'Push-ups': 'push_up',
      'Plank Hold': 'plank',
      'Sit-ups': 'squat', // fallback
      'Crunches': 'squat', // fallback
      'Russian Twists': 'squat', // fallback
      'Leg Raises': 'high_knee',
      'Calf Raises': 'squat', // fallback
      'Wall Sit': 'plank', // fallback
      'Shoulder Press': 'push_up', // fallback
      'Bicep Curls': 'push_up', // fallback
      'Tricep Dips': 'push_up', // fallback
      'Pull-ups': 'push_up', // fallback
      'Arm Circles': 'jumping_jack', // fallback
      'Dumbbell Thrusters': 'squat', // fallback
      'Dumbbell Bench Press': 'push_up', // fallback
      'Dumbbell Swings': 'jumping_jack', // fallback
      'Dumbbell Side Bends': 'squat', // fallback
      'Bodyweight Squats': 'squat',
      'Dumbbell Deadlifts': 'squat', // fallback
    };
    
    // Try exact match first
    if (nameMap[exerciseName]) {
      return nameMap[exerciseName];
    }
    
    // Try case-insensitive partial match
    const lowerName = exerciseName.toLowerCase();
    for (const [key, value] of Object.entries(nameMap)) {
      if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
        return value;
      }
    }
    
    // Default fallback
    return 'squat';
  };

  // Function to draw pose landmarks on canvas
  const drawLandmarks = useCallback((ctx, landmarks, width, height) => {
    if (!landmarks || landmarks.length === 0) return;
    
    // Pose connections (skeleton structure)
    const connections = [
      // Face
      [0, 1], [1, 2], [2, 3], [3, 7],  // Left eye
      [0, 4], [4, 5], [5, 6], [6, 8],  // Right eye
      [0, 9], [0, 10],  // Nose to mouth
      // Upper body
      [11, 12],  // Shoulders
      [11, 13], [13, 15],  // Left arm
      [12, 14], [14, 16],  // Right arm
      [15, 17], [15, 19], [15, 21],  // Left hand
      [16, 18], [16, 20], [16, 22],  // Right hand
      // Torso
      [11, 23], [12, 24],  // Shoulders to hips
      [23, 24],  // Hips
      // Lower body
      [23, 25], [25, 27],  // Left leg
      [24, 26], [26, 28],  // Right leg
      [27, 29], [27, 31],  // Left foot
      [28, 30], [28, 32],  // Right foot
    ];
    
    // Draw connections (skeleton) in green - make them more visible
    ctx.save();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3; // Thicker lines (3 instead of 2)
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 5; // Add glow to lines too
    
    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        const startLandmark = landmarks[start];
        const endLandmark = landmarks[end];
        
        // Lower visibility threshold (0.3 instead of 0.5) to show more connections
        if (startLandmark.visibility > 0.3 && endLandmark.visibility > 0.3) {
          const startX = startLandmark.x * width;
          const startY = startLandmark.y * height;
          const endX = endLandmark.x * width;
          const endY = endLandmark.y * height;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }
    });
    
    ctx.restore();
    
    // Draw landmarks as green circles - make them more visible
    landmarks.forEach((landmark, index) => {
      // Lower visibility threshold to show more landmarks (0.3 instead of 0.5)
      if (landmark.visibility > 0.3) {
        const x = landmark.x * width;
        const y = landmark.y * height;
        
        // Draw larger, brighter circles for better visibility
        ctx.save();
        
        // Add glow effect first
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10;
        
        // Draw circle with green fill
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI); // Slightly larger (5 instead of 4)
        ctx.fill();
        
        // Draw outline for better visibility
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
      }
    });
  }, []);

  // Process video frames and detect exercises (throttled to ~10fps)
  const lastFrameTime = useRef(0);
  const processFrame = useCallback(async () => {
    // Check if we should continue processing
    if (!isActive || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    // Check if video is ready
    const video = videoRef.current;
    if (video.readyState < video.HAVE_CURRENT_DATA) {
      // Video not ready yet, wait and try again
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    const now = Date.now();
    // Throttle to ~10fps (100ms between frames)
    if (now - lastFrameTime.current < 100) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastFrameTime.current = now;
    
    const canvas = canvasRef.current;
    
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      // Only set canvas dimensions if they've changed (to avoid clearing)
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const ctx = canvas.getContext('2d');
      
      // Clear and draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Draw landmarks if available (from previous frame response)
      // Always draw landmarks on every frame if they exist in state
      // This ensures they appear immediately when first detected
      if (landmarks && Array.isArray(landmarks) && landmarks.length > 0) {
        try {
          drawLandmarks(ctx, landmarks, canvas.width, canvas.height);
        } catch (err) {
          console.error('Error drawing landmarks:', err);
        }
      } else {
        // Log when no landmarks are available for debugging
        if (landmarks === null) {
          // Landmarks not set yet - this is normal at startup
        } else if (landmarks && landmarks.length === 0) {
          console.log('Landmarks array is empty');
        }
      }
      
      // Convert canvas to blob and send to backend
      canvas.toBlob(async (blob) => {
        if (!blob) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }
        
        try {
          const formData = new FormData();
          formData.append('file', blob, 'frame.jpg');
          
          const response = await fetch(`${API_URL}/api/process-frame`, {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
          }
          
          const data = await response.json();
          
          if (data.exercises) {
            // Backend now only returns the 4 hardcoded exercises: push_up, squat, jumping_jack, arm_circle
            setCounters(data.exercises);
          }
          
          // Store landmarks for drawing - show whenever landmarks are present
          // Show landmarks immediately when detected
          if (data.landmarks && Array.isArray(data.landmarks) && data.landmarks.length > 0) {
            console.log('✅ Landmarks detected:', data.landmarks.length, 'points');
            // Update state immediately - this will trigger drawing on next frame
            setLandmarks(data.landmarks);
            
            // Also draw immediately on current frame - don't wait for next frame cycle
            // Use requestAnimationFrame to ensure we draw on latest video frame
            requestAnimationFrame(() => {
              if (canvasRef.current && videoRef.current && videoRef.current.readyState >= 2) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                
                // Ensure canvas dimensions match video
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                }
                
                const ctx = canvas.getContext('2d');
                // Clear and redraw the current video frame first
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                // Then draw landmarks on top immediately
                console.log('🎨 Drawing', data.landmarks.length, 'landmarks on canvas');
                drawLandmarks(ctx, data.landmarks, canvas.width, canvas.height);
              }
            });
          } else {
            // Clear landmarks only if explicitly no detection
            if (data.detected === false || !data.landmarks) {
              setLandmarks(null);
            }
          }
        } catch (err) {
          console.error('Error processing frame:', err);
          // On error, still continue processing but maybe slow down
          // Don't break the loop
        } finally {
          // Always continue processing if still active
          if (isActive && videoRef.current && canvasRef.current) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
          }
        }
      }, 'image/jpeg', 0.8);
    } else {
      // Video not ready yet, wait a bit longer and try again
      if (isActive && videoRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    }
  }, [isActive, landmarks, drawLandmarks]);

  // Start/stop frame processing
  useEffect(() => {
    if (isActive) {
      processFrame();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, processFrame, landmarks, drawLandmarks]);

  // Track reps for selected exercise
  useEffect(() => {
    if (!selectedExercise) {
      setCurrentExerciseReps(0);
      setIsExerciseComplete(false);
      return;
    }

    const counterKey = mapExerciseNameToCounter(selectedExercise.name);
    const currentCount = counters[counterKey] || 0;
    const previousCount = previousCounters[counterKey] !== undefined ? previousCounters[counterKey] : (counters[counterKey] || 0);
    
    // Calculate reps done for this exercise (since it was selected)
    // Use max to handle counter resets
    const repsDone = Math.max(0, currentCount - previousCount);
    setCurrentExerciseReps(repsDone);
    
    // Check if required reps are met
    const requiredReps = selectedExercise.reps || 0;
    if (requiredReps > 0 && repsDone >= requiredReps) {
      setIsExerciseComplete(true);
    } else {
      setIsExerciseComplete(false);
    }
  }, [counters, selectedExercise, previousCounters]);

  // Fetch survey when surveyId is provided
  useEffect(() => {
    if (!surveyId) return;

    const fetchSurvey = async () => {
      setLoadingSurvey(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/surveys/${surveyId}`);
        if (!response.ok) throw new Error('Failed to fetch survey');
        const data = await response.json();
        setSurvey(data);
      } catch (err) {
        setError('Failed to load survey: ' + err.message);
      } finally {
        setLoadingSurvey(false);
      }
    };

    fetchSurvey();
  }, [surveyId]);

  // Generate workout when survey loads (with empty answers to get all exercise mappings)
  useEffect(() => {
    if (!survey || !survey.questions) return;

    const generateWorkout = async () => {
      setLoadingWorkout(true);
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
        setError('Failed to generate workout: ' + err.message);
      } finally {
        setLoadingWorkout(false);
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
      setCurrentExerciseReps(0);
      setIsExerciseComplete(false);
      return;
    }

    const answer = answers[currentQuestion.id];
    if (!answer) {
      setSelectedExercise(null);
      setCurrentExerciseReps(0);
      setIsExerciseComplete(false);
      return;
    }

    // Find the segment for this question
    // Try by question_id first, then by index (q1, q2, q3), then by question text
    let segment = workout.segments.find(s => s.question_id === currentQuestion.id);
    
    if (!segment) {
      const questionIndexId = `q${currentQuestionIndex + 1}`;
      segment = workout.segments.find(s => s.question_id === questionIndexId);
    }
    
    if (!segment) {
      segment = workout.segments.find(s => 
        s.question === currentQuestion.heading || 
        s.question.toLowerCase().includes(currentQuestion.heading.toLowerCase())
      );
    }
    
    if (!segment || !segment.option_exercise_mapping) {
      console.log(`No segment found for question ${currentQuestion.id} at index ${currentQuestionIndex}`);
      setSelectedExercise(null);
      setCurrentExerciseReps(0);
      setIsExerciseComplete(false);
      return;
    }

    // Find the exercise for the selected answer
    let mapping = segment.option_exercise_mapping.find(m => m.option === answer);
    
    // Try case-insensitive match if exact match fails
    if (!mapping) {
      mapping = segment.option_exercise_mapping.find(m => 
        m.option.toLowerCase().trim() === answer.toLowerCase().trim()
      );
    }
    const newExercise = mapping ? mapping.exercise : null;
    
    // If exercise changed, reset tracking and capture baseline
    if (newExercise && (!selectedExercise || newExercise.name !== selectedExercise.name)) {
      const counterKey = mapExerciseNameToCounter(newExercise.name);
      setPreviousCounters(prev => ({ ...prev, [counterKey]: counters[counterKey] || 0 }));
      setCurrentExerciseReps(0);
      setIsExerciseComplete(false);
    }
    
    setSelectedExercise(newExercise);
  }, [workout, survey, currentQuestionIndex, answers]);

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    setError(null);
    // Exercise tracking will be reset when selectedExercise updates
  };

  const nextQuestion = () => {
    const currentQuestion = survey?.questions[currentQuestionIndex];
    
    // Must have an answer selected
    if (!currentQuestion || !answers[currentQuestion.id]) {
      setError('Please select an answer first!');
      return;
    }
    
    // For multiple choice questions with exercises, must complete reps
    if (currentQuestion.type === 'multiple_choice' && selectedExercise && selectedExercise.reps) {
      if (!isExerciseComplete) {
        const remaining = selectedExercise.reps - currentExerciseReps;
        setError(`Complete ${remaining} more rep${remaining !== 1 ? 's' : ''} of ${selectedExercise.name} to continue!`);
        return;
      }
    }
    
    // All checks passed, advance to next question
    if (survey && currentQuestionIndex < survey.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentExerciseReps(0);
      setIsExerciseComplete(false);
      setPreviousCounters({});
      setError(null);
      // Clear answer for next question
      const nextQuestion = survey.questions[currentQuestionIndex + 1];
      if (nextQuestion) {
        setAnswers(prev => {
          const newAnswers = { ...prev };
          delete newAnswers[nextQuestion.id];
          return newAnswers;
        });
      }
    }
  };
  
  // Check if user can advance to next question
  const canAdvance = () => {
    const currentQuestion = survey?.questions[currentQuestionIndex];
    
    // Must have an answer
    if (!currentQuestion || !answers[currentQuestion.id]) {
      return false;
    }
    
    // For multiple choice with exercise, must complete reps
    if (currentQuestion.type === 'multiple_choice' && selectedExercise && selectedExercise.reps) {
      return isExerciseComplete;
    }
    
    // Open-ended questions or exercises without reps can advance
    return true;
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const currentQuestion = survey?.questions[currentQuestionIndex];

  // Get exercise for each option
  const getExerciseForOption = (optionText) => {
    if (!workout || !currentQuestion || currentQuestion.type === 'open_ended') {
      return null;
    }
    
    // Try to find segment by question_id first
    let segment = workout.segments.find(s => s.question_id === currentQuestion.id);
    
    // If not found, try to match by question index (q1, q2, q3, etc.)
    if (!segment && currentQuestionIndex !== undefined) {
      const questionIndexId = `q${currentQuestionIndex + 1}`;
      segment = workout.segments.find(s => s.question_id === questionIndexId);
    }
    
    // If still not found, try to match by question text/heading
    if (!segment) {
      segment = workout.segments.find(s => 
        s.question === currentQuestion.heading || 
        s.question.toLowerCase().includes(currentQuestion.heading.toLowerCase()) ||
        currentQuestion.heading.toLowerCase().includes(s.question.toLowerCase())
      );
    }
    
    if (!segment) {
      console.log(`No segment found for question_id: ${currentQuestion.id}`);
      console.log('Question heading:', currentQuestion.heading);
      console.log('Question index:', currentQuestionIndex);
      console.log('Available segments:', workout.segments.map(s => ({ id: s.question_id, question: s.question })));
      return null;
    }
    
    if (!segment.option_exercise_mapping || segment.option_exercise_mapping.length === 0) {
      console.log(`No option_exercise_mapping for segment ${segment.question_id}`);
      return null;
    }
    
    // Try exact match first
    let mapping = segment.option_exercise_mapping.find(m => m.option === optionText);
    
    // If no exact match, try case-insensitive match
    if (!mapping) {
      mapping = segment.option_exercise_mapping.find(m => 
        m.option.toLowerCase().trim() === optionText.toLowerCase().trim()
      );
    }
    
    // If still no match, try partial match
    if (!mapping) {
      mapping = segment.option_exercise_mapping.find(m => 
        optionText.toLowerCase().includes(m.option.toLowerCase()) ||
        m.option.toLowerCase().includes(optionText.toLowerCase())
      );
    }
    
    if (!mapping) {
      console.log(`No mapping found for option: "${optionText}"`);
      console.log('Available options:', segment.option_exercise_mapping.map(m => `"${m.option}"`));
    }
    
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
              <button 
                onClick={startWebcam} 
                className="btn-start"
                disabled={detecting}
              >
                {detecting ? 'LOADING...' : 'START CAMERA'}
              </button>
            ) : (
              <button onClick={stopWebcam} className="btn-stop">STOP CAMERA</button>
            )}
            <button onClick={resetCounters} className="btn-reset">RESET SCORE</button>
          </div>

          {/* Loading States */}
          {loadingSurvey && (
            <div className="survey-section neon-border-blue">
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text neon-text-blue">LOADING SURVEY...</p>
              </div>
            </div>
          )}

          {!loadingSurvey && (loadingWorkout || !workout || !workout?.segments || workout.segments.length === 0) && survey && (
            <div className="survey-section neon-border-blue">
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text neon-text-blue">
                  {loadingWorkout ? 'GENERATING WORKOUT...' : 'LOADING EXERCISES...'}
                </p>
              </div>
            </div>
          )}

          {/* Survey Questions Section - Only show when everything is ready */}
          {!loadingSurvey && !loadingWorkout && survey && workout && workout.segments && workout.segments.length > 0 && currentQuestion && (
            <div className="survey-section neon-border-blue">
              <div className="question-header">
                <h3 className="neon-text-pink">QUESTION {currentQuestionIndex + 1} / {survey.questions.length}</h3>
                <h4 className="neon-text-blue">{currentQuestion.heading}</h4>
              </div>

              {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                <div className="options-grid">
                  {currentQuestion.options.map((option) => {
                    const exercise = getExerciseForOption(option.text);
                    const isSelected = answers[currentQuestion.id] === option.text;
                    const isSelectedExercise = isSelected && exercise && exercise.name === selectedExercise?.name;
                    
                    return (
                      <button
                        key={option.id}
                        className={`option-btn ${isSelected ? 'active' : ''} ${isSelectedExercise && !isExerciseComplete ? 'in-progress' : ''} ${isSelectedExercise && isExerciseComplete ? 'complete' : ''}`}
                        onClick={() => handleAnswer(currentQuestion.id, option.text)}
                        disabled={isSelected && selectedExercise && !isExerciseComplete}
                      >
                        <div className="option-text">{option.text}</div>
                        {exercise && (
                          <div className="option-exercise">
                            <span className="exercise-badge">→ {exercise.name}</span>
                            {exercise.reps && (
                              <span className="exercise-specs">
                                {exercise.reps} reps
                              </span>
                            )}
                          </div>
                        )}
                        {isSelectedExercise && exercise && exercise.reps && (
                          <div className="option-progress">
                            <div className="option-reps-counter">
                              {currentExerciseReps} / {exercise.reps} reps
                            </div>
                            {isExerciseComplete && (
                              <span className="complete-check">✓</span>
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
                <div className={`exercise-action neon-border-pink ${isExerciseComplete ? 'complete' : ''}`}>
                  <div className="exercise-header">
                    <span className="exercise-label">CURRENT ACTION:</span>
                    <span className="exercise-name">{selectedExercise.name}</span>
                  </div>
                  <div className="exercise-details">
                    {selectedExercise.reps && (
                      <span className={isExerciseComplete ? 'complete-reps' : ''}>
                        Reps: {currentExerciseReps} / {selectedExercise.reps}
                      </span>
                    )}
                    {selectedExercise.duration && <span>Duration: {selectedExercise.duration}s</span>}
                    {selectedExercise.equipment && <span>Equipment: {selectedExercise.equipment}</span>}
                  </div>
                  {selectedExercise.reps && (
                    <div className="reps-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${Math.min(100, (currentExerciseReps / selectedExercise.reps) * 100)}%` }}
                        />
                      </div>
                      {isExerciseComplete && (
                        <div className="complete-message neon-text-yellow">
                          ✓ EXERCISE COMPLETE! YOU CAN PROCEED
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="error-message neon-border-yellow">
                  {error}
                </div>
              )}

              <div className="question-nav">
                <button onClick={prevQuestion} disabled={currentQuestionIndex === 0} className="nav-btn">
                  PREV
                </button>
                <button 
                  onClick={nextQuestion} 
                  disabled={
                    currentQuestionIndex === survey.questions.length - 1 || 
                    !canAdvance()
                  } 
                  className={`nav-btn ${!canAdvance() ? 'disabled' : ''}`}
                  title={!canAdvance() && selectedExercise ? `Complete ${selectedExercise.reps} reps of ${selectedExercise.name}` : ''}
                >
                  {!canAdvance() && selectedExercise && selectedExercise.reps ? 
                    `COMPLETE ${selectedExercise.reps} REPS` : 
                    !canAdvance() ? 
                    'SELECT ANSWER' : 
                    'NEXT'}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="counters-section neon-border-blue">
          <h2>STATS</h2>
          <div className="counters-grid">
            {Object.entries(counters).map(([key, val]) => {
              // Map exercise keys to display names
              const displayNames = {
                'push_up': 'PUSH-UPS',
                'squat': 'SQUATS',
                'jumping_jack': 'JUMPING JACKS',
                'arm_circle': 'ARM CIRCLES'
              };
              return (
                <div key={key} className={`counter-card ${key}`}>
                  <span className="counter-label">{displayNames[key] || key.replace('_', ' ').toUpperCase()}</span>
                  <span className="counter-value">{val}</span>
                </div>
              );
            })}
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
