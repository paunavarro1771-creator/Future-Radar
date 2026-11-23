/* Future Radar FC page controller: academies. Extracted without changing data logic. */

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
function renderPlayers(players){const grid=document.getElementById('playerGrid');if(!players.length){grid.innerHTML='<div class="empty">No hay jugadores que coincidan con la búsqueda.</div>';return}grid.innerHTML=players.map(p=>{const rawClub=p.club||'Club no disponible',club=displayClubName(rawClub),category=academyCategory(rawClub),nat=p.nationality||'',flag=flagUrl(nat),photoKey=playerPhotoKey(p),initials=(p.name||'FR').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();return '<a class="player-card" href="/players/'+frSlug(p.name)+'-'+String(p.dateOfBirth||'').replace(/[^0-9]/g,'')+'"><div class="player-photo-wrap"><div class="player-photo-placeholder" data-photo-placeholder="'+esc(photoKey)+'">'+esc(initials)+'</div><img class="player-photo" data-player-photo="'+esc(photoKey)+'" alt="Foto de '+esc(p.name||'jugador')+'" loading="lazy" hidden></div><div class="player-top"><span class="position">'+esc(cleanPosition(p.position))+'</span>'+(flag?'<img class="flag" src="'+flag+'" alt="'+esc(nat)+'" title="'+esc(nat)+'">':'<span class="flag">🌍</span>')+'</div><div class="player-main"><img class="crest" data-crest="'+esc(rawClub)+'" src="'+crestUrl(rawClub)+'" onerror="handleCrestError(this)" alt="Escudo de '+esc(club)+'"><div style="min-width:0"><h3 class="player-name">'+esc(p.name||'Jugador sin nombre')+'</h3><div class="player-club">'+esc(club)+'</div>'+(category!=='Sin categoría indicada'?'<span class="player-club-category">'+esc(category)+'</span>':'')+'</div></div><div class="player-meta"><span>EDAD <b>'+(p.age??'—')+'</b></span><span>ALTURA <b>'+(p.heightCm?p.heightCm+' cm':'—')+'</b></span><span>TEMP. <b>'+esc(p.season||'26/27')+'</b></span></div></a>'}).join('');observePlayerPhotos();}
function normalizeClubForCrest(value){
 return String(value||'').replace(/\b(?:U\s?\d{1,2}|Under\s?\d{1,2})\b/ig,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(football club|soccer club|club de football|club de futbol|fc|f\.c\.|cf|c\.f\.|afc)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function academyCrestSearchForms(value){
 const full=String(value||'').replace(/\b(?:U\s?\d{1,2}|Under\s?\d{1,2})\b/ig,'').trim();
 const forms=[full,full.replace(/^(?:FC|CF|AFC|SC|FK|SK|AS|US|RC|CA|CD|UD|RCD|AC|SV|VfB|VfL)\s+/i,'').trim(),full.replace(/\s+(?:FC|CF|AFC|FK|SK|AS|US|RC|CA|CD|UD|AC)$/i,'').trim()];
 return [...new Set(forms.filter(Boolean))];
}
async function lookupAcademyCrest(club){
 const forms=academyCrestSearchForms(club),targets=new Set(forms.map(normalizeClubForCrest).filter(Boolean)),found=new Map();
 try{
  for(const query of forms){
   for(const language of ['en','es','fr','de','it','pt','nl','tr']){
    const url='https://www.wikidata.org/w/api.php?action=wbsearchentities&search='+encodeURIComponent(query)+'&language='+language+'&uselang='+language+'&type=item&limit=12&format=json&origin=*';
    const response=await fetch(url);if(!response.ok)continue;
    const payload=await response.json();(payload.search||[]).forEach(hit=>{if(hit.id)found.set(hit.id,hit)});
   }
  }
  if(!found.size)return null;
  const ids=[...found.keys()],entities={};
  for(let i=0;i<ids.length;i+=40){
   const response=await fetch('https://www.wikidata.org/w/api.php?action=wbgetentities&ids='+encodeURIComponent(ids.slice(i,i+40).join('|'))+'&props=claims|labels|aliases&languages=en|es|fr|de|it|pt|nl|no|tr|da&format=json&origin=*');
   if(!response.ok)continue;
   const payload=await response.json();Object.assign(entities,payload.entities||{});
  }
  const ranked=[];
  for(const [id,entity] of Object.entries(entities)){
   const names=[];
   Object.values(entity.labels||{}).forEach(x=>names.push(x.value));
   Object.values(entity.aliases||{}).forEach(list=>list.forEach(x=>names.push(x.value)));
   if(!names.some(name=>targets.has(normalizeClubForCrest(name))))continue;
   const claims=entity.claims||{};
   const logo=(claims.P154||[]).find(x=>x.rank==='preferred')||(claims.P154||[]).find(x=>x.rank!=='deprecated');
   const badge=(claims.P94||[]).find(x=>x.rank==='preferred')||(claims.P94||[]).find(x=>x.rank!=='deprecated');
   const file=logo?.mainsnak?.datavalue?.value||badge?.mainsnak?.datavalue?.value;
   if(file)ranked.push({id,file,preferred:logo?.rank==='preferred'||badge?.rank==='preferred'});
  }
  ranked.sort((x,y)=>Number(y.preferred)-Number(x.preferred));
  if(ranked.length)return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(ranked[0].file)+'?width=180';
 }catch(e){}
 return null;
}
const academyCrestPromises=new Map(),academyCrestMisses=new Set(),academyCrestQueue=[];
let academyCrestActive=0,academyCrestObserver=null;
function queuedAcademyCrestLookup(club){
 return new Promise(resolve=>{
  const start=()=>{academyCrestActive++;lookupAcademyCrest(club).then(resolve).catch(()=>resolve(null)).finally(()=>{academyCrestActive--;const next=academyCrestQueue.shift();if(next)next();});};
  if(academyCrestActive<4)start();else academyCrestQueue.push(start);
 });
}
function observeAcademyCrests(){
 const images=[...document.querySelectorAll('#academiesContainer img[data-crest]')];
 if(!('IntersectionObserver' in window)){images.forEach(img=>loadAcademyCrest(img));return}
 if(!academyCrestObserver)academyCrestObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){academyCrestObserver.unobserve(entry.target);loadAcademyCrest(entry.target)}}),{rootMargin:'350px'});
 images.forEach(img=>{if(!crestOverrides[img.dataset.crest]&&!crestCache[img.dataset.crest]&&!academyCrestMisses.has(img.dataset.crest))academyCrestObserver.observe(img)});
}
async function loadAcademyCrest(img){
 const club=img.dataset.crest;if(!club||crestOverrides[club]||crestCache[club]||academyCrestMisses.has(club)){img.src=crestUrl(club);return}
 if(!academyCrestPromises.has(club))academyCrestPromises.set(club,queuedAcademyCrestLookup(club));
 const logo=await academyCrestPromises.get(club);
 if(logo){crestCache[club]=logo;document.querySelectorAll('#academiesContainer img[data-crest="'+CSS.escape(club)+'"]').forEach(node=>{node.src=logo});}
 else{academyCrestMisses.add(club);}
}
function displayClubName(value){return String(value||'Club no disponible').replace(/\b(?:U\s?-?\s?\d{1,2}|Under\s?\d{1,2})\b/ig,'').replace(/\s+(?:FC|F\.C\.|CF|C\.F\.|AFC)$/i,'').replace(/[\s·,|/-]+$/g,'').replace(/\s{2,}/g,' ').trim()||'Club no disponible'}
function academyCategory(club){const m=String(club||'').match(/\b(?:U\s?-?\s?(\d{1,2})|Under\s?(\d{1,2}))\b/i);return m?'U'+(m[1]||m[2]):'Sin categoría indicada'}
function academyGroupKey(club){return String(club||'').replace(/\b(?:U\s?\d{1,2}|Under\s?\d{1,2})\b/ig,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(football club|soccer club|fc|f\.c\.|cf|c\.f\.|afc)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function buildAcademyGroups(players){const groups=new Map();players.forEach(p=>{const club=p.club||'Club no disponible',key=academyGroupKey(club);if(!groups.has(key))groups.set(key,{key,name:displayClubName(club),variants:new Map(),players:[]});const g=groups.get(key);if(!g.variants.has(club))g.variants.set(club,[]);g.variants.get(club).push(p);g.players.push(p);const candidate=displayClubName(club);if(candidate.length<g.name.length)g.name=candidate;});return [...groups.values()].map(g=>{g.crestKey=[...g.variants.keys()].find(c=>crestOverrides[c])||g.name;return g}).sort((a,b)=>a.name.localeCompare(b.name,'es'))}
function renderAcademies(){const term=document.getElementById('academySearch').value.trim().toLowerCase();const category=document.getElementById('frAcademyCategory')?.value||'ALL';const order=document.getElementById('frAcademySort')?.value||'name';const groups=buildAcademyGroups(allRadarPlayers).filter(g=>(g.name.toLowerCase().includes(term)||[...g.variants.keys()].some(c=>displayClubName(c).toLowerCase().includes(term)))&&(category==='ALL'||[...g.variants.keys()].some(c=>academyCategory(c)===category))).sort((a,b)=>order==='players'?b.players.length-a.players.length||a.name.localeCompare(b.name,'es'):a.name.localeCompare(b.name,'es'));const counter=document.getElementById('frAcademyCount');if(counter)counter.textContent=groups.length+' canteras encontradas';const el=document.getElementById('academiesContainer');if(!groups.length){el.innerHTML='<div class="empty">No se han encontrado canteras.</div>';return}el.innerHTML=groups.map(g=>'<a class="academy-card" href="/academies/'+frSlug(g.name)+'/" aria-label="Ver cantera '+esc(g.name)+'"><img data-crest="'+esc(g.crestKey)+'" src="'+crestUrl(g.name)+'" onerror="handleCrestError(this)" alt="Escudo de '+esc(g.name)+'"><span><strong>'+esc(g.name)+'</strong><small>'+g.players.length+' jugadores · '+g.variants.size+' plantilla'+(g.variants.size===1?'':'s')+'</small></span></a>').join('');document.querySelectorAll('#academiesContainer [data-crest]').forEach(img=>{img.onerror=()=>handleCrestError(img);img.src=crestUrl(img.dataset.crest)});observeAcademyCrests()}function openRoster(club){const players=allRadarPlayers.filter(p=>p.club===club).sort((a,b)=>(a.name||'').localeCompare(b.name||''));document.getElementById('rosterName').textContent=club;document.getElementById('rosterCount').textContent=players.length+' jugadores · Temporada 2026/27';const img=document.getElementById('rosterCrest');img.dataset.crest=club;img.onerror=()=>handleCrestError(img);img.src=crestUrl(club);document.getElementById('rosterList').innerHTML=players.map(p=>'<div class="roster-player"><div><strong>'+esc(p.name||'Sin nombre')+'</strong><small>'+esc(cleanPosition(p.position))+' · '+esc(p.clubCountry||'')+'</small></div><div class="roster-right">'+(flagUrl(p.nationality)?'<img src="'+flagUrl(p.nationality)+'" width="20" alt="">':'🌍')+'<div>'+((p.age??'—')+' años')+'</div></div></div>').join('');const panel=document.getElementById('rosterPanel');panel.classList.add('show');document.querySelectorAll('.academy-card').forEach(b=>b.classList.toggle('active',b.dataset.club===club));panel.scrollIntoView({behavior:'smooth',block:'nearest'})}
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
  host.innerHTML='<table class="ranking-table"><thead><tr><th>#</th><th>Player</th><th>Age</th><th>Club</th><th>PJ</th><th>MIN</th><th>G</th><th>A</th><th>GC</th><th>Source</th></tr></thead><tbody>'+players.map((p,i)=>{const s=p.youthLeagueStats;return '<tr><td class="rank-number">'+(i+1)+'</td><td><div class="rank-player"><img src="'+crestUrl(p.club||'')+'" alt="" onerror="handleCrestError(this)" data-crest="'+esc(displayClubName(p.club))+'"><div><strong>'+esc(p.name)+'</strong><small>'+esc(cleanPosition(p.position))+'</small></div></div></td><td>'+esc(p.age??'—')+'</td><td>'+esc(displayClubName(p.club))+'</td><td>'+s.matchesPlayed+'</td><td>'+(s.minutesPlayed??'—')+'</td><td>'+(s.goals??'—')+'</td><td>'+(s.assists??'—')+'</td><td>'+(s.goalsConceded??'—')+'</td><td><a class="rank-source" href="'+esc(s.sourceUrl)+'" target="_blank" rel="noopener">UEFA</a></td></tr>'}).join('')+'</tbody></table><p class="rank-muted" style="padding:12px 14px">Ordenado por '+labels[metric]+'. Datos de la UEFA Youth League 2026/27; los campos no publicados se muestran como —.</p>';return;
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
 host.innerHTML='<table class="ranking-table"><thead><tr><th>#</th><th>Player</th><th>Age</th><th>Current Level</th><th>Prospect Score</th><th>Future Radar Score</th></tr></thead><tbody>'+scored.map((p,i)=>'<tr><td class="rank-number">'+(i+1)+'</td><td><div class="rank-player"><img src="'+crestUrl(p.club||'')+'" alt="" onerror="handleCrestError(this)" data-crest="'+esc(displayClubName(p.club))+'"><div><strong>'+esc(p.name)+'</strong><small>'+esc(displayClubName(p.club))+' · '+esc(p.nationality||'')+'</small></div></div></td><td>'+esc(p.age??'—')+'</td><td>'+p.scores.current.toFixed(1)+'</td><td>'+p.scores.prospect.toFixed(1)+'</td><td class="rank-score">'+p.scores.combined.toFixed(1)+'</td></tr>').join('')+'</tbody></table>';
}
function setupRankings(){
 const clubSelect=document.getElementById('rankingClub');
 [...new Set(allRadarPlayers.map(p=>p.club).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=displayClubName(c)+(academyCategory(c)!=='Sin categoría indicada'?' · '+academyCategory(c):'');clubSelect.appendChild(o)});
 document.querySelectorAll('[data-ranking-tab]').forEach(btn=>btn.addEventListener('click',()=>{activeRankingTab=btn.dataset.rankingTab;document.querySelectorAll('[data-ranking-tab]').forEach(b=>b.classList.toggle('active',b===btn));document.getElementById('rankingPosition').disabled=activeRankingTab==='academies';document.getElementById('rankingClub').disabled=activeRankingTab==='academies';document.getElementById('rankingMetric').style.display=activeRankingTab==='youth'?'block':'none';renderRankings()}));
 ['rankingSearch','rankingPosition','rankingClub','rankingMetric'].forEach(id=>document.getElementById(id).addEventListener(id==='rankingSearch'?'input':'change',renderRankings));
 renderRankings();
}


const U17_DATA_URL='/u17-world-cup-2026.json';
let u17Data=null;
function u17DateLabel(date){return new Date(date+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'short',timeZone:'UTC'});}
function u17Team(code){return u17Data.teams.find(t=>t.code===code);}
function u17Flag(team,extraClass='u17-flag'){return '<img class="'+extraClass+'" src="'+team.flag+'" alt="Bandera de '+team.name+'" loading="lazy" decoding="async">';}
function renderU17Fixtures(){
 const date=document.getElementById('u17Date').value,group=document.getElementById('u17Group').value,term=document.getElementById('u17TeamSearch').value.trim().toLowerCase();
 const groups=new Map(u17Data.teams.map(t=>[t.code,t.group]));
 const list=u17Data.matches.filter(m=>(date==='ALL'||m.date===date)&&(group==='ALL'||groups.get(m.home)===group)&&(!term||[m.home,m.away].some(code=>{const t=u17Team(code);return (t?.name+' '+code).toLowerCase().includes(term)})));
 document.getElementById('u17Fixtures').innerHTML=list.length?list.map(m=>{const home=u17Team(m.home),away=u17Team(m.away);return '<article class="u17-match"><div class="u17-match-time">'+m.timeQatar+'<small>'+u17DateLabel(m.date)+'</small></div><div class="u17-match-teams"><div class="u17-match-side">'+u17Flag(home,'u17-match-flag')+'<b>'+home.name+'</b></div><span>VS</span><div class="u17-match-side">'+u17Flag(away,'u17-match-flag')+'<b>'+away.name+'</b></div></div><div class="u17-match-meta">Grupo '+groups.get(m.home)+'<br>Campo '+m.pitch+'</div></article>'}).join(''):'<div class="empty">No hay partidos para estos filtros.</div>';
}
function renderU17Groups(){
 const letters='ABCDEFGHIJKL'.split('');
 document.getElementById('u17Groups').innerHTML=letters.map(g=>'<article class="u17-group"><h3>GRUPO '+g+'</h3>'+u17Data.teams.filter(t=>t.group===g).map(t=>'<div class="u17-team"><span class="u17-team-main">'+u17Flag(t)+'<span>'+t.name+'</span></span><small>'+t.code+'</small></div>').join('')+'</article>').join('');
}

