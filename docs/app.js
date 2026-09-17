'use strict';
const data = window.PRODUCTS || [];
const fields = ['major','middle','name','pattern','code','color','weight','thickness','size'];
const labels = {major:'품목대분류',middle:'품목중분류',name:'품명',pattern:'패턴',code:'색상번호',color:'색상명',weight:'평량',thickness:'두께',size:'사이즈'};
const state = Object.fromEntries(fields.map(k=>[k,'']));
const $ = id=>document.getElementById(id);
const esc = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = value=>String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
const collator = new Intl.Collator('ko',{numeric:true,sensitivity:'base'});
const fmt = new Intl.NumberFormat('ko-KR',{maximumFractionDigits:4});
const missing = '__missing__';
let page = 1, filtered = [], query = '';
const pageSize = 15;
const haystack = new Map(data.map(p=>[p.id,norm([p.name,p.spec,p.major,p.middle,p.colorRaw,p.code,p.color,p.pattern,p.weight,p.thickness,p.size].join(' '))]));
function matches(p, except){return fields.every(k=>k===except || !state[k] || (p[k] || missing)===state[k]) && query.trim().split(/\s+/).filter(Boolean).every(q=>haystack.get(p.id).includes(norm(q)));}
function price(p){return typeof p.price==='number' ? fmt.format(p.price) : '가격 문의';}
function updateOptions(){
  for(const key of fields){
    const values = [...new Set(data.filter(p=>matches(p,key)).map(p=>p[key]||missing))].sort((a,b)=>a===missing?1:b===missing?-1:collator.compare(a,b));
    if(state[key] && !values.includes(state[key]))values.unshift(state[key]);
    $(key).innerHTML='<option value="">전체</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v===missing?'미기재':v)}</option>`).join('');
    $(key).value=state[key]; $(key).disabled=values.length===0;
  }
}
function render(){
  updateOptions(); filtered=data.filter(p=>matches(p));
  const sort=$('sort').value;
  if(sort==='name')filtered.sort((a,b)=>collator.compare(a.name,b.name));
  if(sort==='low'||sort==='high')filtered.sort((a,b)=>a.price==null?1:b.price==null?-1:(a.price-b.price)*(sort==='low'?1:-1));
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
  $('count').textContent=fmt.format(filtered.length)+'개';
  $('chips').innerHTML=fields.filter(k=>state[k]).map(k=>`<button class="chip" data-remove="${k}" aria-label="${labels[k]} 조건 해제">${labels[k]} · ${esc(state[k]===missing?'미기재':state[k])} ×</button>`).join('');
  $('list').innerHTML=filtered.length?filtered.slice((page-1)*pageSize,page*pageSize).map(p=>`<article class="product"><div><p class="breadcrumb">${esc(p.major)} &nbsp;/&nbsp; ${esc(p.middle)}</p><h3>${esc(p.name)}</h3><div class="specs"><span class="spec">${esc(p.spec)}</span>${p.colorRaw?`<span class="spec">색상 ${esc(p.colorRaw)}</span>`:''}${p.pattern?`<span class="spec">${esc(p.pattern)}</span>`:''}${p.cert?`<span class="spec spec-cert">${esc(p.cert)}</span>`:''}</div></div><div class="product-price"><div class="money">${price(p)}${typeof p.price==='number'?'<small>원</small>':''}</div><span class="unit">1 ${esc(p.unit||'단위 미기재')} 기준</span><button class="details-button" data-detail="${p.id}" aria-label="${esc(p.name)} 상세 정보">상세 정보 ↗</button></div></article>`).join(''):'<div class="empty"><h3>조건에 맞는 상품이 없습니다.</h3><p>검색어를 줄이거나 선택한 조건을 해제해 보세요.</p><button class="primary" data-reset>검색 조건 초기화</button></div>';
  $('page').textContent=filtered.length?`${page} / ${fmt.format(pages)} 페이지`:'0개 상품';
  $('prev').disabled=page<=1;$('next').disabled=page>=pages;
}
function reset(){fields.forEach(k=>state[k]='');query='';$('query').value='';page=1;render();}
fields.forEach(key=>$(key).addEventListener('change',()=>{
  state[key]=$(key).value;
  // Category changes begin a fresh branch; other choices retain compatible selections.
  if(key==='major')fields.filter(k=>k!=='major').forEach(k=>state[k]='');
  if(key==='middle')fields.filter(k=>!['major','middle'].includes(k)).forEach(k=>state[k]='');
  if(key==='name')fields.slice(3).forEach(k=>state[k]='');
  page=1;render();
}));
let debounce;
$('query').addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(()=>{query=$('query').value;page=1;render();},120);});
$('sort').addEventListener('change',()=>{page=1;render();});
$('reset').addEventListener('click',reset);
$('chips').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){state[b.dataset.remove]='';page=1;render();}});
// Keep focus and return to the result header when paging long lists.
for(const [id,delta] of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{page+=delta;render();document.querySelector('.results-bar').scrollIntoView({block:'start',behavior:'auto'});});
$('list').addEventListener('click',e=>{
  if(e.target.closest('[data-reset]')){reset();return;}
  const button=e.target.closest('[data-detail]');if(!button)return;
  const p=data.find(x=>x.id===Number(button.dataset.detail));
  const pairs=[['품목대분류',p.major],['품목중분류',p.middle],['패턴',p.pattern],['색상번호',p.code],['색상명',p.color],['색상코드 원문',p.colorRaw],['규격 원문',p.spec],['평량',p.weight],['두께',p.thickness],['사이즈',p.size],['기준단위',p.unit],['적재환산량',p.load],['인증',p.cert]];
  $('detail-content').innerHTML=`<p class="eyebrow">PRODUCT DETAIL</p><h2>${esc(p.name)}</h2><p class="detail-money">${price(p)} <small>${typeof p.price==='number'?'원 / ':''}${esc(p.unit)}</small></p><dl>${pairs.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v===''||v==null?'미기재':v)}</dd>`).join('')}</dl><p class="detail-note">표준단가는 원본 가격표의 값입니다. 적재환산량은 가격 배수가 아닙니다.<br>패턴·색상은 품명과 색상코드에서 구분한 값이며, 원문을 함께 확인해 주세요.<br>부가세 포함 여부는 원본에 기재되어 있지 않습니다.</p>`;
  $('detail').showModal();
});
$('close-detail').addEventListener('click',()=>$('detail').close());
$('detail').addEventListener('click',e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();}});
$('total').textContent=fmt.format(data.length);render();


const mobileMedia = matchMedia('(max-width:760px)');
const adaptFilters = ()=>{$('filter-panel').open=!mobileMedia.matches;};
mobileMedia.addEventListener('change',adaptFilters);adaptFilters();

