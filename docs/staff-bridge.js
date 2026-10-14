'use strict';
window.STAFF_API_BASE='https://doosung-staff-quotes.doosungpaper82.chatgpt.site';
window.staffUser=null;
(()=>{
 const byId=id=>document.getElementById(id);
 const send=detail=>window.dispatchEvent(new CustomEvent('staff-command',{detail}));
 const show=view=>{const staff=view!=='search';byId('staff-root').hidden=!staff;byId('public-catalog').hidden=staff;byId('staff-toast').hidden=true;document.body.classList.toggle('staff-view',staff);window.scrollTo({top:0,behavior:'instant'});};
 let staffLoad;
 const ensureStaff=()=>{
   if(!staffLoad){
     const css=document.createElement('link');css.rel='stylesheet';css.href='staff/staff-client.css?v=quote-layout-20261014';document.head.append(css);
     byId('staff-root').textContent='직원 로그인 화면을 불러오는 중입니다…';
     staffLoad=import('./staff/staff-client.js?v=quote-layout-20261014').catch(error=>{staffLoad=null;byId('staff-root').textContent='화면을 불러오지 못했습니다. 직원 로그인 버튼을 다시 눌러 주세요.';throw error;});
   }
   return staffLoad;
 };
 byId('staff-login').addEventListener('click',()=>{show('login');ensureStaff().then(()=>{if(window.staffUser)send({view:'quote'});}).catch(()=>{});});
 if(sessionStorage.getItem('doosung-staff-session')){const restore=()=>ensureStaff().catch(()=>{});if('requestIdleCallback' in window)requestIdleCallback(restore,{timeout:1200});else setTimeout(restore,0);}
 window.addEventListener('staff-show',e=>show(e.detail.view));
 const toast=text=>{byId('staff-toast').textContent=text;byId('staff-toast').hidden=false;clearTimeout(window.staffToastTimer);window.staffToastTimer=setTimeout(()=>byId('staff-toast').hidden=true,3500);};
 window.addEventListener('staff-toast',e=>toast(e.detail.text));
 window.addEventListener('staff-state',e=>{
  const previousStaff=!!window.staffUser&&!window.staffUser.mustChange;
  const {user,selected,quoteCount}=e.detail;window.staffUser=user&&user.status==='approved'?user:null;
  byId('staff-login').textContent=user?'직원 메뉴':'직원 로그인';
  byId('staff-controls').hidden=!user;
  byId('staff-controls').replaceChildren();
  if(user){const info=document.createElement('span');info.className='staff-user';info.textContent=user.name+' · '+user.department;byId('staff-controls').append(info);
   const items=[['search','가격 검색'],['compare',`가격 비교 (${selected.length})`],['quote',`견적 작성 (${quoteCount})`],['saved','내 견적'],...(user.role==='admin'?[['users','직원 승인']]:[]),['password','비밀번호 변경'],['logout','로그아웃']];
   for(const [view,label] of items){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=user.mustChange&&!['password','logout'].includes(view);button.addEventListener('click',()=>{if(view==='search')show(view);else if(view==='logout')send({action:'logout'});else{show(view);send({view});}});byId('staff-controls').append(button);}
  }
  const note=document.querySelector('.price-note');if(note){note.replaceChildren(document.createTextNode(user&&!user.mustChange?'가격 · 원/매 (포·권 등은 원본 판매 단위) ':'가격 · 원 / 표시단위 (매 단위 상품은 500매 기준) '));const vat=document.createElement('span');vat.textContent='부가세(VAT) 별도 금액';note.append(vat);}
  if(previousStaff!==(!!window.staffUser&&!window.staffUser.mustChange)){if(typeof render==='function')render();const detail=byId('detail');if(detail.open)detail.close();}
 });
 byId('list').addEventListener('click',e=>{const compare=e.target.closest('[data-staff-compare]'),add=e.target.closest('[data-staff-add]');if(compare){send({action:'compare',id:Number(compare.dataset.staffCompare)});toast('상단 가격 비교 메뉴에서 선택 상품을 확인하세요.');}if(add)send({action:'add',id:Number(add.dataset.staffAdd)});});
 byId('home-link').addEventListener('click',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey)show('search');});
})();