let u17SquadPlayers=[];
let u17SquadsLoaded=false;
let u17SelectedTeam='ALL';
function renderU17SquadResults(){
 const position=document.getElementById('u17SquadPosition').value,term=document.getElementById('u17SquadSearch').value.trim().toLowerCase();
 const list=u17SquadPlayers.filter(p=>p.nationalTeamCode===u17SelectedTeam&&(position==='ALL'||p.position===position)&&(!term||[p.name,p.club,p.nationalTeam].some(v=>String(v||'').toLowerCase().includes(term))));
 const selected=u17Data.teams.find(t=>t.code===u17SelectedTeam);
 document.getElementById('u17SquadCount').textContent=list.length+' jugadores · '+(selected?.name||u17SelectedTeam);
 document.getElementById('u17SquadResults').innerHTML=list.length?'<div class="u17-squad-table-wrap"><table class="u17-squad-table"><thead><tr><th>#</th><th>Jugador</th><th>Posición</th><th>Edad</th><th>Fecha nacimiento</th><th>Altura</th><th>Club</th></tr></thead><tbody>'+list.map(p=>'<tr><td>'+p.squadNumber+'</td><td class="u17-squad-player">'+esc(p.name)+'</td><td>'+esc(cleanPosition(p.position))+'</td><td>'+p.age+'</td><td>'+esc(p.dateOfBirth)+'</td><td>'+(p.heightCm?p.heightCm+' cm':'—')+'</td><td class="u17-squad-club">'+esc(displayClubName(p.club)||'—')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Esta selección no tiene jugadores en el PDF oficial recibido. No añadiremos nombres estimados.</div>';
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
  document.getElementById('heroCount').innerHTML=allRadarPlayers.length+' <small>perfiles registrados</small>';const clubs=[...new Set(allRadarPlayers.map(p=>p.club).filter(Boolean))];document.getElementById('clubCount').textContent=buildAcademyGroups(allRadarPlayers).length;renderPlayers(allRadarPlayers);renderAcademies();loadCrests(clubs);
  const rankingClub=document.getElementById('rankingClub');if(rankingClub){const present=new Set([...rankingClub.options].map(o=>o.value));clubs.forEach(c=>{if(!present.has(c)){const o=document.createElement('option');o.value=c;o.textContent=displayClubName(c)+(academyCategory(c)!=='Sin categoría indicada'?' · '+academyCategory(c):'');rankingClub.appendChild(o)}})}
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
 document.querySelectorAll('[data-u17-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-u17-tab]').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('u17FixturesPanel').hidden=b.dataset.u17Tab!=='fixtures';document.getElementById('u17GroupsPanel').hidden=b.dataset.u17Tab!=='groups';document.getElementById('u17SquadsPanel').hidden=b.dataset.u17Tab!=='squads';if(b.dataset.u17Tab==='squads')loadU17Squads()}));
 renderU17Fixtures();renderU17Groups();
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
 if(!data||!data.available){host.innerHTML='<div class="youth-api-section"><div class="data-status"><i class="data-dot"></i> Estadísticas no disponibles</div><p class="youth-api-note">'+esc(data?.message||'La fuente todavía no ha devuelto datos para este encuentro. No mostramos cifras estimadas ni inventadas.')+'</p></div>';return;}
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
 document.getElementById('youthMatchModalContent').innerHTML='<h2 id="youthMatchModalTitle" style="font:700 22px Space Grotesk;margin:18px 0 0">Ficha del partido</h2>'+'<div class="youth-match-scoreboard"><div class="youth-match-club"><img src="'+esc(youthCrest(m.home))+'" alt="" onerror="handleCrestError(this)" data-crest="'+esc(youthTeamKey[m.home]||m.home)+'"><span>'+esc(m.home)+'</span></div><div class="youth-match-bigscore">'+(finished?m.homeScore+' - '+m.awayScore:'VS')+'</div><div class="youth-match-club"><img src="'+esc(youthCrest(m.away))+'" alt="" onerror="handleCrestError(this)" data-crest="'+esc(youthTeamKey[m.away]||m.away)+'"><span>'+esc(m.away)+'</span></div></div>'+'<div class="youth-match-detail-grid"><div class="youth-match-detail-cell"><small>Fecha</small><strong>'+fmt+'</strong></div><div class="youth-match-detail-cell"><small>Competición</small><strong>UEFA Youth League</strong></div><div class="youth-match-detail-cell"><small>Jornada</small><strong>'+m.matchday+'</strong></div><div class="youth-match-detail-cell"><small>Estado</small><strong>'+(finished?'Finalizado':'Próximo')+'</strong></div></div>'+'<div class="youth-match-data-head"><strong>Estadísticas del partido</strong><span>Datos integrados</span></div><div id="youthMatchStats" class="youth-match-data-panel"><p class="youth-api-note">Cargando datos…</p></div>'+'<div class="youth-match-source-actions"><a class="uefa-link" href="'+esc(officialUrl)+'" target="_blank" rel="noopener">CENTRO OFICIAL UEFA ↗</a></div>';
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

