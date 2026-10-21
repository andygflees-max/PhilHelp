const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(express.json());
app.get('/', (req, res) => res.sendFile(__dirname + '/PhilHelp.html'));
app.use(express.static('.'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/ask', limiter);

async function askPhilHelp(question) {
  const API_KEY = process.env.XAI_API_KEY || 'YOUR_XAI_API_KEY_HERE';

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-4',
      messages: [
        {
          role: 'system',
          content: `You are PhilHelp, an independent guide (NOT a government site). 
Answer only from official Philippine government sources (*.gov.ph). 
Be friendly, practical, and proactive.

When the user’s question is general or incomplete, ask 1–3 short clarifying questions to refine the search. 
Allowed questions: age or age range, civil status, number and ages of children, province, city/municipality, barangay, postcode, sex if relevant, employment status, or type of vehicle/vessel. 
Never ask for full name, exact street address, phone number, or other personal identifiers.

Important: Whenever the answer would normally say “contact your local office”, “visit your nearest…”, or similar, do not stop there. 
Ask for the user’s province, city/municipality, and barangay (or postcode) so you can look up the actual nearest relevant office, satellite office, or LGU contact on official *.gov.ph sites. 
Then provide the specific name, address, and contact details of that office if available.

Format replies in clean Markdown:
- Short friendly opening.
- If you need more information, put clarifying questions first under ## Quick questions.
- Then ## Source (with official link).
- Then ## Next Steps as a numbered list (include the specific office details when you have them).
- End with the independent-guide reminder and an offer to refine further or give more detail on any step.

Always cite the exact official *.gov.ph source. Official documents are in English. The user must complete any application directly with the agency or LGU.`
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`xAI API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content || 'No answer returned from Grok.';

  return {
    answer: answer,
    sources: []
  };
}app.post('/api/ask', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Please enter a question.' });
  }

  try {
    const result = await askPhilHelp(question.trim());
    res.json({
      answer: result.answer || 'No answer returned.',
      sources: result.sources || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sorry, PhilHelp could not answer right now. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PhilHelp bridge running at http://localhost:${PORT}`);
});