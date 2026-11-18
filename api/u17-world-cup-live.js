const BASE = 'https://www.sofascore.com/api/v1';
const TOURNAMENT_ID = 279; // U17 World Championship
const ALIASES = {
  QAT:['qatar','catar'], PAN:['panama','panama'], EGY:['egypt','egipto'], GRE:['greece','grecia'],
  KOR:['south korea','korea republic','korea','corea del sur'], UGA:['uganda'], NCL:['new caledonia','nueva caledonia'],
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
async function listMatches(dates) {
  const uniqueDates = [...new Set(dates)].slice(0, 20);
  const payloads = await Promise.all(uniqueDates.map(date =>
    getJson('/sport/football/scheduled-events/' + encodeURIComponent(date)).catch(() => ({ events: [] }))
  ));
  const events = payloads.flatMap(payload => Array.isArray(payload.events) ? payload.events : []);
  return events.filter(event => tournamentId(event) === TOURNAMENT_ID).map(event => ({
    ...simplify(event),
    date: event.startTimestamp ? new Date(event.startTimestamp * 1000).toISOString().slice(0, 10) : null,
    homeCode: codeForTeam(event.homeTeam?.name),
    awayCode: codeForTeam(event.awayTeam?.name)
  })).filter(event => event.homeCode && event.awayCode);
}
async function findEvent(date, home, away) {
  const payload = await getJson('/sport/football/scheduled-events/' + encodeURIComponent(date));
  const events = Array.isArray(payload.events) ? payload.events : [];
  return events.find(event => tournamentId(event) === TOURNAMENT_ID &&
    sameTeam(home, event.homeTeam?.name) && sameTeam(away, event.awayTeam?.name)) || null;
}
async function matchDetails(eventId) {
  const [event, statistics, lineups, incidents] = await Promise.all([
    getJson('/event/' + eventId),
    getJson('/event/' + eventId + '/statistics').catch(() => null),
    getJson('/event/' + eventId + '/lineups').catch(() => null),
    getJson('/event/' + eventId + '/incidents').catch(() => null)
  ]);
  return {
    event: simplify(event.event || event),
    statistics: statistics?.statistics || null,
    lineups: lineups || null,
    incidents: incidents?.incidents || [],
    source: 'SofaScore public match centre',
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
      const dates = String(req.query.dates || '').split(',').filter(value => /^\\d{4}-\\d{2}-\\d{2}$/.test(value));
      if (!dates.length) return res.status(400).json({ available: false, message: 'Faltan las fechas del calendario.' });
      const matches = await listMatches(dates);
      return res.status(200).json({ available: true, matches, source: 'SofaScore', sourceType: 'unofficial_public_endpoint', updatedAt: new Date().toISOString() });
    }
    const date = String(req.query.date || '');
    const home = String(req.query.home || '').toUpperCase();
    const away = String(req.query.away || '').toUpperCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !ALIASES[home] || !ALIASES[away]) {
      return res.status(400).json({ available: false, message: 'Fecha o selecciones no válidas.' });
    }
    const event = await findEvent(date, home, away);
    if (!event) return res.status(200).json({
      available: false, covered: false, source: 'SofaScore',
      message: 'SofaScore todavía no ofrece una ficha identificable para este partido. Conservamos el calendario oficial y no inventamos resultados.'
    });
    if (details) {
      const data = await matchDetails(event.id);
      return res.status(200).json({ available: true, ...data });
    }
    return res.status(200).json({ available: true, match: simplify(event), source: 'SofaScore', sourceType: 'unofficial_public_endpoint', updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('FIFA U17 live data error:', error);
    return res.status(error.status || 502).json({
      available: false, source: 'SofaScore',
      message: error.status === 403 || error.status === 429
        ? 'La fuente gratuita ha limitado temporalmente las consultas. El calendario sigue disponible.'
        : 'No se ha podido conectar con la fuente gratuita. El calendario sigue disponible.',
      detail: process.env.NODE_ENV === 'development' ? String(error.message || error) : undefined
    });
  }
};
module.exports.config = { maxDuration: 20 };
