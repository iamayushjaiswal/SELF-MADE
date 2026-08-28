export async function discoverBuyers({ category = 'textiles', country = '', limit = 10, market = '' } = {}, isCancelled = () => false) {
  const targetCountry = country || 'International';
  const query = `${category} importers buyers companies ${targetCountry} ${market}`;
  
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
      const ignoreList = ['amazon', 'alibaba', 'linkedin', 'facebook', 'youtube', 'instagram', 'twitter', 'wikipedia', 'globalsources', 'indiamart'];
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

  if (!process.env.HUNTER_API_KEY) {
    throw new Error('HUNTER_API_KEY is required in .env to find emails for the discovered companies.');
  }

  const allLeads = [];
  // Use Hunter.io to find emails for each discovered domain
  console.log(`Discovered ${domains.length} domains from SerpApi:`, domains);
  for (const domain of domains) {
    if (allLeads.length >= limit) break;
    if (isCancelled()) break;
    
    console.log(`Searching Hunter for domain: ${domain}`);
    const hunterLeads = await discoverFromHunter(domain, process.env.HUNTER_API_KEY);
    console.log(`Hunter returned ${hunterLeads ? hunterLeads.length : 0} leads for ${domain}`);
    if (hunterLeads && hunterLeads.length > 0) {
      // Add the context to the leads
      const categorizedLeads = hunterLeads.map(lead => ({
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

export async function discoverFromHunter(domain, apiKey) {
  if (!apiKey) return null;

  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    try {
      const errorData = await res.json();
      const errorMessage = errorData?.errors?.[0]?.details || errorData?.errors?.[0]?.id || `Hunter API error: ${res.status}`;
      throw new Error(errorMessage);
    } catch (e) {
      if (e.message && e.message.includes('Hunter')) {
        throw e;
      }
      throw new Error(`Hunter API request failed with status: ${res.status}`);
    }
  }

  const data = await res.json();
  const emails = data?.data?.emails || [];

  return emails.slice(0, 10).map((entry) => ({
    companyName: data.data.organization || domain,
    contactName: `${entry.first_name || ''} ${entry.last_name || ''}`.trim() || 'Unknown',
    email: entry.value,
    website: `https://${domain}`,
    country: entry.country || '',
    category: entry.position || 'General',
    source: 'hunter.io',
    aiClassification: classifyContact('general', entry.country || 'International'),
  }));
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
