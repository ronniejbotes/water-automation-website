import { chromium } from 'playwright-core';
const exe="C:/Users/ronja/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:1440,height:900}});
// check the hub-ish pages a user/crawler would traverse
const pages=['/', '/about-us/', '/buy-now/', '/contact-us/', '/partner/', '/q-and-a/', '/blog/', '/case-studies/', '/water-leak-protection-boston/'];
for(const u of pages){
  const resp=await p.goto('http://localhost:4400'+u,{waitUntil:'networkidle'}).catch(e=>null);
  if(!resp){console.log(u.padEnd(32),'LOAD FAIL');continue;}
  await p.waitForTimeout(800);
  const r=await p.evaluate(()=>{
    const as=[...document.querySelectorAll('a[href]')];
    return {total:as.length, city:as.filter(a=>/water-leak-protection-(boston|chicago|dallas|fort-lauderdale|houston|miami|new-york|washington-dc)/.test(a.getAttribute('href')||'')).map(a=>a.getAttribute('href'))};
  });
  console.log(`${u.padEnd(32)} status=${resp.status()} anchors=${String(r.total).padStart(4)} -> city links: ${r.city.length}`);
}
// sample-page from sitemap
for(const u of ['/sample-page/','/return-policy/']){
  const resp=await p.goto('http://localhost:4400'+u,{waitUntil:'domcontentloaded'}).catch(()=>null);
  console.log(`${u.padEnd(32)} status=${resp?resp.status():'FAIL'}`);
}
await b.close();
