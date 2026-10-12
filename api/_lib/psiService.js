/**
 * Singapore PSI & PM2.5 Service
 * Connects to official data.gov.sg NEA APIs with in-memory caching and fallback.
 */

let cache = {
  data: null,
  timestamp: 0,
};

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache
const REQUEST_TIMEOUT_MS = 8000;

export function getPsiCategory(psi) {
  if (psi <= 50) return { category: 'Good', color: 'emerald', hex: '#10B981', desc: 'Air quality is considered satisfactory, and air pollution poses little or no risk.' };
  if (psi <= 100) return { category: 'Moderate', color: 'amber', hex: '#F59E0B', desc: 'Air quality is acceptable. A small number of individuals unusually sensitive to air pollution may face mild respiratory irritation.' };
  if (psi <= 200) return { category: 'Unhealthy', color: 'orange', hex: '#F97316', desc: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.' };
  if (psi <= 300) return { category: 'Very Unhealthy', color: 'red', hex: '#EF4444', desc: 'Health alert: The risk of health effects is increased for everyone. Sensitive groups should avoid outdoor activity.' };
  return { category: 'Hazardous', color: 'purple', hex: '#8B5CF6', desc: 'Health warning of emergency conditions: Everyone is more likely to be affected. Avoid all outdoor exertion.' };
}

export function getPm25Category(pm25) {
  if (pm25 <= 55) return { category: 'Normal', color: 'emerald', desc: 'Normal 1-hour PM2.5 concentration.' };
  if (pm25 <= 150) return { category: 'Elevated', color: 'amber', desc: 'Elevated PM2.5 concentration.' };
  if (pm25 <= 250) return { category: 'High', color: 'orange', desc: 'High PM2.5 concentration.' };
  return { category: 'Very High', color: 'red', desc: 'Very high PM2.5 concentration.' };
}

async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function fetchCurrentPsi(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cache.data && (now - cache.timestamp < CACHE_TTL_MS)) {
    return { ...cache.data, isStale: false, fromCache: true };
  }

  let psiRaw = null;
  let pm25Raw = null;
  let weatherRaw = null;
  let upstreamError = null;

  // 1. Fetch PSI (v2 with v1 fallback)
  try {
    const psiRes = await fetchWithTimeout('https://api-open.data.gov.sg/v2/real-time/api/psi');
    if (psiRes.ok) {
      const json = await psiRes.json();
      if (json.data && json.data.items && json.data.items.length > 0) {
        psiRaw = json.data;
      }
    }
  } catch (err) {
    upstreamError = err.message;
  }

  // Fallback to v1 if v2 failed or empty
  if (!psiRaw) {
    try {
      const v1Res = await fetchWithTimeout('https://api.data.gov.sg/v1/environment/psi');
      if (v1Res.ok) {
        const v1Json = await v1Res.json();
        if (v1Json.items && v1Json.items.length > 0) {
          psiRaw = {
            regionMetadata: (v1Json.region_metadata || []).map(r => ({
              name: r.name,
              labelLocation: r.label_location
            })),
            items: v1Json.items
          };
        }
      }
    } catch (err) {
      upstreamError = upstreamError || err.message;
    }
  }

  // 2. Fetch 1-hr PM2.5
  try {
    const pmRes = await fetchWithTimeout('https://api-open.data.gov.sg/v2/real-time/api/pm25', {}, 4000);
    if (pmRes.ok) {
      const json = await pmRes.json();
      if (json.data && json.data.items && json.data.items.length > 0) {
        pm25Raw = json.data;
      }
    }
  } catch (e) {
    // PM2.5 v1 fallback
    try {
      const v1pmRes = await fetchWithTimeout('https://api.data.gov.sg/v1/environment/pm25', {}, 4000);
      if (v1pmRes.ok) {
        const json = await v1pmRes.json();
        if (json.items && json.items.length > 0) {
          pm25Raw = { items: json.items };
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // 3. Fast secondary weather fetch (temperature, humidity, wind) - non-blocking
  try {
    const [tempRes, rhRes, windRes] = await Promise.allSettled([
      fetchWithTimeout('https://api-open.data.gov.sg/v2/real-time/api/air-temperature', {}, 3000),
      fetchWithTimeout('https://api-open.data.gov.sg/v2/real-time/api/relative-humidity', {}, 3000),
      fetchWithTimeout('https://api-open.data.gov.sg/v2/real-time/api/wind-speed', {}, 3000),
    ]);

    let temp = null, rh = null, wind = null;
    if (tempRes.status === 'fulfilled' && tempRes.value.ok) {
      const tJson = await tempRes.value.json();
      const readings = tJson.data?.readings?.[0]?.data || [];
      if (readings.length) {
        const vals = readings.map(r => r.value).filter(v => typeof v === 'number');
        if (vals.length) temp = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }
    }
    if (rhRes.status === 'fulfilled' && rhRes.value.ok) {
      const rJson = await rhRes.value.json();
      const readings = rJson.data?.readings?.[0]?.data || [];
      if (readings.length) {
        const vals = readings.map(r => r.value).filter(v => typeof v === 'number');
        if (vals.length) rh = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }
    if (windRes.status === 'fulfilled' && windRes.value.ok) {
      const wJson = await windRes.value.json();
      const readings = wJson.data?.readings?.[0]?.data || [];
      if (readings.length) {
        const vals = readings.map(r => r.value).filter(v => typeof v === 'number');
        if (vals.length) wind = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }
    }
    weatherRaw = { temperature: temp, relativeHumidity: rh, windSpeed: wind };
  } catch {
    weatherRaw = null;
  }

  // If live fetch failed, return cached data marked as stale
  if (!psiRaw) {
    if (cache.data) {
      return {
        ...cache.data,
        isStale: true,
        staleReason: upstreamError || 'Upstream official API temporarily unreachable; displaying cached observations.',
      };
    }
    throw new Error(`Official air quality service unavailable: ${upstreamError || 'No response from upstream'}`);
  }

  // Parse items
  const items = psiRaw.items || [];
  const latestItem = items[items.length - 1] || items[0];
  const previousItem = items.length > 1 ? items[items.length - 2] : null;

  const psiReadings = latestItem.readings?.psi_twenty_four_hourly || {};
  const prevPsiReadings = previousItem?.readings?.psi_twenty_four_hourly || {};

  // Extract PM2.5 1-hour readings
  const pm25LatestItem = pm25Raw?.items?.[pm25Raw.items.length - 1] || pm25Raw?.items?.[0];
  const pm25Readings = pm25LatestItem?.readings?.pm25_one_hourly || latestItem.readings?.pm25_twenty_four_hourly || {};

  const regionNames = ['north', 'south', 'east', 'west', 'central'];
  const regions = {};
  let highest = { region: 'central', psi: -1 };
  let lowest = { region: 'central', psi: 999 };
  let sumPsi = 0;
  let countPsi = 0;

  for (const name of regionNames) {
    const psiVal = psiReadings[name] ?? 0;
    const pmVal = pm25Readings[name] ?? null;
    const prevPsi = prevPsiReadings[name] ?? null;
    const psiCat = getPsiCategory(psiVal);
    const pmCat = pmVal !== null ? getPm25Category(pmVal) : null;
    const change = prevPsi !== null ? psiVal - prevPsi : 0;

    regions[name] = {
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      psi: psiVal,
      pm25: pmVal,
      change,
      category: psiCat.category,
      color: psiCat.color,
      hex: psiCat.hex,
      categoryDescription: psiCat.desc,
      pm25Category: pmCat?.category || null,
      pm25Color: pmCat?.color || null,
    };

    if (psiVal > highest.psi) {
      highest = { region: name, displayName: name.charAt(0).toUpperCase() + name.slice(1), psi: psiVal };
    }
    if (psiVal < lowest.psi) {
      lowest = { region: name, displayName: name.charAt(0).toUpperCase() + name.slice(1), psi: psiVal };
    }
    sumPsi += psiVal;
    countPsi++;
  }

  const nationalAvg = countPsi > 0 ? Math.round(sumPsi / countPsi) : 0;
  const overallCat = getPsiCategory(highest.psi); // Official convention: overall air quality driven by highest regional index

  // Calculate overall change
  let overallChange = 0;
  if (previousItem) {
    const prevMax = Math.max(...regionNames.map(r => prevPsiReadings[r] || 0));
    overallChange = highest.psi - prevMax;
  }

  const result = {
    status: 'success',
    source: 'National Environment Agency (NEA), Singapore',
    platform: 'data.gov.sg',
    datasetUrl: 'https://data.gov.sg/datasets/d_000598f9f69718ffd6c77ae367a5d84f',
    apiEndpoint: 'https://api-open.data.gov.sg/v2/real-time/api/psi',
    licenseUrl: 'https://data.gov.sg/open-data-licence',
    timestamp: latestItem.timestamp || new Date().toISOString(),
    updatedTimestamp: latestItem.updatedTimestamp || latestItem.timestamp || new Date().toISOString(),
    isStale: false,
    fetchedAt: new Date().toISOString(),
    regions,
    summary: {
      highest,
      lowest,
      nationalAverage: nationalAvg,
      overallCategory: overallCat.category,
      overallColor: overallCat.color,
      overallHex: overallCat.hex,
      overallDescription: overallCat.desc,
      changeFromPrevious: overallChange,
    },
    pollutants: {
      pm25_twenty_four_hourly: latestItem.readings?.pm25_twenty_four_hourly || {},
      pm10_twenty_four_hourly: latestItem.readings?.pm10_twenty_four_hourly || {},
      so2_twenty_four_hourly: latestItem.readings?.so2_twenty_four_hourly || {},
      no2_one_hour_max: latestItem.readings?.no2_one_hour_max || {},
      co_eight_hour_max: latestItem.readings?.co_eight_hour_max || {},
      o3_eight_hour_max: latestItem.readings?.o3_eight_hour_max || {},
    },
    weather: weatherRaw,
  };

  cache = {
    data: result,
    timestamp: now,
  };

  return result;
}
