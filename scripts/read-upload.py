"""Read an administrator's workbook without executing formulas or macros."""
import hashlib, json, pathlib, sys, csv, io
import openpyxl

root = pathlib.Path(__file__).resolve().parents[1]
source = root / 'incoming' / 'price-list.xlsx'
if not source.exists():
    print('No uploaded workbook; deploy existing catalog.')
    sys.exit(0)
raw = source.read_bytes()
if len(raw) > 10 * 1024 * 1024:
    raise ValueError('가격표 파일은 10MB 이하여야 합니다.')
digest = hashlib.sha256(raw).hexdigest()
metadata = root / 'docs' / 'catalog-version.json'
if metadata.exists() and json.loads(metadata.read_text(encoding='utf-8')).get('sha256') == digest:
    print('Workbook already imported.')
    sys.exit(0)
book = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=False)
sheet = book.active
iterator = sheet.iter_rows()
headers = [str(c.value or '').strip() for c in next(iterator)]
if len(headers) != len(set(headers)):
    raise ValueError('열 이름이 중복되었거나 비어 있습니다.')
required = ['품명', '규격', '품목대분류', '품목중분류', '표준단가', '기준단위']
if any(h not in headers for h in required):
    raise ValueError('필수 열: ' + ', '.join(required))
rows = []
for cells in iterator:
    if not any(c.value is not None for c in cells):
        continue
    if any(c.data_type in ('f', 'e') for c in cells):
        raise ValueError(f'{cells[0].row}행: 수식과 오류 셀은 값으로 붙여넣은 뒤 업로드해 주세요.')
    rows.append(dict(zip(headers, [c.value for c in cells])))
    if len(rows) > 20000:
        raise ValueError('최대 20,000개 상품까지 업로드할 수 있습니다.')
if not rows:
    raise ValueError('상품이 없는 가격표입니다.')
(root / 'catalog-import.json').write_text(json.dumps(rows, ensure_ascii=False), encoding='utf-8')
(root / 'catalog-import-sha.txt').write_text(digest, encoding='utf-8')
print(f'Validated workbook: {len(rows)} rows')
