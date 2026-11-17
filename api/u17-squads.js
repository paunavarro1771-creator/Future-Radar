const PDF_URL = 'https://fdp.fifa.org/assetspublic/ce303/pdf/SquadLists-Spanish.pdf';
const TEAM_CODES = new Set('ALG ARG AUS BEL BRA CMR CHI CHN CIV COL CRC CRO CUB DEN DOM ECU EGY ESP FIJ FRA GRE HAI HON ITA JAM JPN KOR MAR MEX MLI MNE MOZ NCL NZL PAN QAT ROU SEN SRB TAN TJK UGA URU UZB VEN VIE'.split(' '));
const POSITION_MAP = { PO: 'GK', DF: 'DEF', MC: 'CM', DC: 'ST', MF: 'CM', FW: 'ST' };

function normalizeDate(raw) {
  const match = String(raw || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return '';
  return [match[1].padStart(2, '0'), match[2].padStart(2, '0'), match[3]].join('/');
}
function ageOnTournamentStart(raw) {
  const normalized = normalizeDate(raw);
  if (!normalized) return null;
  const [day, month, year] = normalized.split('/').map(Number);
  const start = new Date(Date.UTC(2026, 10, 19));
  let age = 2026 - year;
  if (start.getUTCMonth() + 1 < month || (start.getUTCMonth() + 1 === month && start.getUTCDate() < day)) age--;
  return age;
}
function compact(parts) {
  return parts.map(x => String(x || '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
function pageLines(items) {
  const sorted = items.filter(x => x.str && x.str.trim()).map(x => ({
    text: x.str.trim(), x: x.transform?.[4] || 0, y: x.transform?.[5] || 0
  })).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const item of sorted) {
    let line = lines.find(l => Math.abs(l.y - item.y) < 1.8);
    if (!line) { line = { y: item.y, items: [] }; lines.push(line); }
    line.items.push(item);
  }
  return lines.map(line => {
    line.items.sort((a, b) => a.x - b.x);
    const col = (min, max) => compact(line.items.filter(i => i.x >= min && i.x < max).map(i => i.text));
    return {
      y: line.y,
      text: compact(line.items.map(i => i.text)),
      number: col(5, 26),
      pos: col(26, 54),
      displayName: col(54, 176),
      firstNames: col(176, 296),
      surnames: col(296, 390),
      shirtName: col(390, 535),
      dob: col(535, 584),
      club: col(584, 797),
      height: col(797, 850)
    };
  });
}
module.exports = async (req, res) => {
  let stage = 'starting';
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
  try {
    stage = 'downloading_fifa_pdf';
    const response = await fetch(PDF_URL, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FutureRadarFC/1.0; +https://www.futureradar.es)',
        'Accept': 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': 'https://www.fifa.com/',
        'Origin': 'https://www.fifa.com'
      }
    });
    if (!response.ok) {
      console.error('FIFA PDF upstream response:', response.status, response.statusText);
      return res.status(502).json({ error: 'FIFA squad PDF could not be downloaded', stage, upstreamStatus: response.status, upstreamStatusText: response.statusText });
    }
    const contentType = response.headers.get('content-type') || '';
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 1000 || (contentType && !/pdf|octet-stream/i.test(contentType))) {
      return res.status(502).json({ error: 'FIFA did not return a valid PDF', stage, contentType, bytes: bytes.length });
    }
    stage = 'loading_pdf_parser';
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
    stage = 'parsing_pdf';
    const pdf = await pdfjs.getDocument({ data: bytes, disableWorker: true, useSystemFonts: true, verbosity: 0 }).promise;
    const players = [];
    const teamsFound = new Set();
    const pageErrors = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      try {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const lines = pageLines(content.items);
        // FIFA puts one national squad on each page. Read the country code from the page heading,
        // rather than relying on a fixed vertical coordinate (the Spanish and English PDFs differ).
        const header = lines.slice(0, 22).map(l => l.text).join(' ');
        const codeMatch = header.match(/\(([A-Z]{3})\)/g)?.map(value => value.slice(1, 4)).find(code => TEAM_CODES.has(code));
        if (!codeMatch) continue;
        const teamCode = codeMatch;
        teamsFound.add(teamCode);
        for (const line of lines) {
          // Prefer coordinate-based columns when available; fall back to the full text row.
          // This avoids silently dropping every player when FIFA changes PDF column positions.
          let squadNumber = line.number;
          let rawPosition = line.pos;
          let dob = normalizeDate(line.dob);
          let clubRaw = line.club;
          let rawHeight = line.height;
          let name = compact([line.firstNames, line.surnames]) || line.displayName;
          if (!/^\d{1,2}$/.test(squadNumber) || !POSITION_MAP[rawPosition] || !dob) {
            const dateMatch = line.text.match(/\b(\d{1,2}\\/\d{1,2}\\/\d{4})\b/);
            if (!dateMatch) continue;
            const dateIndex = line.text.indexOf(dateMatch[0]);
            const beforeDate = line.text.slice(0, dateIndex).trim();
            const afterDate = line.text.slice(dateIndex + dateMatch[0].length).trim();
            const prefix = beforeDate.match(/^(\d{1,2})\s+(PO|DF|MC|DC|MF|FW)\s+(.+)$/);
            if (!prefix) continue;
            squadNumber = prefix[1];
            rawPosition = prefix[2];
            dob = normalizeDate(dateMatch[0]);
            // PLAYER NAME is the first display-name column after shirt number and position.
            // Keep the first two tokens as FIFA's display-name format (e.g. "PONCE Guillermo").
            name = prefix[3].split(/\s+/).slice(0, 2).join(' ');
            const heightMatch = afterDate.match(/\s+(\d{3})\s*$/);
            rawHeight = heightMatch ? heightMatch[1] : '';
            clubRaw = heightMatch ? afterDate.slice(0, heightMatch.index).trim() : afterDate;
          }
          if (!/^\d{1,2}$/.test(squadNumber) || !POSITION_MAP[rawPosition] || !dob || !name) continue;
          const clubCountry = clubRaw.match(/\\(([A-Z]{3})\\)\s*$/)?.[1] || '';
          const club = clubRaw.replace(/\s*\\([A-Z]{3}\\)\s*$/, '').trim();
          const height = Number(String(rawHeight).match(/\d{3}/)?.[0]);
          players.push({
            name,
            position: POSITION_MAP[rawPosition],
            nationality: teamCode,
            nationalTeamCode: teamCode,
            squadNumber: Number(squadNumber),
            dateOfBirth: dob,
            age: ageOnTournamentStart(dob),
            club: club || clubRaw || '',
            clubCountry,
            heightCm: Number.isFinite(height) && height > 130 && height < 230 ? height : null,
            season: '2026/27',
            competition: 'FIFA U-17 World Cup Qatar 2026',
            tournament: 'FIFA U-17 World Cup Qatar 2026',
            source: 'FIFA',
            sourceUrl: 'https://fdp.fifa.org/assetspublic/ce303/pdf/SquadLists-Spanish.pdf',
            sourceUpdated: '2026-11-17'
          });
        }
      } catch (error) {
        pageErrors.push({ page: pageNumber, message: String(error.message || error) });
      }
    }
    const unique = new Map();
    for (const player of players) {
      const key = [player.nationalTeamCode, player.squadNumber, player.name, player.dateOfBirth].join('|');
      unique.set(key, player);
    }
    const finalPlayers = [...unique.values()];
    const counts = {};
    for (const p of finalPlayers) counts[p.nationalTeamCode] = (counts[p.nationalTeamCode] || 0) + 1;
    return res.status(200).json({
      competition: 'FIFA U-17 World Cup Qatar 2026',
      source: PDF_URL,
      sourceVersion: '2026-11-17',
      pdfPages: pdf.numPages,
      players: finalPlayers,
      playerCount: finalPlayers.length,
      teamsFound: [...teamsFound].sort(),
      teamCount: teamsFound.size,
      countsByTeam: counts,
      pageErrors,
      extractionDiagnostics: finalPlayers.length ? undefined : { sampleRows: pageErrors.length ? [] : 'PDF pages were read, but no rows matched the expected squad format.' }
    });
  } catch (error) {
    console.error('FIFA U17 squad import failed at stage:', stage, error);
    return res.status(502).json({ error: 'Could not import FIFA squad list', stage, detail: String(error.message || error), stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
};

module.exports.config = { maxDuration: 60 };
