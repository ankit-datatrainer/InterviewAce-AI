import type { PlatformSettings } from '@/lib/platform-settings';

export interface InvoiceData {
  invoiceNo: string;
  date: string;          // human-readable
  billedToName: string;
  billedToEmail?: string;
  description: string;   // e.g. "1-on-1 Coaching · Jane Coach · Mar 3, 10:00 AM"
  baseAmount: number;    // pre-tax, in currency units (rupees)
}

/** Parses a "₹1,499" / "1499" style price string into a number. */
export function parsePrice(price: string | number | null | undefined): number {
  if (typeof price === 'number') return price;
  if (!price) return 0;
  const n = Number(String(price).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function money(sym: string, n: number): string {
  return `${sym}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** Builds a self-contained printable invoice HTML document. */
export function buildInvoiceHtml(data: InvoiceData, settings: PlatformSettings): string {
  const tax = +(data.baseAmount * (settings.taxPercent / 100)).toFixed(2);
  const total = +(data.baseAmount + tax).toFixed(2);
  const sym = settings.currencySymbol;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${data.invoiceNo}</title>
<style>
  * { box-sizing: border-box; font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
  body { margin: 0; padding: 40px; color: #1a1a2e; background: #fff; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
  .brand { font-size: 22px; font-weight: 800; color: #2563eb; }
  .brand small { display:block; font-size: 12px; color:#666; font-weight:500; margin-top:4px; }
  h1 { font-size: 28px; margin: 0; letter-spacing: 1px; color:#111; }
  .meta { text-align: right; font-size: 13px; color:#444; }
  .party { margin: 28px 0; font-size: 14px; }
  .party b { display:block; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
  th { text-align:left; background:#f4f6fb; padding:12px; color:#555; font-size:12px; text-transform:uppercase; }
  td { padding:12px; border-bottom:1px solid #eee; }
  .totals { margin-left:auto; width: 280px; margin-top: 16px; font-size:14px; }
  .totals div { display:flex; justify-content:space-between; padding:6px 0; }
  .totals .grand { border-top:2px solid #111; margin-top:6px; padding-top:12px; font-weight:800; font-size:16px; }
  .foot { margin-top:48px; font-size:12px; color:#888; text-align:center; border-top:1px solid #eee; padding-top:16px; }
  @media print { body { padding: 0; } .noprint { display:none; } }
</style></head><body>
  <div class="head">
    <div class="brand">${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="" style="height:40px"/>` : settings.platformName}<small>${settings.supportEmail}</small></div>
    <div><h1>INVOICE</h1><div class="meta">#${data.invoiceNo}<br/>${data.date}</div></div>
  </div>
  <div class="party"><b>Billed to</b>${data.billedToName}${data.billedToEmail ? `<br/>${data.billedToEmail}` : ''}</div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody><tr><td>${data.description}</td><td style="text-align:right">${money(sym, data.baseAmount)}</td></tr></tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>${money(sym, data.baseAmount)}</span></div>
    <div><span>${settings.taxLabel} (${settings.taxPercent}%)</span><span>${money(sym, tax)}</span></div>
    <div class="grand"><span>Total</span><span>${money(sym, total)}</span></div>
  </div>
  <div class="foot">Thank you for choosing ${settings.platformName}. This is a computer-generated invoice.</div>
  <div class="noprint" style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">Print / Save as PDF</button></div>
</body></html>`;
}

/** Opens the invoice in a new tab, ready to print or save as PDF. */
export function openInvoice(data: InvoiceData, settings: PlatformSettings): void {
  const html = buildInvoiceHtml(data, settings);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
