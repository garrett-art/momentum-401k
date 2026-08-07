export const config = { runtime: 'edge' };

const MODEL = 'claude-sonnet-4-6';

function buildPrompt(plan, settings) {
  const avg = plan.avgBalance || (plan.assets && plan.participants
    ? Math.round(Number(plan.assets) / Number(plan.participants)) : 0);
  const planType = Number(plan.participants) < 2000 && avg > 15000
    ? 'fee_benchmark' : 'admin_complexity';

  return `You are an expert 401(k) plan advisor preparing a prospecting analysis for ${settings.name || 'an advisor'} at ${settings.firm || 'Momentum Wealth Management'}.

Analyze this plan and return a JSON object with the following structure. Return ONLY valid JSON, no markdown, no preamble.

Plan data:
- Company: ${plan.company}
- EIN: ${plan.ein}
- Assets: $${Number(plan.assets || 0).toLocaleString()}
- Participants: ${plan.participants}
- Average balance: $${avg.toLocaleString()}
- Plan year: ${plan.planYear}
- Provider: ${plan.provider || 'Unknown'}
- Model type: ${planType}

Return this exact JSON structure:
{
  "planType": "${planType}",
  "modelRationale": "one sentence explaining why this model applies",
  "keyMetrics": {
    "estimatedTotalCostPct": ${planType === 'fee_benchmark' ? 1.28 : 0},
    "estimatedTotalCostDollar": ${planType === 'fee_benchmark' ? Math.round(Number(plan.assets || 0) * 0.0128) : 0},
    "medianComparablePct": ${planType === 'fee_benchmark' ? 0.89 : 0},
    "excessCostDollar": ${planType === 'fee_benchmark' ? Math.round(Number(plan.assets || 0) * (0.0128 - 0.0089)) : 0}
  },
  "prospectProfile": "2-3 sentences describing who Matt is likely talking to and what they care about",
  "postcardBridge": "the exact opening line Matt says when they pick up the phone referencing the postcard",
  "anchorNumber": "the key number to lead with (e.g. $31,338/yr)",
  "anchorContext": "one sentence explaining what that number means",
  "callArc": [
    "Step 1 description",
    "Step 2 description",
    "Step 3 description",
    "Step 4 description"
  ],
  "talkingPoints": [
    "talking point 1",
    "talking point 2",
    "talking point 3",
    "talking point 4",
    "talking point 5"
  ],
  "questionsToAsk": [
    "question 1",
    "question 2",
    "question 3"
  ],
  "potentialObjections": [
    {"objection": "objection text", "response": "response text"},
    {"objection": "objection text", "response": "response text"}
  ],
  "erisa404Line": "one plain-spoken sentence about their personal ERISA fiduciary duty",
  "solutionText": "2-3 sentences describing what a better plan looks like for this specific employer"
}`;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { plan, settings } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: buildPrompt(plan, settings) }],
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
    console.error('analyze error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
