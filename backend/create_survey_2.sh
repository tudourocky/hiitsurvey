#!/bin/bash
# Script to create multiple themed surveys using curl commands
# All surveys are multiple choice with different themes

echo "Creating themed surveys..."

# 1. Fitness & Exercise Survey
curl -X POST "http://localhost:8000/surveys" -H "Content-Type: application/json" -d '{"title": "Fitness & Exercise Preferences", "questions": [{"id": "q1", "heading": "What is your primary fitness goal?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Weight Loss"}, {"id": "opt2", "text": "Muscle Building"}, {"id": "opt3", "text": "Cardiovascular Health"}, {"id": "opt4", "text": "Flexibility & Mobility"}]}, {"id": "q2", "heading": "How many days per week do you want to exercise?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "1-2 days"}, {"id": "opt2", "text": "3-4 days"}, {"id": "opt3", "text": "5-6 days"}, {"id": "opt4", "text": "Every day"}]}, {"id": "q3", "heading": "What time of day do you prefer to work out?", "type": "multiple_choice", "options": [{"id": "opt1", "text": "Early Morning (5-8 AM)"}, {"id": "opt2", "text": "Morning (8-12 PM)"}, {"id": "opt3", "text": "Afternoon (12-5 PM)"}, {"id": "opt4", "text": "Evening (5-9 PM)"}]}]}'


echo -e "\n\n✅ All surveys created successfully!"
echo "You can now view all surveys at: http://localhost:8000/surveys"
