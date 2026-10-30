// invoice.js - builds invoices in 4 styles, prints them, saves PDFs, and shows the popup.
// Needs the html2pdf library (loaded by the page) for "Save PDF".

const Invoice = (function () {
  const STYLES = ['A4 Minimal', 'A4 Classic', 'A4 Bold', 'Thermal Receipt'];
  const KEY = { 'A4 Minimal': 'minimal', 'A4 Classic': 'classic', 'A4 Bold': 'bold', 'Thermal Receipt': 'thermal' };

  const money = v => 'Rs ' + Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
  const fdate = v => { const d = new Date(v); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  const row = (l, v, cls) => { const r = h('div', 'inv-row' + (cls ? ' ' + cls : '')); r.append(h('span', null, l), h('span', null, v)); return r; };

  const CSS = `
  .inv{box-sizing:border-box;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.45;width:794px;padding:46px 52px;margin:0 auto}
  .inv *{box-sizing:border-box}
  .inv-title{text-align:center;font-size:26pt;font-weight:700;letter-spacing:2px}
  .inv-store{text-align:center;color:#555;margin-top:2px}
  .inv-top{display:flex;justify-content:space-between;gap:24px;margin-top:26px}
  .inv-h{font-size:12pt;font-weight:700;margin-bottom:6px}
  .inv-name{font-weight:700}
  .inv-meta{min-width:270px}
  .inv-row{display:flex;justify-content:space-between;gap:16px;padding:2px 0}
  .inv-row span:first-child{font-weight:700}
  .inv-table{width:100%;border-collapse:collapse;margin-top:26px}
  .inv-table th,.inv-table td{padding:8px;text-align:left;vertical-align:top}
  .inv-table .r{text-align:right}
  .inv-totals{margin:16px 0 0 auto;width:280px}
  .inv-totals .inv-row{font-size:10pt}
  .inv-totals .inv-total{font-size:15pt;font-weight:700;border-top:2px solid #111;margin-top:6px;padding-top:6px}
  .inv-note{margin-top:20px;font-size:10pt}
  .inv-thanks{margin-top:34px;text-align:left;font-weight:700}
  .inv-foot{margin-top:26px;text-align:center;color:#555;font-size:9pt}

  .inv.minimal .inv-table th{border-bottom:1.5px solid #111}
  .inv.minimal .inv-table td{border-bottom:1px solid #ddd}

  .inv.classic{font-family:Georgia,'Times New Roman',serif}
  .inv.classic .inv-title{border-bottom:3px double #111;padding-bottom:8px}
  .inv.classic .inv-table th,.inv.classic .inv-table td{border:1px solid #444}
  .inv.classic .inv-table th{background:#efefef}

  .inv.bold .inv-title{background:var(--ic,#1a73e8);color:#fff;padding:14px;border-radius:6px;font-size:24pt}
  .inv.bold .inv-h{color:var(--ic,#1a73e8)}
  .inv.bold .inv-table th{background:var(--ic,#1a73e8);color:#fff}
  .inv.bold .inv-table td{border-bottom:1px solid #ddd}
  .inv.bold .inv-totals .inv-total{background:var(--ic,#1a73e8);color:#fff;border:0;padding:8px 10px;border-radius:6px}

  .inv.thermal{width:302px;padding:10px 8px;font-family:'Courier New',monospace;font-size:9pt}
  .inv.thermal .inv-title{font-size:15pt;letter-spacing:1px}
  .inv.thermal .inv-top{display:block;margin-top:10px}
  .inv.thermal .inv-meta{min-width:0;margin-top:8px}
  .inv.thermal .inv-h{font-size:10pt}
  .inv.thermal .t-sep{border-top:1px dashed #000;margin:8px 0}
  .inv.thermal .t-item{margin:4px 0}
  .inv.thermal .inv-totals{width:100%}
  .inv.thermal .inv-totals .inv-total{font-size:12pt;border-top:1px dashed #000}
  .inv.thermal .inv-thanks{margin-top:14px}
  .inv.thermal .inv-foot{margin-top:8px;font-size:8pt}

  #printArea{display:none}
  @page{size:A4;margin:14mm}
  @page receipt{size:80mm auto;margin:3mm}
  @media print{
    body.printing > *:not(#printArea){display:none !important}
    body.printing #printArea{display:block}
    #printArea .inv{width:auto;margin:0;padding:0;break-after:page}
    #printArea .inv.thermal{width:72mm;page:receipt}
  }
  .inv-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}
  .inv-modal{background:#fff;color:#111;border-radius:12px;padding:20px;width:100%;max-width:380px;box-shadow:0 10px 40px rgba(0,0,0,.4);font-family:Arial,Helvetica,sans-serif}
  .inv-modal h3{margin:0 0 4px;font-size:1.15rem}
  .inv-modal p{margin:0 0 12px;color:#666;font-size:.9rem}
  .inv-modal label{display:flex;align-items:center;gap:10px;margin:10px 0;font-size:1rem;color:#111}
  .inv-modal input[type=checkbox]{width:20px;height:20px}
  .inv-modal .b{display:flex;gap:10px;margin-top:16px}
  .inv-modal button{flex:1;width:auto;margin:0;padding:12px;border:0;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;background:#1a73e8;color:#fff}
  .inv-modal button.g{background:#eee;color:#111}
  .inv-modal button:disabled{opacity:.6}
  .inv-modal .st{min-height:1.2em;margin-top:10px;font-size:.85rem;color:#b91c1c}`;

  function ensureCss() {
    if (document.getElementById('invcss')) return;
    const st = document.createElement('style'); st.id = 'invcss'; st.textContent = CSS; document.head.appendChild(st);
  }

  /* ---------- Build one invoice ---------- */
  function build(d, style) {
    ensureCss();
    const key = KEY[style] || 'minimal', thermal = key === 'thermal';
    const root = h('div', 'inv ' + key);
    if (/^#[0-9a-f]{3,8}$/i.test(d.store.color || '')) root.style.setProperty('--ic', d.store.color);

    root.appendChild(h('div', 'inv-title', 'Invoice'));
    if (d.store.name) root.appendChild(h('div', 'inv-store', d.store.name));

    const top = h('div', 'inv-top'), bill = h('div', 'inv-bill');
    bill.appendChild(h('div', 'inv-h', 'Bill To'));
    bill.appendChild(h('div', 'inv-name', d.customer.name));
    String(d.customer.address || '').split('\n').forEach(l => { if (l.trim()) bill.appendChild(h('div', null, l.trim())); });
    if (d.customer.city) bill.appendChild(h('div', null, d.customer.city));
    if (d.customer.phone) bill.appendChild(h('div', null, d.customer.phone));
    const meta = h('div', 'inv-meta');
    meta.append(row('Invoice No', d.invoiceNo), row('Billing Date', fdate(d.date)), row('Billing Terms', d.terms));
    top.append(bill, meta); root.appendChild(top);

    if (thermal) {
      root.appendChild(h('div', 't-sep'));
      d.items.forEach(i => {
        const it = h('div', 't-item'); it.appendChild(h('div', null, (i.sku ? i.sku + ' ' : '') + i.desc));
        it.appendChild(row(i.qty + ' x ' + money(i.price), money(i.amount))); root.appendChild(it);
      });
      root.appendChild(h('div', 't-sep'));
    } else {
      const t = h('table', 'inv-table'), hr = h('tr');
      [['SKU', ''], ['Description', ''], ['Qty', 'r'], ['Unit Price', 'r'], ['Amount', 'r']].forEach(c => hr.appendChild(h('th', c[1], c[0])));
      const th = h('thead'); th.appendChild(hr); t.appendChild(th);
      const tb = h('tbody');
      d.items.forEach(i => {
        const r = h('tr');
        r.append(h('td', '', i.sku), h('td', '', i.desc), h('td', 'r', i.qty), h('td', 'r', money(i.price)), h('td', 'r', money(i.amount)));
        tb.appendChild(r);
      });
      t.appendChild(tb); root.appendChild(t);
    }

    const tot = h('div', 'inv-totals');
    tot.append(row('SUBTOTAL', money(d.subtotal)), row('DISCOUNT %', (d.discPct || 0) + '%'), row('DISCOUNT', money(d.discount)));
    tot.appendChild(row('TOTAL', money(d.total), 'inv-total'));
    if (d.advance > 0) { tot.append(row('Advance Amount', money(d.advance)), row('Balance Due', money(Math.max(0, d.total - d.advance)))); }
    root.appendChild(tot);

    if (d.note) root.appendChild(h('div', 'inv-note', 'Note: ' + d.note));
    root.appendChild(h('div', 'inv-thanks', 'Thank you for your Order'));
    root.appendChild(h('div', 'inv-foot', 'If you have any questions about this invoice, please contact ' + (d.store.phone || d.store.name)));
    return root;
  }

  /* ---------- Print and PDF ---------- */
  function print(d, styles) {
    ensureCss();
    let area = document.getElementById('printArea');
    if (!area) { area = h('div'); area.id = 'printArea'; document.body.appendChild(area); }
    area.textContent = '';
    styles.forEach(s => area.appendChild(build(d, s)));
    document.body.classList.add('printing');
    window.onafterprint = () => { document.body.classList.remove('printing'); area.textContent = ''; };
    setTimeout(() => window.print(), 150);
  }

  async function savePdf(d, styles) {
    if (typeof html2pdf === 'undefined') throw new Error('PDF library did not load. Check your internet.');
    for (const s of styles) {
      const el = build(d, s), thermal = s === 'Thermal Receipt';
      let fmt = 'a4';
      if (thermal) {   // receipt paper: 80 mm wide, as tall as the content
        const tmp = h('div'); tmp.style.cssText = 'position:absolute;left:-9999px;top:0';
        tmp.appendChild(el); document.body.appendChild(tmp);
        fmt = [80, Math.ceil(el.offsetHeight * 25.4 / 96) + 6]; tmp.remove();
      }
      await html2pdf().set({
        margin: 0, filename: d.invoiceNo + '-' + s.replace(/\s+/g, '-') + '.pdf',
        image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: fmt, orientation: 'portrait' }
      }).from(el).save();
    }
  }

  /* ---------- Popup: pick styles, then Save PDF or Print ---------- */
  function openDialog(d, defaultStyle) {
    ensureCss();
    const old = document.getElementById('invDlg'); if (old) old.remove();
    const ov = h('div', 'inv-ov'); ov.id = 'invDlg';
    const box = h('div', 'inv-modal');
    box.append(h('h3', null, 'Invoice ' + d.invoiceNo), h('p', null, 'Choose the style, then save or print.'));
    const first = STYLES.indexOf(defaultStyle || d.style) > -1 ? (defaultStyle || d.style) : 'A4 Classic';
    const boxes = [];
    STYLES.forEach(s => {
      const l = h('label'), c = document.createElement('input'); c.type = 'checkbox'; c.value = s; c.checked = s === first;
      boxes.push(c); l.append(c, document.createTextNode(s)); box.appendChild(l);
    });
    const st = h('div', 'st'), b = h('div', 'b');
    const bp = h('button', null, 'Save PDF'), br = h('button', null, 'Print'), bc = h('button', 'g', 'Close');
    const chosen = () => boxes.filter(c => c.checked).map(c => c.value);
    bp.onclick = async () => {
      const s = chosen(); if (!s.length) { st.textContent = 'Tick at least one style.'; return; }
      st.textContent = ''; bp.disabled = true; bp.textContent = 'Saving...';
      try { await savePdf(d, s); } catch (e) { st.textContent = e.message; }
      bp.disabled = false; bp.textContent = 'Save PDF';
    };
    br.onclick = () => { const s = chosen(); if (!s.length) { st.textContent = 'Tick at least one style.'; return; } st.textContent = ''; print(d, s); };
    bc.onclick = () => ov.remove();
    b.append(bp, br, bc); box.append(st, b); ov.appendChild(box); document.body.appendChild(ov);
  }

  return { STYLES: STYLES, build: build, print: print, savePdf: savePdf, openDialog: openDialog };
})();
