#!/bin/bash
# Script to create multiple themed surveys using curl commands
# All surveys are multiple choice with different themes

echo "Creating themed surveys..."

# 1. Fitness & Exercise Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Fitness & Exercise Preferences", "questions": [{"id": "q1", "heading": "What is your primary fitness goal?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Weight Loss"}, {"id": "opt2", "text": "Muscle Building"}, {"id": "opt3", "text": "Cardiovascular Health"}, {"id": "opt4", "text": "Flexibility & Mobility"}]}, {"id": "q2", "heading": "How many days per week do you want to exercise?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "1-2 days"}, {"id": "opt2", "text": "3-4 days"}, {"id": "opt3", "text": "5-6 days"}, {"id": "opt4", "text": "Every day"}]}, {"id": "q3", "heading": "What time of day do you prefer to work out?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Early Morning (5-8 AM)"}, {"id": "opt2", "text": "Morning (8-12 PM)"}, {"id": "opt3", "text": "Afternoon (12-5 PM)"}, {"id": "opt4", "text": "Evening (5-9 PM)"}]}]}'

echo -e "\n\n"

# 2. Nutrition & Diet Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Nutrition & Diet Habits", "questions": [{"id": "q1", "heading": "What is your current diet approach?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Mediterranean"}, {"id": "opt2", "text": "Vegetarian"}, {"id": "opt3", "text": "Vegan"}, {"id": "opt4", "text": "Keto/Low-Carb"}, {"id": "opt5", "text": "No Specific Diet"}]}, {"id": "q2", "heading": "How many meals do you typically eat per day?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "2 meals"}, {"id": "opt2", "text": "3 meals"}, {"id": "opt3", "text": "4-5 meals"}, {"id": "opt4", "text": "6+ meals (grazing)"}]}, {"id": "q3", "heading": "What is your biggest nutrition challenge?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Portion Control"}, {"id": "opt2", "text": "Eating Enough Protein"}, {"id": "opt3", "text": "Meal Planning"}, {"id": "opt4", "text": "Avoiding Processed Foods"}]}]}'

echo -e "\n\n"

# 3. Mental Health & Wellness Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Mental Health & Wellness Assessment", "questions": [{"id": "q1", "heading": "How would you rate your current stress level?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Very Low"}, {"id": "opt2", "text": "Low"}, {"id": "opt3", "text": "Moderate"}, {"id": "opt4", "text": "High"}, {"id": "opt5", "text": "Very High"}]}, {"id": "q2", "heading": "How many hours of sleep do you get per night?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Less than 5 hours"}, {"id": "opt2", "text": "5-6 hours"}, {"id": "opt3", "text": "7-8 hours"}, {"id": "opt4", "text": "9+ hours"}]}, {"id": "q3", "heading": "What stress management techniques do you use?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Meditation"}, {"id": "opt2", "text": "Exercise"}, {"id": "opt3", "text": "Reading"}, {"id": "opt4", "text": "Social Activities"}, {"id": "opt5", "text": "None"}]}]}'

echo -e "\n\n"

# 4. Work-Life Balance Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Work-Life Balance Evaluation", "questions": [{"id": "q1", "heading": "How many hours do you work per week?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Less than 40 hours"}, {"id": "opt2", "text": "40-50 hours"}, {"id": "opt3", "text": "50-60 hours"}, {"id": "opt4", "text": "More than 60 hours"}]}, {"id": "q2", "heading": "How often do you take breaks during work?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Every hour"}, {"id": "opt2", "text": "Every 2-3 hours"}, {"id": "opt3", "text": "Once per day"}, {"id": "opt4", "text": "Rarely"}]}, {"id": "q3", "heading": "What would most improve your work-life balance?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Flexible Work Hours"}, {"id": "opt2", "text": "Remote Work Options"}, {"id": "opt3", "text": "More Vacation Time"}, {"id": "opt4", "text": "Better Time Management"}]}]}'

echo -e "\n\n"

