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
      },
      {
        "id": "prod-007",
        "category": "Adolescent Health",
        "question_type": "multiple_choice",
        "question_text": "Which of the following is a normal part of puberty for most teenagers?",
        "option_a": "Growing taller very quickly over a short period",
        "option_b": "Feeling embarrassed about body changes",
        "option_c": "Both A and B",
        "option_d": "None of the above",
        "correct_answer": "C",
        "explanation": "Both rapid growth spurts and feeling self-conscious about body changes are completely normal during puberty. Everyone goes through these changes at their own pace, and it is okay to feel a mix of emotions about it.",
        "status": "verified"
      },
      {
        "id": "prod-008",
        "category": "Adolescent Health",
        "question_type": "true_or_false",
        "question_text": "It is normal for teenagers to need more sleep than adults.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "A",
        "explanation": "Teenagers genuinely need more sleep than adults — around 8 to 10 hours per night. This is because the teenage brain is still developing, and sleep plays a key role in growth, learning, and emotional regulation.",
        "status": "verified"
      },
      {
        "id": "prod-009",
        "category": "Adolescent Health",
        "question_type": "scenario",
        "question_text": "Your classmate seems withdrawn and avoids friends lately. They snap at small things and have lost interest in activities they used to enjoy. What should you do?",
        "option_a": "Give them space and stop talking to them until they feel better",
        "option_b": "Tell the teacher so they get in trouble",
        "option_c": "Let them know you care and suggest they talk to a trusted adult or counselor",
        "option_d": "Post about it on social media so others can help",
        "correct_answer": "C",
        "explanation": "Withdrawal, irritability, and loss of interest can be signs of depression or other emotional difficulties. Expressing concern kindly and encouraging them to talk to someone they trust is a supportive and helpful response.",
        "status": "verified"
      },
      {
        "id": "prod-010",
        "category": "Adolescent Health",
        "question_type": "multiple_choice",
        "question_text": "What is the best way to handle peer pressure to try something you are uncomfortable with?",
        "option_a": "Go along with it so your friends do not get upset",
        "option_b": "Make up an elaborate excuse to avoid the situation",
        "option_c": "Suggest a different activity that everyone can enjoy",
        "option_d": "Stop being friends with anyone who pressures you",
        "correct_answer": "C",
        "explanation": "Suggesting an alternative activity is a confident and constructive way to handle peer pressure. It shows you have boundaries while still being open to spending time with friends.",
        "status": "verified"
      },
      {
        "id": "prod-011",
        "category": "Adolescent Health",
        "question_type": "true_or_false",
        "question_text": "Spending more than 3 hours a day on a phone can negatively affect a teenagers mental health.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "A",
        "explanation": "Research shows that excessive screen time — especially on social media — is linked to higher rates of anxiety and depression in teenagers. Setting healthy limits on phone use can help protect your mental well-being.",
        "status": "verified"
      },
      {
        "id": "prod-012",
        "category": "Adolescent Health",
        "question_type": "scenario",
        "question_text": "A friend tells you they have been skipping meals to lose weight quickly before a school event. What is the best response?",
        "option_a": "Tell them that is a great idea and you should try it too",
        "option_b": "Suggest they talk to a doctor or nutritionist about healthy ways to feel good about their body",
        "option_c": "Ignore it because it is their choice",
        "option_d": "Tell everyone at school so they can help",
        "correct_answer": "B",
        "explanation": "Skipping meals is not a safe or effective way to manage weight and can lead to serious health problems. Encouraging your friend to speak with a health professional and focusing on feeling healthy rather than looking a certain way is the most caring approach.",
        "status": "verified"
      },
      {
        "id": "prod-013",
        "category": "Adolescent Health",
        "question_type": "multiple_choice",
        "question_text": "Which of the following is the most effective way to manage stress as a teenager?",
        "option_a": "Keeping all your worries to yourself",
        "option_b": "Talking to someone you trust and finding healthy outlets like exercise or hobbies",
        "option_c": "Staying up late to finish all your tasks at once",
        "option_d": "Ignoring the problem until it goes away",
        "correct_answer": "B",
        "explanation": "Talking about what is bothering you and staying active through exercise or hobbies are proven ways to reduce stress. Keeping problems bottled up or ignoring them usually makes stress worse over time.",
        "status": "verified"
      },
      {
        "id": "prod-014",
        "category": "Adolescent Health",
        "question_type": "true_or_false",
        "question_text": "Boys do not experience emotional changes during puberty.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "B",
        "explanation": "Boys experience significant emotional changes during puberty, including mood swings, increased sensitivity, and new feelings. Hormonal changes affect everyone — not just girls — and all of these reactions are completely normal.",
        "status": "verified"
      },
      {
        "id": "prod-015",
        "category": "General Health",
        "question_type": "multiple_choice",
        "question_text": "How much water should a teenager aim to drink each day?",
        "option_a": "1-2 glasses",
        "option_b": "3-4 glasses",
        "option_c": "6-8 glasses",
        "option_d": "12 or more glasses",
        "correct_answer": "C",
        "explanation": "Most teenagers should aim for about 6 to 8 glasses of water a day. Staying hydrated helps your body function properly, supports concentration, and keeps your skin and organs healthy.",
        "status": "verified"
      },
      {
        "id": "prod-016",
        "category": "General Health",
        "question_type": "true_or_false",
        "question_text": "Washing your hands with soap and water is one of the best ways to prevent getting sick.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "A",
        "explanation": "Handwashing with soap and water removes germs that can cause infections. It is one of the simplest and most effective ways to protect yourself and others from illness, especially before eating and after using the bathroom.",
        "status": "verified"
      },
      {
        "id": "prod-017",
        "category": "General Health",
        "question_type": "scenario",
        "question_text": "You have a mild fever and a runny nose. Your parent suggests staying home from school. What is the best reason to agree?",
        "option_a": "To avoid getting your friends sick and to let your body rest and recover",
        "option_b": "Because you do not want to do schoolwork",
        "option_c": "Because your parent always says no to everything",
        "option_d": "Because your friends will miss you",
        "correct_answer": "A",
        "explanation": "Staying home when you are sick helps prevent spreading germs to classmates and teachers. Rest also gives your body the energy it needs to fight the infection and recover more quickly.",
        "status": "verified"
      },
      {
        "id": "prod-018",
        "category": "General Health",
        "question_type": "multiple_choice",
        "question_text": "Which of the following is the healthiest snack choice?",
        "option_a": "A bag of chips and a soda",
        "option_b": "Fresh fruit with a handful of nuts",
        "option_c": "A candy bar and juice",
        "option_d": "Fried noodles with extra sauce",
        "correct_answer": "B",
        "explanation": "Fresh fruit and nuts provide natural vitamins, minerals, and healthy fats that fuel your body and brain. Processed snacks are often high in sugar and salt, which can cause energy crashes and do not support good health.",
        "status": "verified"
      },
      {
        "id": "prod-019",
        "category": "General Health",
        "question_type": "true_or_false",
        "question_text": "Cracking your knuckles will cause arthritis when you are older.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "B",
        "explanation": "There is no scientific evidence that cracking your knuckles causes arthritis. The popping sound is just gas bubbles in the joint fluid. While it may not be the best habit, it does not damage your joints in the long run.",
        "status": "verified"
      },
      {
        "id": "prod-020",
        "category": "General Health",
        "question_type": "scenario",
        "question_text": "You cut your finger while cooking and it is bleeding. What is the correct first step?",
        "option_a": "Cover it tightly with a bandage without cleaning it",
        "option_b": "Rinse it under clean running water and apply gentle pressure with a clean cloth",
        "option_c": "Put toothpaste on it to stop the bleeding",
        "option_d": "Ignore it and keep cooking",
        "correct_answer": "B",
        "explanation": "Rinsing a wound under clean running water helps remove dirt and bacteria. Applying gentle pressure with a clean cloth stops the bleeding, and then you can cover it with a bandage to keep it protected.",
        "status": "verified"
      },
      {
        "id": "prod-021",
        "category": "General Health",
        "question_type": "multiple_choice",
        "question_text": "How often should teenagers brush their teeth?",
        "option_a": "Once a day",
        "option_b": "Twice a day — morning and night",
        "option_c": "Only after eating sweets",
        "option_d": "Once a week",
        "correct_answer": "B",
        "explanation": "Brushing your teeth twice a day — once in the morning and once before bed — removes plaque and prevents cavities and gum disease. Using fluoride toothpaste and flossing daily adds extra protection for your teeth and gums.",
        "status": "verified"
      },
      {
        "id": "prod-022",
        "category": "General Health",
        "question_type": "true_or_false",
        "question_text": "Vaccines are important for protecting both yourself and the people around you.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "A",
        "explanation": "Vaccines help your immune system fight off serious diseases. When enough people are vaccinated, it creates community protection that helps keep people who cannot get vaccinated — like those with certain health conditions — safe as well.",
        "status": "verified"
      },
      {
        "id": "prod-023",
        "category": "Sexual and Reproductive Health",
        "question_type": "multiple_choice",
        "question_text": "What does consent mean in a healthy relationship?",
        "option_a": "Agreeing to something because you feel pressured",
        "option_b": "Freely and clearly agreeing to something without being forced or guilted",
        "option_c": "Going along with what the other person wants without saying anything",
        "option_d": "Only saying yes once so it applies to everything in the future",
        "correct_answer": "B",
        "explanation": "Consent means giving clear, enthusiastic agreement without any pressure, manipulation, or coercion. It must be given freely every time, and anyone can change their mind at any point — that is always okay.",
        "status": "verified"
      },
      {
        "id": "prod-024",
        "category": "Sexual and Reproductive Health",
        "question_type": "true_or_false",
        "question_text": "Using condoms is an effective way to reduce the risk of getting or spreading most STIs.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "A",
        "explanation": "Condoms are one of the most effective tools for reducing the risk of STIs when used correctly and consistently. They create a barrier that prevents the exchange of bodily fluids where many infections are transmitted.",
        "status": "verified"
      },
      {
        "id": "prod-025",
        "category": "Sexual and Reproductive Health",
        "question_type": "scenario",
        "question_text": "Someone you are dating pressures you to do something sexual you are not ready for. What is the best response?",
        "option_a": "Do it so they do not leave you",
        "option_b": "Tell them clearly that you are not ready and that a respectful partner will understand",
        "option_c": "Pretend to feel sick to avoid the situation",
        "option_d": "Post about it on social media to get advice",
        "correct_answer": "B",
        "explanation": "A healthy relationship is built on respect and understanding. You always have the right to say no, and anyone who truly cares about you will respect your boundaries without pressuring you.",
        "status": "verified"
      },
      {
        "id": "prod-026",
        "category": "Sexual and Reproductive Health",
        "question_type": "multiple_choice",
        "question_text": "Which of the following is true about puberty?",
        "option_a": "It only happens to girls",
        "option_b": "It only happens to boys",
        "option_c": "It happens to all people and involves physical and emotional changes",
        "option_d": "It only happens during childhood",
        "correct_answer": "C",
        "explanation": "Puberty is a natural process that happens to all people, involving changes to the body and emotions. These changes are driven by hormones and occur at different times and paces for everyone.",
        "status": "verified"
      },
      {
        "id": "prod-027",
        "category": "Sexual and Reproductive Health",
        "question_type": "true_or_false",
        "question_text": "You should feel embarrassed about asking a doctor or health worker questions about your body.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "B",
        "explanation": "Doctors and health professionals are trained to answer questions about your body without judgment. Asking questions is a sign of maturity and helps you take charge of your own health.",
        "status": "verified"
      },
      {
        "id": "prod-028",
        "category": "Sexual and Reproductive Health",
        "question_type": "scenario",
        "question_text": "A friend shares a rumor they heard online about how STIs spread. It sounds scary but may not be accurate. What should you do?",
        "option_a": "Share the rumor with others so they can be warned",
        "option_b": "Suggest you both look up reliable information from a health source or trusted adult",
        "option_c": "Ignore it because it is probably true",
        "option_d": "Stop being friends with them for spreading misinformation",
        "correct_answer": "B",
        "explanation": "It is important to get health information from reliable sources like doctors, health workers, or trusted health organizations. Checking facts together helps both of you learn the truth and avoid unnecessary fear or stigma.",
        "status": "verified"
      },
      {
        "id": "prod-029",
        "category": "Sexual and Reproductive Health",
        "question_type": "multiple_choice",
        "question_text": "What is the best way to protect your reproductive health as a teenager?",
        "option_a": "Avoid talking about it because it is embarrassing",
        "option_b": "Learn the facts, ask questions, and make informed choices",
        "option_c": "Rely only on what friends tell you",
        "option_d": "Wait until you are an adult to learn anything about it",
        "correct_answer": "B",
        "explanation": "Being informed about your body and reproductive health helps you make safe and confident choices. Learning from trusted sources and asking questions is the best way to stay healthy and empowered.",
        "status": "verified"
      },
      {
        "id": "prod-030",
        "category": "Sexual and Reproductive Health",
        "question_type": "true_or_false",
        "question_text": "Everyone experiences puberty at the exact same age.",
        "option_a": "True",
        "option_b": "False",
        "option_c": "",
        "option_d": "",
        "correct_answer": "B",
        "explanation": "Puberty starts at different ages for different people — some begin as early as 8 and others as late as 14. There is a wide range of what is normal, so there is no need to compare yourself to others.",
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
