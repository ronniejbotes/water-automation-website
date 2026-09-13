import { chromium } from 'playwright-core';
const exe="C:/Users/ronja/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const urls=['/2435/','/water-damage-is-silent-and-brutal-heres-how-to-outsmart-it/','/the-smart-way-to-stop-water-leaks-before-they-drain-your-wallet/','/how-a-smart-leak-detector-can-save-you-thousands/','/can-a-running-toilet-increase-your-water-bill/','/diy-water-leak-detection-that-actually-works/'];
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:1440,height:900}});
for(const u of urls){
  await p.goto('http://localhost:4400'+u,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2000);
  const r = await p.evaluate(()=>{
    const w=document.querySelector('.elementor-widget-theme-post-content');
    if(!w) return {err:'no post-content widget'};
    const clone=w.cloneNode(true);
    const loops=[...clone.querySelectorAll('.elementor-widget-loop-grid, .elementor-loop-container')];
    const nestedLoop=loops.length;
    loops.forEach(l=>l.remove());
    const txt=clone.innerText||clone.textContent;
    const cnt=(s,re)=>((s.match(re)||[]).length);
    return {
      nestedLoopWidgets:nestedLoop,
      bodyChars:txt.replace(/\s+/g,' ').trim().length,
      aquahalt:cnt(txt,/aquahalt/gi),
      aquahaltCtx:[...txt.matchAll(/.{60}aquahalt.{60}/gi)].map(m=>m[0].replace(/\s+/g,' ')).slice(0,5),
      moen:cnt(txt,/moen/gi), phyn:cnt(txt,/phyn/gi), govee:cnt(txt,/govee/gi),
      title:(document.title||'').slice(0,90),
      firstWords:txt.replace(/\s+/g,' ').trim().slice(0,200)
    };
  });
  console.log(u+'\n'+JSON.stringify(r,null,1)+'\n');
}
await b.close();
