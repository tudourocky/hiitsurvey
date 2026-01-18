"""Exercise detection service with improved accuracy"""
from collections import deque
from app.utils.constants import PoseLandmark
from app.utils.geometry import calculate_angle, calculate_distance

# Minimum visibility threshold for landmarks
MIN_VISIBILITY = 0.5

# Smoothing window size (frames)
SMOOTHING_WINDOW = 5

# Debouncing: require N consecutive frames for state change
DEBOUNCE_FRAMES = 3


class ExerciseDetectionService:
    """Service for detecting exercises from pose landmarks with improved accuracy"""
    
    def __init__(self):
        # Exercise detection state with debouncing
        self.exercise_states = {
            "squat": {
                "count": 0, "stage": "up", "prev_angle": 180,
                "angle_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0, "body_scale": None
            },
            "jumping_jack": {
                "count": 0, "stage": "closed",
                "arm_dist_history": deque(maxlen=SMOOTHING_WINDOW),
                "leg_dist_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0, "body_scale": None
            },
            "burpee": {
                "count": 0, "stage": "standing", "prev_hip_y": 0,
                "hip_y_history": deque(maxlen=SMOOTHING_WINDOW),
                "knee_angle_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0
            },
            "mountain_climber": {
                "count": 0, "stage": "neutral", "knee_cycle": 0,
                "wrist_y_history": deque(maxlen=SMOOTHING_WINDOW),
                "hip_y_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0
            },
            "high_knee": {
                "count": 0, "stage": "down",
                "left_knee_y_history": deque(maxlen=SMOOTHING_WINDOW),
                "right_knee_y_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0
            },
            "push_up": {
                "count": 0, "stage": "up",
                "elbow_angle_history": deque(maxlen=SMOOTHING_WINDOW),
                "wrist_y_history": deque(maxlen=SMOOTHING_WINDOW),
                "shoulder_y_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0
            },
            "lunge": {
                "count": 0, "stage": "standing",
                "left_knee_angle_history": deque(maxlen=SMOOTHING_WINDOW),
                "right_knee_angle_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0
            },
            "plank": {
                "count": 0, "stage": "not_plank", "hold_time": 0,
                "angle_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0
            },
            "jump_squat": {
                "count": 0, "stage": "up", "prev_hip_y": 0,
                "angle_history": deque(maxlen=SMOOTHING_WINDOW),
                "hip_y_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0
            },
            "star_jump": {
                "count": 0, "stage": "closed",
                "arm_dist_history": deque(maxlen=SMOOTHING_WINDOW),
                "leg_dist_history": deque(maxlen=SMOOTHING_WINDOW),
                "stage_counter": 0, "body_scale": None
            }
        }
    
    def _is_visible(self, landmark):
        """Check if landmark is visible enough"""
        return hasattr(landmark, 'visibility') and landmark.visibility >= MIN_VISIBILITY
    
    def _get_body_scale(self, landmarks):
        """Calculate body scale for adaptive thresholds"""
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        
        if not all(self._is_visible(lm) for lm in [left_shoulder, left_hip, left_ankle]):
            return None
        
        # Use torso length as scale reference
        torso_length = calculate_distance(left_shoulder, left_hip)
        leg_length = calculate_distance(left_hip, left_ankle)
        body_height = torso_length + leg_length
        
        return body_height if body_height > 0 else None
    
    def _smooth_value(self, history, current_value):
        """Apply moving average smoothing"""
        history.append(current_value)
        if len(history) < 2:
            return current_value
        return sum(history) / len(history)
    
    def _check_state_transition(self, state, new_stage, condition_met):
        """Debounced state transition"""
        if condition_met:
            if state["stage"] != new_stage:
                state["stage_counter"] += 1
                if state["stage_counter"] >= DEBOUNCE_FRAMES:
                    state["stage"] = new_stage
                    state["stage_counter"] = 0
                    return True
            else:
                state["stage_counter"] = 0
        else:
            state["stage_counter"] = 0
        return False
    
    def reset_counters(self):
        """Reset all exercise counters"""
        for exercise in self.exercise_states:
            self.exercise_states[exercise]["count"] = 0
            # Reset state but keep history for smoothing
            if "stage_counter" in self.exercise_states[exercise]:
                self.exercise_states[exercise]["stage_counter"] = 0
    
    def get_counters(self):
        """Get current exercise counters"""
        return {
            exercise_name: state["count"] 
            for exercise_name, state in self.exercise_states.items()
        }
    
    def detect_all_exercises(self, landmarks):
        """Detect all exercises and return detection results"""
        return {
            "squat": self.detect_squat(landmarks),
            "jumping_jack": self.detect_jumping_jack(landmarks),
            "burpee": self.detect_burpee(landmarks),
            "mountain_climber": self.detect_mountain_climber(landmarks),
            "high_knee": self.detect_high_knee(landmarks),
            "push_up": self.detect_push_up(landmarks),
            "lunge": self.detect_lunge(landmarks),
            "plank": self.detect_plank(landmarks),
            "jump_squat": self.detect_jump_squat(landmarks),
            "star_jump": self.detect_star_jump(landmarks)
        }
    
    def detect_squat(self, landmarks):
        """Detect squat exercise with improved accuracy"""
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        right_hip = landmarks[PoseLandmark.RIGHT_HIP]
        right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
        right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_hip, left_knee, left_ankle]):
            # Try right side
            if not all(self._is_visible(lm) for lm in [right_hip, right_knee, right_ankle]):
                return False
            hip, knee, ankle = right_hip, right_knee, right_ankle
        else:
            hip, knee, ankle = left_hip, left_knee, left_ankle
        
        # Calculate angle with smoothing
        angle_knee = calculate_angle(hip, knee, ankle)
        state = self.exercise_states["squat"]
        smoothed_angle = self._smooth_value(state["angle_history"], angle_knee)
        
        # Adaptive thresholds based on body scale
        if state["body_scale"] is None:
            state["body_scale"] = self._get_body_scale(landmarks)
        
        # Use adaptive thresholds (slightly more lenient)
        down_threshold = 95 if state["body_scale"] and state["body_scale"] > 0.5 else 90
        up_threshold = 155 if state["body_scale"] and state["body_scale"] > 0.5 else 160
        
        # Detect squat down with debouncing
        if smoothed_angle < down_threshold:
            if self._check_state_transition(state, "down", state["stage"] == "up"):
                pass  # State changed to down
        
        # Detect squat up (rep complete) with debouncing
        if smoothed_angle > up_threshold:
            if self._check_state_transition(state, "up", state["stage"] == "down"):
                state["count"] += 1
                return True
        
        return False
    
    def detect_jumping_jack(self, landmarks):
        """Detect jumping jack exercise with improved accuracy"""
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_wrist, right_wrist, left_ankle, right_ankle, left_shoulder]):
            return False
        
        # Calculate distances with smoothing
        arm_distance = calculate_distance(left_wrist, right_wrist)
        leg_distance = calculate_distance(left_ankle, right_ankle)
        wrist_height = (left_wrist.y + right_wrist.y) / 2
        
        state = self.exercise_states["jumping_jack"]
        smoothed_arm_dist = self._smooth_value(state["arm_dist_history"], arm_distance)
        smoothed_leg_dist = self._smooth_value(state["leg_dist_history"], leg_distance)
        
        # Adaptive thresholds
        if state["body_scale"] is None:
            state["body_scale"] = self._get_body_scale(landmarks)
        
        scale_factor = state["body_scale"] if state["body_scale"] else 0.4
        open_arm_threshold = 0.25 * scale_factor
        open_leg_threshold = 0.15 * scale_factor
        closed_arm_threshold = 0.18 * scale_factor
        closed_leg_threshold = 0.12 * scale_factor
        
        # Arms up and legs spread (open position)
        is_open = (smoothed_arm_dist > open_arm_threshold and 
                  smoothed_leg_dist > open_leg_threshold and 
                  wrist_height < left_shoulder.y)
        
        if self._check_state_transition(state, "open", is_open and state["stage"] == "closed"):
            pass
        
        # Arms down and legs together (closed position)
        is_closed = (smoothed_arm_dist < closed_arm_threshold and 
                    smoothed_leg_dist < closed_leg_threshold)
        
        if self._check_state_transition(state, "closed", is_closed and state["stage"] == "open"):
            state["count"] += 1
            return True
        
        return False
    
    def detect_burpee(self, landmarks):
        """Detect burpee exercise with improved accuracy"""
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_hip, left_knee, left_ankle, left_wrist, left_shoulder]):
            return False
        
        hip_y = left_hip.y
        wrist_y = left_wrist.y
        knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
        
        state = self.exercise_states["burpee"]
        smoothed_hip_y = self._smooth_value(state["hip_y_history"], hip_y)
        smoothed_knee_angle = self._smooth_value(state["knee_angle_history"], knee_angle)
        
        # State machine for burpee phases with debouncing
        if state["stage"] == "standing":
            if smoothed_knee_angle < 105:
                if self._check_state_transition(state, "squat", True):
                    pass
        elif state["stage"] == "squat":
            if wrist_y > left_hip.y and smoothed_hip_y > state["prev_hip_y"] + 0.01:
                if self._check_state_transition(state, "plank", True):
                    pass
        elif state["stage"] == "plank":
            if wrist_y < left_shoulder.y and smoothed_hip_y < state["prev_hip_y"] - 0.01:
                if self._check_state_transition(state, "jump", True):
                    pass
        elif state["stage"] == "jump":
            if smoothed_knee_angle > 145 and smoothed_hip_y < 0.65:
                if self._check_state_transition(state, "standing", True):
                    state["count"] += 1
                    return True
        
        state["prev_hip_y"] = smoothed_hip_y
        return False
    
    def detect_mountain_climber(self, landmarks):
        """Detect mountain climber exercise with improved accuracy"""
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        right_hip = landmarks[PoseLandmark.RIGHT_HIP]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_knee, right_knee, left_wrist, right_wrist, left_hip, right_hip]):
            return False
        
        wrist_y = (left_wrist.y + right_wrist.y) / 2
        hip_y = (left_hip.y + right_hip.y) / 2
        
        state = self.exercise_states["mountain_climber"]
        smoothed_wrist_y = self._smooth_value(state["wrist_y_history"], wrist_y)
        smoothed_hip_y = self._smooth_value(state["hip_y_history"], hip_y)
        
        # Must be in plank position
        is_plank = smoothed_wrist_y > smoothed_hip_y and abs(smoothed_wrist_y - smoothed_hip_y) < 0.18
        
        if is_plank:
            # Detect knee movement toward chest
            left_knee_up = left_knee.y < left_hip.y - 0.08
            right_knee_up = right_knee.y < right_hip.y - 0.08
            
            if state["stage"] == "neutral":
                if left_knee_up or right_knee_up:
                    if self._check_state_transition(state, "knee_up", True):
                        state["knee_cycle"] += 1
            elif state["stage"] == "knee_up":
                if not left_knee_up and not right_knee_up:
                    if self._check_state_transition(state, "neutral", True):
                        if state["knee_cycle"] >= 2:
                            state["count"] += 1
                            state["knee_cycle"] = 0
                            return True
        else:
            state["stage"] = "neutral"
            state["knee_cycle"] = 0
            state["stage_counter"] = 0
        
        return False
    
    def detect_high_knee(self, landmarks):
        """Detect high knee exercise with improved accuracy"""
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        right_hip = landmarks[PoseLandmark.RIGHT_HIP]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_knee, right_knee, left_hip, right_hip, left_ankle, right_ankle]):
            return False
        
        # Check if standing (ankles below hips)
        left_ankle_below = left_ankle.y > left_hip.y
        right_ankle_below = right_ankle.y > right_hip.y
        
        state = self.exercise_states["high_knee"]
        smoothed_left_knee_y = self._smooth_value(state["left_knee_y_history"], left_knee.y)
        smoothed_right_knee_y = self._smooth_value(state["right_knee_y_history"], right_knee.y)
        
        if left_ankle_below and right_ankle_below:
            # Detect knee lifting high (adaptive threshold)
            left_knee_high = smoothed_left_knee_y < left_hip.y - 0.12
            right_knee_high = smoothed_right_knee_y < right_hip.y - 0.12
            
            if state["stage"] == "down":
                if left_knee_high or right_knee_high:
                    if self._check_state_transition(state, "up", True):
                        pass
            elif state["stage"] == "up":
                if not left_knee_high and not right_knee_high:
                    if self._check_state_transition(state, "down", True):
                        state["count"] += 1
                        return True
        
        return False
    
    def detect_push_up(self, landmarks):
        """Detect push-up exercise with improved accuracy"""
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        left_elbow = landmarks[PoseLandmark.LEFT_ELBOW]
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_shoulder = landmarks[PoseLandmark.RIGHT_SHOULDER]
        right_elbow = landmarks[PoseLandmark.RIGHT_ELBOW]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_shoulder, left_elbow, left_wrist, right_shoulder, right_elbow, right_wrist]):
            return False
        
        # Calculate average elbow angle with smoothing
        left_angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
        right_angle = calculate_angle(right_shoulder, right_elbow, right_wrist)
        avg_angle = (left_angle + right_angle) / 2
        
        wrist_y = (left_wrist.y + right_wrist.y) / 2
        shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
        
        state = self.exercise_states["push_up"]
        smoothed_angle = self._smooth_value(state["elbow_angle_history"], avg_angle)
        smoothed_wrist_y = self._smooth_value(state["wrist_y_history"], wrist_y)
        smoothed_shoulder_y = self._smooth_value(state["shoulder_y_history"], shoulder_y)
        
        # Must be in push-up position
        if smoothed_wrist_y > smoothed_shoulder_y:
            # Detect push-up down (elbow bends)
            if smoothed_angle < 95:
                if self._check_state_transition(state, "down", state["stage"] == "up"):
                    pass
            
            # Detect push-up up (elbow straightens, rep complete)
            if smoothed_angle > 155:
                if self._check_state_transition(state, "up", state["stage"] == "down"):
                    state["count"] += 1
                    return True
        
        return False
    
    def detect_lunge(self, landmarks):
        """Detect lunge exercise with improved accuracy"""
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        right_hip = landmarks[PoseLandmark.RIGHT_HIP]
        right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
        right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_hip, left_knee, left_ankle, right_hip, right_knee, right_ankle]):
            return False
        
        # Calculate knee angles with smoothing
        left_knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
        right_knee_angle = calculate_angle(right_hip, right_knee, right_ankle)
        
        state = self.exercise_states["lunge"]
        smoothed_left_angle = self._smooth_value(state["left_knee_angle_history"], left_knee_angle)
        smoothed_right_angle = self._smooth_value(state["right_knee_angle_history"], right_knee_angle)
        
        # Detect which leg is forward (ankle in front of hip)
        left_forward = left_ankle.x < left_hip.x
        right_forward = right_ankle.x > right_hip.x
        
        if state["stage"] == "standing":
            # Transition to lunge down
            if (left_forward and smoothed_left_angle < 95) or (right_forward and smoothed_right_angle < 95):
                if self._check_state_transition(state, "down", True):
                    pass
        elif state["stage"] == "down":
            # Return to standing (rep complete)
            if smoothed_left_angle > 145 and smoothed_right_angle > 145:
                if self._check_state_transition(state, "standing", True):
                    state["count"] += 1
                    return True
        
        return False
    
    def detect_plank(self, landmarks):
        """Detect plank exercise with improved accuracy"""
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_shoulder, left_hip, left_ankle, left_wrist, right_wrist]):
            return False
        
        # Check if body is straight and horizontal (plank position)
        shoulder_hip_ankle_angle = calculate_angle(left_shoulder, left_hip, left_ankle)
        wrist_y = (left_wrist.y + right_wrist.y) / 2
        hip_y = left_hip.y
        
        state = self.exercise_states["plank"]
        smoothed_angle = self._smooth_value(state["angle_history"], shoulder_hip_ankle_angle)
        
        # Plank position: body straight (angle ~180), hands on ground
        is_plank = (165 < smoothed_angle < 195 and 
                   wrist_y > hip_y and 
                   abs(wrist_y - hip_y) < 0.25)
        
        if is_plank:
            if state["stage"] == "not_plank":
                if self._check_state_transition(state, "plank", True):
                    state["hold_time"] = 0
            else:
                state["hold_time"] += 1
                # Count every 30 frames (~1 second at 30fps)
                if state["hold_time"] % 30 == 0:
                    state["count"] += 1
                    return True
        else:
            if self._check_state_transition(state, "not_plank", True):
                state["hold_time"] = 0
        
        return False
    
    def detect_jump_squat(self, landmarks):
        """Detect jump squat exercise with improved accuracy"""
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_hip, left_knee, left_ankle]):
            return False
        
        angle_knee = calculate_angle(left_hip, left_knee, left_ankle)
        hip_y = left_hip.y
        
        state = self.exercise_states["jump_squat"]
        smoothed_angle = self._smooth_value(state["angle_history"], angle_knee)
        smoothed_hip_y = self._smooth_value(state["hip_y_history"], hip_y)
        
        if state["stage"] == "up":
            # Detect squat down
            if smoothed_angle < 95:
                if self._check_state_transition(state, "down", True):
                    state["prev_hip_y"] = smoothed_hip_y
        elif state["stage"] == "down":
            # Detect jump (hip moves up significantly)
            if smoothed_hip_y < state["prev_hip_y"] - 0.04:
                if self._check_state_transition(state, "jump", True):
                    pass
            state["prev_hip_y"] = smoothed_hip_y
        elif state["stage"] == "jump":
            # Return to standing (rep complete)
            if smoothed_angle > 155 and smoothed_hip_y > state["prev_hip_y"] - 0.03:
                if self._check_state_transition(state, "up", True):
                    state["count"] += 1
                    return True
            state["prev_hip_y"] = smoothed_hip_y
        
        return False
    
    def detect_star_jump(self, landmarks):
        """Detect star jump exercise with improved accuracy"""
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        
        # Check visibility
        if not all(self._is_visible(lm) for lm in [left_wrist, right_wrist, left_ankle, right_ankle, left_shoulder]):
            return False
        
        arm_distance = calculate_distance(left_wrist, right_wrist)
        leg_distance = calculate_distance(left_ankle, right_ankle)
        wrist_height = (left_wrist.y + right_wrist.y) / 2
        
        state = self.exercise_states["star_jump"]
        smoothed_arm_dist = self._smooth_value(state["arm_dist_history"], arm_distance)
        smoothed_leg_dist = self._smooth_value(state["leg_dist_history"], leg_distance)
        
        # Adaptive thresholds
        if state["body_scale"] is None:
            state["body_scale"] = self._get_body_scale(landmarks)
        
        scale_factor = state["body_scale"] if state["body_scale"] else 0.4
        open_arm_threshold = 0.35 * scale_factor
        open_leg_threshold = 0.22 * scale_factor
        closed_arm_threshold = 0.18 * scale_factor
        closed_leg_threshold = 0.12 * scale_factor
        
        # Star position: arms and legs spread wide, arms above head
        is_open = (smoothed_arm_dist > open_arm_threshold and 
                  smoothed_leg_dist > open_leg_threshold and 
                  wrist_height < left_shoulder.y - 0.08)
        
        if self._check_state_transition(state, "open", is_open and state["stage"] == "closed"):
            pass
        
        # Closed position: arms and legs together
        is_closed = (smoothed_arm_dist < closed_arm_threshold and 
                    smoothed_leg_dist < closed_leg_threshold)
        
        if self._check_state_transition(state, "closed", is_closed and state["stage"] == "open"):
            state["count"] += 1
            return True
        
        return False


# Singleton instance
exercise_detection_service = ExerciseDetectionService()
