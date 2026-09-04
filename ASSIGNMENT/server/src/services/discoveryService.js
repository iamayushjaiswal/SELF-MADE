export async function discoverBuyers({ category = 'textiles', country = '', city = '', limit = 10, market = '' } = {}, isCancelled = () => false) {
  const targetCountry = country || 'International';
  const targetCity = city ? `${city} ` : '';
  const query = `"${category}" (importer OR buyer OR wholesaler OR distributor) -directory -b2b ${targetCity}${targetCountry} ${market}`;
  
  if (!process.env.SERP_API_KEY) {
    throw new Error('SERP_API_KEY is required in .env for discovering genuine leads via search.');
  }

  // Add a random offset so repeated searches yield new results
  const randomStart = Math.floor(Math.random() * 50);
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=${limit}&start=${randomStart}&api_key=${process.env.SERP_API_KEY}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch from SerpApi. Please check your SERP_API_KEY.');
  }

  const data = await res.json();
  const organicResults = data.organic_results || [];
  
  // Extract domains from search results
  const domains = [];
  for (const result of organicResults) {
    try {
      const resultUrl = new URL(result.link);
      let domain = resultUrl.hostname;
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }
      // Basic filter to avoid common non-company domains
      const ignoreList = [
        'amazon', 'alibaba', 'linkedin', 'facebook', 'youtube', 'instagram', 'twitter', 'wikipedia', 
        'globalsources', 'indiamart', 'yellowpages', 'yelp', 'bbb.org', 'mapquest', 'seair', 'compass', 
        'zoominfo', 'dnb.com', 'rocketreach', 'apollo.io', 'manta.com', 'panjiva', 'zauba', 'volza', 
        'tradeindia', 'thomasnet', 'kompass', 'go4worldbusiness', 'importkey', 'eximpedia', 'trademo', 
        'exportgenius', 'tradewheel', 'superpages', 'uschina.org'
      ];
      if (!ignoreList.some(ignore => domain.includes(ignore)) && !domains.includes(domain)) {
        domains.push(domain);
      }
    } catch (e) {
      // invalid URL
    }
  }

  if (domains.length === 0) {
    throw new Error('Could not find any suitable company domains from the search results.');
  }

  if (!process.env.SNOV_CLIENT_ID || !process.env.SNOV_CLIENT_SECRET) {
    throw new Error('SNOV_CLIENT_ID and SNOV_CLIENT_SECRET are required in .env to find emails for the discovered companies.');
  }

  const allLeads = [];
  // Use Apollo.io to find emails for each discovered domain
  console.log(`Discovered ${domains.length} domains from SerpApi:`, domains);
  for (const domain of domains) {
    if (allLeads.length >= limit) break;
    if (isCancelled()) break;
    
    console.log(`Searching Snov.io for domain: ${domain}`);
    const snovLeads = await discoverFromSnov(domain, process.env.SNOV_CLIENT_ID, process.env.SNOV_CLIENT_SECRET);
    console.log(`Snov.io returned ${snovLeads ? snovLeads.length : 0} leads for ${domain}`);
    if (snovLeads && snovLeads.length > 0) {
      // Add the context to the leads
      const categorizedLeads = snovLeads.map(lead => ({
        ...lead,
        category,
        market: market || `${targetCountry} ${category} market`,
        country: lead.country || targetCountry,
      }));
      allLeads.push(...categorizedLeads);
    }
  }

  console.log(`Total leads found: ${allLeads.length}`);
  return allLeads.slice(0, limit);
}

export function classifyContact(category, country) {
  const priority = ['electronics', 'machinery'].includes(category) ? 'High-value B2B' : 'Volume trade';
  return `${priority} buyer in ${country} — ${category} import segment`;
}

export async function discoverFromSnov(domain, clientId, clientSecret) {
  if (!clientId || !clientSecret) return null;

  try {
    // 1. Get access token
    const tokenRes = await fetch('https://api.snov.io/v1/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      throw new Error(err.message || 'Failed to authenticate with Snov.io');
    }

    const { access_token } = await tokenRes.json();

    // 2. Query domain emails
    const searchRes = await fetch(`https://api.snov.io/v2/domain-emails-with-info?domain=${domain}&type=personal&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchRes.ok) {
      const err = await searchRes.json();
      throw new Error(err.message || `Snov.io API error: ${searchRes.status}`);
    }

    const data = await searchRes.json();
    const emails = data?.emails || [];

    return emails.map((entry) => {
      let contactName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
      return {
        companyName: data.companyName || domain,
        contactName: contactName || 'Unknown',
        email: entry.email,
        website: `https://${domain}`,
        country: data.country || '',
        category: entry.position || 'General',
        source: 'snov.io',
        aiClassification: classifyContact('general', data.country || 'International'),
      };
    });
  } catch (err) {
    throw new Error(`Snov.io integration error: ${err.message}`);
  }
}

export async function classifyWithAI(text, apiKey, model = process.env.GENAI_MODEL || 'gemini-2.0-flash-lite') {
  if (!apiKey) {
    return classifyContact('general', 'International');
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Classify this export buyer contact in one short sentence for outreach prioritization: ${text}`,
          }],
        }],
      }),
    });

    if (!res.ok) return classifyContact('general', 'International');
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || classifyContact('general', 'International');
  } catch {
    return classifyContact('general', 'International');
  }
}
