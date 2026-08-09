function buildPrompt(plan, settings) {
  const avg = plan.avgBalance || (plan.assets && plan.participants
    ? Math.round(Number(plan.assets) / Number(plan.participants)) : 0);
  const assets = Number(plan.assets || 0);
  const parts = Number(plan.participants || 1);
  const partsPerMillion = assets > 0 ? Math.round(parts / (assets / 1e6)) : 0;
  const excessCost = Math.round(assets * (0.0128 - 0.0089));

  return `You are an expert 401(k) plan advisor preparing a prospecting analysis for ${settings.name || 'Matt'} at Momentum Wealth Management.

Plan data:
- Company: ${plan.company}
- EIN: ${plan.ein}
- Assets: $${assets.toLocaleString()}
- Participants: ${parts}
- Participants per $1M in assets: ${partsPerMillion}
- Plan year: ${plan.planYear}
- Provider: ${plan.provider || 'Unknown'}

Return ONLY valid JSON, no markdown, no preamble:
{
  "keyMetrics": {
    "estimatedTotalCostPct": 1.28,
    "estimatedTotalCostDollar": ${Math.round(assets * 0.0128)},
    "medianComparablePct": 0.89,
    "excessCostDollar": ${excessCost}
  },
  "prospectProfile": "2-3 sentences about who Matt is likely talking to and what they care about",
  "postcardBridge": "the exact opening line Matt says when they pick up the phone referencing the postcard",
  "anchorNumber": "the key fee number to lead with e.g. $31,338/yr",
  "anchorContext": "one sentence explaining what that excess cost number means",
  "diagnosticNote": "1-2 sentences flagging anything Matt should know before the call — if the fee story is strong, say so briefly; if the plan has many participants relative to assets suggesting a workforce-heavy employer where the dollar figure may be modest, flag that and suggest leaning on ERISA fiduciary framing instead; if it's an owner-dominated professional practice, note that the excess cost likely understates the real drag on the owner's balance",
  "callArc": ["step 1","step 2","step 3","step 4"],
  "talkingPoints": ["point 1","point 2","point 3","point 4","point 5"],
  "questionsToAsk": ["question 1","question 2","question 3"],
  "potentialObjections": [
    {"objection":"text","response":"text"},
    {"objection":"text","response":"text"}
  ],
  "erisa404Line": "one plain-spoken sentence about their personal ERISA fiduciary duty",
  "solutionText": "2-3 sentences on what a better plan looks like for this employer"
}`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel' });

  try {
    const { plan, settings } = req.body;
    if (!plan) return res.status(400).json({ error: 'Missing plan data' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: buildPrompt(plan, settings || {}) }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `Anthropic error ${response.status}: ${err}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();

    let result;
    try { result = JSON.parse(clean); }
    catch (e) { return res.status(500).json({ error: `JSON parse failed: ${e.message}` }); }

    res.status(200).json(result);
  } catch (err) {
    console.error('analyze error:', err);
    res.status(500).json({ error: err.message });
  }
}
