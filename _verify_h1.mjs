import { chromium } from 'playwright-core';
const exe="C:/Users/ronja/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:4400/water-leak-protection-boston/',{waitUntil:'networkidle'});
await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(()=>{
  const h=document.querySelector('h1');
  const cs=getComputedStyle(h); const r=h.getBoundingClientRect();
  // walk ancestors for hiding
  let anc=[],n=h;
  while(n&&n!==document.body){const c=getComputedStyle(n);anc.push({tag:n.tagName,cls:(n.className||'').toString().slice(0,50),display:c.display,vis:c.visibility,op:c.opacity,h:Math.round(n.getBoundingClientRect().height)});n=n.parentElement;}
  return {text:h.textContent.trim(), innerText:h.innerText, display:cs.display, visibility:cs.visibility, opacity:cs.opacity, fontSize:cs.fontSize, rect:{w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top)}, ancestors:anc.slice(0,6)};
}),null,1));
// also count visible h-tags
console.log("\nHeading outline (visible only):");
console.log((await p.evaluate(()=>[...document.querySelectorAll('h1,h2,h3')].filter(h=>h.offsetParent!==null||h.getClientRects().length).map(h=>h.tagName+': '+h.innerText.trim().slice(0,70)))).join('\n'));
await b.close();
