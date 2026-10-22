'use strict';
window.STAFF_API_BASE='https://doosung-staff-quotes.doosungpaper82.chatgpt.site';
window.staffUser=null;
(()=>{
 const byId=id=>document.getElementById(id);
 const syncNavHeight=()=>document.documentElement.style.setProperty('--staff-nav-height',byId('staff-controls').getBoundingClientRect().height+'px');
 const navObserver=new ResizeObserver(syncNavHeight);
 navObserver.observe(byId('staff-controls'));
 window.addEventListener('resize',syncNavHeight);
 syncNavHeight();
 const send=detail=>window.dispatchEvent(new CustomEvent('staff-command',{detail}));
 const recordRoute=(route,replace=false)=>{if(JSON.stringify(history.state?.doosungRoute)===JSON.stringify(route))return;history[replace?'replaceState':'pushState']({...history.state,doosungRoute:route},'',location.href);};
 history.replaceState({...history.state,doosungRoute:{view:'search'}},'',location.href);
 const show=(view,record=true,replace=false)=>{if(record&&['search','login'].includes(view))recordRoute({view},replace);const staff=view!=='search';byId('staff-root').hidden=!staff;byId('public-catalog').hidden=staff;byId('staff-toast').hidden=true;document.body.classList.toggle('staff-view',staff);window.scrollTo({top:0,behavior:'instant'});};
 let staffLoad;
 const ensureStaff=()=>{
   if(!staffLoad){
     const css=document.createElement('link');css.rel='stylesheet';css.href='staff/staff-client.css?v=copy-20261023';document.head.append(css);
     byId('staff-root').textContent='직원 로그인 화면을 불러오는 중입니다…';
     staffLoad=import('./staff/staff-client-copy-20261023.js').catch(error=>{staffLoad=null;byId('staff-root').textContent='화면을 불러오지 못했습니다. 직원 로그인 버튼을 다시 눌러 주세요.';throw error;});
   }
   return staffLoad;
 };
 byId('staff-login').addEventListener('click',()=>{show('login');ensureStaff().then(()=>{if(window.staffUser)send({view:'quote'});}).catch(()=>{});});
 if(sessionStorage.getItem('doosung-staff-session')||localStorage.getItem('doosung-staff-remembered')){const restore=()=>ensureStaff().catch(()=>{});if('requestIdleCallback' in window)requestIdleCallback(restore,{timeout:1200});else setTimeout(restore,0);}
 window.addEventListener('staff-show',e=>show(e.detail.view,true,!!e.detail.replace));
 window.addEventListener('staff-route',e=>{
  const {replace,...route}=e.detail;
  if(!window.staffUser||window.staffUser.mustChange)return;
  const changed=JSON.stringify(history.state?.doosungRoute)!==JSON.stringify(route);
  recordRoute(route,!!replace);if(changed||(route.view==='search')!==byId('staff-root').hidden)show(route.view,false);
 });
 window.addEventListener('popstate',e=>{
  const route=e.state?.doosungRoute||{view:'search'};
  if(!['search','login','quote','preview','saved','users','password'].includes(route.view)){show('search',true,true);return;}
  if(route.view==='search'){show('search',false);return;}
  if(!window.staffUser){show('login',true,true);ensureStaff().catch(()=>{});return;}
  if(window.staffUser.mustChange){show('password',false);recordRoute({view:'password'},true);send({view:'password'});return;}
  if(route.view==='login'){show('search',true,true);return;}
  show(route.view,false);send({action:'history',route});
 });
 const toast=text=>{byId('staff-toast').textContent=text;byId('staff-toast').hidden=false;clearTimeout(window.staffToastTimer);window.staffToastTimer=setTimeout(()=>byId('staff-toast').hidden=true,3500);};
 window.addEventListener('staff-toast',e=>toast(e.detail.text));
 window.addEventListener('staff-state',e=>{
  const previousStaff=!!window.staffUser&&!window.staffUser.mustChange;
  const {user,quoteCount}=e.detail;window.staffUser=user&&user.status==='approved'?user:null;
  if(previousStaff&&!user)show('search',true,true);
  byId('staff-login').hidden=!!user;
  byId('staff-login').textContent='직원 로그인';
  byId('staff-controls').hidden=!user;
  byId('staff-controls').replaceChildren();
  byId('staff-account-controls').hidden=!user;
  byId('staff-account-controls').replaceChildren();
  if(user){const info=document.createElement('span');info.className='staff-user';info.textContent=user.name+' · '+user.department;byId('staff-controls').append(info);
   const items=[['search','가격 검색'],['quote','견적 작성'],['saved','내 견적'],...(user.role==='admin'?[['users','직원 승인']]:[]),['password','비밀번호 변경'],['logout','로그아웃']];
   for(const [view,label] of items){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=user.mustChange&&!['password','logout'].includes(view);button.addEventListener('click',()=>{if(view==='search')show(view);else if(view==='logout')send({action:'logout'});else{show(view);send({view});}});byId(['users','password','logout'].includes(view)?'staff-account-controls':'staff-controls').append(button);}
  }
  syncNavHeight();
  const note=document.querySelector('.price-note');if(note){note.replaceChildren(document.createTextNode(user&&!user.mustChange?'가격 · 장단가 / 연단가 / 톤단가 (포·권 등은 원본 단위) ':'가격 · 원 / 표시단위 (매 단위 상품은 500매 기준) '));const vat=document.createElement('span');vat.textContent='부가세(VAT) 별도 금액';note.append(vat);}
  if(previousStaff!==(!!window.staffUser&&!window.staffUser.mustChange)){if(typeof render==='function')render();const detail=byId('detail');if(detail.open)detail.close();}
 });
 byId('list').addEventListener('click',e=>{const add=e.target.closest('[data-staff-add]');if(add)send({action:'add',id:Number(add.dataset.staffAdd)});});
 byId('home-link').addEventListener('click',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey)show('search');});
})();
