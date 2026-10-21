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
      model: 'grok-4',          // or 'grok-3' / latest available model
      messages: [
        {
          role: 'system',
          content: `You are PhilHelp, an independent guide (NOT a government site). 
Answer only from official Philippine government sources (*.gov.ph). 
Be friendly, practical, and proactive.

When the user’s question is general or incomplete, ask 1–3 short clarifying questions to refine the search before giving a full answer. 
Allowed questions include: age or age range of the person or dependents, civil status, number and ages of children, province and barangay (not exact address), sex if relevant to the program, employment status, or type of vehicle/vessel. 
Never ask for full name, exact street address, phone number, or other personal identifiers.

Format replies in clean Markdown:
- Short friendly opening.
- If you need more information, put the clarifying questions first under a heading ## Quick questions.
- Then give ## Source (with official link).
- Then ## Next Steps as a numbered list.
- End with the independent-guide reminder and an offer to refine further or give more detail on any step.

Always cite the exact official *.gov.ph source. Official documents are in English. The user must complete any application directly with the agency or LGU.`
Remind the user that official documents are in English and that they must complete any application directly with the agency or LGU.
After the reminder, always add a final short paragraph that offers to refine the search, give more detail, or look up related information. Example: “Would you like me to refine this, give more detail, or find related information?”
Never ask for personal details such as full name or exact address.`
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
    sources: []   // Grok returns sources inside the text; you can parse them later if desired
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