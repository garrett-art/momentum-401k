export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { transcript, plan } = await req.json();

    const prompt = `You are analyzing a sales call transcript for a 401(k) advisor.

Plan: ${plan.company} (${plan.participants} participants, $${Number(plan.assets||0).toLocaleString()} in assets)

Transcript:
${transcript}

Return ONLY a JSON object with this structure, no markdown:
{
  "callSummary": "2-3 sentence summary of what happened on the call",
  "interestLevel": "high|medium|low|none",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "nextSteps": "what was agreed or what should happen next, or 'none agreed'",
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
    const result = JSON.parse(clean);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
