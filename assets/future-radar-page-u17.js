/* Future Radar FC page controller: u17. Extracted without changing data logic. */

let allRadarPlayers=[];
const flags={ALB:'al',ALG:'dz',ANG:'ao',ARG:'ar',AUS:'au',AUT:'at',AZE:'az',BEL:'be',BIH:'ba',BRA:'br',BUL:'bg',CIV:'ci',CMR:'cm',COD:'cd',COL:'co',COM:'km',CRO:'hr',CUW:'cw',CZE:'cz',EGY:'eg',ENG:'gb-eng',ESP:'es',FIN:'fi',FRA:'fr',GAB:'ga',GAM:'gm',GBS:'gw',GEO:'ge',GER:'de',GHA:'gh',GRE:'gr',GUI:'gn',HUN:'hu',IRL:'ie',ISL:'is',ITA:'it',JPN:'jp',KOR:'kr',KOS:'xk',LTU:'lt',LVA:'lv',MAR:'ma',MDA:'md',MKD:'mk',MNE:'me',NED:'nl',NGR:'ng',NIR:'gb-nir',NOR:'no',PER:'pe',POL:'pl',POR:'pt',ROU:'ro',RUS:'ru',SCO:'gb-sct',SEN:'sn',SLO:'si',SRB:'rs',SUI:'ch',SVK:'sk',SWE:'se',THA:'th',TUN:'tn',TUR:'tr',UKR:'ua',USA:'us',WAL:'gb-wls',QAT:'qa',PAN:'pa',UGA:'ug',NCL:'nc',ECU:'ec',MOZ:'mz',DEN:'dk',HAI:'ht',KSA:'sa',URU:'uy',JAM:'jm',UZB:'uz',MLI:'ml',NZL:'nz',VIE:'vn',CUB:'cu',TJK:'tj',FIJ:'fj',CHN:'cn',TAN:'tz',CHI:'cl',CRC:'cr',MEX:'mx',VEN:'ve',DOM:'do'};
const wikiPages={
'AEK Athens U19':'AEK_Athens_F.C.','Arsenal U19':'Arsenal_F.C.','Aston Villa U19':'Aston_Villa_F.C.','Atlético de Madrid U19':'Atlético_Madrid','Barcelona U19':'FC_Barcelona','Bayern München U19':'FC_Bayern_Munich','Bodø/Glimt U19':'FK_Bodø/Glimt','Borussia Dortmund U19':'Borussia_Dortmund','Club Brugge U19':'Club_Brugge_KV','Como U20':'Como_1907','FC Porto U19':'FC_Porto','Fenerbahçe U19':'Fenerbahçe_S.K.','Feyenoord U19':'Feyenoord','Galatasaray U19':'Galatasaray_S.K.','Inter U20':'Inter_Milan','LASK Linz U19':'LASK','Lens U19':'RC_Lens','Lille U19':'LOSC_Lille','Liverpool U19':'Liverpool_F.C.','Manchester City U19':'Manchester_City_F.C.','Manchester United U19':'Manchester_United_F.C.','Napoli U19':'S.S.C._Napoli','PSV Eindhoven U19':'PSV_Eindhoven','Paris Saint-Germain U19':'Paris_Saint-Germain_F.C.','RB Leipzig U19':'RB_Leipzig','Real Betis U19':'Real_Betis','Real Madrid U19':'Real_Madrid_CF','Roma U20':'AS_Roma','Sabah U19':'Sabah_FK','Shakhtar Donetsk U19':'FC_Shakhtar_Donetsk','Slavia Praha U19':'SK_Slavia_Prague','Sporting CP U19':'Sporting_CP','VfB Stuttgart U19':'VfB_Stuttgart','Viking FK U19':'Viking_FK','Villarreal U19':'Villarreal_CF','ŠK Slovan Bratislava U19':'ŠK_Slovan_Bratislava'};
const crestCache={};
// Escudos contrastados: evitamos que una foto del estadio o de una celebración
// aparezca como si fuera el escudo del club.
const crestOverrides={
  'Arsenal U19':'https://www.footylogos.com/downloads/logo/arsenal-logo-footylogos.png',
  'Atlético de Madrid U19':'https://www.footylogos.com/downloads/logo/atletico-madrid-logo-footylogos.png',
  'Fenerbahçe U19':'https://www.footylogos.com/downloads/logo/fenerbahce-logo-footylogos.png',
  'Lille U19':'https://www.footylogos.com/downloads/logo/losc-lille-logo-footylogos.png',
  'Liverpool U19':'https://www.footylogos.com/downloads/logo/liverpool-fc-logo-footylogos.png',
  'Manchester City U19':'https://www.footylogos.com/downloads/logo/manchester-city-logo-footylogos.png',
  'FC Porto U19':'https://www.footylogos.com/downloads/logo/fc-porto-logo-footylogos.png',
  'Lens U19':'https://www.footylogos.com/downloads/logo/rc-lens-logo-footylogos.png',
  'Roma U20':'https://commons.wikimedia.org/wiki/Special:FilePath/AS_Roma_logo.svg?width=160'
};
function flagUrl(code){const iso=flags[String(code||'').toUpperCase()];return iso?'https://flagcdn.com/w40/'+iso+'.png':''}
function initials(name){return (name||'FR').replace(/[^A-Za-zÀ-ÿ ]/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'FR'}
function crestFallback(name){return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="15" fill="#1b2a20"/><text x="40" y="47" font-family="Arial" font-size="25" font-weight="bold" text-anchor="middle" fill="#b7f36b">'+initials(name)+'</text></svg>')}
function crestUrl(club){return crestOverrides[club]||crestCache[club]||crestFallback(club)}
async function fetchClubLogo(page){
  // Primero intentamos recuperar el escudo oficial desde Wikidata.
  try{
    const wdUrl='https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles='+encodeURIComponent(page)+'&props=claims&format=json&origin=*&redirects=1';
    const wd=await fetch(wdUrl);const data=await wd.json();
    const entity=Object.values(data.entities||{}).find(x=>x&&x.claims);
    const claims=(entity?.claims?.P154||[]).filter(c=>c.rank!=='deprecated');
    const logo=claims[0]?.mainsnak?.datavalue?.value;
    if(logo)return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(logo)+'?width=180';
  }catch(e){}
  // Recuperamos el sistema anterior para los clubes cuyo thumbnail sí mostraba
  // su escudo. Porto, Lens y Roma tienen override propio para evitar fotos erróneas.
  try{
    const url='https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=180&redirects=1&titles='+encodeURIComponent(page)+'&origin=*';
    const r=await fetch(url);const d=await r.json();const pg=Object.values(d.query.pages||{})[0];
    if(pg?.thumbnail?.source)return pg.thumbnail.source;
  }catch(e){}
  return null;
}
async function loadCrests(clubs){
  await Promise.all(clubs.map(async club=>{if(crestOverrides[club])return;const page=wikiPages[club];if(!page)return;const logo=await fetchClubLogo(page);if(logo)crestCache[club]=logo;}));
  document.querySelectorAll('[data-crest]').forEach(img=>{const club=img.dataset.crest;img.src=crestUrl(club);});
}
function handleCrestError(img){img.onerror=null;img.src=crestFallback(img.dataset.crest||img.alt||'FR');}
function cleanPosition(pos){const p=String(pos||'').trim().toUpperCase();if(['GK','PO','POR','PORTERO'].includes(p)||p.includes('PORT'))return 'PORTERO';if(['ST','CF','LW','RW','FW','DC','DEL'].includes(p)||p.includes('DELANT')||p.includes('EXTREMO'))return 'DELANTERO';if(['CB','LB','RB','LWB','RWB','DEF','DF','LI','LD','DFC'].includes(p)||p.includes('DEFEN'))return 'DEFENSA';if(['CM','CDM','CAM','DM','AM','MC','MCD','MCO','VOL','MD','MI'].includes(p)||p.includes('CENTRO')||p.includes('MEDIO'))return 'CENTROCAMPISTA';return p||'SIN DATO'}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const officialPlayerProfiles={
  'Adrián Pérez':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/adrian-perez-munoz',
  'Marco Company':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/marco-david-company-garcia',
  'Andrés Corcoba':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/andres-corcoba-martinez',
  'Rubén López Domínguez':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/ruben-lopez-dominguez',
  'Pelayo Palomo':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/pelayo-palomo-cidon',
  'Rodrigo Velasco':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/rodrigo-velasco-sanchez',
  'Javi Bailón':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/francisco-javier-bailon-alvarez',
  'Álvaro Lezcano':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/alvaro-lezcano-munoz',
  'Ares Capatana Abad':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/ares-capatana-garcia-abad',
  'Luis Paulo':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/luis-paulo-quevedo',
  'Mateo Garrido':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/mateo-garrido-calderon',
  'José Luis Espinosa':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/jose-luis-saez-espinosa',
  'Mauro Bautista':'https://www.realmadrid.com/es-ES/futbol/cantera-masculina/juvenil-a/mauro-bautista-sanchez'
};
const playerPhotoCache=new Map(),playerPhotoQueue=[];let playerPhotoWorkers=0,playerPhotoObserver=null;
function playerPhotoKey(p){return String(p.name||'').trim()+'|'+String(p.dateOfBirth||'');}
function normalizePlayerName(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
async function findPlayerPhoto(p){
  const name=String(p.name||'').trim();if(!name)return null;
  const officialProfile=officialPlayerProfiles[name];if(officialProfile)return '/api/player-photo?profile='+encodeURIComponent(officialProfile);
  const searchUrl='https://www.wikidata.org/w/api.php?action=wbsearchentities&search='+encodeURIComponent(name)+'&language=en&uselang=en&type=item&limit=8&format=json&origin=*';
  const sr=await fetch(searchUrl);if(!sr.ok)throw new Error('Wikidata search unavailable');const sd=await sr.json();
  const exact=(sd.search||[]).filter(x=>normalizePlayerName(x.label)===normalizePlayerName(name));
  if(!exact.length)return null;
  const ids=exact.map(x=>x.id).join('|');
  const er=await fetch('https://www.wikidata.org/w/api.php?action=wbgetentities&ids='+encodeURIComponent(ids)+'&props=claims|descriptions&languages=en&format=json&origin=*');
  if(!er.ok)throw new Error('Wikidata entities unavailable');const ed=await er.json();
  const birthYear=String(p.dateOfBirth||'').match(/(?:19|20)\d{2}/)?.[0];
  for(const hit of exact){
    const entity=ed.entities?.[hit.id];if(!entity)continue;
    const description=entity.descriptions?.en?.value||hit.description||'';
    const occupations=(entity.claims?.P106||[]).map(c=>c.mainsnak?.datavalue?.value?.id).filter(Boolean);
    const isFootballer=/footballer|football player|soccer player|association football/i.test(description)||occupations.includes('Q937857');
    if(!isFootballer)continue;
    if(birthYear){const birth=entity.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time||'';const found=birth.match(/(?:19|20)\d{2}/)?.[0];if(found&&found!==birthYear)continue;}
    const file=entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;if(file)return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file)+'?width=480';
  }
  return null;
}
async function processPlayerPhotoQueue(){
  if(playerPhotoWorkers>=3||!playerPhotoQueue.length)return;
  const job=playerPhotoQueue.shift();playerPhotoWorkers++;
  try{const url=await findPlayerPhoto(job.player);playerPhotoCache.set(job.key,url||'');if(url){const img=document.querySelector('[data-player-photo="'+CSS.escape(job.key)+'"]'),placeholder=document.querySelector('[data-photo-placeholder="'+CSS.escape(job.key)+'"]');if(img){img.onload=()=>{img.hidden=false;if(placeholder)placeholder.hidden=true};img.onerror=()=>{img.hidden=true};img.src=url;}}}
  catch(e){playerPhotoCache.set(job.key,'');}
  finally{playerPhotoWorkers--;processPlayerPhotoQueue();}
}
function queuePlayerPhoto(img){
  const key=img.dataset.playerPhoto;if(!key||playerPhotoCache.has(key))return;
  if(playerPhotoQueue.some(j=>j.key===key))return;
  const card=img.closest('.player-card');const name=card?.querySelector('.player-name')?.textContent||'';
  const player=allRadarPlayers.find(p=>playerPhotoKey(p)===key);if(!player)return;
  playerPhotoQueue.push({key,player});processPlayerPhotoQueue();
}
function observePlayerPhotos(){
  if(!('IntersectionObserver' in window))return;
  if(!playerPhotoObserver)playerPhotoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){const img=entry.target.querySelector('[data-player-photo]');if(img)queuePlayerPhoto(img);playerPhotoObserver.unobserve(entry.target)}}),{rootMargin:'250px'});
  document.querySelectorAll('.player-photo-wrap').forEach(wrap=>{if(!wrap.dataset.observed){wrap.dataset.observed='1';playerPhotoObserver.observe(wrap)}});
}
function frSlug(v){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function renderPlayers(players){const grid=document.getElementById('playerGrid');if(!players.length){grid.innerHTML='<div class="empty">No hay jugadores que coincidan con la búsqueda.</div>';return}grid.innerHTML=players.map(p=>{const club=p.club||'Club no disponible',nat=p.nationality||'',flag=flagUrl(nat),photoKey=playerPhotoKey(p),initials=(p.name||'FR').split(/\\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();return '<a class="player-card" href="/players/'+frSlug(p.name)+'-'+String(p.dateOfBirth||'').replace(/[^0-9]/g,'')+'"><div class="player-photo-wrap"><div class="player-photo-placeholder" data-photo-placeholder="'+esc(photoKey)+'">'+esc(initials)+'</div><img class="player-photo" data-player-photo="'+esc(photoKey)+'" alt="Foto de '+esc(p.name||'jugador')+'" loading="lazy" hidden></div><div class="player-top"><span class="position">'+esc(cleanPosition(p.position))+'</span>'+(flag?'<img class="flag" src="'+flag+'" alt="'+esc(nat)+'" title="'+esc(nat)+'">':'<span class="flag">🌍</span>')+'</div><div class="player-main"><img class="crest" data-crest="'+esc(club)+'" src="'+crestUrl(club)+'" onerror="handleCrestError(this)" alt="Escudo de '+esc(club)+'"><div style="min-width:0"><h3 class="player-name">'+esc(p.name||'Jugador sin nombre')+'</h3><div class="player-club">'+esc(club)+'</div></div></div><div class="player-meta"><span>EDAD <b>'+(p.age??'—')+'</b></span><span>ALTURA <b>'+(p.heightCm?p.heightCm+' cm':'—')+'</b></span><span>TEMP. <b>'+esc(p.season||'26/27')+'</b></span></div></a>'}).join('');observePlayerPhotos();}
function renderAcademies(){const term=document.getElementById('academySearch').value.trim().toLowerCase();const map=new Map();allRadarPlayers.forEach(p=>{const c=p.club||'Club no disponible';if(!map.has(c))map.set(c,[]);map.get(c).push(p)});const entries=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).filter(([c])=>c.toLowerCase().includes(term));const el=document.getElementById('academiesContainer');if(!entries.length){el.innerHTML='<div class="empty">No se han encontrado canteras.</div>';return}el.innerHTML=entries.map(([c,ps])=>'<a class="academy-card" href="/academies/'+frSlug(c)+'"><img data-crest="'+esc(c)+'" src="'+crestUrl(c)+'" onerror="handleCrestError(this)" alt="Escudo de '+esc(c)+'"><span><strong>'+esc(c)+'</strong><small>'+ps.length+' jugadores registrados</small></span></a>').join('');document.querySelectorAll('[data-crest]').forEach(img=>{img.onerror=()=>handleCrestError(img);img.src=crestUrl(img.dataset.crest)})}
function openRoster(club){const players=allRadarPlayers.filter(p=>p.club===club).sort((a,b)=>(a.name||'').localeCompare(b.name||''));document.getElementById('rosterName').textContent=club;document.getElementById('rosterCount').textContent=players.length+' jugadores · Temporada 2026/27';const img=document.getElementById('rosterCrest');img.dataset.crest=club;img.onerror=()=>handleCrestError(img);img.src=crestUrl(club);document.getElementById('rosterList').innerHTML=players.map(p=>'<div class="roster-player"><div><strong>'+esc(p.name||'Sin nombre')+'</strong><small>'+esc(cleanPosition(p.position))+' · '+esc(p.clubCountry||'')+'</small></div><div class="roster-right">'+(flagUrl(p.nationality)?'<img src="'+flagUrl(p.nationality)+'" width="20" alt="">':'🌍')+'<div>'+((p.age??'—')+' años')+'</div></div></div>').join('');const panel=document.getElementById('rosterPanel');panel.classList.add('show');document.querySelectorAll('.academy-card').forEach(b=>b.classList.toggle('active',b.dataset.club===club));panel.scrollIntoView({behavior:'smooth',block:'nearest'})}
function filterPlayers(){
 const term=document.getElementById('playerSearch').value.trim().toLocaleLowerCase('es');
 const pos=document.getElementById('positionFilter').value;
 const age=document.getElementById('frAgeFilter')?.value||'ALL';
 const sort=document.getElementById('frPlayerSort')?.value||'name';
 const list=allRadarPlayers.filter(p=>
  [p.name,p.club,p.nationality].some(v=>String(v||'').toLocaleLowerCase('es').includes(term))&&
  (pos==='ALL'||cleanPosition(p.position)===pos)&&
  (age==='ALL'||(Number.isFinite(Number(p.age))&&Number(p.age)<=Number(age)))
 );
 list.sort((a,b)=>sort==='age-asc'?(Number(a.age??999)-Number(b.age??999))||String(a.name||'').localeCompare(String(b.name||''),'es'):sort==='age-desc'?(Number(b.age??-1)-Number(a.age??-1))||String(a.name||'').localeCompare(String(b.name||''),'es'):String(a.name||'').localeCompare(String(b.name||''),'es'));
 const counter=document.getElementById('frPlayerCount');if(counter)counter.textContent=list.length+' de '+allRadarPlayers.length+' jugadores';
 renderPlayers(list);
}

let activeRankingTab='global';
function playerRankingScores(p){
 if(p.currentLevel===null||p.currentLevel===undefined||p.prospectScore===null||p.prospectScore===undefined)return null;
 const current=Number(p.currentLevel),prospect=Number(p.prospectScore);
 if(!Number.isFinite(current)||!Number.isFinite(prospect)||current<0||current>100||prospect<0||prospect>100)return null;
 return {current,prospect,combined:Math.round((current+prospect)/2*10)/10};
}
function rankingEligible(p,tab){
 const age=Number(p.age);
 if(tab==='u18')return Number.isFinite(age)&&age<=18;
 if(tab==='u21')return Number.isFinite(age)&&age>=19&&age<=21;
 return true;
}
function renderRankings(){
 const host=document.getElementById('rankingResults');if(!host)return;
 const search=(document.getElementById('rankingSearch')?.value||'').trim().toLowerCase();
 const position=document.getElementById('rankingPosition')?.value||'ALL';
 const club=document.getElementById('rankingClub')?.value||'ALL';

 if(activeRankingTab==='youth'){
  const metric=document.getElementById('rankingMetric')?.value||'goals';
  const labels={goals:'Goles',matchesPlayed:'Partidos',minutesPlayed:'Minutos',assists:'Asistencias',totalAttempts:'Disparos',goalsConceded:'Goles encajados'};
  const players=allRadarPlayers.filter(p=>p.youthLeagueStats&&
   (metric==='goalsConceded'?typeof p.youthLeagueStats.goalsConceded==='number':typeof p.youthLeagueStats[metric]==='number')&&
   (position==='ALL'||cleanPosition(p.position)===position)&&
   (club==='ALL'||p.club===club)&&
   (!search||[p.name,p.club,p.nationality].some(v=>String(v||'').toLowerCase().includes(search))))
   .sort((a,b)=>b.youthLeagueStats[metric]-a.youthLeagueStats[metric]||b.youthLeagueStats.matchesPlayed-a.youthLeagueStats.matchesPlayed)
   .slice(0,100);
  if(!players.length){host.innerHTML='<div class="rank-empty"><span class="rank-status">SIN DATOS PARA ESTE FILTRO</span><strong>No hay registros disponibles en esta categoría.</strong><p>Estamos ampliando la cobertura de la competición club por club. Las estadísticas se muestran únicamente cuando aparecen en una fuente oficial de UEFA.</p></div>';return;}
  host.innerHTML='<table class="ranking-table"><thead><tr><th>#</th><th>Player</th><th>Age</th><th>Club</th><th>PJ</th><th>MIN</th><th>G</th><th>A</th><th>GC</th><th>Source</th></tr></thead><tbody>'+players.map((p,i)=>{const s=p.youthLeagueStats;return '<tr><td class="rank-number">'+(i+1)+'</td><td><div class="rank-player"><img src="'+crestUrl(p.club||'')+'" alt="" onerror="handleCrestError(this)" data-crest="'+esc(p.club||'')+'"><div><strong>'+esc(p.name)+'</strong><small>'+esc(cleanPosition(p.position))+'</small></div></div></td><td>'+esc(p.age??'—')+'</td><td>'+esc(p.club||'')+'</td><td>'+s.matchesPlayed+'</td><td>'+(s.minutesPlayed??'—')+'</td><td>'+(s.goals??'—')+'</td><td>'+(s.assists??'—')+'</td><td>'+(s.goalsConceded??'—')+'</td><td><a class="rank-source" href="'+esc(s.sourceUrl)+'" target="_blank" rel="noopener">UEFA</a></td></tr>'}).join('')+'</tbody></table><p class="rank-muted" style="padding:12px 14px">Ordenado por '+labels[metric]+'. Datos de la UEFA Youth League 2026/27; los campos no publicados se muestran como —.</p>';return;
 }
 if(activeRankingTab==='academies'){
  const clubs=new Map();
  allRadarPlayers.forEach(p=>{const s=playerRankingScores(p);if(!s)return;const name=p.club||'Club no disponible';if(!clubs.has(name))clubs.set(name,[]);clubs.get(name).push(s)});
  const rows=[...clubs.entries()].map(([name,scores])=>({name,count:scores.length,score:scores.reduce((a,s)=>a+s.combined,0)/scores.length,current:scores.reduce((a,s)=>a+s.current,0)/scores.length,prospect:scores.reduce((a,s)=>a+s.prospect,0)/scores.length})).sort((a,b)=>b.score-a.score);
  if(!rows.length){host.innerHTML='<div class="rank-empty"><span class="rank-status">EVALUACIONES PENDIENTES</span><strong>El ranking de academias está preparado.</strong><p>Se activará cuando existan jugadores evaluados con Current Level y Prospect Score. No clasificamos canteras por número de fichas: eso mediría el tamaño de la base, no la calidad de su formación.</p></div>';return;}
  const filtered=rows.filter(r=>r.name.toLowerCase().includes(search));
  host.innerHTML='<table class="ranking-table"><thead><tr><th>#</th><th>Academy</th><th>Players evaluated</th><th>Current avg.</th><th>Prospect avg.</th><th>Academy score</th></tr></thead><tbody>'+filtered.map((r,i)=>'<tr><td class="rank-number">'+(i+1)+'</td><td><div class="rank-player"><img src="'+crestUrl(r.name)+'" alt="" onerror="handleCrestError(this)" data-crest="'+esc(r.name)+'"><div><strong>'+esc(r.name)+'</strong><small>Academy ranking</small></div></div></td><td>'+r.count+'</td><td>'+r.current.toFixed(1)+'</td><td>'+r.prospect.toFixed(1)+'</td><td class="rank-score">'+r.score.toFixed(1)+'</td></tr>').join('')+'</tbody></table>';return;
 }
 const scored=allRadarPlayers.filter(p=>playerRankingScores(p)&&rankingEligible(p,activeRankingTab)&&
  (position==='ALL'||cleanPosition(p.position)===position)&&
  (club==='ALL'||p.club===club)&&
  (!search||[p.name,p.club,p.nationality].some(v=>String(v||'').toLowerCase().includes(search))))
 .map(p=>({...p,scores:playerRankingScores(p)})).sort((a,b)=>b.scores.combined-a.scores.combined||b.scores.prospect-a.scores.prospect).slice(0,100);
 if(!scored.length){host.innerHTML='<div class="rank-empty"><span class="rank-status">EVALUACIONES PENDIENTES</span><strong>El ranking está listo. Faltan las primeras valoraciones.</strong><p>Ya contamos con estadísticas oficiales de la UEFA Youth League para parte de los jugadores. Para el Top 100 combinado aún necesitamos valoraciones individuales de Current Level y Prospect Score: no vamos a convertir goles o edad directamente en una nota de scouting.</p></div>';return;}
 host.innerHTML='<table class="ranking-table"><thead><tr><th>#</th><th>Player</th><th>Age</th><th>Current Level</th><th>Prospect Score</th><th>Future Radar Score</th></tr></thead><tbody>'+scored.map((p,i)=>'<tr><td class="rank-number">'+(i+1)+'</td><td><div class="rank-player"><img src="'+crestUrl(p.club||'')+'" alt="" onerror="handleCrestError(this)" data-crest="'+esc(p.club||'')+'"><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.club||'')+' · '+esc(p.nationality||'')+'</small></div></div></td><td>'+esc(p.age??'—')+'</td><td>'+p.scores.current.toFixed(1)+'</td><td>'+p.scores.prospect.toFixed(1)+'</td><td class="rank-score">'+p.scores.combined.toFixed(1)+'</td></tr>').join('')+'</tbody></table>';
}
function setupRankings(){
 const clubSelect=document.getElementById('rankingClub');
 [...new Set(allRadarPlayers.map(p=>p.club).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;clubSelect.appendChild(o)});
 document.querySelectorAll('[data-ranking-tab]').forEach(btn=>btn.addEventListener('click',()=>{activeRankingTab=btn.dataset.rankingTab;document.querySelectorAll('[data-ranking-tab]').forEach(b=>b.classList.toggle('active',b===btn));document.getElementById('rankingPosition').disabled=activeRankingTab==='academies';document.getElementById('rankingClub').disabled=activeRankingTab==='academies';document.getElementById('rankingMetric').style.display=activeRankingTab==='youth'?'block':'none';renderRankings()}));
 ['rankingSearch','rankingPosition','rankingClub','rankingMetric'].forEach(id=>document.getElementById(id).addEventListener(id==='rankingSearch'?'input':'change',renderRankings));
 renderRankings();
}


const U17_DATA_URL='/u17-world-cup-2026.json';
let u17Data=null;
let u17CompetitionLiveMatches={};
function u17CompetitionMatchKey(date,home,away){return [date,home,away].join('|')}
function u17DateLabel(date){return new Date(date+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'short',timeZone:'UTC'});}
function u17Team(code){return u17Data.teams.find(t=>t.code===code);}
function u17Flag(team,extraClass='u17-flag'){return '<img class="'+extraClass+'" src="'+team.flag+'" alt="Bandera de '+team.name+'" loading="lazy" decoding="async">';}
function renderU17Fixtures(){
 const date=document.getElementById('u17Date').value,group=document.getElementById('u17Group').value,term=document.getElementById('u17TeamSearch').value.trim().toLowerCase();
 const groups=new Map(u17Data.teams.map(t=>[t.code,t.group]));
 const list=u17Data.matches.filter(m=>(date==='ALL'||m.date===date)&&(group==='ALL'||groups.get(m.home)===group)&&(!term||[m.home,m.away].some(code=>{const t=u17Team(code);return (t?.name+' '+code).toLowerCase().includes(term)})));
 document.getElementById('u17Fixtures').innerHTML=list.length?list.map(m=>{
  const home=u17Team(m.home),away=u17Team(m.away),live=u17CompetitionLiveMatches[u17CompetitionMatchKey(m.date,m.home,m.away)];
  const hasScore=live&&live.homeScore!==null&&live.awayScore!==null;
  const score=hasScore?live.homeScore+' - '+live.awayScore:'VS';
  const isLive=live?.status==='LIVE',finished=live?.status==='FT';
  const state=isLive?(live.statusDescription||'EN DIRECTO'):(finished?'FINALIZADO':live?.status==='POSTPONED'?'APLAZADO':live?.status==='CANCELLED'?'CANCELADO':'PROGRAMADO');
  const minute=isLive&&live.minute!==null?' · '+live.minute+"'":'';
  const matchIndex=u17Data.matches.indexOf(m);
  return '<article class="u17-match '+(isLive?'u17-match-live':'')+'" tabindex="0" role="button" data-u17-match="'+matchIndex+'"><div class="u17-match-time">'+m.timeQatar+'<small>'+u17DateLabel(m.date)+'</small></div><div class="u17-match-teams"><div class="u17-match-side">'+u17Flag(home,'u17-match-flag')+'<b>'+home.name+'</b></div><span class="u17-match-score-live">'+score+'</span><div class="u17-match-side">'+u17Flag(away,'u17-match-flag')+'<b>'+away.name+'</b></div></div><div class="u17-match-meta">'+state+minute+'<br>Grupo '+groups.get(m.home)+' · Campo '+m.pitch+'<span class="u17-match-open">VER FICHA ↗</span></div></article>';
 }).join(''):'<div class="empty">No hay partidos para estos filtros.</div>';
}
function renderU17MatchDetail(payload,m){
 const home=u17Team(m.home),away=u17Team(m.away),live=u17CompetitionLiveMatches[u17CompetitionMatchKey(m.date,m.home,m.away)],event=payload.event||live||{};
 const score=event.homeScore!=null&&event.awayScore!=null?event.homeScore+' - '+event.awayScore:(live?.homeScore!=null&&live?.awayScore!=null?live.homeScore+' - '+live.awayScore:'VS');
 const rawStats=payload.statistics;let stats=Array.isArray(rawStats)?rawStats:[];
 if(!stats.length&&rawStats&&typeof rawStats==='object'){
  const hs=rawStats.T1||rawStats.home||rawStats.Home||rawStats.homeStats,as=rawStats.T2||rawStats.away||rawStats.Away||rawStats.awayStats;
  if(Array.isArray(hs)&&Array.isArray(as))stats=hs.map((v,i)=>({name:v.Nm||v.name||v.Tp||('Estadística '+(i+1)),home:v.Vl??v.value??v.v??v,away:as[i]?.Vl??as[i]?.value??as[i]?.v??as[i] }));
  else stats=Object.entries(rawStats).map(([name,v])=>({name,home:Array.isArray(v)?v[0]:(v?.home??v?.T1??null),away:Array.isArray(v)?v[1]:(v?.away??v?.T2??null)})).filter(x=>x.home!==null||x.away!==null);
 }
 const statHtml=stats.length?'<div class="u17-detail-section"><h3>ESTADÍSTICAS</h3><div class="u17-detail-grid">'+stats.map(x=>'<div class="u17-detail-stat"><b>'+esc(x.home??'—')+'</b><span>'+esc(x.name||'Dato')+'</span><b>'+esc(x.away??'—')+'</b></div>').join('')+'</div></div>':'<div class="u17-detail-section"><h3>ESTADÍSTICAS</h3><p class="u17-detail-note">El proveedor no facilita estadísticas verificables para este partido.</p></div>';
 const xi=payload.lineups||{},h=xi.home||[],a=xi.away||[];
 const lineup=(h.length||a.length)?'<div class="u17-detail-section"><h3>ALINEACIONES</h3><div class="u17-detail-lineups"><div><b>'+esc(home.name)+'</b><ol>'+h.map(p=>'<li>'+esc(p.number||'')+' '+esc(p.name)+'</li>').join('')+'</ol></div><div><b>'+esc(away.name)+'</b><ol>'+a.map(p=>'<li>'+esc(p.number||'')+' '+esc(p.name)+'</li>').join('')+'</ol></div></div></div>':'<div class="u17-detail-section"><h3>ALINEACIONES</h3><p class="u17-detail-note">Las alineaciones oficiales todavía no están disponibles en la fuente.</p></div>';
 const potm=payload.playerOfTheMatch?.name?'<div class="u17-detail-section" data-match-pane="events"><h3>JUGADOR DEL PARTIDO · FIFA</h3><p>'+esc(payload.playerOfTheMatch.name)+'</p></div>':'';
 const incidents=Array.isArray(payload.incidents)?payload.incidents:[];const goals=incidents.filter(i=>/goal|gol/i.test(String(i.type||i.Ty||i.name||'')));const eventRow=i=>{const minute=i.minute??i.Ps??i.Min??'—',player=i.player||i.Pnm||i.Nm||'Autor sin confirmar',side=i.side==='home'?home.name:i.side==='away'?away.name:'',type=i.type||i.Ty||i.name||'Evento';return '<div class="u17-detail-event"><strong>'+esc(String(minute).replace(/'$/,'')+"'")+'</strong> · '+esc(type)+' · '+esc(player)+(side?' · '+esc(side):'')+'</div>'};const events='<div class="u17-detail-section"><h3>GOLES Y MINUTOS</h3>'+(goals.length?goals.map(eventRow).join(''):'<p class="u17-detail-note">No hay goleadores y minutos verificados para este partido.</p>')+'<h3>OTROS EVENTOS</h3>'+(incidents.length>goals.length?incidents.filter(i=>!goals.includes(i)).map(eventRow).join(''):'<p class="u17-detail-note">Sin otros eventos verificados.</p>')+'</div>';
 const verifiedSource=payload.officialReportUrl||payload.source||'';
 const safeSource=typeof verifiedSource==='string'&&/^https:\/\//i.test(verifiedSource)?verifiedSource:'';
 const reportSourceHtml='<div class="u17-detail-section" data-match-pane="sources"><h3>DOCUMENTACIÓN DEL PARTIDO</h3>'+(safeSource?'<p><a href="'+esc(safeSource)+'" target="_blank" rel="noopener noreferrer" style="color:var(--green);text-decoration:underline">Abrir informe o fuente del partido ↗</a></p>':'<p class="u17-detail-note">No hay un informe enlazado para este encuentro.</p>')+'<p class="u17-detail-note">Estadísticas: '+(stats.length?'informe disponible':'sin cobertura verificada')+' · Alineaciones: '+(h.length===11&&a.length===11?'completas':'incompletas o no disponibles')+' · Eventos: '+(incidents.length?'registrados':'no disponibles')+'.</p><p class="u17-detail-note">Los informes FIFA y los marcadores archivados tienen distinta procedencia. No se presentan como información en directo.</p></div>';
 const provider=payload.alternativeProvider;
 const providerHtml=provider?'<div class="u17-detail-section" data-match-pane="sources"><h3>FUENTES ADICIONALES</h3><p class="u17-detail-note">YSscores dispone de una ficha externa para este encuentro. No se incrusta porque algunos proveedores bloquean la visualización y pueden dejar paneles vacíos.</p><p><a href="'+esc(provider.lineupUrl)+'" target="_blank" rel="noopener" style="color:var(--green);text-decoration:underline">Consultar alineaciones en YSscores ↗</a></p><p><a href="'+esc(provider.matchUrl)+'" target="_blank" rel="noopener" style="color:var(--green);text-decoration:underline">Consultar estadísticas y eventos en YSscores ↗</a></p></div>':'';
 document.getElementById('u17DetailContent').innerHTML='<div class="u17-detail-score"><div class="u17-detail-side">'+u17Flag(home,'')+esc(home.name)+'</div><div class="u17-detail-result">'+score+'</div><div class="u17-detail-side">'+u17Flag(away,'')+esc(away.name)+'</div></div><p class="u17-detail-note">'+u17DateLabel(m.date)+' · '+m.timeQatar+' · '+esc(event.statusDescription||live?.statusDescription||'Programado')+'</p><div class="u17-detail-tabs" role="tablist"><button type="button" class="active" data-detail-tab="stats">Estadísticas</button><button type="button" data-detail-tab="lineups">Alineaciones</button><button type="button" data-detail-tab="events">Eventos</button><button type="button" data-detail-tab="sources">Fuentes</button></div><p class="u17-detail-note">Última consulta: '+esc(payload.updatedAt?new Date(payload.updatedAt).toLocaleTimeString('es-ES'):'sin confirmar')+' · ID '+esc(payload.matchKey||m.date+':'+m.home+':'+m.away)+'</p>'+statHtml+lineup+events+potm+reportSourceHtml+providerHtml+'<p class="u17-detail-note">Fuentes: informes oficiales FIFA y archivo histórico de Future Radar. Los datos no disponibles no se estiman.</p>';
 const content=document.getElementById('u17DetailContent');content.querySelectorAll('.u17-detail-section').forEach((section,i)=>{if(!section.dataset.matchPane)section.dataset.matchPane=['stats','lineups','events','sources'][i]||'sources'});
 const activate=tab=>{content.querySelectorAll('[data-detail-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.detailTab===tab);b.setAttribute('aria-selected',String(b.dataset.detailTab===tab))});content.querySelectorAll('[data-match-pane]').forEach(section=>{section.hidden=section.dataset.matchPane!==tab})};
 content.querySelectorAll('[data-detail-tab]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.detailTab)));activate('stats');
}
let activeU17MatchIndex=null;
async function openU17Match(index){
 activeU17MatchIndex=index;
 const m=u17Data.matches[index],home=u17Team(m.home),away=u17Team(m.away);
 document.getElementById('u17DetailTitle').textContent=home.name+' vs '+away.name;
 const overlay=document.getElementById('u17DetailOverlay');
 overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
 document.body.style.overflow='hidden';
 document.getElementById('u17DetailContent').innerHTML='<p class="u17-detail-note">Consultando Future Radar API…</p>';
 try{
  const q=new URLSearchParams({date:m.date,home:m.home,away:m.away});
  const response=await fetch('/api/future-radar-u17?'+q,{cache:'no-store'});
  if(!response.ok)throw new Error('Future Radar API '+response.status);
  const match=await response.json();
  renderU17MatchDetail(match,m);
 }catch(error){
  const archived=u17CompetitionLiveMatches[u17CompetitionMatchKey(m.date,m.home,m.away)];
  renderU17MatchDetail({event:archived||null,statistics:null,lineups:null,incidents:[],matchKey:m.date+':'+m.home+':'+m.away},m);
  const notice=document.createElement('p');
  notice.className='u17-detail-note';
  notice.textContent='No se pudo consultar Future Radar API. Mostrando el último marcador almacenado.';
  document.getElementById('u17DetailContent').prepend(notice);
 }
}
function closeU17Match(){activeU17MatchIndex=null;document.getElementById('u17DetailOverlay').classList.remove('open');document.getElementById('u17DetailOverlay').setAttribute('aria-hidden','true');document.body.style.overflow=''}

function u17NormalizeEngineMatch(match){
 const homeCode=match.home?.code||match.homeCode,awayCode=match.away?.code||match.awayCode;
 if(!match.date||!homeCode||!awayCode)return null;
 return {
   date:match.date,homeCode,awayCode,
   homeScore:match.home?.score??match.homeScore??null,
   awayScore:match.away?.score??match.awayScore??null,
   status:match.status||'SCHEDULED',
   statusDescription:match.statusDescription||match.status||'',
   minute:match.minute??null,
   source:match.source||'',
   verifiedAt:match.verifiedAt||match.archivedAt||null
 };
}
async function refreshU17CompetitionLive(){
 if(!u17Data?.matches?.length)return;
 const status=document.getElementById('u17LiveStatus');
 try{
  const response=await fetch('/api/future-radar-u17',{cache:'no-store'});
  if(!response.ok)throw new Error('Future Radar API '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.matches))throw new Error('Invalid Future Radar API response');
  const next={};
  for(const raw of data.matches){
   const match=u17NormalizeEngineMatch(raw);
   if(match)next[u17CompetitionMatchKey(match.date,match.homeCode,match.awayCode)]=match;
  }
  u17CompetitionLiveMatches=next;
  renderU17Fixtures();
  renderU17Groups();
  if(status)status.textContent='Future Radar API · '+data.coverage.archiveWithScores+' marcadores · '+data.coverage.officialReports+' informes FIFA · '+data.coverage.completeLineups+' alineaciones completas · Archivo '+(data.coverage.archiveTimestamp||'sin fecha')+' · No es un servicio en directo';
 }catch(error){
  console.warn('Future Radar API:',error);
  if(status)status.textContent='Future Radar API no disponible; mostrando datos almacenados';
 }
}
function calculateU17GroupStandings(group){
 const teams=u17Data.teams.filter(t=>t.group===group);
 const table=new Map(teams.map(t=>[t.code,{team:t,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,live:0}]));
 for(const fixture of u17Data.matches.filter(m=>m.stage==='group'&&teams.some(t=>t.code===m.home)&&teams.some(t=>t.code===m.away))){
  const result=u17CompetitionLiveMatches[u17CompetitionMatchKey(fixture.date,fixture.home,fixture.away)];
  if(!result||!['FT','LIVE'].includes(result.status)||result.homeScore===null||result.awayScore===null||!Number.isFinite(Number(result.homeScore))||!Number.isFinite(Number(result.awayScore)))continue;
  const home=table.get(fixture.home),away=table.get(fixture.away),hs=Number(result.homeScore),as=Number(result.awayScore);
  home.played++;away.played++;home.gf+=hs;home.ga+=as;away.gf+=as;away.ga+=hs;
  if(result.status==='LIVE'){home.live++;away.live++}
  if(hs>as){home.wins++;home.points+=3;away.losses++}
  else if(hs<as){away.wins++;away.points+=3;home.losses++}
  else{home.draws++;away.draws++;home.points++;away.points++}
 }
 return [...table.values()].map(row=>({...row,gd:row.gf-row.ga})).sort((a,b)=>b.points-a.points||b.gd-a.gd||b.gf-a.gf||b.wins-a.wins||a.team.name.localeCompare(b.team.name,'es'));
}
function renderU17Groups(){
 const letters='ABCDEFGHIJKL'.split('');
 const host=document.getElementById('u17Groups');
 host.innerHTML='<div class="u17-group-legend"><span><b>PJ</b> Partidos</span><span><b>DG</b> Diferencia</span><span><b>Pts</b> Puntos</span><span>Clasificación provisional · incluye partidos en directo</span></div>'+letters.map(g=>{
  const rows=calculateU17GroupStandings(g);
  return '<article class="u17-group"><h3><span>GRUPO '+g+'</span><small>'+rows.filter(r=>r.played>0).length+'/4</small></h3><div style="overflow-x:auto"><table class="u17-group-table"><thead><tr><th>Selección</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><td><span class="u17-group-team"><b class="u17-pos">'+(i+1)+'</b>'+u17Flag(r.team,'')+'<span>'+esc(r.team.name)+(r.live?' <i style="color:var(--green);font-style:normal">●</i>':'')+'</span></span></td><td>'+r.played+'</td><td>'+r.wins+'</td><td>'+r.draws+'</td><td>'+r.losses+'</td><td>'+(r.gd>0?'+':'')+r.gd+'</td><td class="u17-points">'+r.points+'</td></tr>').join('')+'</tbody></table></div><div class="u17-group-foot">'+rows.reduce((n,r)=>n+r.played,0)/2+' partidos contabilizados</div></article>';
 }).join('');
}

let u17SquadPlayers=[];
let u17SquadsLoaded=false;
let u17SelectedTeam='ALL';
function renderU17SquadResults(){
 const position=document.getElementById('u17SquadPosition').value,term=document.getElementById('u17SquadSearch').value.trim().toLowerCase();
 const list=u17SquadPlayers.filter(p=>p.nationalTeamCode===u17SelectedTeam&&(position==='ALL'||p.position===position)&&(!term||[p.name,p.club,p.nationalTeam].some(v=>String(v||'').toLowerCase().includes(term))));
 const selected=u17Data.teams.find(t=>t.code===u17SelectedTeam);
 document.getElementById('u17SquadCount').textContent=list.length+' jugadores · '+(selected?.name||u17SelectedTeam);
 document.getElementById('u17SquadResults').innerHTML=list.length?'<div class="u17-squad-table-wrap"><table class="u17-squad-table"><thead><tr><th>#</th><th>Jugador</th><th>Posición</th><th>Edad</th><th>Fecha nacimiento</th><th>Altura</th><th>Club</th></tr></thead><tbody>'+list.map(p=>'<tr><td>'+p.squadNumber+'</td><td class="u17-squad-player">'+esc(p.name)+'</td><td>'+esc(cleanPosition(p.position))+'</td><td>'+p.age+'</td><td>'+esc(p.dateOfBirth)+'</td><td>'+(p.heightCm?p.heightCm+' cm':'—')+'</td><td class="u17-squad-club">'+esc(p.club||'—')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Esta selección no tiene jugadores en el PDF oficial recibido. No añadiremos nombres estimados.</div>';
}
function openU17SquadTeam(code){
 const team=u17Data.teams.find(t=>t.code===code);if(!team)return;
 u17SelectedTeam=code;
 document.getElementById('u17SquadCountryGrid').hidden=true;
 document.getElementById('u17SquadDetail').hidden=false;
 document.getElementById('u17SquadSelected').innerHTML=u17Flag(team,'')+'<span>'+esc(team.name)+'</span><small style="font-size:11px;color:var(--muted);font-weight:500">Grupo '+esc(team.group||'—')+'</small>';
 document.getElementById('u17SquadSearch').value='';document.getElementById('u17SquadPosition').value='ALL';renderU17SquadResults();
}
function renderU17SquadCountries(){
 const counts=new Map();u17SquadPlayers.forEach(p=>counts.set(p.nationalTeamCode,(counts.get(p.nationalTeamCode)||0)+1));
 const host=document.getElementById('u17SquadCountryGrid');
 host.innerHTML=u17Data.teams.map(team=>'<button type="button" class="u17-country-card" data-u17-country="'+esc(team.code)+'">'+u17Flag(team,'u17-country-flag')+'<span class="u17-country-info"><strong>'+esc(team.name)+'</strong><small>Grupo '+esc(team.group||'—')+'</small></span><span class="u17-country-count">'+(counts.get(team.code)||0)+'/21</span></button>').join('');
 host.querySelectorAll('[data-u17-country]').forEach(button=>button.addEventListener('click',()=>openU17SquadTeam(button.dataset.u17Country)));
}
async function loadU17Squads(){
 if(u17SquadsLoaded){document.getElementById('u17SquadCountryGrid').hidden=false;document.getElementById('u17SquadDetail').hidden=true;return}
 const status=document.getElementById('u17SquadStatus');status.innerHTML='Cargando las convocatorias oficiales de FIFA desde la base de datos…';
 try{
  const response=await FutureRadarData.response('u17Squads');if(!response.ok)throw new Error('No se pudo cargar la base de convocatorias ('+response.status+')');
  const payload=await response.json();if(!Array.isArray(payload.teams)||!payload.teams.length)throw new Error('La base de datos no contiene selecciones');
  const positionMap={PO:'GK',DF:'DEF',MC:'CM',DC:'ST'},sourceUrl='https://fdp.fifa.org/assetspublic/ce303/pdf/SquadLists-Spanish.pdf';
  u17SquadPlayers=payload.teams.flatMap(team=>(team.players||[]).map(p=>({...p,name:[p.givenNames,p.surnames].filter(Boolean).join(' ')||p.playerName,position:positionMap[p.positionCode]||p.positionCode,age:p.ageAtTournamentStart,squadNumber:p.shirtNumber,nationalTeam:team.teamName,nationalTeamCode:team.teamCode,competition:payload.tournament.name,sourceUrl})));
  const known=new Map(allRadarPlayers.map((p,i)=>[[String(p.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),String(p.dateOfBirth||'')].join('|'),i]));
  let added=0,matched=0;
  for(const player of u17SquadPlayers){const key=[String(player.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),String(player.dateOfBirth||'')].join('|');const link={competition:player.competition,nationalTeam:player.nationalTeam,nationalTeamCode:player.nationalTeamCode,squadNumber:player.squadNumber,sourceUrl};if(known.has(key)){allRadarPlayers[known.get(key)].worldCupSquad=link;matched++}else{allRadarPlayers.push({...player,nationality:player.nationalTeamCode,worldCupSquad:link});known.set(key,allRadarPlayers.length-1);added++}}
  u17SquadsLoaded=true;
  document.getElementById('u17SquadBack').addEventListener('click',()=>{document.getElementById('u17SquadDetail').hidden=true;document.getElementById('u17SquadCountryGrid').hidden=false});
  document.getElementById('u17SquadPosition').addEventListener('change',renderU17SquadResults);document.getElementById('u17SquadSearch').addEventListener('input',renderU17SquadResults);
  document.getElementById('heroCount').innerHTML=allRadarPlayers.length+' <small>perfiles registrados</small>';const clubs=[...new Set(allRadarPlayers.map(p=>p.club).filter(Boolean))];document.getElementById('clubCount').textContent=clubs.length;renderPlayers(allRadarPlayers);renderAcademies();loadCrests(clubs);
  const rankingClub=document.getElementById('rankingClub');if(rankingClub){const present=new Set([...rankingClub.options].map(o=>o.value));clubs.forEach(c=>{if(!present.has(c)){const o=document.createElement('option');o.value=c;o.textContent=c;rankingClub.appendChild(o)}})}
  renderU17SquadCountries();
  const missingTeams=payload.teams.filter(t=>!t.players?.length).map(t=>t.teamName);
  status.innerHTML='<strong>Base FIFA cargada:</strong> '+u17SquadPlayers.length+' jugadores de '+payload.summary.teamsWithSquadsInDocument+' convocatorias completas. '+added+' perfiles nuevos añadidos a Future Radar y '+matched+' vinculados con perfiles existentes.'+(missingTeams.length?' Convocatoria no incluida en el PDF: '+missingTeams.join(', ')+'.':'')+' <a href="'+sourceUrl+'" target="_blank" rel="noopener" style="color:var(--green);text-decoration:underline">Fuente oficial FIFA ↗</a>';
 }catch(error){status.textContent='No se pudo cargar la base de convocatorias: '+error.message+'. Puedes consultar el PDF oficial enlazado arriba.';console.error(error)}
}

async function setupU17(){
 try{const r=await FutureRadarData.response('u17');if(!r.ok)throw new Error('U17 data unavailable');u17Data=await r.json();
 document.getElementById('u17TeamCount').textContent=u17Data.teams.length;document.getElementById('u17MatchCount').textContent=u17Data.matches.length;
 [...new Set(u17Data.matches.map(m=>m.date))].sort().forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=u17DateLabel(d);document.getElementById('u17Date').appendChild(o)});
 ['u17Date','u17Group'].forEach(id=>document.getElementById(id).addEventListener('change',renderU17Fixtures));document.getElementById('u17TeamSearch').addEventListener('input',renderU17Fixtures);
 const fixtureHost=document.getElementById('u17Fixtures');
 fixtureHost.addEventListener('click',e=>{const card=e.target.closest('[data-u17-match]');if(card)openU17Match(Number(card.dataset.u17Match))});
 fixtureHost.addEventListener('keydown',e=>{const card=e.target.closest('[data-u17-match]');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openU17Match(Number(card.dataset.u17Match))}});
 document.getElementById('u17DetailClose').addEventListener('click',closeU17Match);
 document.getElementById('u17DetailOverlay').addEventListener('click',e=>{if(e.target.id==='u17DetailOverlay')closeU17Match()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeU17Match()});
 document.querySelectorAll('[data-u17-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-u17-tab]').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('u17FixturesPanel').hidden=b.dataset.u17Tab!=='fixtures';document.getElementById('u17GroupsPanel').hidden=b.dataset.u17Tab!=='groups';document.getElementById('u17SquadsPanel').hidden=b.dataset.u17Tab!=='squads';const statsPanel=document.getElementById('u17PlayerStatsPanel');if(statsPanel)statsPanel.hidden=b.dataset.u17Tab!=='playerstats';if(b.dataset.u17Tab==='playerstats'&&statsPanel)loadU17PlayerStats();if(b.dataset.u17Tab==='squads')loadU17Squads()}));
 renderU17Fixtures();renderU17Groups();
 refreshU17CompetitionLive();setInterval(()=>{refreshU17CompetitionLive();if(activeU17MatchIndex!==null)openU17Match(activeU17MatchIndex)},60000);
 }catch(e){document.getElementById('u17Fixtures').innerHTML='<div class="empty">No se ha podido cargar el calendario U17.</div>';console.error(e)}
}



