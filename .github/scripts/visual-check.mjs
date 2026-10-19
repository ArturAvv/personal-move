import { chromium } from 'playwright';
import fs from 'node:fs';
const base=process.env.TEST_URL || 'http://127.0.0.1:8765/';
const out='visual-results';
// Final verification rerun after replacement of calf raise and Bird Dog photographs.
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errors=[];
page.on('pageerror',e=>errors.push('JavaScript: '+e.message));
const report={url:base,viewport:'390x844',testedCommit:process.env.GITHUB_SHA||'local',screenshots:[],images:[],errors};
const fail=(msg)=>{errors.push(msg);console.error('FAIL',msg)};
try {
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await page.screenshot({path:out+'/00-home.png',fullPage:true});
 await page.locator('[data-go="levels"]').click();
 await page.screenshot({path:out+'/01-levels.png',fullPage:true});
 await page.locator('[data-go="plan"]').click();
 const routine=await page.locator('.routine-list li').allTextContents();
 if(routine.length!==10)fail('Expected 10 exercises, got '+routine.length);
 if(!routine[5]?.includes('Поза ребёнка'))fail('Child pose should be exercise 6');
 if(!routine[6]?.includes('Отжимания'))fail('Pushups should be exercise 7');
 await page.locator('[data-action="begin"]').click();
 for(let i=0;i<10;i++){
   const title=await page.locator('.guided h2').first().innerText();
   const imgs=page.locator('.guided .poses img');
   const count=await imgs.count();
   if(count<1)fail('No exercise photos for '+title);
   const frames=[];
   for(let j=0;j<count;j++){
     const img=imgs.nth(j);
     await img.scrollIntoViewIfNeeded();
     await img.evaluate(el=>new Promise(resolve=>{if(el.complete)return resolve();el.addEventListener('load',resolve,{once:true});el.addEventListener('error',resolve,{once:true});setTimeout(resolve,12000)}));
     const data=await img.evaluate(el=>({src:el.currentSrc,loaded:el.complete&&el.naturalWidth>0,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,rectWidth:el.getBoundingClientRect().width,rectHeight:el.getBoundingClientRect().height,containerWidth:el.closest('.guided').getBoundingClientRect().width,fit:getComputedStyle(el).objectFit}));
     frames.push(data);
     if(!data.loaded)fail('Broken image: '+title+' frame '+(j+1)+' '+data.src.slice(0,130));
     if(i>=5 && data.rectWidth < data.containerWidth*0.78)fail('Floor image not full width: '+title+' frame '+(j+1));
     if(i>=5 && data.rectWidth<=data.rectHeight)fail('Floor image frame not landscape: '+title+' frame '+(j+1));
     if(i>=5 && data.naturalWidth<=data.naturalHeight)fail('Floor source image itself is not landscape: '+title+' frame '+(j+1));
   }
   report.images.push({exercise:i+1,title,frames});
   await page.screenshot({path:out+'/'+String(i+2).padStart(2,'0')+'-exercise-'+(i+1)+'.png',fullPage:true});
   report.screenshots.push(title);
   await page.locator('[data-action="next"]').click();
 }
 if(!await page.locator('.complete').count())fail('Completion screen not reached');
 await page.screenshot({path:out+'/12-complete.png',fullPage:true});
} catch(e){fail('Test crashed: '+e.stack);await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{})}
finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close()}
if(errors.length)process.exit(1);
console.log('PASS: all 10 exercises, images, layout, navigation and completion');
