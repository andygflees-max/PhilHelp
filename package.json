const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(express.json());
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
Always cite the exact source with a link. 
Provide numbered Next Steps that can be printed or emailed. 
Format your reply in clean Markdown:
- Use a short friendly opening paragraph.
- Use a level-2 heading for the source (## Source).
- Use a level-2 heading for next steps (## Next Steps) followed by a numbered list.
- Put each next step on its own line.
Be friendly and helpful. 
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