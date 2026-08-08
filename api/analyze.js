function buildPrompt(plan, settings) {
  const avg = plan.avgBalance || (plan.assets && plan.participants
    ? Math.round(Number(plan.assets) / Number(plan.participants)) : 0);
  const planType = Number(plan.participants) < 2000 && avg > 15000
    ? 'fee_benchmark' : 'admin_complexity';
  const excessCost = planType === 'fee_benchmark'
    ? Math.round(Number(plan.assets || 0) * (0.0128 - 0.0089)) : 0;

  return `You are an expert 401(k) plan advisor. Analyze this plan and return ONLY valid JSON, no markdown, no preamble.

Plan: ${plan.company} | EIN: ${plan.ein} | Assets: $${Number(plan.assets||0).toLocaleString()} | Participants: ${plan.participants} | Avg balance: $${avg.toLocaleString()} | Provider: ${plan.provider||'Unknown'} | Model: ${planType}

Return this exact JSON structure:
{
  "planType": "${planType}",
  "modelRationale": "one sentence why this model applies",
  "keyMetrics": {
    "estimatedTotalCostPct": ${planType==='fee_benchmark'?1.28:0},
    "estimatedTotalCostDollar": ${Math.round(Number(plan.assets||0)*0.0128)},
    "medianComparablePct": ${planType==='fee_benchmark'?0.89:0},
    "excessCostDollar": ${excessCost}
  },
  "prospectProfile": "2-3 sentences about who Matt is likely talking to",
  "postcardBridge": "exact opening line referencing the postcard",
  "anchorNumber": "key number to lead with",
  "anchorContext": "one sentence explaining that number",
  "callArc": ["step 1","step 2","step 3","step 4"],
  "talkingPoints": ["point 1","point 2","point 3","point 4","point 5"],
  "questionsToAsk": ["question 1","question 2","question 3"],
  "potentialObjections": [
    {"objection":"text","response":"text"},
    {"objection":"text","response":"text"}
  ],
  "erisa404Line": "one plain sentence about personal ERISA fiduciary duty",
  "solutionText": "2-3 sentences on what a better plan looks like"
}`;
}

export default async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' });
  }

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
      const errText = await response.text();
      return res.status(500).json({ error: `Anthropic API error ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    
    let result;
    try {
      result = JSON.parse(clean);
    } catch (parseErr) {
      return res.status(500).json({ error: `JSON parse failed: ${parseErr.message}`, raw: text.slice(0, 200) });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('analyze error:', err);
    res.status(500).json({ error: err.message });
  }
}
