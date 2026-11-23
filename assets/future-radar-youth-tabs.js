/* Youth League four-pane match details. All values come from existing fixture/API. */
(()=>{'use strict';
 const modal=document.getElementById('youthMatchModal');if(!modal)return;
 const body=document.getElementById('youthMatchModalContent');if(!body)return;
 const unavailable='<p class="fr-match-unavailable">No disponible en el dataset actual</p>';
 let active='stats';
 function render(){
  if(!modal.classList.contains('open'))return;
  const source=body.querySelector('.youth-match-source-actions');
  const stats=body.querySelector('#youthMatchStats');
  if(!stats)return;
  let tabs=body.querySelector('.fr-match-tabs');
  if(!tabs){
   tabs=document.createElement('div');tabs.className='fr-match-tabs';tabs.setAttribute('role','tablist');
   tabs.innerHTML=[['stats','Estadísticas'],['lineups','Alineaciones'],['events','Eventos'],['sources','Fuentes']].map(([key,label])=>'<button type="button" role="tab" data-fr-match-tab="'+key+'">'+label+'</button>').join('');
   stats.before(tabs);
   tabs.addEventListener('click',e=>{const button=e.target.closest('[data-fr-match-tab]');if(button){active=button.dataset.frMatchTab;render()}});
  }
  let panels=body.querySelector('.fr-match-panels');
  if(!panels){
   panels=document.createElement('div');panels.className='fr-match-panels';
   panels.innerHTML='<section data-fr-pane="stats"></section><section data-fr-pane="lineups"></section><section data-fr-pane="events"></section><section data-fr-pane="sources"></section>';
   tabs.after(panels);
  }
  const statsPane=panels.querySelector('[data-fr-pane="stats"]'),lineupPane=panels.querySelector('[data-fr-pane="lineups"]');
  if(stats.parentNode!==statsPane)statsPane.append(stats);
  const lineup=stats.querySelector('.youth-api-xi')?.closest('.youth-api-section');
  if(lineup&&lineup.parentNode!==lineupPane)lineupPane.append(lineup);
  if(!lineupPane.querySelector('.youth-api-section')&&!lineupPane.querySelector('.fr-match-unavailable'))lineupPane.innerHTML=unavailable;
  const eventPane=panels.querySelector('[data-fr-pane="events"]');
  if(!eventPane.hasChildNodes())eventPane.innerHTML=unavailable;
  const sourcesPane=panels.querySelector('[data-fr-pane="sources"]');
  if(source&&source.parentNode!==sourcesPane)sourcesPane.append(source);
  if(!sourcesPane.hasChildNodes())sourcesPane.innerHTML=unavailable;
  tabs.querySelectorAll('button').forEach(b=>{const on=b.dataset.frMatchTab===active;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});
  panels.querySelectorAll('[data-fr-pane]').forEach(p=>p.hidden=p.dataset.frPane!==active);
 }
 const observer=new MutationObserver(()=>{if(modal.classList.contains('open'))queueMicrotask(render);else active='stats'});
 observer.observe(modal,{attributes:true,attributeFilter:['class']});
 const dataObserver=new MutationObserver(()=>{if(!modal.classList.contains('open'))return;const stats=body.querySelector('#youthMatchStats');if(!stats)return;const xi=stats.querySelector('.youth-api-xi')?.closest('.youth-api-section');if(xi){const pane=body.querySelector('[data-fr-pane="lineups"]');if(pane){pane.replaceChildren(xi);render()}}});
 dataObserver.observe(body,{childList:true,subtree:true});
})();
