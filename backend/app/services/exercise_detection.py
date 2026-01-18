"""Exercise detection service"""
import math
from app.utils.constants import PoseLandmark
from app.utils.geometry import calculate_angle, calculate_distance


class ExerciseDetectionService:
    """Service for detecting exercises from pose landmarks"""
    
    def __init__(self):
        # Exercise detection state
        self.exercise_states = {
            "squat": {"count": 0, "stage": "up", "prev_angle": 180},
            "jumping_jack": {"count": 0, "stage": "closed", "prev_arm_distance": 0.2, "prev_leg_distance": 0.15},
            "burpee": {"count": 0, "stage": "standing", "prev_hip_y": 0},
            "mountain_climber": {"count": 0, "stage": "neutral", "prev_knee_y": 0, "knee_cycle": 0},
            "high_knee": {"count": 0, "stage": "down", "prev_left_knee_y": 0, "prev_right_knee_y": 0},
            "push_up": {"count": 0, "stage": "up", "prev_elbow_angle": 180},
            "lunge": {"count": 0, "stage": "standing", "prev_knee_angle": 180},
            "plank": {"count": 0, "stage": "not_plank", "hold_time": 0},
            "jump_squat": {"count": 0, "stage": "up", "prev_hip_y": 0, "prev_angle": 180},
            "star_jump": {"count": 0, "stage": "closed", "prev_arm_distance": 0, "prev_leg_distance": 0},
            "arm_circle": {"count": 0, "stage": "neutral", "cycle_count": 0, "prev_wrist_angle": 0}
        }
    
    def reset_counters(self):
        """Reset all exercise counters"""
        for exercise in self.exercise_states:
            self.exercise_states[exercise]["count"] = 0
    
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
            "star_jump": self.detect_star_jump(landmarks),
            "arm_circle": self.detect_arm_circle(landmarks)
        }
    
    def detect_squat(self, landmarks):
        """Detect squat exercise"""
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        
        angle_knee = calculate_angle(left_hip, left_knee, left_ankle)
        
        state = self.exercise_states["squat"]
        
        # Detect squat down
        if angle_knee < 90 and state["stage"] == "up":
            state["stage"] = "down"
        
        # Detect squat up (rep complete)
        if angle_knee > 160 and state["stage"] == "down":
            state["stage"] = "up"
            state["count"] += 1
            return True
        
        return False
    
    def detect_jumping_jack(self, landmarks):
        """Detect jumping jack exercise - slightly stricter to avoid walking false positives"""
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        right_shoulder = landmarks[PoseLandmark.RIGHT_SHOULDER]
        
        # Simple distance calculations
        arm_distance = calculate_distance(left_wrist, right_wrist)
        leg_distance = calculate_distance(left_ankle, right_ankle)
        
        # Check if arms are raised (helps distinguish from walking where arms swing lower)
        avg_wrist_y = (left_wrist.y + right_wrist.y) / 2
        avg_shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
        arms_raised = avg_wrist_y < avg_shoulder_y + 0.05  # Arms at or above shoulder level (lenient)
        
        state = self.exercise_states["jumping_jack"]
        
        # Track previous distances to detect movement
        prev_arm_dist = state.get("prev_arm_distance", 0.2)
        prev_leg_dist = state.get("prev_leg_distance", 0.15)
        
        # Slightly stricter thresholds to avoid walking false positives
        # Open position: BOTH arms AND legs must be spread (not just one)
        # This distinguishes jumping jacks from walking where movement is alternating
        arms_spread = arm_distance > 0.28  # Slightly increased from 0.25
        legs_spread = leg_distance > 0.20  # Slightly increased from 0.18
        
        # Closed position: both arms AND legs close together
        arms_close = arm_distance < 0.22
        legs_close = leg_distance < 0.16
        
        # Simple state machine - similar to squat detection
        if state["stage"] == "closed":
            # Transition to open: BOTH arms AND legs spread, AND arms raised
            # This prevents walking from triggering (walking has alternating movement, arms not raised)
            if arms_spread and legs_spread and arms_raised:
                state["stage"] = "open"
                state["prev_arm_distance"] = arm_distance
                state["prev_leg_distance"] = leg_distance
        
        elif state["stage"] == "open":
            # Transition to closed: both arms AND legs close together
            # Count a rep when returning to closed position
            if arms_close and legs_close:
                state["stage"] = "closed"
                state["count"] += 1
                state["prev_arm_distance"] = arm_distance
                state["prev_leg_distance"] = leg_distance
                return True
        
        # Update previous distances for next frame
        state["prev_arm_distance"] = arm_distance
        state["prev_leg_distance"] = leg_distance
        
        return False
    
    def detect_burpee(self, landmarks):
        """Detect burpee exercise"""
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        
        hip_y = left_hip.y
        wrist_y = left_wrist.y
        knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
        
        state = self.exercise_states["burpee"]
        
        # State machine for burpee phases
        if state["stage"] == "standing":
            # Transition to squat
            if knee_angle < 100:
                state["stage"] = "squat"
        elif state["stage"] == "squat":
            # Transition to plank (hands down)
            if wrist_y > left_hip.y and hip_y > state["prev_hip_y"]:
                state["stage"] = "plank"
        elif state["stage"] == "plank":
            # Transition to jump (arms up, body up)
            if wrist_y < left_shoulder.y and hip_y < state["prev_hip_y"]:
                state["stage"] = "jump"
        elif state["stage"] == "jump":
            # Return to standing (rep complete)
            if knee_angle > 150 and hip_y < 0.6:
                state["stage"] = "standing"
                state["count"] += 1
                return True
        
        state["prev_hip_y"] = hip_y
        return False
    
    def detect_mountain_climber(self, landmarks):
        """Detect mountain climber exercise"""
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        right_hip = landmarks[PoseLandmark.RIGHT_HIP]
        
        # Check if in plank position (hands on ground, body horizontal)
        wrist_y = (left_wrist.y + right_wrist.y) / 2
        hip_y = (left_hip.y + right_hip.y) / 2
        
        state = self.exercise_states["mountain_climber"]
        
        # Must be in plank position
        if wrist_y > hip_y and abs(wrist_y - hip_y) < 0.15:
            # Detect knee movement toward chest
            left_knee_up = left_knee.y < left_hip.y - 0.1
            right_knee_up = right_knee.y < right_hip.y - 0.1
            
            if state["stage"] == "neutral":
                if left_knee_up or right_knee_up:
                    state["stage"] = "knee_up"
                    state["knee_cycle"] += 1
            elif state["stage"] == "knee_up":
                # Knee returns down
                if not left_knee_up and not right_knee_up:
                    state["stage"] = "neutral"
                    # Count every 2 cycles (both legs)
                    if state["knee_cycle"] >= 2:
                        state["count"] += 1
                        state["knee_cycle"] = 0
                        return True
        else:
            state["stage"] = "neutral"
            state["knee_cycle"] = 0
        
        return False
    
    def detect_high_knee(self, landmarks):
        """Detect high knee exercise - made more lenient like squats"""
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        right_hip = landmarks[PoseLandmark.RIGHT_HIP]
        
        state = self.exercise_states["high_knee"]
        
        # More lenient: check if either knee is raised (not both required)
        # Reduced threshold from 0.15 to 0.08 for easier detection
        left_knee_high = left_knee.y < left_hip.y - 0.08
        right_knee_high = right_knee.y < right_hip.y - 0.08
        
        # Simple state machine - similar to squat detection
        # Detect knee lifting up (either knee)
        if (left_knee_high or right_knee_high) and state["stage"] == "down":
            state["stage"] = "up"
        
        # Detect knee returning down (both knees down) - rep complete
        elif (not left_knee_high and not right_knee_high) and state["stage"] == "up":
            state["stage"] = "down"
            state["count"] += 1
            return True
        
        return False
    
    def detect_push_up(self, landmarks):
        """Detect push-up exercise - more lenient, focuses on being on the ground"""
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        left_elbow = landmarks[PoseLandmark.LEFT_ELBOW]
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_shoulder = landmarks[PoseLandmark.RIGHT_SHOULDER]
        right_elbow = landmarks[PoseLandmark.RIGHT_ELBOW]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        right_hip = landmarks[PoseLandmark.RIGHT_HIP]
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
        
        # Calculate average elbow angle
        left_angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
        right_angle = calculate_angle(right_shoulder, right_elbow, right_wrist)
        avg_angle = (left_angle + right_angle) / 2
        
        # Get body part positions
        wrist_y = (left_wrist.y + right_wrist.y) / 2
        shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
        hip_y = (left_hip.y + right_hip.y) / 2
        knee_y = (left_knee.y + right_knee.y) / 2
        ankle_y = (left_ankle.y + right_ankle.y) / 2
        
        # KEY DISTINCTION: Push-ups are the ONLY exercise on the ground
        # For exercises on the ground, ankles and knees should be very low (high y values)
        # In normalized coordinates: 0 = top, 1 = bottom (higher y = lower on screen = closer to ground)
        
        # PRIMARY CHECK: Ankles must be on/near the ground (very low in frame)
        # This distinguishes from standing exercises (squats, jumping jacks, arm circles)
        ankles_on_ground = ankle_y > 0.55  # Ankles must be below 55% mark (more lenient than before)
        
        # SECONDARY CHECK: Knees should also be relatively low (not bent up like in squats)
        # In push-ups, knees are on ground. In squats, knees are bent up (lower y values)
        knees_low = knee_y > 0.45  # Knees should be below 45% mark
        
        # TERTIARY CHECK: Body should be relatively horizontal (to distinguish from standing)
        # In push-ups: shoulders and hips are at similar height (horizontal)
        # In standing exercises: hips are much lower than shoulders (vertical)
        body_horizontal = abs(hip_y - shoulder_y) < 0.20  # More lenient: up to 20% difference
        
        # QUATERNARY CHECK: Overall body position should be low (distinguish from standing)
        # Hips should be relatively low, indicating prone/plank position
        hips_low = hip_y > 0.45  # Hips should be below 45% mark
        
        # FIFTH CHECK: Hands should be on ground (wrists below shoulders or at similar level)
        # More lenient - just check wrists aren't way above shoulders
        hands_on_ground = wrist_y >= shoulder_y - 0.10  # Wrists can be slightly above but not much
        
        state = self.exercise_states["push_up"]
        
        # PRIMARY requirement: Must be on the ground (ankles on ground)
        # SECONDARY: Body should be horizontal and low (distinguishes from standing)
        if (ankles_on_ground and 
            knees_low and 
            body_horizontal and 
            hips_low and 
            hands_on_ground):
            
            # Detect push-up down (elbow bends) - more lenient angle threshold
            if avg_angle < 100 and state["stage"] == "up":  # More lenient: was 90, now 100
                state["stage"] = "down"
            
            # Detect push-up up (elbow straightens, rep complete) - more lenient angle threshold
            if avg_angle > 150 and state["stage"] == "down":  # More lenient: was 160, now 150
                state["stage"] = "up"
                state["count"] += 1
                return True
        
        return False
    
    def detect_lunge(self, landmarks):
        """Detect lunge exercise"""
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        right_hip = landmarks[PoseLandmark.RIGHT_HIP]
        right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
        right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
        
        # Calculate knee angles for both legs
        left_knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
        right_knee_angle = calculate_angle(right_hip, right_knee, right_ankle)
        
        # Detect which leg is forward (ankle in front of hip)
        left_forward = left_ankle.x < left_hip.x
        right_forward = right_ankle.x > right_hip.x
        
        state = self.exercise_states["lunge"]
        
        if state["stage"] == "standing":
            # Transition to lunge down
            if (left_forward and left_knee_angle < 90) or (right_forward and right_knee_angle < 90):
                state["stage"] = "down"
        elif state["stage"] == "down":
            # Return to standing (rep complete)
            if left_knee_angle > 150 and right_knee_angle > 150:
                state["stage"] = "standing"
                state["count"] += 1
                return True
        
        return False
    
    def detect_plank(self, landmarks):
        """Detect plank exercise (counts seconds held)"""
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        
        # Check if body is straight and horizontal (plank position)
        shoulder_hip_ankle_angle = calculate_angle(left_shoulder, left_hip, left_ankle)
        wrist_y = (left_wrist.y + right_wrist.y) / 2
        hip_y = left_hip.y
        
        state = self.exercise_states["plank"]
        
        # Plank position: body straight (angle ~180), hands on ground
        is_plank = (170 < shoulder_hip_ankle_angle < 190 and 
                    wrist_y > hip_y and 
                    abs(wrist_y - hip_y) < 0.2)
        
        if is_plank:
            if state["stage"] == "not_plank":
                state["stage"] = "plank"
                state["hold_time"] = 0
            else:
                state["hold_time"] += 1
                # Count every 30 frames (~1 second at 30fps)
                if state["hold_time"] % 30 == 0:
                    state["count"] += 1
                    return True
        else:
            state["stage"] = "not_plank"
            state["hold_time"] = 0
        
        return False
    
    def detect_jump_squat(self, landmarks):
        """Detect jump squat exercise"""
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        left_knee = landmarks[PoseLandmark.LEFT_KNEE]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        
        angle_knee = calculate_angle(left_hip, left_knee, left_ankle)
        hip_y = left_hip.y
        
        state = self.exercise_states["jump_squat"]
        
        if state["stage"] == "up":
            # Detect squat down
            if angle_knee < 90:
                state["stage"] = "down"
                state["prev_hip_y"] = hip_y
        elif state["stage"] == "down":
            # Detect jump (hip moves up significantly)
            if hip_y < state["prev_hip_y"] - 0.05:
                state["stage"] = "jump"
            state["prev_hip_y"] = hip_y
        elif state["stage"] == "jump":
            # Return to standing (rep complete)
            if angle_knee > 160 and hip_y > state["prev_hip_y"] - 0.02:
                state["stage"] = "up"
                state["count"] += 1
                return True
            state["prev_hip_y"] = hip_y
        
        return False
    
    def detect_star_jump(self, landmarks):
        """Detect star jump exercise"""
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
        right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        left_hip = landmarks[PoseLandmark.LEFT_HIP]
        
        arm_distance = calculate_distance(left_wrist, right_wrist)
        leg_distance = calculate_distance(left_ankle, right_ankle)
        wrist_height = (left_wrist.y + right_wrist.y) / 2
        
        state = self.exercise_states["star_jump"]
        
        # Star position: arms and legs spread wide, arms above head
        if (arm_distance > 0.4 and leg_distance > 0.25 and 
            wrist_height < left_shoulder.y - 0.1):
            if state["stage"] == "closed":
                state["stage"] = "open"
        
        # Closed position: arms and legs together
        if arm_distance < 0.2 and leg_distance < 0.15:
            if state["stage"] == "open":
                state["stage"] = "closed"
                state["count"] += 1
                return True
        
        return False
    
    def detect_arm_circle(self, landmarks):
        """Detect arm circle exercise - simplified and lenient like other exercises"""
        left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
        right_shoulder = landmarks[PoseLandmark.RIGHT_SHOULDER]
        left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
        
        state = self.exercise_states["arm_circle"]
        
        # Calculate wrist position relative to shoulder (for circular motion)
        # Use average of both arms for more lenient detection
        left_wrist_rel_x = left_wrist.x - left_shoulder.x
        left_wrist_rel_y = left_wrist.y - left_shoulder.y
        right_wrist_rel_x = right_wrist.x - right_shoulder.x
        right_wrist_rel_y = right_wrist.y - right_shoulder.y
        
        # Calculate angle of wrist relative to shoulder (for circular motion tracking)
        left_angle = math.degrees(math.atan2(left_wrist_rel_y, left_wrist_rel_x))
        right_angle = math.degrees(math.atan2(right_wrist_rel_y, right_wrist_rel_x))
        avg_angle = (left_angle + right_angle) / 2
        
        # Normalize angle to 0-360
        avg_angle = avg_angle % 360
        if avg_angle < 0:
            avg_angle += 360
        
        # Track angle changes to detect circular motion
        prev_angle = state.get("prev_wrist_angle", avg_angle)
        
        # Calculate angle difference (handle wrap-around)
        angle_diff = abs(avg_angle - prev_angle)
        if angle_diff > 180:
            angle_diff = 360 - angle_diff
        
        # Simple detection: track accumulated circular motion
        # More lenient: lower threshold for one full circle
        cycle_count = state.get("cycle_count", 0)
        
        # Accumulate angle movement when arms are moving
        if angle_diff > 5:  # Only track if there's significant movement (>5 degrees)
            cycle_count += angle_diff
            state["cycle_count"] = cycle_count
            
            # Count one rep when accumulated angle reaches ~270 degrees (more lenient than 360)
            if cycle_count >= 270:
                state["cycle_count"] = 0
                state["count"] += 1
                state["prev_wrist_angle"] = avg_angle
                return True
        
        # Update previous angle
        state["prev_wrist_angle"] = avg_angle
        
        # Reset cycle if no movement (arms stopped)
        if angle_diff < 1:
            state["cycle_count"] = 0
        
        return False


# Singleton instance
exercise_detection_service = ExerciseDetectionService()
