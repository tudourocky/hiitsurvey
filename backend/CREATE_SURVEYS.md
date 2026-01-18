# Creating Surveys

This guide shows you how to create surveys using the API.

## Endpoint

**POST** `/surveys`

## Request Format

```json
{
  "title": "Survey Title",
  "questions": [
    {
      "id": "q1",
      "heading": "Question text?",
      "type": "multiple_choice",
      "options": [
        {"id": "opt1", "text": "Option 1"},
        {"id": "opt2", "text": "Option 2"},
        {"id": "opt3", "text": "Option 3"}
      ]
    }
  ]
}
```

## Quick Start

### Option 1: Use the Script

Run the provided script to create 10 different themed surveys:

```bash
cd backend
./create_surveys.sh
```

### Option 2: Manual curl Commands

See individual curl commands below for each survey theme.

## Survey Themes Included

The script creates surveys with the following themes:

1. **Fitness & Exercise Preferences** - 3 questions about fitness goals, workout frequency, and preferred times
2. **Nutrition & Diet Habits** - 3 questions about diet approach, meal frequency, and nutrition challenges
3. **Mental Health & Wellness Assessment** - 3 questions about stress, sleep, and stress management
4. **Work-Life Balance Evaluation** - 3 questions about work hours, breaks, and balance improvements
5. **Technology & Digital Wellness** - 3 questions about screen time, tracking apps, and digital concerns
6. **Social Connection & Relationships** - 3 questions about socialization frequency, preferred connection methods, and support networks
7. **Productivity & Time Management** - 3 questions about productivity challenges, techniques, and prioritization
8. **Hobbies & Personal Interests** - 3 questions about hobby types, time spent, and barriers
9. **Learning & Personal Development** - 3 questions about learning methods, time dedicated, and desired skills
10. **Travel & Adventure Preferences** - 3 questions about travel types, frequency, and concerns

## Example: Create a Single Survey

```bash
curl -X POST "http://localhost:8000/surveys" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fitness & Exercise Preferences",
    "questions": [
      {
        "id": "q1",
        "heading": "What is your primary fitness goal?",
        "type": "multiple_choice",
        "options": [
          {"id": "opt1", "text": "Weight Loss"},
          {"id": "opt2", "text": "Muscle Building"},
          {"id": "opt3", "text": "Cardiovascular Health"},
          {"id": "opt4", "text": "Flexibility & Mobility"}
        ]
      }
    ]
  }'
```

## View All Surveys

After creating surveys, you can view them all:

```bash
curl http://localhost:8000/surveys
```

## View a Specific Survey

```bash
curl http://localhost:8000/surveys/{survey_id}
```

The survey ID will be returned in the response when you create a survey.

## Notes

- All surveys created through this endpoint are stored in memory (will be lost on server restart)
- Survey IDs are automatically generated UUIDs
- All questions in the provided examples are multiple choice
- The endpoint returns a 201 status code on successful creation