# 5. Technology & Digital Wellness Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Technology & Digital Wellness", "questions": [{"id": "q1", "heading": "How many hours per day do you spend on screens?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Less than 4 hours"}, {"id": "opt2", "text": "4-8 hours"}, {"id": "opt3", "text": "8-12 hours"}, {"id": "opt4", "text": "More than 12 hours"}]}, {"id": "q2", "heading": "Do you use screen time tracking apps?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Yes, actively use them"}, {"id": "opt2", "text": "Yes, but rarely check"}, {"id": "opt3", "text": "No, but interested"}, {"id": "opt4", "text": "No, not interested"}]}, {"id": "q3", "heading": "What is your biggest digital wellness concern?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Sleep Quality"}, {"id": "opt2", "text": "Eye Strain"}, {"id": "opt3", "text": "Social Media Addiction"}, {"id": "opt4", "text": "Reduced Physical Activity"}]}]}'

echo -e "\n\n"

# 6. Social Connection Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Social Connection & Relationships", "questions": [{"id": "q1", "heading": "How often do you socialize with friends or family?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Daily"}, {"id": "opt2", "text": "Several times per week"}, {"id": "opt3", "text": "Once per week"}, {"id": "opt4", "text": "Rarely"}]}, {"id": "q2", "heading": "What is your preferred way to connect with others?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "In-person gatherings"}, {"id": "opt2", "text": "Video calls"}, {"id": "opt3", "text": "Phone calls"}, {"id": "opt4", "text": "Text messaging"}]}, {"id": "q3", "heading": "How would you rate your current social support network?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Excellent"}, {"id": "opt2", "text": "Good"}, {"id": "opt3", "text": "Fair"}, {"id": "opt4", "text": "Poor"}]}]}'

echo -e "\n\n"

# 7. Productivity & Time Management Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Productivity & Time Management", "questions": [{"id": "q1", "heading": "What is your biggest productivity challenge?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Procrastination"}, {"id": "opt2", "text": "Distractions"}, {"id": "opt3", "text": "Lack of Planning"}, {"id": "opt4", "text": "Overcommitment"}]}, {"id": "q2", "heading": "Which productivity technique do you use most?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "To-Do Lists"}, {"id": "opt2", "text": "Time Blocking"}, {"id": "opt3", "text": "Pomodoro Technique"}, {"id": "opt4", "text": "None"}]}, {"id": "q3", "heading": "How do you prioritize your tasks?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "By deadline"}, {"id": "opt2", "text": "By importance"}, {"id": "opt3", "text": "By urgency"}, {"id": "opt4", "text": "No specific system"}]}]}'

echo -e "\n\n"

# 8. Hobbies & Interests Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Hobbies & Personal Interests", "questions": [{"id": "q1", "heading": "What type of hobbies do you enjoy most?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Creative (art, music, writing)"}, {"id": "opt2", "text": "Physical (sports, outdoor activities)"}, {"id": "opt3", "text": "Intellectual (reading, puzzles)"}, {"id": "opt4", "text": "Social (games, clubs)"}]}, {"id": "q2", "heading": "How much time do you spend on hobbies per week?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Less than 5 hours"}, {"id": "opt2", "text": "5-10 hours"}, {"id": "opt3", "text": "10-20 hours"}, {"id": "opt4", "text": "More than 20 hours"}]}, {"id": "q3", "heading": "What prevents you from pursuing hobbies more?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Lack of time"}, {"id": "opt2", "text": "Lack of money"}, {"id": "opt3", "text": "Lack of motivation"}, {"id": "opt4", "text": "No barriers"}]}]}'

echo -e "\n\n"

# 9. Learning & Development Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Learning & Personal Development", "questions": [{"id": "q1", "heading": "What is your preferred learning method?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Online courses"}, {"id": "opt2", "text": "Books"}, {"id": "opt3", "text": "Hands-on practice"}, {"id": "opt4", "text": "Mentorship"}]}, {"id": "q2", "heading": "How many hours per week do you dedicate to learning?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Less than 2 hours"}, {"id": "opt2", "text": "2-5 hours"}, {"id": "opt3", "text": "5-10 hours"}, {"id": "opt4", "text": "More than 10 hours"}]}, {"id": "q3", "heading": "What skill would you most like to develop?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Technical skills"}, {"id": "opt2", "text": "Communication skills"}, {"id": "opt3", "text": "Creative skills"}, {"id": "opt4", "text": "Leadership skills"}]}]}'

