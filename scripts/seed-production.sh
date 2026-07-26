#!/bin/bash
# Seed and approve production questions on Render
# Usage: bash scripts/seed-production.sh

BASE="https://quiz-generator-rugz.onrender.com"
PASS=$(grep ADMIN_PASSWORD ~/quiz-generator/.env | cut -d '=' -f2-)

echo "Seeding questions..."

RESPONSE=$(curl -s -X POST "$BASE/api/questions/bulk" \
  -H "X-Admin-Password: $PASS" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "id": "prod-001",
        "category": "Adolescent Health",
        "question_type": "multiple_choice",
        "question_text": "At what age does puberty typically begin for most girls?",
        "option_a": "8-9 years",
        "option_b": "10-14 years",
        "option_c": "16-18 years",
        "option_d": "18-20 years",
        "correct_answer": "B",
        "explanation": "Puberty in girls typically begins between ages 10-14, though starting as early as 8 is considered normal. During this time, the body goes through many changes including growth in height and development of breasts.",
        "status": "verified"
      },
      {
        "id": "prod-002",
        "category": "Adolescent Health",
        "question_type": "true_or_false",
        "question_text": "Feeling sad or moody sometimes during teenage years is completely normal.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "A",
        "explanation": "Emotional ups and downs are a normal part of adolescence due to hormonal changes and new life experiences. However, if sadness lasts more than two weeks or affects daily life, it is important to talk to a trusted adult or health professional.",
        "status": "verified"
      },
      {
        "id": "prod-003",
        "category": "General Health",
        "question_type": "multiple_choice",
        "question_text": "How many hours of sleep do teenagers need each night?",
        "option_a": "5-6 hours",
        "option_b": "7-8 hours",
        "option_c": "8-10 hours",
        "option_d": "11-12 hours",
        "correct_answer": "C",
        "explanation": "Teenagers need 8-10 hours of sleep per night because their bodies and brains are still growing and developing. Good sleep helps with concentration, mood, and physical health.",
        "status": "verified"
      },
      {
        "id": "prod-004",
        "category": "General Health",
        "question_type": "scenario",
        "question_text": "Your friend has been feeling tired all the time and has headaches every day for two weeks. What is the best advice?",
        "option_a": "Tell them to drink more coffee to stay awake",
        "option_b": "Encourage them to see a doctor as these could be signs of something treatable",
        "option_c": "Tell them it is normal and they should ignore it",
        "option_d": "Suggest they search for a diagnosis online",
        "correct_answer": "B",
        "explanation": "Persistent tiredness and daily headaches lasting two weeks are signs that something may need medical attention. Encouraging a friend to see a doctor and offering to go with them is the kindest and most helpful response.",
        "status": "verified"
      },
      {
        "id": "prod-005",
        "category": "Sexual and Reproductive Health",
        "question_type": "true_or_false",
        "question_text": "You can get an STI from sharing food or drinks with someone who has one.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "B",
        "explanation": "STIs are transmitted through direct contact with infected bodily fluids — not through sharing food, drinks, or casual contact. Understanding how STIs are and are not transmitted helps reduce unnecessary fear and stigma.",
        "status": "verified"
      },
      {
        "id": "prod-006",
        "category": "Sexual and Reproductive Health",
        "question_type": "multiple_choice",
        "question_text": "What is the most important reason to talk to a doctor if you think you might have an STI?",
        "option_a": "To get a note for school",
        "option_b": "Because most STIs are treatable and early treatment prevents complications",
        "option_c": "Because doctors are required to tell your parents",
        "option_d": "To find out who gave it to you",
        "correct_answer": "B",
        "explanation": "Most STIs are treatable, and many are completely curable when caught early. Seeing a doctor quickly prevents complications and protects your health and the health of others.",
        "status": "verified"
      }
    ]
  }')

echo "Seed response: $RESPONSE"

# Extract IDs and approve all
echo ""
echo "Approving all questions..."

# Extract real IDs from seed response and approve them
IDS=$(echo $RESPONSE | grep -o '"ids":\["[^]]*\]' | grep -o '"[a-f0-9-]\{36\}"' | tr -d '"')

for ID in $IDS; do
  echo "Approving $ID..."
  curl -s -X PATCH "$BASE/api/questions/$ID/review" \
    -H "X-Admin-Password: $PASS" \
    -H "Content-Type: application/json" \
    -d '{"action":"approve"}'
  echo ""
done

echo ""
echo "Done. Checking stats..."
curl -s -H "X-Admin-Password: $PASS" "$BASE/api/stats"
echo ""
