export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { transcript, plan } = req.body;

    const prompt = `Analyze this 401(k) sales call transcript. Return ONLY valid JSON, no markdown.

Plan: ${plan.company} (${plan.participants} participants, $${Number(plan.assets||0).toLocaleString()} assets)

Transcript:
${transcript}

Return:
{
  "callSummary": "2-3 sentence summary",
  "interestLevel": "high|medium|low|none",
  "keyPoints": ["point 1","point 2","point 3"],
  "nextSteps": "what was agreed or none agreed",
  "objections": ["any objections raised"],
  "positives": ["any positive signals"]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    res.status(200).json(JSON.parse(clean));
  } catch (err) {
    console.error('transcript error:', err);
    res.status(500).json({ error: err.message });
  }
}
