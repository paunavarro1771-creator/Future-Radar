const API_BASE = 'https://api.football-data-api.com';

function unwrap(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (payload?.data && typeof payload.data === 'object') return [payload.data];
  return [];
}
function norm(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\b(u-?19|youth|academy|fc|cf|afc|sc|club)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function sameTeam(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const aliases = {
    'atleti': 'atletico madrid', 'atletico': 'atletico madrid',
    'b dortmund': 'borussia dortmund', 'dortmund': 'borussia dortmund',
    'man city': 'manchester city', 'man utd': 'manchester united',
    'psg': 'paris saint germain', 'paris': 'paris saint germain',
    'inter': 'inter milan', 'sporting cp': 'sporting',
    'real betis': 'betis', 'bayern munchen': 'bayern munich'
  };
  const ax = aliases[x] || x, ay = aliases[y] || y;
  return ax === ay || ax.includes(ay) || ay.includes(ax);
}
async function apiGet(path, key) {
  const url = new URL(API_BASE + path);
  url.searchParams.set('key', key);
  const response = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': 'FutureRadarFC/1.0' }
  });
  if (!response.ok) {
    const error = new Error('FootyStats API respondió ' + response.status);
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  if (payload?.success === false || payload?.error) {
    throw new Error(payload.message || payload.error || 'FootyStats rechazó la consulta');
  }
  return payload;
}
function seasonYear(entry) {
  const season = entry?.season || {};
  return String(season.year || season.name || entry?.season_year || entry?.year || '');
}
function seasonId(entry) {
  return entry?.season?.id || entry?.season_id || entry?.id || null;
}
function matchDate(match) {
  const unix = Number(match.date_unix || match.dateUnix || match.kickoff_unix || 0);
  if (unix) return new Date(unix * 1000).toISOString().slice(0, 10);
  const raw = match.date || match.kickoff || match.match_date || '';
  return String(raw).slice(0, 10);
}
function matchHome(match) {
  return match.home_name || match.home_team_name || match.team_a_name || match.homeTeam || match.home || '';
}
function matchAway(match) {
  return match.away_name || match.away_team_name || match.team_b_name || match.awayTeam || match.away || '';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  if (req.method !== 'GET') return res.status(405).json({ available: false, message: 'Método no permitido.' });
  const date = String(req.query.date || '');
  const home = String(req.query.home || '');
  const away = String(req.query.away || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !home || !away) {
    return res.status(400).json({ available: false, message: 'Faltan la fecha o los equipos del partido.' });
  }
  const key = process.env.FOOTYSTATS_API_KEY;
  if (!key) {
    return res.status(503).json({
      available: false,
      code: 'API_KEY_REQUIRED',
      message: 'La conexión está preparada, pero falta configurar FOOTYSTATS_API_KEY en Vercel. También hay que activar UEFA Youth League 2026/27 en la cuenta de FootyStats.'
    });
  }

  try {
    let season = process.env.FOOTYSTATS_SEASON_ID || '';
    if (!season) {
      const leaguesPayload = await apiGet('/league-list?chosen_leagues_only=true', key);
      const leagues = unwrap(leaguesPayload);
      const youth = leagues.filter(item => {
        const name = norm(item.league_name || item.name || item.competition_name || '');
        return name.includes('uefa youth league');
      });
      const selected = youth.find(item => /2026/.test(seasonYear(item))) || youth[0];
      season = seasonId(selected);
      if (!season) {
        return res.status(424).json({
          available: false,
          code: 'YOUTH_LEAGUE_NOT_ENABLED',
          message: 'FootyStats no devuelve UEFA Youth League en las competiciones activadas. Activa UEFA Youth League 2026/27 en la configuración de tu cuenta.'
        });
      }
    }

    const schedulePayload = await apiGet('/league-matches?season_id=' + encodeURIComponent(season) + '&max_per_page=1000', key);
    const schedule = unwrap(schedulePayload);
    const target = new Date(date + 'T12:00:00Z').getTime();
    const candidates = schedule.filter(match => {
      const rawDate = matchDate(match);
      const time = new Date(rawDate + 'T12:00:00Z').getTime();
      return rawDate && Math.abs(time - target) <= 86400000 &&
        sameTeam(matchHome(match), home) && sameTeam(matchAway(match), away);
    });
    const found = candidates[0];
    if (!found || !(found.id || found.match_id)) {
      return res.status(404).json({
        available: false,
        code: 'MATCH_NOT_MAPPED',
        message: 'La API tiene la competición, pero todavía no hemos podido emparejar este partido con seguridad. No mostraremos estadísticas de otro encuentro.'
      });
    }

    const detailPayload = await apiGet('/match?match_id=' + encodeURIComponent(found.id || found.match_id), key);
    const detail = detailPayload?.data && !Array.isArray(detailPayload.data)
      ? detailPayload.data : (unwrap(detailPayload)[0] || {});
    const statsKeys = ['team_a_possession', 'team_b_possession', 'team_a_shots', 'team_b_shots',
      'team_a_corners', 'team_b_corners', 'team_a_fouls', 'team_b_fouls'];
    const hasStats = statsKeys.some(field => detail[field] !== undefined && detail[field] !== null);
    if (!hasStats) {
      return res.status(200).json({
        available: false,
        code: 'MATCH_STATS_NOT_COVERED',
        message: 'El partido está identificado, pero FootyStats aún no ofrece estadísticas detalladas para este encuentro.'
      });
    }

    return res.status(200).json({
      available: true,
      provider: 'FootyStats',
      providerMatchId: found.id || found.match_id,
      seasonId: season,
      stats: detail,
      lineups: detail.lineups || {},
      homeGoals: detail.homeGoals || [],
      awayGoals: detail.awayGoals || [],
      sourceUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Youth League statistics API error:', error);
    return res.status(error.status || 502).json({
      available: false,
      code: 'UPSTREAM_ERROR',
      message: 'No se han podido recuperar las estadísticas del proveedor. Comprueba la clave y la cobertura de la competición.',
      detail: process.env.NODE_ENV === 'development' ? String(error.message || error) : undefined
    });
  }
};

module.exports.config = { maxDuration: 30 };
