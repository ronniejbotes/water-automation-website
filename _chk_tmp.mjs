import { chromium } from 'playwright-core';
const exe = "C:/Users/ronja/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const b = await chromium.launch({executablePath: exe});
const p = await b.newPage({viewport:{width:1440,height:900}});
for (const u of ['2435','hidden-dangers-of-water-leaks','automatic-shutoff-vacation-home','blog']){
  await p.goto(`http://localhost:4400/${u}/`, {waitUntil:'networkidle', timeout:60000});
  await p.waitForTimeout(2500);
  const r = await p.evaluate(()=>{
    const t = document.body.innerText.replace(/\s+/g,' ').trim();
    const c = (s)=> t.split(s).length - 1;
    const i = t.indexOf('Acceptance checklist');
    return {len:t.length,
      acc: c('Acceptance checklist'),
      prep: c('Preparation may involve surveys, measurements, permits'),
      handoff: c('What should I receive at handoff'),
      sample: i<0 ? 'NOT VISIBLE' : t.slice(i, i+400)};
  });
  console.log(`\n== /${u}/ visibleLen=${r.len} acceptanceChecklist=${r.acc} prep=${r.prep} handoff=${r.handoff}`);
  console.log('   >>', r.sample);
}
await b.close();
