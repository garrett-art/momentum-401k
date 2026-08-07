// EFAST2 proxy — queries DOL Form 5500 public API
// Falls back to empty array on failure; mock data shown in app UI

function buildQuery(target) {
  if (target.type === 'zip') {
    return `spons_us_zip:${target.value}`;
  }
  return `spons_us_city:"${target.value}" AND spons_us_state:${target.state}`;
}

function parseHit(hit) {
  const s = hit._source || hit || {};
  const assets = parseFloat(
    s.net_assets || s.tot_assets_eoy_amt || s.total_assets || 0
  );
  const participants = parseInt(
    s.tot_partcp_eoy_cnt || s.tot_active_partcp_cnt || 0, 10
  );
  const avgBalance = participants > 0 ? Math.round(assets / participants) : 0;

  return {
    ein: s.sponsor_ein || s.spons_ein || '',
    company: s.sponsor_dfe_name || s.plan_name || s.spons_dfe_name || '',
    assets,
    participants,
    avgBalance,
    planYear: (s.plan_year_begin_date || s.py_start_date || '').slice(0, 4),
    provider: '',
    address: s.spons_us_address1 || s.spons_us_addr1 || '',
    city: s.spons_us_city || '',
    state: s.spons_us_state || '',
    zip: (s.spons_us_zip || s.spons_zip || '').toString().slice(0, 5),
    adminName: s.plan_admin_name || s.sponsor_dfe_name || '',
    adminPhone: s.spons_phone_num || '',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { targets } = req.body;
  const allHits = [];
  const seenEINs = new Set();

  for (const target of targets) {
    try {
      const params = new URLSearchParams({
        q: buildQuery(target),
        sort_by: 'net_assets',
        sort_order: 'desc',
        size: '25',
        dateRange: 'custom',
        startDate: '2022-01-01',
        endDate: '2024-12-31',
      });

      const url = `https://efts.dol.gov/EFTS/hits?${params}`;
      console.log(`EFAST2 query: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      console.log(`EFAST2 status: ${response.status}`);

      if (!response.ok) {
        console.error(`EFAST2 error ${response.status} for ${buildQuery(target)}`);
        continue;
      }

      const data = await response.json();
      console.log(`EFAST2 total hits: ${data.hits?.total?.value || data.hits?.total || 0}`);

      const hits = data.hits?.hits || [];
      for (const hit of hits) {
        const plan = parseHit(hit);
        if (plan.ein && !seenEINs.has(plan.ein) && plan.assets > 0 && plan.company) {
          seenEINs.add(plan.ein);
          allHits.push(plan);
        }
      }
    } catch (e) {
      console.error(`Target ${JSON.stringify(target)} failed:`, e.message);
    }
  }

  allHits.sort((a, b) => b.assets - a.assets);
  console.log(`Returning ${allHits.length} plans`);
  res.status(200).json(allHits);
}
