const BASE = 'https://www.sofascore.com/api/v1'; // Match-detail fallback only
const LIVESCORE_BASE = 'https://prod-cdn-mev-api.livescore.com/v1/api/app';
const ALIASES = {
  QAT:['qatar','catar'], PAN:['panama','panama'], EGY:['egypt','egipto'], GRE:['greece','grecia'],
  KOR:['south korea','korea republic','republic of korea','korea','corea del sur','corea republicana'], UGA:['uganda'], NCL:['new caledonia','nueva caledonia'],
  ECU:['ecuador'], ARG:['argentina'], AUS:['australia'], MOZ:['mozambique','mozambique'], DEN:['denmark','dinamarca'],
  FRA:['france','francia'], HAI:['haiti','haiti'], KSA:['saudi arabia','arabia saudita','saudi arabia'], URU:['uruguay'],
  ITA:['italy','italia'], JAM:['jamaica'], CIV:['ivory coast','cote d ivoire','costa de marfil'], UZB:['uzbekistan','uzbekistan'],
  SEN:['senegal'], CRO:['croatia','croacia'], CUB:['cuba'], TJK:['tajikistan','tayikistan'],
  MLI:['mali'], NZL:['new zealand','nueva zelanda'], BEL:['belgium','belgica'], VIE:['vietnam'],
  ESP:['spain','espana'], CHN:['china'], FIJ:['fiji','fiyi'], MAR:['morocco','marruecos'],
  BRA:['brazil','brasil'], IRL:['ireland','republic of ireland','republica de irlanda'], TAN:['tanzania'],
  CRC:['costa rica'], DOM:['dominican republic','republica dominicana'], MNE:['montenegro'], CHI:['chile'],
  ALG:['algeria','argelia'], MEX:['mexico'], ROU:['romania','rumania'], CMR:['cameroon','camerun'],
  VEN:['venezuela'], JPN:['japan','japon'], COL:['colombia'], SRB:['serbia'], HON:['honduras']
};
function norm(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(u\s?-?\s?17|under\s?17|u17)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function sameTeam(code, actual) {
  const a = norm(actual);
  return (ALIASES[code] || []).some(name => {
    const b = norm(name);
    return a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ');
  });
}
async function getJson(path) {
  const response = await fetch(BASE + path, {
    headers: {
      'Accept': 'application/json',
      'Referer': 'https://www.sofascore.com/',
      'User-Agent': 'Mozilla/5.0 (compatible; FutureRadarFC/1.0; +https://www.futureradar.es)'
    }
  });
  if (!response.ok) {
    const error = new Error('SofaScore respondió ' + response.status);
    error.status = response.status;
    throw error;
  }
  return response.json();
}
function tournamentId(event) {
  return Number(event?.tournament?.uniqueTournament?.id || event?.tournament?.id || 0);
}
function statusOf(event) {
  const type = event?.status?.type || '';
  if (type === 'finished') return 'FT';
  if (type === 'inprogress') return 'LIVE';
  if (type === 'postponed') return 'POSTPONED';
  if (type === 'canceled') return 'CANCELLED';
  return 'SCHEDULED';
}
function simplify(event) {
  return {
    id: event.id,
    home: event.homeTeam?.name || '',
    away: event.awayTeam?.name || '',
    homeScore: event.homeScore?.current ?? event.homeScore?.display ?? null,
    awayScore: event.awayScore?.current ?? event.awayScore?.display ?? null,
    status: statusOf(event),
    statusDescription: event.status?.description || event.status?.type || 'Programado',
    minute: event.time?.currentPeriodStartTimestamp
      ? Math.max(0, Math.floor((Date.now() / 1000 - event.time.currentPeriodStartTimestamp) / 60))
      : (event.time?.playedSeconds ? Math.floor(event.time.playedSeconds / 60) : null),
    startTimestamp: event.startTimestamp || null,
    tournamentId: tournamentId(event),
    winnerCode: event.winnerCode || null
  };
}
function codeForTeam(name) {
  return Object.keys(ALIASES).find(code => sameTeam(code, name)) || null;
}
function liveScoreDate(event) {
  const packed = String(event?.Esd || '');
  const match = packed.match(/^(\\d{4})(\\d{2})(\\d{2})/);
  if (match) return match[1] + '-' + match[2] + '-' + match[3];
  const timestamp = event?.Etm?.ATm ? Number(event.Etm.ATm) : null;
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : null;
}
function liveScoreStatus(event) {
  const esid = Number(event?.Esid);
  const epr = Number(event?.Epr);
  if (esid === 6 || esid === 13 || epr === 2 || event?.Eps === 'FT' || event?.Eps === 'AP') return 'FT';
  if (esid === 10 || event?.Eps === 'HT') return 'LIVE';
  if ([2, 3].includes(esid) || epr === 1) return 'LIVE';
  return 'SCHEDULED';
}
function simplifyLiveScore(event, date, homeCode, awayCode) {
  const status = liveScoreStatus(event);
  const home = Array.isArray(event?.T1) ? event.T1[0] : event?.T1;
  const away = Array.isArray(event?.T2) ? event.T2[0] : event?.T2;
  return {
    id: String(event.Eid || event.Id || ''),
    home: home?.Nm || '',
    away: away?.Nm || '',
    homeScore: event.Tr1 === undefined || event.Tr1 === null || event.Tr1 === '' ? null : Number(event.Tr1),
    awayScore: event.Tr2 === undefined || event.Tr2 === null || event.Tr2 === '' ? null : Number(event.Tr2),
    status,
    statusDescription: event.Eps || (status === 'FT' ? 'FT' : status === 'LIVE' ? 'EN DIRECTO' : 'Programado'),
    minute: event.Eps && /^\\d/.test(String(event.Eps)) ? String(event.Eps).replace(/[^0-9+]/g, '') : null,
    startTimestamp: event.Etm?.ATm ? Math.floor(Number(event.Etm.ATm) / 1000) : null,
    date, homeCode, awayCode,
    sourceUrl: event.Eid ? 'https://www.livescore.com/' : null
  };
}
async function getLiveScoreDay(date) {
  const compactDate = date.replace(/-/g, '');
  const url = LIVESCORE_BASE + '/date/soccer/' + compactDate + '/1?countryCode=ES&locale=en';
  const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 FutureRadarFC/1.0' } });
  if (!response.ok) throw new Error('LiveScore respondió ' + response.status + ' para ' + date);
  return response.json();
}
function extractLiveScoreEvents(payload) {
  const root = payload?.data || payload;
  const stages = root?.Stages || root?.data?.Stages || [];
  return stages.flatMap(stage => Array.isArray(stage.Events) ? stage.Events : []);
}
async function listMatches(dates) {
  const requestedDates = new Set([...new Set(dates)].slice(0, 30));
  const payloads = await Promise.all([...requestedDates].map(date =>
    getLiveScoreDay(date).catch(error => {
      console.warn('LiveScore daily feed unavailable for ' + date + ':', error.message);
      return null;
    })
  ));
  const unique = new Map();
  for (const payload of payloads) {
    for (const event of extractLiveScoreEvents(payload)) {
      const home = Array.isArray(event.T1) ? event.T1[0] : event.T1;
      const away = Array.isArray(event.T2) ? event.T2[0] : event.T2;
      const date = liveScoreDate(event);
      if (!date || !requestedDates.has(date)) continue;
      const homeCode = codeForTeam(home?.Nm || '');
      const awayCode = codeForTeam(away?.Nm || '');
      if (!homeCode || !awayCode) continue;
      const match = simplifyLiveScore(event, date, homeCode, awayCode);
      if (match.id) unique.set(match.id, match);
    }
  }
  return [...unique.values()];
}
async function findEvent(date, home, away) {
  const matches = await listMatches([date]);
  const match = matches.find(event => event.homeCode === home && event.awayCode === away);
  if (!match) return null;
  return match;
}
async function matchDetails(eventId) {
  const [scoreboard, incidents] = await Promise.all([
    fetch('https://prod-cdn-public-api.livescore.com/v1/api/app/scoreboard/soccer/' + encodeURIComponent(eventId) + '?locale=en')
      .then(r => r.ok ? r.json() : null).catch(() => null),
    fetch('https://prod-cdn-public-api.livescore.com/v1/api/app/incidents/soccer/' + encodeURIComponent(eventId) + '?locale=en')
      .then(r => r.ok ? r.json() : null).catch(() => null)
  ]);
  const event = scoreboard?.Event || scoreboard?.event || scoreboard;
  return {
    event: event ? {
      id: String(event.Eid || eventId),
      home: (Array.isArray(event.T1) ? event.T1[0] : event.T1)?.Nm || '',
      away: (Array.isArray(event.T2) ? event.T2[0] : event.T2)?.Nm || '',
      homeScore: event.Tr1 === undefined ? null : Number(event.Tr1),
      awayScore: event.Tr2 === undefined ? null : Number(event.Tr2),
      status: liveScoreStatus(event),
      statusDescription: event.Eps || 'Programado'
    } : null,
    statistics: null,
    lineups: null,
    incidents: incidents?.Incs || incidents?.incidents || [],
    source: 'LiveScore public match centre',
    sourceType: 'unofficial_public_endpoint',
    updatedAt: new Date().toISOString()
  };
}
module.exports = async (req, res) => {
  const details = String(req.query.details || '') === '1';
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', details ? 'public, s-maxage=25, stale-while-revalidate=45' : 'public, s-maxage=45, stale-while-revalidate=90');
  if (req.method !== 'GET') return res.status(405).json({ available: false, message: 'Método no permitido.' });
  try {
    if (String(req.query.list || '') === '1') {
      const dates = String(req.query.dates || '').split(',').filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value));
      if (!dates.length) return res.status(400).json({ available: false, message: 'Faltan las fechas del calendario.' });
      const matches = await listMatches(dates);
      return res.status(200).json({ available: true, matches, source: 'LiveScore', sourceType: 'unofficial_public_endpoint', updatedAt: new Date().toISOString() });
    }
    const date = String(req.query.date || '');
    const home = String(req.query.home || '').toUpperCase();
    const away = String(req.query.away || '').toUpperCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !ALIASES[home] || !ALIASES[away]) {
      return res.status(400).json({ available: false, message: 'Fecha o selecciones no válidas.' });
    }
    const event = await findEvent(date, home, away);
    if (!event) return res.status(200).json({
      available: false, covered: false, source: 'LiveScore',
      message: 'LiveScore todavía no ofrece una ficha identificable para este partido. Conservamos el calendario oficial y no inventamos resultados.'
    });
    if (details) {
      const data = await matchDetails(event.id);
      return res.status(200).json({ available: true, ...data });
    }
    return res.status(200).json({ available: true, match: event, source: 'LiveScore', sourceType: 'unofficial_public_endpoint', updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('FIFA U17 live data error:', error);
    return res.status(error.status || 502).json({
      available: false, source: 'LiveScore',
      message: error.status === 403 || error.status === 429
        ? 'LiveScore ha limitado temporalmente las consultas. El calendario sigue disponible.'
        : 'No se ha podido conectar con LiveScore. El calendario sigue disponible.',
      detail: process.env.NODE_ENV === 'development' ? String(error.message || error) : undefined
    });
  }
};
module.exports.config = { maxDuration: 20 };
