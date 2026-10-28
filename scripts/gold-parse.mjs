/* gold-parse.mjs — Parse bảng giá kimkhanhviethung.vn
   Thuần JavaScript: chạy được ở Node (Action) lẫn trình duyệt (test/demo). */

export function norm(s){
  return String(s ?? '')
    .replace(/<[^>]*>/g, ' ')      // bỏ mọi thẻ HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function digits(s){
  const t = String(s ?? '').replace(/[^\d]/g, '');
  return t ? parseInt(t, 10) : 0;
}
export function dmyToIso(s){
  const m = String(s ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/* Trả về { sourceUpdatedAt: "09/10/2026 14:16:19" | null, items: [{group,name,buy,sell,convert}] } */
export function parseGoldPage(html){
  const out = { sourceUpdatedAt: null, items: [] };
  if(!html) return out;

  const m = html.match(/Ngày cập nhật:\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);
  if(m) out.sourceUpdatedAt = m[1];

  // Chọn bảng chứa cột "Mua vào" (site render HTML thiếu thẻ </tr> nên tách theo <tr>)
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  const table = tables.find(t => /Mua vào/i.test(t)) || tables.find(t => /tag_a/i.test(t)) || null;
  if(!table) return out;

  let group = 'Khác';
  for(const row of table.split(/<tr\b/i).slice(1)){
    const ths = row.match(/<th[\s\S]*?<\/th>/gi);
    if(ths && ths.length){
      const g = norm(ths[0]);
      if(g) group = g;
      continue;
    }
    const tds = row.match(/<td[\s\S]*?<\/td>/gi);
    if(tds && tds.length >= 3){
      const name = norm(tds[0]);
      if(!name) continue;
      out.items.push({
        group,
        name,
        buy: digits(tds[1]),
        sell: tds[2] ? digits(tds[2]) : 0,
        convert: tds[3] ? digits(tds[3]) : 0
      });
    }
  }
  return out;
}

/* Ghép snapshot vào store theo luật: live > wayback, bản mới hơn (fetchedAt) thắng */
export function mergeSnapshot(store, key, snap){
  const old = store[key];
  if(!old){ store[key] = snap; return 'added'; }
  if(old.origin === 'live' && snap.origin === 'wayback') return 'kept';
  // Nếu cả 2 đều là live và ngày cập nhật từ nguồn giống nhau hoặc giá giống hệt nhau -> giữ nguyên
  if(old.origin === 'live' && snap.origin === 'live'){
    if(old.sourceUpdatedAt && snap.sourceUpdatedAt && old.sourceUpdatedAt === snap.sourceUpdatedAt){
      return 'kept';
    }
    const oldStr = JSON.stringify(old.items || []);
    const newStr = JSON.stringify(snap.items || []);
    if(oldStr === newStr) return 'kept';
  }
  if(String(old.fetchedAt || '') >= String(snap.fetchedAt || '')) return 'kept';
  store[key] = snap;
  return 'updated';
}