echo -e "\n\n"

# 10. Travel & Adventure Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Travel & Adventure Preferences", "questions": [{"id": "q1", "heading": "What type of travel do you prefer?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Beach & Relaxation"}, {"id": "opt2", "text": "City Exploration"}, {"id": "opt3", "text": "Nature & Hiking"}, {"id": "opt4", "text": "Cultural Immersion"}]}, {"id": "q2", "heading": "How often do you travel per year?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Never"}, {"id": "opt2", "text": "1-2 times"}, {"id": "opt3", "text": "3-5 times"}, {"id": "opt4", "text": "More than 5 times"}]}, {"id": "q3", "heading": "What is your biggest travel concern?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Budget"}, {"id": "opt2", "text": "Safety"}, {"id": "opt3", "text": "Language barriers"}, {"id": "opt4", "text": "Time constraints"}]}]}'

echo -e "\n\n"

# 11. Non-Profit Volunteering Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Non-Profit Volunteering Engagement", "questions": [{"id": "q1", "heading": "What type of non-profit work interests you most?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Education & Youth Development"}, {"id": "opt2", "text": "Environmental Conservation"}, {"id": "opt3", "text": "Healthcare & Wellness"}, {"id": "opt4", "text": "Poverty & Social Justice"}]}, {"id": "q2", "heading": "How often would you like to volunteer?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Weekly"}, {"id": "opt2", "text": "Bi-weekly"}, {"id": "opt3", "text": "Monthly"}, {"id": "opt4", "text": "Occasionally"}]}, {"id": "q3", "heading": "What is your preferred volunteer activity?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Direct Service (helping people directly)"}, {"id": "opt2", "text": "Administrative Support"}, {"id": "opt3", "text": "Event Organization"}, {"id": "opt4", "text": "Fundraising & Outreach"}]}]}'

echo -e "\n\n"

# 12. Community Impact Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Community Impact Assessment", "questions": [{"id": "q1", "heading": "What community issue matters most to you?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Homelessness & Housing"}, {"id": "opt2", "text": "Food Insecurity"}, {"id": "opt3", "text": "Education Access"}, {"id": "opt4", "text": "Environmental Quality"}]}, {"id": "q2", "heading": "How do you prefer to make an impact?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Donating Money"}, {"id": "opt2", "text": "Donating Time"}, {"id": "opt3", "text": "Advocacy & Awareness"}, {"id": "opt4", "text": "Skills-Based Volunteering"}]}, {"id": "q3", "heading": "What is the biggest barrier to your involvement?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Lack of Time"}, {"id": "opt2", "text": "Financial Constraints"}, {"id": "opt3", "text": "Not Knowing Where to Start"}, {"id": "opt4", "text": "No Barriers"}]}]}'

echo -e "\n\n"

# 13. Social Causes & Activism Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Social Causes & Activism Engagement", "questions": [{"id": "q1", "heading": "Which social cause do you feel most passionate about?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Climate Change & Sustainability"}, {"id": "opt2", "text": "Racial & Social Equality"}, {"id": "opt3", "text": "Mental Health Awareness"}, {"id": "opt4", "text": "Animal Welfare"}]}, {"id": "q2", "heading": "How do you currently support causes you care about?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Regular Donations"}, {"id": "opt2", "text": "Attending Events"}, {"id": "opt3", "text": "Sharing on Social Media"}, {"id": "opt4", "text": "Not Currently Active"}]}, {"id": "q3", "heading": "What would motivate you to get more involved?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Clear Impact Stories"}, {"id": "opt2", "text": "Flexible Time Commitments"}, {"id": "opt3", "text": "Community of Like-Minded People"}, {"id": "opt4", "text": "Specific Action Plans"}]}]}'

echo -e "\n\n✅ All surveys created successfully!"
echo "You can now view all surveys at: http://localhost:8000/surveys"
