import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { targets } = req.body;
    const allHits = [];
    const seenEINs = new Set();

    for (const target of targets) {
      let query = supabase
        .from('plans_5500')
        .select('*')
        .order('assets', { ascending: false })
        .limit(30);

      if (target.type === 'zip') {
        query = query.eq('zip', target.value);
      } else {
        query = query.ilike('city', target.value).eq('state', target.state);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Query error for ${JSON.stringify(target)}:`, error.message);
        continue;
      }

      for (const row of (data || [])) {
        if (!row.ein || seenEINs.has(row.ein)) continue;
        seenEINs.add(row.ein);
        allHits.push({
          ein:          row.ein,
          company:      row.company,
          assets:       Number(row.assets || 0),
          participants: Number(row.participants || 0),
          avgBalance:   Number(row.avg_balance || 0),
          planYear:     row.plan_year || '',
          provider:     '',
          address:      row.address || '',
          city:         row.city || '',
          state:        row.state || '',
          zip:          row.zip || '',
          adminName:    row.admin_name || '',
          adminPhone:   row.admin_phone || '',
        });
      }
    }

    allHits.sort((a, b) => b.assets - a.assets);
    res.status(200).json(allHits);
  } catch (err) {
    console.error('efast2 error:', err);
    res.status(500).json({ error: err.message });
  }
}
