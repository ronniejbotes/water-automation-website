import { chromium } from 'playwright-core';
const exe="C:/Users/ronja/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const cities=["boston","chicago","dallas","fort-lauderdale","houston","miami","new-york","washington-dc"];
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:1440,height:900}});
for(const c of cities){
  await p.goto(`http://localhost:4400/water-leak-protection-${c}/`,{waitUntil:'networkidle'});
  await p.waitForTimeout(1200);
  const r=await p.evaluate(()=>{
    const h=document.querySelector('h1');
    if(!h) return {none:true};
    const cs=getComputedStyle(h), rc=h.getBoundingClientRect();
    return {text:h.textContent.trim(), visibility:cs.visibility, rendersText:h.innerText.length>0, boxW:Math.round(rc.width), boxH:Math.round(rc.height)};
  });
  console.log(`${c.padEnd(18)} vis=${r.visibility.padEnd(7)} rendersText=${r.rendersText} box=${r.boxW}x${r.boxH} text="${r.text}"`);
}
await b.close();
