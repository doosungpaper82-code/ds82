export const HEADERS=['품명','규격','품목대분류','품목중분류','표준단가','적재환산량','기준단위','추가특성(인증)','색상코드','패턴','색상번호','색상명','평량','두께','사이즈'];
export const MAX_BYTES=5*1024*1024;
export function parseCSV(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('CSV는 5MB 이하로 선택해 주세요.');
  text=text.replace(/^\uFEFF/,'');
  if(text.includes('\uFFFD'))throw Error('한글을 읽을 수 없습니다. 파일 인코딩을 변경하거나 CSV UTF-8로 저장해 주세요.');
  const rows=[];let row=[],field='',quoted=false,closed=false,line=1,start=1;
  const cell=()=>{row.push(field.trim());field='';closed=false;};
  const finish=()=>{cell();if(row.some(x=>x!==''))rows.push({cells:row,line:start});row=[];start=line+1;if(rows.length>20001)throw Error('최대 20,000개 상품까지 적용할 수 있습니다.');};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else{field+=c;if(c==='\n')line++;}continue;}
    if(c==='"'){if(field||closed)throw Error(`${line}행: 따옴표 형식을 확인해 주세요.`);quoted=true;}
    else if(c===',')cell();
    else if(c==='\n'||c==='\r'){finish();if(c==='\r'&&text[i+1]==='\n')i++;line++;start=line;}
    else if(closed){if(!/\s/.test(c))throw Error(`${line}행: 닫는 따옴표 뒤에 쉼표가 필요합니다.`);}
    else field+=c;
    if(field.length>4000)throw Error(`${line}행: 한 셀은 4,000자 이내로 입력해 주세요.`);
  }
  if(quoted)throw Error('닫히지 않은 따옴표가 있습니다.');
  if(field||row.length||closed)finish();
  if(rows.length<2)throw Error('열 이름과 상품 데이터가 있는 CSV를 선택해 주세요.');
  const headers=rows.shift().cells;
  if(new Set(headers).size!==headers.length)throw Error('중복된 열 이름이 있습니다.');
  const required=['품명','규격','품목대분류','품목중분류','표준단가','기준단위'];
  const absent=required.filter(h=>!headers.includes(h));
  if(absent.length)throw Error(`필수 열이 없습니다: ${absent.join(', ')}`);
  const errors=[],products=[];
  for(const r of rows){
    if(r.cells.length!==headers.length){errors.push(`${r.line}행: 열 개수가 맞지 않습니다. 쉼표가 있는 값은 큰따옴표로 감싸 주세요.`);continue;}
    const get=h=>r.cells[headers.indexOf(h)]??'';
    const blank=required.filter(h=>get(h)==='');
    if(blank.length){errors.push(`${r.line}행: ${blank.join(', ')} 값이 비어 있습니다.`);continue;}
    const raw=get('표준단가');
    if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,4})?$/.test(raw)||!Number.isFinite(Number(raw.replaceAll(',','')))){
      errors.push(`${r.line}행: 표준단가는 0 이상의 숫자로 입력해 주세요. (소수점 최대 4자리)`);continue;
    }
    const load=get('적재환산량');
    if(load&&!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(load)){errors.push(`${r.line}행: 적재환산량은 0 이상의 숫자로 입력해 주세요.`);continue;}
    const p=extract({id:r.line,name:get('품명'),spec:get('규격'),major:get('품목대분류'),middle:get('품목중분류'),price:Number(raw.replaceAll(',','')),load:load?Number(load.replaceAll(',','')):null,unit:get('기준단위'),cert:get('추가특성(인증)'),colorRaw:get('색상코드')});
    for(const [h,k] of [['패턴','pattern'],['색상번호','code'],['색상명','color'],['평량','weight'],['두께','thickness'],['사이즈','size']])if(get(h))p[k]=get(h);
    products.push(p);
  }
  if(errors.length)throw Error(`${errors.length}개 행을 수정해 주세요.\n${errors.slice(0,12).join('\n')}${errors.length>12?'\n나머지 오류는 앞의 오류를 수정한 뒤 다시 확인해 주세요.':''}`);
  return {products,warnings:[products.some(p=>!p.weight&&!p.thickness)||products.some(p=>!p.size)?'일부 규격은 자동 분리되지 않았습니다. 원본 규격으로 검색할 수 있으며, 평량·두께·사이즈 열을 추가하면 직접 지정할 수 있습니다.':''].filter(Boolean)};
}
export function extract(p){
  const {name,spec,middle,colorRaw}=p;
  const weight=spec.match(/(\d+(?:\.\d+)?)\s*g\b/), thick=spec.match(/^(\d+(?:\.\d+)?)\s*(mm|μm?|㎛|µm?)/), size=spec.match(/(\d+(?:\.\d+)?(?:\(\d+\))?)(mm)?\s*[xX*×]\s*(\d+(?:\.\d+)?)(mm|M|m)?/);
  let pattern='',code='',color=colorRaw;
  if(middle==='티엠보스')pattern=name.match(/T-EOS\(([^)]+)\)/)?.[1]||'';
  if(middle==='탄트셀렉트')pattern=name.match(/탄트\d+\*([^\d*]+)/)?.[1]||'';
  if(middle==='오리지널그문드')pattern=color.split(' ')[0]||'';
  if(pattern)color=color.replace(/^(미닛|사간|이오리|해머튼|자가드|제라드|타셀|호소오리|모시|로렐|안개|노을|운모|눈꽃|타탄|레이드|매트)\s+/,'');
  const m=color.match(/(?<![A-Za-z0-9])([A-Za-z]{0,4}\d+[A-Za-z]?(?:\(\d+\))?)(?![A-Za-z0-9])/);
  if(m){code=m[1];color=(color.slice(0,m.index)+color.slice(m.index+m[0].length)).replace(/^[ -]+|[ -]+$/g,'');}
  const plain=name.replace(/^\(FSC[^)]*\)/,'').trim();
  if(!code){const n=plain.match(/(?:\*|[-(])([A-Za-z]{0,3}\d{2,4})(?=[)\s*\-]|$)/);if(n&&n[1]!==String(Number(weight?.[1])))code=n[1];}
  if(!color){const tail=plain.match(/\(([^()]+)\)\s*$/)?.[1];if(tail&&/[가-힣ぁ-ヿ一-龯A-Za-z]/.test(tail)&&!/^(?:[A-Za-z]*\d+|FSC.*|ECO|N|T|E)$/.test(tail))color=tail;else if(code){const rest=plain.slice(plain.lastIndexOf(code)+code.length);color=rest.match(/^\s*-\s*([^*()]+)$/)?.[1]?.trim()||'';}}
  return {...p,pattern,code,color,weight:weight?Number(weight[1])+' g':'',thickness:thick?Number(thick[1])+(thick[2]==='mm'?' mm':' μm'):'',size:size?size[1]+(size[2]?' mm':'')+' × '+size[3]+(size[4]?' '+size[4]:''):spec.match(/\d+roll/)?.[0]||''};
}
export function exportCSV(products){
  const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  return '\uFEFF'+HEADERS.map(quote).join(',')+'\r\n'+products.map(p=>[p.name,p.spec,p.major,p.middle,p.price,p.load,p.unit,p.cert,p.colorRaw,p.pattern,p.code,p.color,p.weight,p.thickness,p.size].map(v=>quote(typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:v)).join(',')).join('\r\n');
}
