/**
 * MayaApp CDC — Instagram Data Fetcher
 * 
 * Puxa dados do Instagram via Windsor.ai REST API,
 * faz merge com dados históricos existentes e gera data.json atualizado.
 * 
 * Executado diariamente pelo GitHub Actions.
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.WINDSOR_API_KEY;
const BASE_URL = 'https://connectors.windsor.ai/all';
const ACCOUNT_ID = '17841480695293760';
const DATA_FILE = path.join(__dirname, '..', 'data.json');

// Número de dias de histórico diário para manter
const DAILY_HISTORY_DAYS = 90;

if (!API_KEY) {
  console.error('❌ WINDSOR_API_KEY não definida. Configure como secret no GitHub.');
  process.exit(1);
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

async function windsorFetch(fields, extraParams = {}) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    connector: 'instagram',
    fields: Array.isArray(fields) ? fields.join(',') : fields,
    accounts: ACCOUNT_ID,
    ...extraParams,
  });

  const url = `${BASE_URL}?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Windsor API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  // Windsor.ai retorna { data: [...] } ou diretamente [...]
  return json.data || json;
}

function dateStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function loadExistingData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mergeDaily(existingDaily, newDaily) {
  const map = new Map();
  
  // Existing data first (preserva histórico)
  for (const row of (existingDaily || [])) {
    map.set(row.date, row);
  }
  
  // New data sobrescreve (dados mais recentes da API)
  for (const row of newDaily) {
    map.set(row.date, row);
  }

  // Ordena por data e mantém apenas os últimos DAILY_HISTORY_DAYS dias
  const cutoff = dateStr(DAILY_HISTORY_DAYS);
  return Array.from(map.values())
    .filter(r => r.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// -------------------------------------------------------------------
// Data fetchers
// -------------------------------------------------------------------

async function fetchDailyMetrics() {
  console.log('📈 Buscando métricas diárias da conta...');
  
  const fields = [
    'date', 'reach', 'likes', 'comments', 'saves', 'shares',
    'total_interactions', 'views', 'accounts_engaged', 'follower_count_1d'
  ];

  const raw = await windsorFetch(fields, {
    date_from: dateStr(30),
    date_to: dateStr(1), // Exclui hoje (dados incompletos)
  });

  return raw
    .filter(r => r.date) // Filtra linhas sem data
    .map(r => ({
      date: r.date,
      reach: r.reach || 0,
      likes: r.likes || 0,
      comments: r.comments || 0,
      saves: r.saves || 0,
      shares: r.shares || 0,
      total_interactions: r.total_interactions || 0,
      views: r.views || 0,
      accounts_engaged: r.accounts_engaged || 0,
      new_followers: r.follower_count_1d || 0,
    }));
}

async function fetchAccountInfo() {
  console.log('👤 Buscando info da conta...');
  
  const fields = ['followers_count', 'follows_count', 'media_count'];
  const raw = await windsorFetch(fields);
  
  const row = Array.isArray(raw) ? raw[0] : raw;
  return {
    followers_count: row?.followers_count || null,
    follows_count: row?.follows_count || null,
    media_count: row?.media_count || null,
  };
}

async function fetchPosts() {
  console.log('📸 Buscando métricas de posts...');
  
  const fields = [
    'timestamp', 'media_type', 'media_caption', 'media_permalink',
    'media_url', 'media_thumbnail_url',
    'media_engagement', 'media_reach', 'media_saved', 'media_shares',
    'media_views', 'media_like_count', 'media_comments_count', 'media_follows'
  ];

  // Puxa posts dos últimos 90 dias para ter histórico
  const raw = await windsorFetch(fields, {
    date_from: dateStr(90),
  });

  return raw
    .filter(r => r.timestamp) // Filtra linhas sem timestamp
    .map(r => ({
      timestamp: r.timestamp,
      type: r.media_type || 'IMAGE',
      caption: r.media_caption || '',
      permalink: r.media_permalink || '',
      media_url: r.media_url || r.media_thumbnail_url || null,
      metrics: {
        reach: r.media_reach || 0,
        engagement: r.media_engagement || 0,
        saves: r.media_saved || 0,
        shares: r.media_shares || 0,
        views: r.media_views || 0,
        likes: r.media_like_count || 0,
        comments: r.media_comments_count || 0,
        follows: r.media_follows || null,
      }
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

async function fetchAudience() {
  console.log('🎯 Buscando dados de audiência...');
  
  try {
    // Gender
    const genderRaw = await windsorFetch(['audience_gender_name', 'audience_gender_size']);
    const gender = (Array.isArray(genderRaw) ? genderRaw : [])
      .filter(r => r.audience_gender_name)
      .map(r => ({ name: r.audience_gender_name, size: r.audience_gender_size }));

    // Age
    const ageRaw = await windsorFetch(['audience_age_name', 'audience_age_size']);
    const age = (Array.isArray(ageRaw) ? ageRaw : [])
      .filter(r => r.audience_age_name)
      .map(r => ({ name: r.audience_age_name, size: r.audience_age_size }));

    // Cities
    const cityRaw = await windsorFetch(['city', 'audience_city_size']);
    const cities = (Array.isArray(cityRaw) ? cityRaw : [])
      .filter(r => r.city)
      .map(r => ({ name: r.city, size: r.audience_city_size }))
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, 10);

    // Countries
    const countryRaw = await windsorFetch(['audience_country_name', 'audience_country_size']);
    const countries = (Array.isArray(countryRaw) ? countryRaw : [])
      .filter(r => r.audience_country_name)
      .map(r => ({ name: r.audience_country_name, size: r.audience_country_size }))
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, 10);

    const available = gender.length > 0 || age.length > 0;
    
    return { available, gender, age, cities, countries };
  } catch (err) {
    console.warn('⚠️  Dados de audiência indisponíveis (< 100 seguidores?):', err.message);
    return {
      available: false,
      min_followers_required: 100,
      gender: [],
      age: [],
      cities: [],
      countries: [],
    };
  }
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------

async function main() {
  console.log('🚀 Iniciando fetch de dados Instagram — MayaApp CDC');
  console.log(`📅 Data: ${new Date().toISOString()}`);
  console.log('');

  const existing = loadExistingData();

  const [dailyMetrics, accountInfo, posts, audience] = await Promise.all([
    fetchDailyMetrics(),
    fetchAccountInfo(),
    fetchPosts(),
    fetchAudience(),
  ]);

  // Merge daily metrics com histórico existente
  const mergedDaily = mergeDaily(existing?.daily_metrics, dailyMetrics);

  // Preserva followers_count histórico se account retornar null
  // (o campo followers_count só retorna o valor de "hoje")
  const followersHistory = existing?.followers_history || {};
  if (accountInfo.followers_count) {
    followersHistory[dateStr(0)] = accountInfo.followers_count;
  }

  const data = {
    meta: {
      last_updated: new Date().toISOString(),
      account_id: ACCOUNT_ID,
      account_name: 'MayaApp CDC (mayaapp.cdc)',
    },
    account: accountInfo,
    followers_history: followersHistory,
    daily_metrics: mergedDaily,
    posts: posts,
    audience: audience,
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

  console.log('');
  console.log('✅ data.json atualizado com sucesso!');
  console.log(`   📊 ${mergedDaily.length} dias de métricas diárias`);
  console.log(`   📸 ${posts.length} posts`);
  console.log(`   👤 ${accountInfo.followers_count || '?'} seguidores`);
  console.log(`   🎯 Audiência: ${audience.available ? 'disponível' : 'indisponível (< 100 seguidores)'}`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