let youthLeagueMatches=[];
const youthTeamKey={
 'AEK Athens':'AEK Athens U19','Arsenal':'Arsenal U19','Aston Villa':'Aston Villa U19','Atlético de Madrid':'Atlético de Madrid U19','Barcelona':'Barcelona U19','Bayern München':'Bayern München U19','Bodø/Glimt':'Bodø/Glimt U19','Borussia Dortmund':'Borussia Dortmund U19','Club Brugge':'Club Brugge U19','Como':'Como U20','Porto':'FC Porto U19','Fenerbahçe':'Fenerbahçe U19','Feyenoord':'Feyenoord U19','Galatasaray':'Galatasaray U19','Inter':'Inter U20','LASK':'LASK Linz U19','Lens':'Lens U19','Lille':'Lille U19','Liverpool':'Liverpool U19','Manchester City':'Manchester City U19','Manchester United':'Manchester United U19','Napoli':'Napoli U19','PSV Eindhoven':'PSV Eindhoven U19','Paris Saint-Germain':'Paris Saint-Germain U19','Leipzig':'RB Leipzig U19','Real Betis':'Real Betis U19','Real Madrid':'Real Madrid U19','Roma':'Roma U20','Sabah':'Sabah U19','Shakhtar Donetsk':'Shakhtar Donetsk U19','Slavia Praha':'Slavia Praha U19','Sporting CP':'Sporting CP U19','Stuttgart':'VfB Stuttgart U19','Viking':'Viking FK U19','Villarreal':'Villarreal U19','Slovan Bratislava':'ŠK Slovan Bratislava U19'
};
function youthCrest(team){const key=youthTeamKey[team];return key?crestUrl(key):crestFallback(team)}
function renderYouthCalendar(){
 const day=document.getElementById('youthMatchdayFilter').value;
 const status=document.getElementById('youthMatchStatusFilter').value;
 const q=document.getElementById('youthTeamFilter').value.trim().toLocaleLowerCase();
 const matches=youthLeagueMatches.filter(m=>(day==='ALL'||String(m.matchday)===day)&&(status==='ALL'||m.status===status)&&(!q||(m.home+' '+m.away).toLocaleLowerCase().includes(q)));
 const host=document.getElementById('youthCalendarGrid');
 const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'short'});
 host.innerHTML=matches.map(m=>{
  const finished=m.status==='FT';
  const homeScore=finished?m.homeScore:'—',awayScore=finished?m.awayScore:'—';
  const when=finished?'Finalizado':(m.kickoff||'Hora por confirmar')+' CET';
  const idx=youthLeagueMatches.indexOf(m);
  return '<button type="button" class="youth-match" data-youth-match="'+idx+'" aria-label="Abrir ficha del partido '+esc(m.home)+' contra '+esc(m.away)+'"><div class="youth-match-top"><span>Jornada '+m.matchday+' · '+fmt(m.date)+'</span><span class="youth-match-status '+(finished?'':'upcoming')+'">'+(finished?'FT':'PRÓXIMO')+'</span></div><div class="youth-match-row"><span class="youth-match-team-wrap"><img class="youth-match-crest" src="'+esc(youthCrest(m.home))+'" data-crest="'+esc(youthTeamKey[m.home]||m.home)+'" alt="" onerror="handleCrestError(this)"><span class="youth-match-team" title="'+esc(m.home)+'">'+esc(m.home)+'</span></span><span class="youth-match-score '+(finished?'':'pending')+'">'+homeScore+'</span></div><div class="youth-match-row"><span class="youth-match-team-wrap"><img class="youth-match-crest" src="'+esc(youthCrest(m.away))+'" data-crest="'+esc(youthTeamKey[m.away]||m.away)+'" alt="" onerror="handleCrestError(this)"><span class="youth-match-team" title="'+esc(m.away)+'">'+esc(m.away)+'</span></span><span class="youth-match-score '+(finished?'':'pending')+'">'+awayScore+'</span></div><div class="youth-match-bottom"><span class="youth-match-day">'+(finished?'RESULTADO':'HORARIO')+'</span><span>'+when+'</span></div><div class="youth-match-open">Ver ficha del partido ↗</div></button>';
 }).join('')||'<div class="empty">No hay partidos que coincidan con tu búsqueda.</div>';
}