async function init(){try{const r=await FutureRadarData.response('players');if(!r.ok)throw new Error('No se pudo cargar el archivo de jugadores');allRadarPlayers=await r.json();const clubs=[...new Set(allRadarPlayers.map(p=>p.club).filter(Boolean))];document.getElementById('heroCount').innerHTML=allRadarPlayers.length+' <small>perfiles registrados</small>';document.getElementById('clubCount').textContent=clubs.length;renderPlayers(allRadarPlayers);const cats=[...new Set(allRadarPlayers.map(p=>academyCategory(p.club)).filter(c=>c!=='Sin categoría indicada'))].sort();const categorySelect=document.getElementById('frAcademyCategory');cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;categorySelect.appendChild(o)});renderAcademies();setupRankings();loadCrests(clubs)}catch(e){document.getElementById('playerGrid').innerHTML='<div class="empty">No se ha podido cargar la base de datos. Recarga la página en unos segundos.</div>';document.getElementById('academiesContainer').innerHTML='<div class="empty">No se han podido cargar las canteras.</div>';console.error(e)}}
document.getElementById('playerSearch').addEventListener('input',filterPlayers);document.getElementById('positionFilter').addEventListener('change',filterPlayers);document.getElementById('frAgeFilter').addEventListener('change',filterPlayers);document.getElementById('frPlayerSort').addEventListener('change',filterPlayers);document.getElementById('academySearch').addEventListener('input',renderAcademies);document.getElementById('frAcademyCategory').addEventListener('change',renderAcademies);document.getElementById('frAcademySort').addEventListener('change',renderAcademies);document.getElementById('closeRoster').addEventListener('click',()=>document.getElementById('rosterPanel').classList.remove('show'));document.addEventListener('DOMContentLoaded',()=>{init();setupU17();setupYouthCalendar()});
