import React, { useRef, useEffect, useState, useCallback } from 'react';
import './VideoBox.css';
import { client, updateLeaderBoard } from './shared/supabase';

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
  const [isSurveyComplete, setIsSurveyComplete] = useState(false); // Track if all questions are done
  const [lockedAnswers, setLockedAnswers] = useState({}); // Track which questions have locked answers
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [landmarks, setLandmarks] = useState(null);
  const [countdown, setCountdown] = useState(null); // 3, 2, 1, or null (no countdown)
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const baselineCountersRef = useRef({ push_up: 0, squat: 0, jumping_jack: 0, arm_circle: 0 }); // Baseline when question started
  const currentExerciseKeyRef = useRef(null); // Current exercise counter key
  const lastBaselineQuestionRef = useRef(-1); // Track which question baseline was set for
  const countersRef = useRef(counters); // Keep latest counters in ref for use in timeout callbacks

  // Keep countersRef in sync with counters state
  useEffect(() => {
    countersRef.current = counters;
  }, [counters]);

  const leaderboardSubmittedRef = useRef(false);

  // Reset submit guard when a different survey loads
  useEffect(() => {
    leaderboardSubmittedRef.current = false;
  }, [surveyId]);

  useEffect(() => {
    if (!isSurveyComplete) return;
    if (leaderboardSubmittedRef.current) return;

    let cancelled = false;
    let unsubscribeAuth = null;

    const submit = async () => {
      try {
        const res = await updateLeaderBoard();
        if (cancelled) return;

        // If the user isn't logged in yet, wait for login then retry once.
        if (res?.ok === false && res.reason === 'not_logged_in') {
          const { data } = client.auth.onAuthStateChange(async (_event, session) => {
            if (!session?.user) return;
            if (leaderboardSubmittedRef.current) return;

            try {
              const retryRes = await updateLeaderBoard();
              if (retryRes?.ok) {
                leaderboardSubmittedRef.current = true;
                window.dispatchEvent(new Event('leaderboard-updated'));
              }
            } catch (err) {
              console.error('Leaderboard submit failed after login:', err);
            } finally {
              data.subscription.unsubscribe();
            }
          });

          unsubscribeAuth = () => data.subscription.unsubscribe();
          return;
        }

        leaderboardSubmittedRef.current = true;
        window.dispatchEvent(new Event('leaderboard-updated'));
      } catch (err) {
        console.error('Leaderboard submit failed:', err);
        leaderboardSubmittedRef.current = false;
      }
    };

    submit();

    return () => {
      cancelled = true;
      unsubscribeAuth?.();
    };
  }, [isSurveyComplete]);

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
            setDetecting(false);
            // Start countdown after camera is ready
            startCountdown();
          }
        };
        
        // Fallback: if onloadedmetadata doesn't fire, wait a bit then check
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2 && !isActive) {
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
            setDetecting(false);
            // Start countdown if not already active
            if (!isActive) {
              startCountdown();
            }
          }
        }, 1000);
      }
    } catch (err) {
      setDetecting(false);
      setIsActive(false);
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'CAMERA ERROR: ';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '⚠️ CAMERA PERMISSION DENIED\n\n';
        errorMessage += 'Please allow camera access to use this feature.\n\n';
        errorMessage += 'How to enable:\n';
        errorMessage += '1. Click the camera icon in your browser\'s address bar\n';
        errorMessage += '2. Select "Allow" for camera permissions\n';
        errorMessage += '3. Refresh the page and try again';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = '⚠️ CAMERA NOT FOUND\n\n';
        errorMessage += 'No camera device detected. Please connect a camera and try again.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = '⚠️ CAMERA IN USE\n\n';
        errorMessage += 'Camera is already being used by another application. Please close other apps using the camera.';
      } else {
        errorMessage += err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
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
    setCountdown(null);
    setIsCountdownActive(false);
    setLandmarks(null);
  };

  // Countdown function: 3, 2, 1, then start
  const startCountdown = () => {
    setIsCountdownActive(true);
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          setIsCountdownActive(false);
          setIsActive(true); // Start detection after countdown
          return null;
        }
        return prev - 1;
      });
    }, 1000); // Count down every second
  };

  const resetCounters = async () => {
    try {
      await fetch(`${API_URL}/api/reset-counters`, { method: 'POST' });
      const zeroCounters = { push_up: 0, squat: 0, jumping_jack: 0, arm_circle: 0 };
      setCounters(zeroCounters);
      baselineCountersRef.current = { ...zeroCounters };
      setCurrentExerciseReps(0);
      setPreviousCounters({});
      setIsExerciseComplete(false);
      
      // Unlock the current question's answer so user can select a different exercise
      const currentQuestion = survey?.questions[currentQuestionIndex];
      if (currentQuestion && currentQuestion.id) {
        setLockedAnswers(prev => {
          const newLocked = { ...prev };
          delete newLocked[currentQuestion.id];
          return newLocked;
        });
        // Clear the answer for the current question
        setAnswers(prev => {
          const newAnswers = { ...prev };
          delete newAnswers[currentQuestion.id];
          return newAnswers;
        });
        // Reset exercise selection
        setSelectedExercise(null);
        console.log('[Reset] Unlocked answer for question', currentQuestion.id);
      }
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
    // Allow processing during countdown so landmarks can show up and calibrate
    // Only need video and canvas to be available
    if (!videoRef.current || !canvasRef.current) {
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
          // Always continue processing if video/canvas are available (even during countdown)
          if (videoRef.current && canvasRef.current) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
          }
        }
      }, 'image/jpeg', 0.8);
    } else {
      // Video not ready yet, wait a bit longer and try again
      if (videoRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    }
  }, [landmarks, drawLandmarks]);

  // Start/stop frame processing
  // Process frames continuously (including during countdown) so landmarks can show up
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      processFrame();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [processFrame]);

  // Track reps for selected exercise - uses ref for baseline to avoid re-render loops
  useEffect(() => {
    if (!selectedExercise) {
      setCurrentExerciseReps(0);
      setIsExerciseComplete(false);
      return;
    }

    const counterKey = mapExerciseNameToCounter(selectedExercise.name);
    currentExerciseKeyRef.current = counterKey;
    
    const currentCount = counters[counterKey] || 0;
    const baselineCount = baselineCountersRef.current[counterKey] || 0;
    
    // Calculate reps done for this exercise (since baseline was set)
    const repsDone = Math.max(0, currentCount - baselineCount);
    
    console.log(`[Track Reps] ${selectedExercise.name}: counterKey=${counterKey}, current=${currentCount}, baseline=${baselineCount}, reps=${repsDone}`);
    
    // Update reps immediately for real-time progress bar
    setCurrentExerciseReps(repsDone);
    
    // Complete exercise after 5 reps
    const requiredReps = 5;
    
    if (repsDone >= requiredReps && !isExerciseComplete) {
      console.log(`[Track Reps] Exercise complete! ${repsDone} >= ${requiredReps}`);
      setIsExerciseComplete(true);
    } else if (repsDone < requiredReps && isExerciseComplete) {
      setIsExerciseComplete(false);
    }
  }, [counters, selectedExercise, isExerciseComplete]);

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
          options: q.options ? q.options.slice(0, 4).map(opt => opt.text) : null
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
    
    // If exercise changed, reset tracking
    // Don't reset baseline here - it should already be set when question started
    if (newExercise && (!selectedExercise || newExercise.name !== selectedExercise.name)) {
      setCurrentExerciseReps(0);
      setIsExerciseComplete(false);
    }
    
    setSelectedExercise(newExercise);
  }, [workout, survey, currentQuestionIndex, answers, selectedExercise, counters]);
  
  // Set baseline counters when starting a new question
  // This captures the counter values at the start so we can measure progress
  useEffect(() => {
    if (!survey || !workout) return;
    
    // Skip if baseline was already set for this question (e.g., by auto-advance)
    if (lastBaselineQuestionRef.current === currentQuestionIndex) {
      console.log(`[Baseline] Skipping - baseline already set for question ${currentQuestionIndex}`);
      return;
    }
    
    const currentQuestion = survey.questions[currentQuestionIndex];
    if (!currentQuestion || currentQuestion.type === 'open_ended') {
      return;
    }
    
    // Set baseline to current counter values for this question
    // This is the starting point for counting reps
    console.log(`[Baseline] Setting baseline for question ${currentQuestionIndex}:`, { ...counters });
    baselineCountersRef.current = {
      push_up: counters.push_up || 0,
      squat: counters.squat || 0,
      jumping_jack: counters.jumping_jack || 0,
      arm_circle: counters.arm_circle || 0
    };
    lastBaselineQuestionRef.current = currentQuestionIndex;
    
    // Also reset state-based previous counters for backwards compatibility
    setPreviousCounters({ ...baselineCountersRef.current });
  }, [survey, workout, currentQuestionIndex]); // Only run when question changes

  // Auto-advance to next question when exercise is complete (after 5 reps)
  useEffect(() => {
    if (!isExerciseComplete || !survey) return;
    
    console.log(`[Auto-advance] Exercise complete! Current question: ${currentQuestionIndex}`);
    
    // Check if we're on the last question - if so, mark survey as complete
    if (currentQuestionIndex >= survey.questions.length - 1) {
      console.log('[Auto-advance] On last question - survey complete!');
      const timer = setTimeout(async () => {
        setIsSurveyComplete(true);
        
        // Submit survey responses to backend/SurveyMonkey
        try {
          const answersList = Object.entries(answers).map(([questionId, answerText]) => ({
            question_id: questionId,
            answer: answerText
          }));
          
          console.log(`[Survey Submission] Submitting ${answersList.length} answers for survey ${survey.id}`, answersList);
          
          const submitResponse = await fetch(`${API_URL}/surveys/${survey.id}/responses`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              survey_id: survey.id,
              answers: answersList
            })
          });
          
          if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            console.error(`[Survey Submission] HTTP ${submitResponse.status}: ${errorText}`);
            throw new Error(`HTTP ${submitResponse.status}: ${errorText}`);
          }
          
          const result = await submitResponse.json();
          
          if (result.success) {
            console.log('✓ Survey responses successfully submitted to SurveyMonkey', result);
            if (result.response_id) {
              console.log(`  Response ID: ${result.response_id}`);
            }
          } else {
            console.warn('⚠ Survey submission failed:', result.message);
            // Show user-friendly error message (optional)
            alert(`Survey submission warning: ${result.message}`);
          }
        } catch (err) {
          console.error('✗ Error submitting survey responses:', err);
          // Don't block UI - survey is still marked complete even if submission fails
          // Optionally show error to user
          console.warn('Survey completed locally, but submission to SurveyMonkey failed. Check console for details.');
        }
      }, 400); // Small delay to show completion
      return () => clearTimeout(timer);
    }
    
    // Wait a moment before auto-advancing to show completion
    const timer = setTimeout(async () => {
      console.log('[Auto-advance] Advancing to next question...');
      
      // Reset counters to 0 when advancing to next question
      try {
        await fetch(`${API_URL}/api/reset-counters`, { method: 'POST' });
        const zeroCounters = { push_up: 0, squat: 0, jumping_jack: 0, arm_circle: 0 };
        setCounters(zeroCounters);
        countersRef.current = zeroCounters;
        baselineCountersRef.current = { ...zeroCounters };
        console.log('[Auto-advance] Counters reset to 0');
      } catch (err) {
        console.error('Error resetting counters on advance:', err);
        // Continue with advance even if reset fails
        const zeroCounters = { push_up: 0, squat: 0, jumping_jack: 0, arm_circle: 0 };
        setCounters(zeroCounters);
        countersRef.current = zeroCounters;
        baselineCountersRef.current = { ...zeroCounters };
      }
      
      // Get next question index before updating state
      const nextQuestionIndex = currentQuestionIndex + 1;
      
      // Update the baseline ref for next question and mark it as set (already set to zero above)
      lastBaselineQuestionRef.current = nextQuestionIndex;
      console.log(`[Auto-advance] Set baseline for question ${nextQuestionIndex}:`, baselineCountersRef.current);
      const nextQuestion = survey.questions[nextQuestionIndex];
      
      // Advance to next question
      setCurrentQuestionIndex(nextQuestionIndex);
      setCurrentExerciseReps(0);
      setIsExerciseComplete(false);
      setSelectedExercise(null);
      setPreviousCounters({ ...baselineCountersRef.current });
      setError(null);
      
      // Clear answer for next question
      if (nextQuestion) {
        setAnswers(prev => {
          const newAnswers = { ...prev };
          delete newAnswers[nextQuestion.id];
          return newAnswers;
        });
        // Clear locked status for next question
        setLockedAnswers(prev => {
          const newLocked = { ...prev };
          delete newLocked[nextQuestion.id];
          return newLocked;
        });
      }
      
      // Skip countdown when auto-advancing - user is already in the flow
      // Just ensure isActive is true so detection continues
      if (!isActive) {
        setIsActive(true);
      }
    }, 400); // 0.4 second delay to show completion
    
    return () => clearTimeout(timer);
    // Remove 'counters' from dependencies - we only want to advance when isExerciseComplete changes
    // Including 'counters' causes the effect to re-run every time counters update, resetting the timer
  }, [isExerciseComplete, survey, currentQuestionIndex, isActive]);

  // Auto-select answer based on first exercise detected
  useEffect(() => {
    if (!workout || !survey || isCountdownActive) return; // Don't detect during countdown
    
    const currentQuestion = survey.questions[currentQuestionIndex];
    if (!currentQuestion || currentQuestion.type === 'open_ended' || lockedAnswers[currentQuestion.id]) {
      return; // Skip if open-ended or already locked
    }

    // Find the segment for this question
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
    
    if (!segment || !segment.option_exercise_mapping) return;

    // Check if any exercise has been detected (counter increased from baseline)
    const exerciseMap = {
      'push_up': 'Push-ups',
      'squat': 'Squats',
      'jumping_jack': 'Jumping Jacks',
      'arm_circle': 'Arm Circles'
    };

    // Find which exercise was detected (counter increased from baseline ref)
    for (const [counterKey, exerciseName] of Object.entries(exerciseMap)) {
      const currentCount = counters[counterKey] || 0;
      const baselineCount = baselineCountersRef.current[counterKey] || 0;
      
      // If a rep was detected (counter increased from baseline), find the matching option
      if (currentCount > baselineCount && !answers[currentQuestion.id]) {
        // Find which option maps to this exercise
        const mapping = segment.option_exercise_mapping.find(m => 
          m.exercise.name === exerciseName
        );
        
        if (mapping) {
          console.log(`[Auto-select] Detected ${exerciseName}: current=${currentCount}, baseline=${baselineCount}`);
          console.log(`[Auto-select] Selecting option: ${mapping.option}`);
          
          // Auto-select this answer based on first detected exercise
          setAnswers(prev => ({ ...prev, [currentQuestion.id]: mapping.option }));
          setLockedAnswers(prev => ({ ...prev, [currentQuestion.id]: true }));
          break; // Only select the first detected exercise
        }
      }
    }
  }, [counters, workout, survey, currentQuestionIndex, lockedAnswers, answers, isCountdownActive]);

  // Removed nextQuestion - now handled by auto-advance
  
  // Removed canAdvance - no longer needed (auto-advance handles this)

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

    // Mark workout as announced and play first question directly
    const announceWorkoutReady = async () => {
      workoutAnnouncedRef.current = true;
      
      // Play the first question directly without announcement
      if (survey.questions && survey.questions[0]) {
        const firstQuestionKey = `${survey.questions[0].id}-0`;
        // Only play if not already read
        if (lastQuestionReadRef.current !== firstQuestionKey) {
          lastQuestionReadRef.current = firstQuestionKey;
          console.log('▶️ Playing first question');
          // Small delay for better UX
          setTimeout(() => {
            playTTSAudio(survey.questions[0].heading);
          }, 300);
        }
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
    }, 200);

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
          <div className={`video-wrapper-small ${isActive ? 'video-wrapper-active' : ''}`}>
            <video ref={videoRef} autoPlay playsInline muted className="video-element" />
            <canvas ref={canvasRef} className="canvas-overlay" />
            {!isActive && !countdown && <div className="video-placeholder">WAITING FOR SIGNAL...</div>}
            {countdown !== null && (
              <div className="countdown-overlay">
                <div className="countdown-number">{countdown}</div>
                <div className="countdown-text">GET READY!</div>
              </div>
            )}
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

          {/* Survey Completion Success Message */}
          {isSurveyComplete && survey && (
            <div className="survey-section neon-border-yellow">
              <div className="completion-message">
                <h2 className="neon-text-yellow completion-title">🎉 SURVEY COMPLETE! 🎉</h2>
                <p className="completion-text">You've successfully completed all {survey.questions.length} questions!</p>
                <p className="completion-subtext">Well done, champion! Your responses have been recorded.</p>
                <div className="completion-stats">
                  <div className="stat-item">
                    <span className="stat-label">Questions Completed:</span>
                    <span className="stat-value">{survey.questions.length} / {survey.questions.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Reps:</span>
                    <span className="stat-value">{Object.values(counters).reduce((a, b) => a + b, 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Survey Questions Section - Only show when everything is ready and not complete */}
          {!loadingSurvey && !loadingWorkout && !isSurveyComplete && survey && workout && workout.segments && workout.segments.length > 0 && currentQuestion && (
            <div className="survey-section neon-border-blue">
              <div className="question-header">
                <h3 className="neon-text-pink">
                  QUESTION {currentQuestionIndex + 1} / {survey.questions.length}
                  {answers[currentQuestion.id] && (
                    <span className="question-answered-indicator">✓</span>
                  )}
                </h3>
                <h4 className="neon-text-blue">{currentQuestion.heading}</h4>
              </div>

              {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                <div className="options-grid">
                  {currentQuestion.options.slice(0, 4).map((option) => {
                    const exercise = getExerciseForOption(option.text);
                    const isSelected = answers[currentQuestion.id] === option.text;
                    const isSelectedExercise = isSelected && exercise && exercise.name === selectedExercise?.name;
                    
                    return (
                      <button
                        key={option.id}
                        className={`option-btn ${isSelected ? 'active' : ''} ${isSelectedExercise && !isExerciseComplete ? 'in-progress' : ''} ${isSelectedExercise && isExerciseComplete ? 'complete' : ''}`}
                        disabled={true}
                        style={{ cursor: 'default' }}
                      >
                        <div className="option-text">{option.text}</div>
                        {exercise && (
                          <div className="option-exercise">
                            <span className="exercise-badge">→ {exercise.name}</span>
                            <span className="exercise-specs">
                              5 reps
                            </span>
                          </div>
                        )}
                        {isSelectedExercise && exercise && (() => {
                          // Progress bar shows percentage of reps done out of 5
                          const requiredReps = 5;
                          const progressPercentage = Math.min(100, (currentExerciseReps / requiredReps) * 100);
                          
                          return (
                            <div className="option-progress">
                              <div className="option-progress-bar">
                                <div 
                                  className="option-progress-fill"
                                  style={{ 
                                    width: `${progressPercentage}%`,
                                    minWidth: progressPercentage > 0 ? '2px' : '0px',
                                    display: 'block'
                                  }}
                                />
                              </div>
                              {isExerciseComplete && (
                                <span className="complete-check">✓</span>
                              )}
                            </div>
                          );
                        })()}
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
                    {selectedExercise.duration && <span>Duration: {selectedExercise.duration}s</span>}
                    {selectedExercise.equipment && <span>Equipment: {selectedExercise.equipment}</span>}
                  </div>
                  {isExerciseComplete && (
                    <div className="complete-message neon-text-yellow">
                      ✓ EXERCISE COMPLETE! MOVING TO NEXT QUESTION...
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="error-message neon-border-yellow">
                  {error}
                </div>
              )}

            </div>
          )}
        </div>

        <aside className="counters-section neon-border-blue">
          <h2>REPS</h2>
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
