const EFAST2_URL = 'https://efts.dol.gov/EFTS/hits';

function buildQuery(target) {
  if (target.type === 'zip') return `"${target.value}"`;
  return `"${target.value}" AND "${target.state}"`;
}

function parseHit(hit) {
  const s = hit._source || {};
  const assets = parseFloat(s.net_assets || s.total_assets || 0);
  const participants = parseInt(s.tot_partcp_eoy_cnt || s.tot_active_partcp_cnt || 0, 10);
  const avgBalance = participants > 0 ? Math.round(assets / participants) : 0;
  return {
    ein: s.sponsor_ein || '',
    company: s.sponsor_dfe_name || s.plan_name || '',
    assets, participants, avgBalance,
    planYear: s.plan_year_begin_date?.slice(0, 4) || '',
    provider: '',
    address: s.spons_us_address1 || '',
    city: s.spons_us_city || '',
    state: s.spons_us_state || '',
    zip: s.spons_us_zip || '',
    adminName: s.plan_admin_name || s.sponsor_dfe_name || '',
    adminPhone: s.spons_phone_num || '',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { targets } = req.body;
    const allHits = [];
    const seenEINs = new Set();

    for (const target of targets) {
      try {
        const params = new URLSearchParams({
          q: buildQuery(target),
          _source: 'sponsor_ein,sponsor_dfe_name,plan_name,net_assets,total_assets,tot_partcp_eoy_cnt,tot_active_partcp_cnt,plan_year_begin_date,spons_us_address1,spons_us_city,spons_us_state,spons_us_zip,plan_admin_name,spons_phone_num',
          sort_by: 'net_assets',
          sort_order: 'desc',
          size: '25',
        });

        const response = await fetch(`${EFAST2_URL}?${params}`, {
          headers: { 'User-Agent': 'MomentumWealth-Reach/1.0', 'Accept': 'application/json' },
        });

        if (!response.ok) continue;
        const data = await response.json();
        const hits = data.hits?.hits || [];

        for (const hit of hits) {
          const plan = parseHit(hit);
          if (plan.ein && !seenEINs.has(plan.ein) && plan.assets > 0 && plan.company) {
            seenEINs.add(plan.ein);
            allHits.push(plan);
          }
        }
      } catch (e) {
        console.error(`EFAST2 query failed for target ${JSON.stringify(target)}:`, e.message);
      }
    }

    allHits.sort((a, b) => b.assets - a.assets);
    res.status(200).json(allHits);
  } catch (err) {
    console.error('efast2 error:', err);
    res.status(500).json({ error: err.message });
  }
}
