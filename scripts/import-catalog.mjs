import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {extract} from '../web/catalog.mjs';
const rows=JSON.parse(fs.readFileSync('catalog-import.json','utf8'));
assert(rows.length>0&&rows.length<=20000,'상품 수는 1~20,000개여야 합니다.');
const context={window:{PRODUCTS:[]}};
vm.createContext(context);
for(let i=0;i<8;i++)vm.runInContext(fs.readFileSync(`docs/data-${i}.js`,'utf8'),context);
const old=context.window.PRODUCTS;
const key=p=>[p.name,p.spec,p.major,p.middle,p.colorRaw].join('\t');
const previous=new Map(old.map(p=>[key(p),p]));
let changedPrices=0,changedUnits=0,overrides=0;
const products=rows.map((r,i)=>{
  const clean=k=>String(r[k]??'').trim();
  const p={id:i+2,name:clean('품명'),spec:clean('규격'),major:clean('품목대분류'),middle:clean('품목중분류'),price:r['표준단가'],load:r['적재환산량'],unit:clean('기준단위'),cert:clean('추가특성(인증)'),colorRaw:clean('색상코드')};
  assert(p.name&&p.spec&&p.unit,`Missing required value at row ${i+2}`);
  assert(typeof p.price==='number'&&Number.isFinite(p.price)&&p.price>=0,`Invalid price at row ${i+2}`);
  const before=previous.get(key(p));
  const result=before?{...before,...p}:extract(p);
  if(clean('평량')){const weight=Number(r['평량']);assert(Number.isFinite(weight)&&weight>=0);result.weight=weight+' g';}
  if(clean('패턴'))result.pattern=clean('패턴');
  // Retain the user's explicit correction for these two 250-sheet packs.
  if(/^화이트크라프트\([AS]\) 080$/.test(p.name)&&p.spec.includes('250매포')&&p.unit==='매'){result.unit='포';overrides++;}
  if(before&&before.price!==result.price)changedPrices++;
  if(before&&before.unit!==result.unit)changedUnits++;
  return result;
});
assert.equal(products.length,rows.length);
const added=products.filter(p=>!previous.has(key(p))).length;
const nextKeys=new Set(products.map(key));
const removed=old.filter(p=>!nextKeys.has(key(p))).length;
for(let i=0;i<8;i++){
  const start=Math.floor(i*products.length/8),end=Math.floor((i+1)*products.length/8);
  const script='window.PRODUCTS.push(...'+JSON.stringify(products.slice(start,end))+');\n';
  new vm.Script(script);
  fs.writeFileSync(`docs/data-${i}.js`,script);
}
const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date()).replaceAll('-','.');
const html=fs.readFileSync('docs/index.html','utf8').replace(/<span id="catalog-date">[^<]*<\/span>/,`<span id="catalog-date">가격표 업데이트 · ${date}</span>`);
fs.writeFileSync('docs/index.html',html);
if(fs.existsSync('catalog-import-sha.txt'))fs.writeFileSync('docs/catalog-version.json',JSON.stringify({sha256:fs.readFileSync('catalog-import-sha.txt','utf8').trim(),updatedAt:new Date().toISOString(),count:products.length}));
console.log(JSON.stringify({count:products.length,changedPrices,changedUnits,added,removed,packCorrectionsRetained:overrides,patterns:products.filter(p=>p.pattern).length}));
