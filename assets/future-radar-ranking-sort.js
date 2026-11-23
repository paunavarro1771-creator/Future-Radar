/* Future Radar: accessible, data-preserving sorting for existing ranking tables. */
(()=>{'use strict';
 const host=document.getElementById('rankingResults');if(!host)return;
 const collator=new Intl.Collator('es',{numeric:true,sensitivity:'base'});
 const number=v=>{const n=String(v).trim().replace(/\s/g,'').replace(',','.');return /^-?\d+(?:\.\d+)?$/.test(n)?Number(n):null};
 const text=cell=>(cell?.textContent||'').trim();
 let sort={column:null,dir:1};
 function setup(){
  const table=host.querySelector('table.ranking-table');if(!table||table.dataset.frSortable==='true')return;
  table.dataset.frSortable='true';sort={column:null,dir:1};
  const ths=[...table.querySelectorAll('thead th')],tbody=table.tBodies[0];if(!tbody)return;
  ths.forEach((th,i)=>{
   if(i===0||/source|fuente/i.test(text(th)))return;
   th.tabIndex=0;th.setAttribute('role','button');th.setAttribute('aria-sort','none');th.title='Ordenar por '+text(th);
   const sortBy=()=>{
    sort.dir=sort.column===i?-sort.dir:1;sort.column=i;
    const rows=[...tbody.rows].map((row,index)=>({row,index,value:text(row.cells[i])}));
    const numeric=rows.some(x=>number(x.value)!==null)&&rows.every(x=>number(x.value)!==null||x.value==='—'||x.value==='');
    rows.sort((a,b)=>{
     const av=numeric?number(a.value):a.value,bv=numeric?number(b.value):b.value;
     if(av===null)return bv===null?a.index-b.index:1;
     if(bv===null)return -1;
     const c=numeric?av-bv:collator.compare(av,bv);
     return c*sort.dir||a.index-b.index;
    });
    const fragment=document.createDocumentFragment();rows.forEach(x=>fragment.appendChild(x.row));tbody.appendChild(fragment);
    ths.forEach((h,j)=>h.setAttribute('aria-sort',j===i?(sort.dir===1?'ascending':'descending'):'none'));
   };
   th.addEventListener('click',sortBy);
   th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sortBy()}});
  });
 }
 new MutationObserver(setup).observe(host,{childList:true});setup();
})();
