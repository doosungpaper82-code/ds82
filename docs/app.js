'use strict';
const data = window.PRODUCTS || [];
const fields = ['major','middle','name','pattern','code','color','thickness','grain'];
const labels = {major:'품목대분류',middle:'품목중분류',name:'품명',pattern:'패턴',code:'색상번호',color:'색상명',weight:'평량',thickness:'두께',size:'사이즈'};
const state = Object.fromEntries(fields.map(k=>[k,'']));
labels.grain='결';
const $ = id=>document.getElementById(id);
const esc = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = value=>String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
const collator = new Intl.Collator('ko',{numeric:true,sensitivity:'base'});
const fmt = new Intl.NumberFormat('ko-KR',{maximumFractionDigits:4});
const missing = '__missing__';
let page = 1, filtered = [], query = '';
const pageSize = 15;
const haystack = new Map(data.map(p=>[p.id,norm([p.name,p.spec,p.major,p.middle,p.colorRaw,p.code,p.color,p.pattern,p.weight,p.thickness,p.size].join(' '))]));
function matchesWeight(p){
  const min=$('weight-min'),max=$('weight-max');
  if(!min.validity.valid||!max.validity.valid)return false;
  if(min.value===''&&max.value==='')return true;
  const weight=parseFloat(String(p.weight).replace(/,/g,''));
  return Number.isFinite(weight)&&(min.value===''||weight>=min.valueAsNumber)&&(max.value===''||weight<=max.valueAsNumber);
}
// Preserve source orientation. Roll lengths in metres are converted to mm.
function sizeInMm(value){
  const parts=String(value??'').normalize('NFKC').split(/[x×]/i);
  if(parts.length!==2)return [NaN,NaN];
  return parts.map(part=>{
    const match=part.trim().match(/^([\d,]+(?:\.\d+)?)(?:\([^)]*\))?\s*(mm|m)?\s*$/i);
    return match?Number(match[1].replace(/,/g,''))*(match[2]?.toLowerCase()==='m'?1000:1):NaN;
  });
}
function paperGrain(p){
  const [width,height]=sizeInMm(p.size);
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width===height)return '판별 불가';
  const reversed=String(p.middle??'').trim()==='유포'||String(p.name??'').includes('유포')||String(p.productNumber??p['품번']??'').includes('유포');
  return (width>height)!==reversed?'횡목':'종목';
}
function matchesSize(p){
  const dimensions=sizeInMm(p.size);
  return ['width','height'].every((key,i)=>{
    const min=$(key+'-min'),max=$(key+'-max');
    if(!min.validity.valid||!max.validity.valid)return false;
    if(min.value===''&&max.value==='')return true;
    return Number.isFinite(dimensions[i])&&(min.value===''||dimensions[i]>=min.valueAsNumber)&&(max.value===''||dimensions[i]<=max.valueAsNumber);
  });
}
function fieldValue(p,key){return key==='grain'?paperGrain(p):(p[key]||missing);}
function matches(p, except){return matchesWeight(p) && matchesSize(p) && fields.every(k=>k===except || !state[k] || fieldValue(p,k)===state[k]) && query.trim().split(/\s+/).filter(Boolean).every(q=>haystack.get(p.id).includes(norm(q)));}
function displayPrice(p){return typeof p.price==='number'?p.price*(String(p.unit).trim()==='매'?500:1):null;}
function displayUnit(p){return String(p.unit).trim()==='매'?'연(500매)':p.unit||'단위 미기재';}
function price(p){const value=displayPrice(p);return value!==null?fmt.format(value):'가격 문의';}
const tonFmt=new Intl.NumberFormat('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2});
function tonPrice(p){
  if(String(p.unit).trim()!=='매'||typeof p.price!=='number'||!Number.isFinite(p.price)||p.price<0)return null;
  const weight=String(p.weight??'').trim().match(/^(\d+(?:\.\d+)?)\s*g(?:\s*\/\s*(?:㎡|m²|m2))?$/i);
  const [width,height]=sizeInMm(p.size);
  if(!weight||Number(weight[1])<=0||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
  const grams=Number(weight[1])*width*height/1e6;
  // 1 tonne = 1,000,000 g; express the resulting won price in millions.
  const value=p.price/grams;
  return Number.isFinite(value)?value:null;
}
function priceColumns(p){
  const ton=tonPrice(p);
  const weight=String(p.weight??'').trim().match(/^(\d+(?:\.\d+)?)\s*g(?:\s*\/\s*(?:㎡|m²|m2))?$/i);
  const showTon=weight&&Number(weight[1])>0;
  const tonColumn=showTon?`<div class="ton-price"><div class="ton-money">${ton===null?'톤 단가 문의':tonFmt.format(ton)+'<small>백만원</small>'}</div><span class="unit">1톤 기준</span></div>`:'';
  return `<div class="price-columns"><div><div class="money">${price(p)}${typeof p.price==='number'?'<small>원</small>':''}</div><span class="unit">1 ${esc(displayUnit(p))} 기준</span></div>${tonColumn}</div>`;
}
function updateOptions(){
  for(const key of fields){
    const values = [...new Set(data.filter(p=>matches(p,key)).map(p=>fieldValue(p,key)))].sort((a,b)=>a===missing?1:b===missing?-1:collator.compare(a,b));
    if(state[key] && !values.includes(state[key]))values.unshift(state[key]);
    $(key).innerHTML='<option value="">전체</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v===missing?'미기재':v)}</option>`).join('');
    $(key).value=state[key]; $(key).disabled=values.length===0;
  }
}
function render(){
  for(const [key,label] of [['width','가로'],['height','세로']]){
    const min=$(key+'-min'),max=$(key+'-max');
    $(key+'-error').textContent=!min.validity.valid||!max.validity.valid?'0 이상의 숫자를 입력해 주세요.':min.value!==''&&max.value!==''&&min.valueAsNumber>max.valueAsNumber?`최소 ${label}는 최대 ${label}보다 작거나 같아야 합니다.`:'';
  }
  const min=$('weight-min'),max=$('weight-max');
  $('weight-error').textContent=!min.validity.valid||!max.validity.valid?'0 이상의 숫자를 입력해 주세요.':min.value!==''&&max.value!==''&&min.valueAsNumber>max.valueAsNumber?'최소 평량은 최대 평량보다 작거나 같아야 합니다.':'';
  updateOptions(); filtered=data.filter(p=>matches(p));
  const sort=$('sort').value;
  if(sort==='name')filtered.sort((a,b)=>collator.compare(a.name,b.name));
  if(sort==='low'||sort==='high')filtered.sort((a,b)=>{const x=displayPrice(a),y=displayPrice(b);return x===null?(y===null?0:1):y===null?-1:(x-y)*(sort==='low'?1:-1);});
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
  $('count').textContent=fmt.format(filtered.length)+'개';
  $('chips').innerHTML=fields.filter(k=>state[k]).map(k=>`<button class="chip" data-remove="${k}" aria-label="${labels[k]} 조건 해제">${labels[k]} · ${esc(state[k]===missing?'미기재':state[k])} ×</button>`).join('');
  $('list').innerHTML=filtered.length?filtered.slice((page-1)*pageSize,page*pageSize).map(p=>`<article class="product"><div><p class="breadcrumb">${esc(p.major)} &nbsp;/&nbsp; ${esc(p.middle)}</p><h3>${esc(p.name)}</h3><div class="specs"><span class="spec spec-grain">결 · ${paperGrain(p)}</span><span class="spec">${esc(p.spec)}</span>${p.colorRaw?`<span class="spec">색상 ${esc(p.colorRaw)}</span>`:''}${p.pattern?`<span class="spec">${esc(p.pattern)}</span>`:''}${p.cert?`<span class="spec spec-cert">${esc(p.cert)}</span>`:''}</div></div><div class="product-price">${priceColumns(p)}<button class="details-button" data-detail="${p.id}" aria-label="${esc(p.name)} 상세 정보">상세 정보 ↗</button></div></article>`).join(''):'<div class="empty"><h3>조건에 맞는 상품이 없습니다.</h3><p>검색어를 줄이거나 선택한 조건을 해제해 보세요.</p><button class="primary" data-reset>검색 조건 초기화</button></div>';
  $('page').textContent=filtered.length?`${page} / ${fmt.format(pages)} 페이지`:'0개 상품';
  $('prev').disabled=page<=1;$('next').disabled=page>=pages;
}
const rangeIds=['weight-min','weight-max','width-min','width-max','height-min','height-max'];
function reset(){fields.forEach(k=>state[k]='');rangeIds.forEach(id=>$(id).value='');query='';$('query').value='';page=1;render();}
for(const id of rangeIds)$(id).addEventListener('input',()=>{page=1;render();});
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
  const pairs=[['품목대분류',p.major],['품목중분류',p.middle],['규격',p.spec],['종이 결',paperGrain(p)],['두께',p.thickness],['색상번호',p.code],['색상명',p.color],['색상코드원문',p.colorRaw],['패턴',p.pattern],['적재환산량',p.load],['FSC 인증',/\bFSC\b/i.test(String(p.cert??''))?'O':'X']];
  $('detail-content').innerHTML=`<p class="eyebrow">PRODUCT DETAIL</p><h2>${esc(p.name)}</h2>${priceColumns(p)}<dl>${pairs.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v===''||v==null?'미기재':v)}</dd>`).join('')}</dl>`;
  $('detail').showModal();
});
$('close-detail').addEventListener('click',()=>$('detail').close());
$('detail').addEventListener('click',e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();}});
$('total').textContent=fmt.format(data.length);render();


const mobileMedia = matchMedia('(max-width:760px)');
const adaptFilters = ()=>{$('filter-panel').open=!mobileMedia.matches;};
mobileMedia.addEventListener('change',adaptFilters);adaptFilters();