function apiStatValue(value,suffix=''){if(value===null||value===undefined||value===''||value==='-')return '—';if(typeof value==='number'&&!Number.isFinite(value))return '—';return String(value)+suffix;}
function renderYouthApiStats(data,m){
 const host=document.getElementById('youthMatchStats');if(!host)return;
 if(!data||!data.available){const finished=m.status==='FT'&&Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore);const official=m.uefaMatchUrl||'https://www.uefa.com/uefayouthleague/fixtures-results/';host.innerHTML='<div class="youth-api-section"><h3>Datos confirmados del encuentro</h3>'+(finished?'<div class="youth-api-grid"><div class="youth-api-stat"><small>Goles</small><div class="youth-api-duel"><div><b>'+esc(m.home)+'</b><span>'+m.homeScore+'</span></div><div><b>'+esc(m.away)+'</b><span>'+m.awayScore+'</span></div></div></div><div class="youth-api-stat"><small>Total de goles</small><strong>'+(m.homeScore+m.awayScore)+'</strong></div></div>':'<p class="youth-api-note">El encuentro aún no tiene un resultado final verificado en nuestra base de datos.</p>')+'<p class="youth-api-note">Posesión, tiros, córneres, faltas, alineaciones y eventos: pendientes de datos verificables. No se generan estadísticas estimadas.</p><p class="youth-api-note">'+esc(data?.message||'El proveedor de estadísticas no está disponible.')+'</p><div class="youth-match-source-actions"><a class="uefa-link" href="'+esc(official)+'" target="_blank" rel="noopener noreferrer">FUENTE UEFA ↗</a>'+(m.sofascoreUrl?'<a class="uefa-link" href="'+esc(m.sofascoreUrl)+'" target="_blank" rel="noopener noreferrer">ESTADÍSTICAS EXTERNAS ↗</a>':'')+'</div></div>';return;}
 const s=data.stats||{},home=m.home,away=m.away;
 const pairs=[['Posesión','team_a_possession','team_b_possession','%'],['Tiros totales','team_a_shots','team_b_shots',''],['Tiros a puerta','team_a_shotsOnTarget','team_b_shotsOnTarget',''],['Tiros fuera','team_a_shotsOffTarget','team_b_shotsOffTarget',''],['Córneres','team_a_corners','team_b_corners',''],['Faltas','team_a_fouls','team_b_fouls',''],['Fueras de juego','team_a_offsides','team_b_offsides',''],['Amarillas','team_a_yellow_cards','team_b_yellow_cards',''],['Rojas','team_a_red_cards','team_b_red_cards','']];
 const cards=pairs.filter(p=>s[p[1]]!==undefined||s[p[2]]!==undefined).map(p=>{let a=s[p[1]],b=s[p[2]];if(p[0]==='Posesión'){if(Number(a)<=1&&a!==null&&a!==undefined)a=Number(a)*100;if(Number(b)<=1&&b!==null&&b!==undefined)b=Number(b)*100;}const av=apiStatValue(a,p[3]),bv=apiStatValue(b,p[3]);const na=Number(a),nb=Number(b),total=na+nb;const meter=p[0]==='Posesión'&&Number.isFinite(total)&&total>0?'<div class="youth-api-meter"><i style="width:'+Math.max(0,Math.min(100,na/total*100))+'%"></i><i style="width:'+Math.max(0,Math.min(100,nb/total*100))+'%"></i></div>':'';return '<div class="youth-api-stat"><small>'+p[0]+'</small><div class="youth-api-duel"><div><b>'+esc(home)+'</b><span>'+esc(av)+'</span></div><div><b>'+esc(away)+'</b><span>'+esc(bv)+'</span></div></div>'+meter+'</div>';}).join('');
 const xi=data.lineups||{};const list=v=>Array.isArray(v)?v.map(x=>typeof x==='string'?x:(x.name||x.full_name||x.player_name||x.player?.name||'')).filter(Boolean):[];
 const hxi=list(xi.home||xi.team_a||xi.localteam||[]),axi=list(xi.away||xi.team_b||xi.visitorteam||[]);
 const lineup=(hxi.length||axi.length)?'<div class="youth-api-section"><h3>Alineaciones</h3><div class="youth-api-xi"><div><h4>'+esc(home)+'</h4><ol>'+hxi.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ol></div><div><h4>'+esc(away)+'</h4><ol>'+axi.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ol></div></div></div>':'';
 host.innerHTML='<div class="youth-api-stats">'+(cards?'<div class="youth-api-section"><h3>Estadísticas de equipo</h3><div class="youth-api-grid">'+cards+'</div></div>':'<div class="youth-api-section"><p class="youth-api-note">La fuente no ha facilitado estadísticas de equipo para este partido.</p></div>')+lineup+'<div class="youth-api-source">Datos de partido · FootyStats API · Estadísticas posteriores al encuentro</div></div>';
}
async function loadYouthMatchStats(m){
 const host=document.getElementById('youthMatchStats');if(!host)return;host.innerHTML='<div class="youth-api-section"><div class="data-status"><i class="data-dot"></i> Consultando proveedor de estadísticas…</div><p class="youth-api-note">Buscando el encuentro y sus datos contrastados.</p></div>';
 try{const params=new URLSearchParams({date:m.date,home:m.home,away:m.away});const response=await fetch('/api/youth-match-stats?'+params.toString());const payload=await response.json();if(!response.ok)throw new Error(payload.message||payload.error||'No se pudo consultar el proveedor');renderYouthApiStats(payload,m);}catch(error){renderYouthApiStats({available:false,message:error.message||'Error de conexión con el proveedor.'},m);}
}
function openYouthMatch(index){
 const m=youthLeagueMatches[index];if(!m)return;const finished=m.status==='FT';const modal=document.getElementById('youthMatchModal');const officialUrl=m.uefaMatchUrl||'https://www.uefa.com/uefayouthleague/fixtures-results/';const fmt=new Date(m.date+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 document.getElementById('youthMatchModalContent').innerHTML='<h2 id="youthMatchModalTitle" style="font:700 22px Space Grotesk;margin:18px 0 0">Ficha del partido</h2>'+'<div class="youth-match-scoreboard"><div class="youth-match-club"><img src="'+esc(youthCrest(m.home))+'" alt="" onerror="handleCrestError(this)" data-crest="'+esc(youthTeamKey[m.home]||m.home)+'"><span>'+esc(m.home)+'</span></div><div class="youth-match-bigscore">'+(finished?m.homeScore+' - '+m.awayScore:'VS')+'</div><div class="youth-match-club"><img src="'+esc(youthCrest(m.away))+'" alt="" onerror="handleCrestError(this)" data-crest="'+esc(youthTeamKey[m.away]||m.away)+'"><span>'+esc(m.away)+'</span></div></div>'+'<div class="youth-match-detail-grid"><div class="youth-match-detail-cell"><small>Fecha</small><strong>'+fmt+'</strong></div><div class="youth-match-detail-cell"><small>Competición</small><strong>UEFA Youth League</strong></div><div class="youth-match-detail-cell"><small>Jornada</small><strong>'+m.matchday+'</strong></div><div class="youth-match-detail-cell"><small>Estado</small><strong>'+(finished?'Finalizado':'Próximo')+'</strong></div></div>'+'<div class="youth-match-data-head"><strong>Estadísticas del partido</strong><span>Datos integrados</span></div><div id="youthMatchStats" class="youth-match-data-panel"><p class="youth-api-note">Cargando datos…</p></div>'+'<div class="youth-match-source-actions"><a class="uefa-link" href="'+esc(officialUrl)+'" target="_blank" rel="noopener">CENTRO OFICIAL UEFA ↗</a>'+(m.sofascoreUrl?'<a class="uefa-link" href="'+esc(m.sofascoreUrl)+'" target="_blank" rel="noopener noreferrer">ESTADÍSTICAS EN SOFASCORE ↗</a>':'')+'</div>';
 modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';loadYouthMatchStats(m);
}
function closeYouthMatch(){const modal=document.getElementById('youthMatchModal');modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';}
async function setupYouthCalendar(){
 const host=document.getElementById('youthCalendarGrid');
 try{
  const response=await FutureRadarData.response('youth');
  if(!response.ok)throw new Error('No se pudo cargar el calendario');
  const data=await response.json();youthLeagueMatches=data.matches||[];
  document.getElementById('youthMatchdayFilter').addEventListener('change',renderYouthCalendar);
  document.getElementById('youthMatchStatusFilter').addEventListener('change',renderYouthCalendar);
  document.getElementById('youthTeamFilter').addEventListener('input',renderYouthCalendar);
  host.addEventListener('click',e=>{const card=e.target.closest('[data-youth-match]');if(card)openYouthMatch(Number(card.dataset.youthMatch));});
  document.getElementById('youthMatchClose').addEventListener('click',closeYouthMatch);
  document.getElementById('youthMatchModal').addEventListener('click',e=>{if(e.target.id==='youthMatchModal')closeYouthMatch();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeYouthMatch();});
  renderYouthCalendar();
  loadCrests([...new Set(youthLeagueMatches.flatMap(m=>[youthTeamKey[m.home],youthTeamKey[m.away]]).filter(Boolean))]);
 }catch(error){host.innerHTML='<div class="empty">No se ha podido cargar el calendario de la Youth League. Recarga la página.</div>';console.error(error)}
}

async function init(){try{const r=await FutureRadarData.response('players');if(!r.ok)throw new Error('No se pudo cargar el archivo de jugadores');allRadarPlayers=await r.json();const clubs=[...new Set(allRadarPlayers.map(p=>p.club).filter(Boolean))];document.getElementById('heroCount').innerHTML=allRadarPlayers.length+' <small>perfiles registrados</small>';document.getElementById('clubCount').textContent=clubs.length;filterPlayers();renderAcademies();setupRankings();loadCrests(clubs)}catch(e){document.getElementById('playerGrid').innerHTML='<div class="empty">No se ha podido cargar la base de datos. Recarga la página en unos segundos.</div>';document.getElementById('academiesContainer').innerHTML='<div class="empty">No se han podido cargar las canteras.</div>';console.error(e)}}
document.getElementById('playerSearch').addEventListener('input',filterPlayers);document.getElementById('positionFilter').addEventListener('change',filterPlayers);document.getElementById('frAgeFilter').addEventListener('change',filterPlayers);document.getElementById('frPlayerSort').addEventListener('change',filterPlayers);document.getElementById('academySearch').addEventListener('input',renderAcademies);document.getElementById('closeRoster').addEventListener('click',()=>document.getElementById('rosterPanel').classList.remove('show'));document.addEventListener('DOMContentLoaded',()=>{init();setupU17();setupYouthCalendar();setInterval(()=>{if(!document.hidden&&u17Data?.matches?.length)refreshU17CompetitionLive()},60000)});

let u17PlayerStatsLoaded=false;
async function loadU17PlayerStats(){
 const host=document.getElementById('u17PlayerStatsPanel');
 if(u17PlayerStatsLoaded)return;
 host.innerHTML='<p class="rank-muted">Cargando informes oficiales FIFA…</p>';
 try{
 const golden=await fetch('/data/fifa-u17-2026-golden-boot.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
 if(golden?.players?.length){renderGoldenBoot(host,golden);u17PlayerStatsLoaded=true;return;}
 const response=await fetch('/api/future-radar-u17',{cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json(),players=new Map();
 const get=(team,number,name)=>{const id=team+':'+(number??String(name).trim().toUpperCase());if(!players.has(id))players.set(id,{team,number,name,starts:0,goals:0});return players.get(id)};
 let lineupMatches=0,goalMatches=0;
 for(const m of data.matches||[]){
 if(m.pdfExtraction?.lineupsVerified&&m.lineups?.home?.length===11&&m.lineups?.away?.length===11){
 lineupMatches++;
 for(const [team,xi] of [[m.homeCode,m.lineups.home],[m.awayCode,m.lineups.away]])for(const p of xi)get(team,p.number,p.name).starts++;
 }
 if(!m.pdfExtraction?.goalEventsVerified)continue;
 goalMatches++;
 for(const g of m.incidents||[]){
 if(g.type!=='goal'||!g.player||![m.homeCode,m.awayCode].includes(g.team)||g.ownGoal)continue;
 get(g.team,g.number,g.player).goals++;
 }
 }
 host.innerHTML='<div class="ranking-model"><h3>Estadísticas individuales · FIFA</h3><p>'+lineupMatches+' partidos con once inicial verificado · '+goalMatches+' partidos con cronología de goles verificada. Totales parciales: no equivalen al total del torneo. No se contabilizan suplencias, asistencias ni minutos sin evidencia.</p></div><div class="ranking-filters" style="margin-top:16px"><input class="control" id="u17StatsSearch" placeholder="Buscar jugador"><select class="control" id="u17StatsTeam"><option value="">Todas las selecciones</option></select><select class="control" id="u17StatsSort"><option value="goals">Máximos goleadores</option><option value="starts">Más titularidades</option></select></div><div class="ranking-table-wrap" style="overflow:auto"><table class="ranking-table"><thead><tr><th>#</th><th>Jugador</th><th>Selección</th><th>Goles verificados</th><th>Titularidades</th></tr></thead><tbody id="u17StatsRows"></tbody></table></div>';
 const teamSelect=document.getElementById('u17StatsTeam');
 for(const team of [...new Set([...players.values()].map(p=>p.team))].sort()){const opt=document.createElement('option');opt.value=team;opt.textContent=u17Team(team).name||team;teamSelect.append(opt)}
 const render=()=>{const q=document.getElementById('u17StatsSearch').value.toLowerCase(),team=teamSelect.value,sort=document.getElementById('u17StatsSort').value;
 const rows=[...players.values()].filter(p=>(!team||p.team===team)&&String(p.name).toLowerCase().includes(q)&&p[sort]>0).sort((a,b)=>b[sort]-a[sort]||b.goals-a.goals||b.starts-a.starts||String(a.name).localeCompare(String(b.name)));
 document.getElementById('u17StatsRows').innerHTML=rows.map((p,i)=>'<tr><td>'+(i+1)+'</td><td><strong>'+esc(p.name)+'</strong></td><td>'+esc(u17Team(p.team).name||p.team)+'</td><td>'+p.goals+'</td><td>'+p.starts+'</td></tr>').join('')||'<tr><td colspan="5">Sin registros verificados.</td></tr>'};
 for(const id of ['u17StatsSearch','u17StatsTeam','u17StatsSort'])document.getElementById(id).addEventListener(id==='u17StatsSearch'?'input':'change',render);
 render();u17PlayerStatsLoaded=true;
 }catch(e){host.textContent='No se pudieron cargar las estadísticas. Vuelve a abrir la pestaña para reintentar.'}
}

function renderGoldenBoot(host,data){
 const pos={FW:'Delantero',MF:'Centrocampista',DF:'Defensa',GK:'Portero'};
 const country=p=>u17Data?.teams?.find(t=>t.code===p.team);
 const flag=p=>country(p)?.flag?'<img class="gb-flag" src="'+esc(country(p).flag)+'" alt="">':'';
 const leader=[...data.players].sort((a,b)=>b.goals-a.goals||b.assists-a.assists||a.minutes-b.minutes)[0];
 host.innerHTML=`<style>
 #u17PlayerStatsPanel .gb-hero{padding:24px;border:1px solid #294536;border-radius:18px;background:linear-gradient(120deg,#14291c,#101914);margin-bottom:18px}
 #u17PlayerStatsPanel .gb-kicker{color:#b4f76a;font-size:11px;letter-spacing:.18em;font-weight:800}
 #u17PlayerStatsPanel .gb-hero h3{font-size:26px;margin:8px 0}
 #u17PlayerStatsPanel .gb-meta{color:#a4b7aa;font-size:12px;margin-top:10px}
 #u17PlayerStatsPanel .gb-leader{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:20px}
 #u17PlayerStatsPanel .gb-leader strong{font-size:22px;color:#b4f76a}
 #u17PlayerStatsPanel .gb-wrap{overflow-x:auto;border:1px solid #293b30;border-radius:14px;margin-top:16px}
 #u17PlayerStatsPanel .gb-table{width:100%;border-collapse:collapse;min-width:720px}
 #u17PlayerStatsPanel .gb-table th{position:static!important;top:auto!important;background:#18251d;color:#a5b9aa;font-size:11px;text-transform:uppercase;letter-spacing:.08em;text-align:left;padding:15px 12px}
 #u17PlayerStatsPanel .gb-table td{padding:14px 12px;border-top:1px solid #24362a}
 #u17PlayerStatsPanel .gb-table tr:hover td{background:#17271c}
 #u17PlayerStatsPanel .gb-name{background:none;border:0;color:inherit;font:inherit;font-weight:700;text-align:left;cursor:pointer;padding:0}
 #u17PlayerStatsPanel .gb-name:hover{color:#b4f76a;text-decoration:underline}
 #u17PlayerStatsPanel .gb-flag{width:24px;height:17px;object-fit:cover;border-radius:3px;vertical-align:middle;margin-right:8px}
 #u17PlayerStatsPanel .gb-goals{color:#b4f76a;font-weight:800}
 #u17PlayerStatsPanel .gb-dialog{color:#eaf4ec;background:#111d16;border:1px solid #38533e;border-radius:20px;padding:26px;width:min(520px,92vw);max-height:85vh;overflow:auto}
 #u17PlayerStatsPanel .gb-dialog::backdrop{background:#000b}
 #u17PlayerStatsPanel .gb-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}
 #u17PlayerStatsPanel .gb-metrics div{background:#1a2b20;border-radius:12px;padding:12px;text-align:center}
 #u17PlayerStatsPanel .gb-metrics b{display:block;font-size:26px;color:#b4f76a}
 #u17PlayerStatsPanel .gb-metrics small{color:#a5b9aa}
 #u17PlayerStatsPanel .gb-close{float:right;cursor:pointer;background:#24382a;border:0;border-radius:8px;color:white;padding:8px 12px}
 </style><section class="gb-hero"><div class="gb-kicker">FIFA U-17 WORLD CUP · PLAYER STATS</div><h3>Golden Boot</h3><div class="gb-leader"><span>Máximo goleador</span><strong>${esc(leader.name)}</strong><span>${leader.goals} goles · ${leader.assists} asistencias</span></div><div class="gb-meta">${data.players.length} registros · Cobertura no certificada como completa · ${esc(data.updatedAt)} · <a href="${esc(data.source)}" target="_blank" rel="noopener">Fuente FIFA</a></div></section><div class="ranking-filters"><input class="control" id="gbSearch" placeholder="Buscar jugador"><select class="control" id="gbTeam"><option value="">Todas las selecciones</option></select><select class="control" id="gbSort"><option value="goals">Máximos goleadores</option><option value="assists">Máximos asistentes</option><option value="minutes">Minutos disputados</option></select></div><div class="gb-wrap"><table class="gb-table"><thead><tr><th>#</th><th>Jugador</th><th>Selección</th><th>Posición</th><th>Goles</th><th>Asistencias</th><th>Minutos</th></tr></thead><tbody id="gbRows"></tbody></table></div><dialog class="gb-dialog" id="gbProfile"><button class="gb-close" type="button" aria-label="Cerrar">Cerrar</button><div id="gbProfileBody"></div></dialog>`;
 const team=host.querySelector('#gbTeam'),search=host.querySelector('#gbSearch'),sort=host.querySelector('#gbSort'),dialog=host.querySelector('#gbProfile');
 for(const code of [...new Set(data.players.map(p=>p.team))].sort()){const o=document.createElement('option');o.value=code;o.textContent=country({team:code})?.name||code;team.append(o)}
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 let squadPromise;
 async function profile(p){
 const body=host.querySelector('#gbProfileBody');body.innerHTML='<div class="gb-kicker">PLAYER PROFILE · U17</div><h2>'+esc(p.name)+'</h2><p>'+flag(p)+esc(country(p)?.name||p.team)+' · '+esc(pos[p.position]||p.position)+'</p><div class="gb-metrics"><div><b>'+p.goals+'</b><small>Goles</small></div><div><b>'+p.assists+'</b><small>Asistencias</small></div><div><b>'+p.minutes+'</b><small>Minutos</small></div></div><p class="gb-meta">Ranking FIFA: '+esc(p.rank)+' · '+(p.minutes>0?((p.goals+p.assists)*90/p.minutes).toFixed(2)+' G+A por 90 min':'G+A por 90 min no disponible')+'</p><div class="gb-extra">Consultando convocatoria oficial…</div>';
 dialog.showModal();
 const extra=body.querySelector('.gb-extra');
 try{if(!squadPromise)squadPromise=FutureRadarData.response('u17Squads').then(r=>{if(!r.ok)throw Error('squads');return r.json()}).catch(()=>null);
 const payload=await squadPromise;const candidates=(payload?.teams||[]).filter(t=>t.teamCode===p.team).flatMap(t=>t.players||[]).filter(x=>[x.playerName,[x.givenNames,x.surnames].filter(Boolean).join(' ')].some(n=>normalize(n)===normalize(p.name)));
 if(candidates.length===1){const x=candidates[0];extra.innerHTML='<p><strong>Club:</strong> '+esc(x.club||'No disponible')+'</p><p><strong>Dorsal:</strong> '+esc(x.shirtNumber??'No disponible')+'</p><p><strong>Edad:</strong> '+esc(x.ageAtTournamentStart??'No disponible')+'</p>'}else extra.textContent='Datos adicionales de convocatoria no vinculados de forma inequívoca.';
 }catch(e){extra.textContent='Convocatoria no disponible.'}
 }
 dialog.querySelector('.gb-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 const draw=()=>{const key=sort.value;const rows=data.players.filter(p=>(!team.value||p.team===team.value)&&normalize(p.name).includes(normalize(search.value))).sort((a,b)=>b[key]-a[key]||b.goals-a.goals||b.assists-a.assists||a.minutes-b.minutes);const tbody=host.querySelector('#gbRows');tbody.innerHTML=rows.map((p,i)=>'<tr><td>'+esc(key==='goals'?p.rank:i+1)+'</td><td><button type="button" class="gb-name" data-index="'+i+'">'+esc(p.name)+' ↗</button></td><td>'+flag(p)+esc(country(p)?.name||p.team)+'</td><td>'+esc(pos[p.position]||p.position)+'</td><td class="gb-goals">'+esc(p.goals)+'</td><td>'+esc(p.assists)+'</td><td>'+esc(p.minutes)+'</td></tr>').join('')||'<tr><td colspan="7">Sin resultados</td></tr>';tbody.querySelectorAll('.gb-name').forEach(b=>b.onclick=()=>profile(rows[Number(b.dataset.index)]))};search.oninput=draw;team.onchange=sort.onchange=draw;draw();
}
