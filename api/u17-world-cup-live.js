const BASE = 'https://www.sofascore.com/api/v1'; // Reserved for future licensed integration
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
  const match = packed.match(/^(\d{4})(\d{2})(\d{2})/);
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
    minute: event.Eps && /^\d/.test(String(event.Eps)) ? String(event.Eps).replace(/[^0-9+]/g, '') : null,
    startTimestamp: event.Etm?.ATm ? Math.floor(Number(event.Etm.ATm) / 1000) : null,
    date, homeCode, awayCode,
    matchKey: `${date}:${homeCode}:${awayCode}`, homeTeamId: `national:${homeCode}:u17`, awayTeamId: `national:${awayCode}:u17`, competitionId: 'fifa-u17-world-cup-2026',
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
  if (payloads.every(payload => payload === null)) throw new Error('No se pudo consultar ninguna fecha del proveedor');
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
async function findMadplayFixture(homeCode, awayCode) {
  // YSscores publishes the tournament index as normal HTML.
  const championshipUrl = 'https://www.ysscores.com/en/championship/83188/FIFA-U-17-World-Cup';
  const response = await fetch(championshipUrl, {
    headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0 FutureRadarFC/1.0' }
  });
  if (!response.ok) throw new Error('YSscores respondió ' + response.status);
  const html = await response.text();
  const homeAliases = ALIASES[homeCode] || [];
  const awayAliases = ALIASES[awayCode] || [];
  const links = [...html.matchAll(/href=["']([^"'<>]*\/en\/match\/(\d+)\/([^"'?#]+))/gi)];
  const slugNorm = value => norm(decodeURIComponent(String(value || '').replace(/-/g, ' ')));
  const hasAlias = (slug, aliases) => aliases.some(alias => {
    const needle = norm(alias);
    return slug === needle || slug.includes(needle + ' ') || slug.startsWith(needle + ' ');
  });
  for (const match of links) {
    const id = match[2], slug = match[3];
    const normalized = slugNorm(slug);
    const [slugHome, slugAway] = normalized.split(/\s+vs\s+/);
    if (slugHome && slugAway && hasAlias(slugHome, homeAliases) && hasAlias(slugAway, awayAliases)) {
      return {
        id,
        slug,
        matchUrl: 'https://www.ysscores.com/en/match/' + id + '/' + slug,
        lineupUrl: 'https://www.ysscores.com/en/lineup/' + id + '/' + slug
      };
    }
  }
  return null;
}
async function matchDetails(eventId, homeCode, awayCode) {
  const [scoreboard, incidents] = await Promise.all([
    fetch('https://prod-cdn-public-api.livescore.com/v1/api/app/scoreboard/soccer/' + encodeURIComponent(eventId) + '?locale=en')
      .then(r => r.ok ? r.json() : null).catch(() => null),
    fetch('https://prod-cdn-public-api.livescore.com/v1/api/app/incidents/soccer/' + encodeURIComponent(eventId) + '?locale=en')
      .then(r => r.ok ? r.json() : null).catch(() => null)
  ]);
  const event = scoreboard?.Event || scoreboard?.event || scoreboard?.data?.Event || scoreboard;
  const findValue = (root, keys) => {
    if (!root || typeof root !== 'object') return null;
    for (const key of keys) if (root[key] !== undefined && root[key] !== null) return root[key];
    for (const value of Object.values(root)) {
      if (value && typeof value === 'object') { const found = findValue(value, keys); if (found !== null) return found; }
    }
    return null;
  };
  const rawStats = findValue(scoreboard, ['Stats','stats','Statistics','statistics']);
  const statistics = Array.isArray(rawStats) ? rawStats.map(item => ({
    name: item.Nm || item.name || item.N || item.Tp || item.type || '',
    home: item.T1 ?? item.V1 ?? item.home ?? item.homeValue ?? item.S1 ?? null,
    away: item.T2 ?? item.V2 ?? item.away ?? item.awayValue ?? item.S2 ?? null
  })).filter(item => item.name) : (rawStats && typeof rawStats === 'object' ? rawStats : null);
  const rawLineups = findValue(scoreboard, ['Lineups','lineups','Lu','lu','Teams','teams']);
  const sidePlayers = (side) => {
    if (Array.isArray(side)) return side.map(p => typeof p === 'string' ? {name:p} : ({
      name:p.Nm || p.name || p.Pnm || p.player?.name || '',
      number:p.Num ?? p.number ?? p.ShirtNo ?? null,
      position:p.Pos || p.position || p.Ps || ''
    })).filter(p => p.name);
    if (side && typeof side === 'object') return side.Players || side.players || side.Starting || side.starting || [];
    return [];
  };
  let lineups = null;
  if (rawLineups && typeof rawLineups === 'object') {
    const homeSide = rawLineups.T1 || rawLineups.home || rawLineups.Home || rawLineups.team1;
    const awaySide = rawLineups.T2 || rawLineups.away || rawLineups.Away || rawLineups.team2;
    const homePlayers = sidePlayers(homeSide), awayPlayers = sidePlayers(awaySide);
    if (homePlayers.length || awayPlayers.length) lineups = {
      home: homePlayers, away: awayPlayers,
      homeFormation: homeSide?.Formation || homeSide?.formation || null,
      awayFormation: awaySide?.Formation || awaySide?.formation || null
    };
  }
  const rawIncidents = incidents?.Incs || incidents?.incidents || incidents?.data?.Incs || [];
  const eventData = event ? {
    id: String(event.Eid || eventId),
    home: (Array.isArray(event.T1) ? event.T1[0] : event.T1)?.Nm || '',
    away: (Array.isArray(event.T2) ? event.T2[0] : event.T2)?.Nm || '',
    homeScore: event.Tr1 === undefined ? null : Number(event.Tr1),
    awayScore: event.Tr2 === undefined ? null : Number(event.Tr2),
    status: liveScoreStatus(event),
    statusDescription: event.Eps || 'Programado'
  } : null;
  let alternativeProvider = null;
  if (!statistics || !lineups) {
    try { alternativeProvider = await findMadplayFixture(homeCode, awayCode); }
    catch (error) { console.warn('Madplay fallback unavailable:', error.message); }
  }
  return {
    event: eventData,
    statistics,
    lineups,
    incidents: rawIncidents,
    alternativeProvider,
    source: 'LiveScore + Madplay/YSscores fallback',
    sourceType: 'unofficial_public_endpoint',
    updatedAt: new Date().toISOString()
  };
}

// Verified match snapshot, used only for this exact finished fixture when the live feed is missing details.
// Source: https://www.ysscores.com/en/match/6139080/South-Korea-U17-vs-New-Caledonia-U17
// These figures are historical, NOT a live API feed.
const VERIFIED_SNAPSHOTS = {
  '2026-11-22:KOR:NCL': {
    event: {home:'South Korea U17',away:'New Caledonia U17',homeScore:6,awayScore:0,status:'FT',statusDescription:'Finalizado'},
    statistics: [
      {name:'Posesión',home:'75%',away:'25%'},{name:'Tiros totales',home:31,away:4},
      {name:'Tiros a puerta',home:18,away:1},{name:'Tiros fuera',home:6,away:3},
      {name:'Tiros bloqueados',home:7,away:0},{name:'Tiros dentro del área',home:24,away:2},
      {name:'Tiros fuera del área',home:7,away:2},{name:'Pases',home:568,away:186},
      {name:'Pases acertados',home:500,away:121},{name:'Precisión de pase',home:'88%',away:'65%'},
      {name:'Córneres',home:15,away:1},{name:'Fueras de juego',home:1,away:1},
      {name:'Faltas',home:4,away:9},{name:'Paradas',home:1,away:12},
      {name:'Tarjetas amarillas',home:2,away:1}
    ],
    incidents: [
      {type:'Gol',minute:5,name:'Park Joo-ho'},
      {type:'Gol',minute:15,name:'Ji-woo Kim'},
      {type:'Gol',minute:20,name:'Ji-woo Kim'},
      {type:'Gol',minute:25,name:'Sun-hyun An'},
      {type:'Gol',minute:27,name:'Seung-min Han'},
      {type:'Gol',minute:53,name:'Ji-woo Kim'}
    ],
    lineups:null,
    source:'YSscores (registro verificado)',sourceType:'verified_historical_snapshot',
    sourceUrl:'https://www.ysscores.com/en/match/6139080/South-Korea-U17-vs-New-Caledonia-U17',
    verifiedAt:'2026-11-22'
  }
};
function verifiedSnapshot(date,home,away) {
  const snapshot=VERIFIED_SNAPSHOTS[`${date}:${home}:${away}`];
  return snapshot ? {...snapshot,updatedAt:new Date().toISOString(),dataAsOf:snapshot.verifiedAt} : null;
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
      let matches=[];let liveError=null;
      try { matches=await listMatches(dates); } catch(error) { liveError=error; }
      const seen=new Set(matches.map(m=>m.matchKey||`${m.date}:${m.homeCode}:${m.awayCode}`));
      for (const [key,snapshot] of Object.entries(VERIFIED_SNAPSHOTS)) {
        const [date,homeCode,awayCode]=key.split(':');
        if(!dates.includes(date)||seen.has(key))continue;
        matches.push({...snapshot.event,id:'verified:'+key,date,homeCode,awayCode,matchKey:key,
          homeTeamId:`national:${homeCode}:u17`,awayTeamId:`national:${awayCode}:u17`,
          competitionId:'fifa-u17-world-cup-2026',sourceType:snapshot.sourceType});
      }
      if(liveError && !matches.length)throw liveError;
      return res.status(200).json({ available: true, matches, source: liveError?'Verified historical snapshots':'LiveScore + verified historical snapshots', sourceType: 'unofficial_public_endpoint', updatedAt: new Date().toISOString() });
    }
    const date = String(req.query.date || '');
    const home = String(req.query.home || '').toUpperCase();
    const away = String(req.query.away || '').toUpperCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !ALIASES[home] || !ALIASES[away]) {
      return res.status(400).json({ available: false, message: 'Fecha o selecciones no válidas.' });
    }
    const snapshot=verifiedSnapshot(date,home,away);
    let event=null;
    try { event = await findEvent(date, home, away); }
    catch (error) { if (!snapshot) throw error; }
    if (details && snapshot) {
      const liveDetails=event ? await matchDetails(event.id,home,away).catch(()=>null) : null;
      const data={...snapshot,statistics:liveDetails?.statistics?.length?liveDetails.statistics:snapshot.statistics,incidents:liveDetails?.incidents?.length?liveDetails.incidents:snapshot.incidents,lineups:liveDetails?.lineups||snapshot.lineups,alternativeProvider:liveDetails?.alternativeProvider||{matchUrl:snapshot.sourceUrl,lineupUrl:'https://www.ysscores.com/en/lineup/6139080/South-Korea-U17-vs-New-Caledonia-U17'}};
      return res.status(200).json({available:true,matchKey:`${date}:${home}:${away}`,competitionId:'fifa-u17-world-cup-2026',homeTeamId:`national:${home}:u17`,awayTeamId:`national:${away}:u17`,...data});
    }
    const identity = { matchKey: `${date}:${home}:${away}`, homeTeamId: `national:${home}:u17`, awayTeamId: `national:${away}:u17`, competitionId: 'fifa-u17-world-cup-2026' };
    if (!event) {
      if (snapshot && !details) return res.status(200).json({available:true,match:{...snapshot.event,date,homeCode:home,awayCode:away,matchKey:`${date}:${home}:${away}`},source:snapshot.source,sourceType:snapshot.sourceType,updatedAt:new Date().toISOString()});
      if (details) {
        let alternativeProvider = null;
        try { alternativeProvider = await findMadplayFixture(home, away); }
        catch (error) { console.warn('Madplay fallback unavailable:', error.message); }
        if (alternativeProvider) return res.status(200).json({
          available: true, ...identity, event: null, statistics: null, lineups: null, incidents: [],
          alternativeProvider, source: 'Madplay/YSscores fallback',
          sourceType: 'public_match_centre_page', updatedAt: new Date().toISOString()
        });
      }
      return res.status(200).json({
        available: false, covered: false, source: 'LiveScore + Madplay',
        message: 'No se ha encontrado una ficha de datos para este partido. Conservamos el calendario oficial y no inventamos resultados.'
      });
    }
    if (details) {
      const data = await matchDetails(event.id, home, away);
      return res.status(200).json({ available: true, ...identity, ...data });
    }
    return res.status(200).json({ available: true, ...identity, match: event, source: 'LiveScore', sourceType: 'unofficial_public_endpoint', updatedAt: new Date().toISOString() });
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
