const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(express.json());
app.use(express.static('.'));

// Redirect root to PhilHelp.html
app.get('/', (req, res) => res.sendFile(__dirname + '/PhilHelp.html'));

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
Prefer official Philippine government sources (*.gov.ph) and always cite them with Markdown links when you use them. 
If no exact *.gov.ph page matches the query, still give the best available official guidance, name the responsible agency, and link to its main website. Do not refuse to answer.

Reply in the language requested by the user (English, Tagalog/Filipino, Cebuano/Bisaya, or Hiligaynon/Ilonggo). If no language is specified, default to English.

CRITICAL RULE: Never ask the same question more than once. 
Ask for location (province + city/municipality + barangay or postcode) in a single combined question if needed, then stop asking for location.

Allowed clarifying questions (each only once): age or age range, civil status, number and ages of children, province/city/barangay/postcode, sex if relevant, employment status, or type of vehicle/vessel. 
Never ask for full name, exact street address, or phone number.

Always turn every website into a Markdown link, e.g. [MARINA](https://marina.gov.ph/).

Format:
- Short friendly opening.
- ## Quick questions (only if new information is still needed).
- ## Source (with links).
- ## Next Steps (numbered).
- Short independent-guide reminder.

Official documents are in English. The user must complete any application directly with the agency or LGU.`
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
}

app.post('/api/ask', async (req, res) => {
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