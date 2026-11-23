/* Shared, data-backed global search; no synthetic players, clubs or teams. */
(()=>{'use strict';
 const $=(s,p=document)=>p.querySelector(s);
 const nav=$('header .nav');if(!nav)return;
 const norm=s=>String(s??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const wrapper=document.createElement('div');wrapper.className='fr-search';
 wrapper.innerHTML='<label class="fr-sr" for="fr-global-search">Buscar jugadores, canteras o selecciones</label><input id="fr-global-search" class="fr-search-input" type="search" placeholder="Buscar en Future Radar…  /" autocomplete="off" aria-controls="fr-search-results" aria-expanded="false"><div id="fr-search-results" class="fr-search-panel" role="listbox" hidden></div>';
 nav.append(wrapper);
 const input=$('input',wrapper),panel=$('.fr-search-panel',wrapper);
 for(const a of document.querySelectorAll('header .navlinks a'))if(new URL(a.href,location.href).pathname===location.pathname)a.setAttribute('aria-current','page');
 const season=document.createElement('span');season.className='fr-season';season.textContent='SEASON 2026/27';nav.append(season);
 let index=[],loaded=false,pending=null;
 async function load(){
  if(loaded)return;
  if(pending)return pending;
  pending=Promise.allSettled([
   fetch('/future-radar-players.json').then(r=>{if(!r.ok)throw Error('players');return r.json()}),
   fetch('/u17-world-cup-2026.json').then(r=>{if(!r.ok)throw Error('teams');return r.json()})
  ]).then(([p,t])=>{
   const players=p.status==='fulfilled'&&Array.isArray(p.value)?p.value:[];
   const teams=t.status==='fulfilled'&&Array.isArray(t.value?.teams)?t.value.teams:[];
   const clubs=new Map();
   for(const player of players){
    if(!player?.name)continue;
    const club=String(player.club||'').trim();
    index.push({type:'Jugadores',title:player.name,subtitle:[club,player.position].filter(Boolean).join(' · '),url:'/players/?q='+encodeURIComponent(player.name)});
    if(club){const name=club.replace(/\\s+(?:U|Sub)[- ]?\\d{2}\\b/gi,'').trim();const k=norm(name);if(!clubs.has(k))clubs.set(k,{type:'Canteras',title:name,subtitle:'Plantilla registrada',url:'/academies/?q='+encodeURIComponent(name)});}
   }
   index.push(...clubs.values());
   for(const team of teams)if(team?.name)index.push({type:'Selecciones',title:team.name,subtitle:team.group?'Grupo '+team.group:'',url:'/competitions/fifa-u17-world-cup/?q='+encodeURIComponent(team.name)});
   loaded=true;
  }).finally(()=>{pending=null});
  return pending;
 }
 function render(){
  const q=norm(input.value.trim());if(!q){panel.hidden=true;input.setAttribute('aria-expanded','false');return}
  const hits=index.filter(x=>norm(x.title+' '+x.subtitle).includes(q)).slice(0,15);
  const groups=['Jugadores','Canteras','Selecciones'];
  panel.innerHTML=hits.length?groups.map(group=>{
   const rows=hits.filter(x=>x.type===group);if(!rows.length)return '';
   return '<div class="fr-search-heading">'+group+'</div>'+rows.map(x=>'<a class="fr-search-item" role="option" href="'+safe(x.url)+'"><span>'+safe(x.title)+'</span><small>'+safe(x.subtitle)+'</small></a>').join('');
  }).join(''):'<div class="fr-search-empty">No disponible en el dataset actual</div>';
  panel.hidden=false;input.setAttribute('aria-expanded','true');
 }
 input.addEventListener('focus',()=>{load().then(render).catch(()=>{panel.innerHTML='<div class="fr-search-empty">No se han podido cargar los datos</div>';panel.hidden=false})});
 input.addEventListener('input',render);
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/input|textarea/i.test(document.activeElement.tagName)){e.preventDefault();input.focus()}if(e.key==='Escape'){panel.hidden=true;input.setAttribute('aria-expanded','false')}});
 document.addEventListener('pointerdown',e=>{if(!wrapper.contains(e.target)){panel.hidden=true;input.setAttribute('aria-expanded','false')}});
 const urlQ=new URLSearchParams(location.search).get('q');
 if(urlQ){const local=location.pathname.startsWith('/players')?'playerSearch':location.pathname.startsWith('/academies')?'academySearch':location.pathname.startsWith('/competitions/fifa-u17-world-cup')?'u17TeamSearch':null;
  if(local){let attempts=0;const tick=()=>{const el=document.getElementById(local);if(el){el.value=urlQ;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}else if(++attempts<12)setTimeout(tick,250)};setTimeout(tick,350)}
 }
})();
