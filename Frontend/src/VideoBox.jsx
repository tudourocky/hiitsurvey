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
  const [currentExerciseReps, setCurrentExerciseReps] = useState(0);
  const [previousCounters, setPreviousCounters] = useState({});
  const [isExerciseComplete, setIsExerciseComplete] = useState(false);
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [loadingWorkout, setLoadingWorkout] = useState(false);

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

  // Process video frames and detect exercises (throttled to ~10fps)
  const lastFrameTime = useRef(0);
  const processFrame = useCallback(async () => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;
    
    const now = Date.now();
    // Throttle to ~10fps (100ms between frames)
    if (now - lastFrameTime.current < 100) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastFrameTime.current = now;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
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
            setCounters(data.exercises);
          }
        } catch (err) {
          console.error('Error processing frame:', err);
        } finally {
          animationFrameRef.current = requestAnimationFrame(processFrame);
        }
      }, 'image/jpeg', 0.8);
    } else {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [isActive]);

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
  }, [isActive, processFrame]);

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

  // Helper function to play TTS audio (wrapped in useCallback to avoid recreation)
  // Returns a Promise that resolves when the audio finishes playing
  // Prevents overlapping audio by tracking if audio is currently playing
  const playTTSAudio = useCallback(async (text) => {
    if (!text || !text.trim()) {
      console.warn('playTTSAudio called with empty text');
      return Promise.resolve();
    }

    // Wait if audio is currently playing
    while (isAudioPlayingRef.current) {
      console.log('⏳ Waiting for current audio to finish...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🎵 Playing TTS audio for:', text);
    isAudioPlayingRef.current = true;
    
    return new Promise(async (resolve, reject) => {
      try {
        console.log('📡 Fetching TTS from:', `${API_URL}/api/text-to-speech`);
        const response = await fetch(`${API_URL}/api/text-to-speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            voice_id: "JBFqnCBsd6RMkjVDRZzb", // Adam voice
            model_id: "eleven_multilingual_v2",
            output_format: "mp3_44100_128"
          })
        });

        console.log('📥 Response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to generate speech:', response.status, errorText);
          isAudioPlayingRef.current = false;
          reject(new Error(`Failed to generate speech: ${response.status}`));
          return;
        }

        // Get audio blob and play it
        const audioBlob = await response.blob();
        console.log('🎧 Audio blob received, size:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        if (audioBlob.size === 0) {
          console.error('❌ Audio blob is empty!');
          isAudioPlayingRef.current = false;
          reject(new Error('Audio blob is empty'));
          return;
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('🔗 Created audio URL:', audioUrl);
        
        const audio = new Audio(audioUrl);
        
        // Add event listeners for debugging
        audio.addEventListener('loadstart', () => console.log('🎵 Audio: loadstart'));
        audio.addEventListener('loadeddata', () => console.log('🎵 Audio: loadeddata'));
        audio.addEventListener('canplay', () => console.log('🎵 Audio: canplay'));
        audio.addEventListener('play', () => console.log('▶️ Audio: playing'));
        audio.addEventListener('pause', () => console.log('⏸️ Audio: paused'));
        
        // Resolve promise when audio ends and mark as not playing
        audio.addEventListener('ended', () => {
          console.log('✅ Audio: ended');
          URL.revokeObjectURL(audioUrl);
          isAudioPlayingRef.current = false;
          resolve();
        });
        
        audio.addEventListener('error', (e) => {
          console.error('❌ Audio error:', e);
          console.error('Audio error details:', audio.error);
          URL.revokeObjectURL(audioUrl);
          isAudioPlayingRef.current = false;
          reject(e);
        });
        
        // Set volume to ensure it's audible
        audio.volume = 1.0;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Audio playback started successfully');
            })
            .catch(err => {
              console.error('❌ Error playing audio:', err);
              console.error('This might be due to browser autoplay policy. User interaction may be required.');
              URL.revokeObjectURL(audioUrl);
              isAudioPlayingRef.current = false;
              reject(err);
            });
        }
      } catch (error) {
        console.error('❌ Error fetching or playing audio:', error);
        console.error('Error stack:', error.stack);
        isAudioPlayingRef.current = false;
        reject(error);
      }
    });
  }, []);

  // Track if workout ready announcement has been played
  const workoutAnnouncedRef = useRef(false);
  // Track the last question that was read to prevent duplicate playback
  const lastQuestionReadRef = useRef(null);
  // Track if audio is currently playing to prevent overlap
  const isAudioPlayingRef = useRef(false);

  // Play audio when workout is generated
  useEffect(() => {
    if (!workout || !survey || loadingWorkout) return;
    if (!workout.segments || workout.segments.length === 0) return;
    // Only announce once when workout is first ready
    if (workoutAnnouncedRef.current) return;

    // Reset question tracking when workout is ready (so first question will play)
    lastQuestionReadRef.current = null;

    // Announce that workout is ready
    const announceWorkoutReady = async () => {
      workoutAnnouncedRef.current = true;
      console.log('🔊 Playing workout ready announcement');
      
      try {
        // Wait for the announcement to finish playing
        await playTTSAudio("Workout ready. Let's begin.");
        
        // After announcement finishes, play the first question
        if (survey.questions && survey.questions[0]) {
          const firstQuestionKey = `${survey.questions[0].id}-0`;
          // Only play if not already read
          if (lastQuestionReadRef.current !== firstQuestionKey) {
            lastQuestionReadRef.current = firstQuestionKey;
            console.log('▶️ Playing first question after announcement');
            // Small delay for better UX
            setTimeout(() => {
              playTTSAudio(survey.questions[0].heading);
            }, 300);
          }
        }
      } catch (error) {
        console.error('Error in workout announcement:', error);
      }
    };

    // Small delay to ensure workout is fully loaded
    const timeoutId = setTimeout(() => {
      announceWorkoutReady();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [workout, survey, loadingWorkout, playTTSAudio]);

  // Play audio when question changes (skip first question if workout just announced - it's handled in workout effect)
  useEffect(() => {
    if (!currentQuestion || !survey || !workout) {
      return;
    }
    if (!workout.segments || workout.segments.length === 0) {
      return;
    }
    
    // Create a unique key for this question
    const questionKey = `${currentQuestion.id}-${currentQuestionIndex}`;
    
    // Skip if this exact question was just read (prevents duplicate from React strict mode or re-renders)
    if (lastQuestionReadRef.current === questionKey) {
      return;
    }
    
    // For the first question, if workout was just announced, skip it (it's handled in workout effect)
    if (currentQuestionIndex === 0 && workoutAnnouncedRef.current) {
      // Check if it was already played by the workout announcement effect
      const firstQuestionKey = `${currentQuestion.id}-0`;
      if (lastQuestionReadRef.current === firstQuestionKey) {
        return; // Already played by workout announcement
      }
      // If workout was announced but first question hasn't been played yet, wait a bit
      // The workout effect will handle it
      return;
    }
    
    // Mark this question as read
    lastQuestionReadRef.current = questionKey;
    
    console.log('▶️ Playing question audio:', currentQuestion.heading);

    // Small delay to ensure question is fully displayed
    const timeoutId = setTimeout(() => {
      playTTSAudio(currentQuestion.heading);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentQuestion, survey, workout, currentQuestionIndex, playTTSAudio]);

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
              <button onClick={startWebcam} className="btn-start">START CAMERA</button>
            ) : (
              <button onClick={stopWebcam} className="btn-stop">STOP CAMERA</button>
            )}
            <button onClick={resetCounters} className="btn-reset">RESET SCORE</button>
            {survey && workout && (
              <button 
                onClick={() => {
                  const testText = currentQuestion?.heading || "Testing audio playback";
                  console.log('🧪 Testing audio with:', testText);
                  playTTSAudio(testText);
                }} 
                className="btn-reset"
                style={{ marginLeft: '10px' }}
              >
                REPLAY AUDIO
              </button>
            )}
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
