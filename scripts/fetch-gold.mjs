#!/usr/bin/env node
/* fetch-gold.mjs — Thu thập giá vàng kimkhanhviethung.vn → data/gold.json
 *
 * Chạy:
 *   node scripts/fetch-gold.mjs                 # lấy bảng giá hiện tại (mặc định, dùng cho cron)
 *   node scripts/fetch-gold.mjs --backfill      # + tải lịch sử từ Wayback (1 năm)
 *   node scripts/fetch-gold.mjs --backfill --max=50   # giới hạn số snapshot
 *
 * Không cần thư viện bên ngoài (chỉ dùng fetch có sẵn của Node 18+).
 * Thoát với mã != 0 khi không lấy được gì → GitHub Action báo đỏ.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGoldPage, dmyToIso, mergeSnapshot } from './gold-parse.mjs';

const SITE_URL = 'https://kimkhanhviethung.vn/tra-cuu-gia-vang.html';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = join(ROOT, 'data', 'gold.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const BACKFILL = args.includes('--backfill');
const MAX_SNAP = (() => {
  const a = args.find(x => x.startsWith('--max='));
  return a ? Math.max(1, parseInt(a.slice(6), 10) || 400) : 400;
})();

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), '|', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isoDay = d => d.toISOString().slice(0, 10);

async function getText(url, timeoutMs = 60000, tries = 5){
  let lastErr;
  for(let i = 1; i <= tries; i++){
    try{
      const res = await fetch(url, {
        headers: {
          'user-agent': UA,
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
          'cache-control': 'no-cache',
          'pragma': 'no-cache'
        },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
        cache: 'no-store'
      });
      if(!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    }catch(e){
      lastErr = e;
      log(`  thử ${i}/${tries} lỗi: ${e.message}`);
      if(i < tries) await sleep(5000 * i);
    }
  }
  throw lastErr;
}

function loadStore(){
  if(!existsSync(DATA_FILE)) return {};
  try{
    const j = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    return (j && j.snapshots && typeof j.snapshots === 'object') ? j.snapshots : {};
  }catch(e){
    log('Cảnh báo: data/gold.json hỏng (' + e.message + ') → bắt đầu mới');
    return {};
  }
}

function saveStore(store){
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  const payload = {
    site: SITE_URL,
    unit: 'Đồng/chỉ',
    generatedAt: new Date().toISOString(),
    days: Object.keys(store).length,
    snapshots: Object.fromEntries(Object.keys(store).sort().map(k => [k, store[k]]))
  };
  writeFileSync(DATA_FILE, JSON.stringify(payload, null, 1) + '\n', 'utf8');
}

/* ---------- 1) Lấy bảng giá hiện tại ---------- */
async function runLive(store){
  log('Lấy bảng giá hiện tại:', SITE_URL);
  const html = await getText(SITE_URL);
  const parsed = parseGoldPage(html);
  if(!parsed.items.length) throw new Error('parse ra 0 dòng — cấu trúc trang có thể đã thay đổi');
  const key = (parsed.sourceUpdatedAt && dmyToIso(parsed.sourceUpdatedAt)) || isoDay(new Date());
  const res = mergeSnapshot(store, key, {
    date: key,
    sourceUpdatedAt: parsed.sourceUpdatedAt,
    fetchedAt: new Date().toISOString(),
    origin: 'live',
    items: parsed.items
  });
  log(`  ${key}: ${parsed.items.length} loại → ${res}`);
  return res;
}

/* ---------- 2) Backfill từ Wayback ---------- */
async function runBackfill(store){
  const pad = n => String(n).padStart(2, '0');
  const from = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const t0 = new Date(Date.now() - 366 * 86400000);
  const cdx = 'https://web.archive.org/cdx/search/cdx?url=' + encodeURIComponent(SITE_URL)
    + '&output=json&fl=timestamp&filter=statuscode:200'
    + '&from=' + from(t0) + '&to=' + from(new Date())
    + '&collapse=timestamp:8&limit=' + (MAX_SNAP + 50);

  log('Truy vấn danh sách bản lưu Wayback…');
  const txt = await getText(cdx, 60000, 2);
  if(/Temporarily Offline|<html|<!doctype/i.test(txt)){
    throw new Error('Internet Archive đang tạm ngừng hoạt động (trả trang lỗi)');
  }
  const rows = JSON.parse(txt.trim());
  const stamps = rows.slice(1).map(r => r && r[0]).filter(Boolean).slice(0, MAX_SNAP);
  log(`  tìm thấy ${stamps.length} bản lưu (1 bản/ngày)`);

  let added = 0, updated = 0, skipped = 0, failed = 0;
  for(let i = 0; i < stamps.length; i++){
    const ts = stamps[i];
    const wbDate = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
    if(store[wbDate]){ skipped++; continue; }
    try{
      const html = await getText(`https://web.archive.org/web/${ts}id_/${SITE_URL}`, 60000, 2);
      const parsed = parseGoldPage(html);
      if(!parsed.items.length){ failed++; }
      else{
        const key = (parsed.sourceUpdatedAt && dmyToIso(parsed.sourceUpdatedAt)) || wbDate;
        const r = mergeSnapshot(store, key, {
          date: key,
          sourceUpdatedAt: parsed.sourceUpdatedAt,
          fetchedAt: new Date().toISOString(),
          waybackTs: ts,
          origin: 'wayback',
          items: parsed.items
        });
        if(r === 'added') added++; else if(r === 'updated') updated++; else skipped++;
      }
    }catch(e){
      failed++;
      log(`  ${wbDate} lỗi: ${e.message}`);
      if(/HTTP 503|HTTP 502|Internet Archive/i.test(String(e.message))){
        log('  Dừng backfill: Internet Archive không sẵn sàng — chạy lại sau');
        break;
      }
    }
    if((i + 1) % 20 === 0) log(`  tiến độ ${i + 1}/${stamps.length} (+${added} mới, ${skipped} bỏ qua, ${failed} lỗi)`);
    await sleep(700);   // giãn tần suất, tôn trọng Wayback
  }
  log(`Backfill xong: +${added} ngày mới, ${updated} cập nhật, ${skipped} bỏ qua, ${failed} lỗi`);
  return added + updated;
}

/* ---------- Main ---------- */
async function main(){
  const store = loadStore();
  log(`Bắt đầu · đang có ${Object.keys(store).length} ngày trong data/gold.json`);
  let saved = 0, liveOk = false;

  if(BACKFILL){
    try{ saved += await runBackfill(store); }
    catch(e){ console.error('::warning::Backfill lỗi: ' + e.message); }
  }
  try{
    const r = await runLive(store);
    saved += (r === 'added' ? 1 : 0);
    liveOk = true;
  }catch(e){
    console.error('::error::Lấy giá hiện tại thất bại: ' + e.message);
  }

  if(!liveOk && saved === 0){
    console.error('::error::Không thu thập được dữ liệu nào');
    process.exit(1);
  }
  saveStore(store);
  log(`Đã ghi data/gold.json · tổng ${Object.keys(store).length} ngày`);
  if(!liveOk) process.exit(2);   // có dữ liệu backfill nhưng lỗi giá hiện tại → Action vẫn báo đỏ
}

main().catch(e => {
  console.error('::error::' + (e && e.stack || e));
  process.exit(1);
});
