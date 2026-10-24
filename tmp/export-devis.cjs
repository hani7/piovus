const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const work = path.resolve('tmp/devis-pdf');
fs.mkdirSync(work, {recursive:true});
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9237', `--user-data-dir=${work}/profile`, 'about:blank'], {windowsHide:true, stdio:'ignore'});
let ws;
const keepAlive=setInterval(()=>{},1000);
async function main() {
  let targets;
  for(let i=0;i<100;i++) {
    try { targets=await (await fetch('http://127.0.0.1:9237/json')).json(); break; } catch { await new Promise(r=>setTimeout(r,200)); }
  }
  ws = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let id=0; const pending=new Map();
  ws.addEventListener('message', e=>{const m=JSON.parse(e.data); if(pending.has(m.id)){const p=pending.get(m.id); pending.delete(m.id); m.error?p.reject(m.error):p.resolve(m.result);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await call('Page.enable');
  await call('Emulation.setEmulatedMedia',{media:'print'});
  await call('Page.navigate',{url:pathToFileURL(path.resolve('devis_piove_cosmetics.html')).href});
  for(let i=0;i<100;i++){if(await evaluate('document.readyState')==='complete')break;await new Promise(r=>setTimeout(r,200));}
  await evaluate('document.fonts.ready.then(()=>true)');
  console.log(JSON.stringify(await evaluate(`Array.from(document.querySelectorAll('.page')).map(p=>({height:p.getBoundingClientRect().height,inner:p.firstElementChild.getBoundingClientRect().height,footer:p.querySelector('.page-footer')?.offsetTop,text:p.innerText.length}))`)));
  if(process.argv.includes('--export')) {
    const result = await evaluate(`(() => {
      const style=document.createElement('style');
      style.textContent='@page { size: A4; margin: 0; } html,body { margin:0; padding:0; print-color-adjust:exact; -webkit-print-color-adjust:exact; } .page { width:210mm; height:297mm; min-height:0; margin:0; break-after:page; overflow:hidden; } .page:last-child { break-after:auto; }';
      document.head.append(style);
      return Array.from(document.querySelectorAll('.page')).map(p=> {
        const inner=p.querySelector('.inner-page');
        if(!inner)return {scale:1};
        const footer=inner.querySelector('.page-footer');
        const nodes=Array.from(inner.children).filter(n=>n!==footer&&!n.classList.contains('watermark'));
        const bottom=Math.max(...nodes.map(n=>n.getBoundingClientRect().bottom-inner.getBoundingClientRect().top));
        const scale=Math.min(1,(p.clientHeight-105)/bottom);
        inner.style.transform='scale('+scale+')';inner.style.transformOrigin='top center';
        inner.style.minHeight=(p.clientHeight/scale)+'px';
        footer.style.bottom=(15*96/25.4/scale)+'px';
        return {scale,bottom,available:p.clientHeight};
      });
    })()`);
    console.log('Layout:',JSON.stringify(result));
    const pdf=await call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,paperWidth:210/25.4,paperHeight:297/25.4,marginTop:0,marginBottom:0,marginLeft:0,marginRight:0});
    const dest=path.join(work,'devis_piove_cosmetics.pdf');
    fs.writeFileSync(dest,Buffer.from(pdf.data,'base64'));
    console.log('PDF:',dest);
    await call('Emulation.setDeviceMetricsOverride',{width:794,height:1123,deviceScaleFactor:0.7,mobile:false});
    for(const n of [0,3,5]) {
      const rect=await evaluate(`(() => {const r=document.querySelectorAll('.page')[${n}].getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
      const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:rect});
      fs.writeFileSync(path.join(work,`page-${n+1}.png`),Buffer.from(shot.data,'base64'));
    }
    const raw=fs.readFileSync(dest,'latin1');
    console.log('Pages:',(raw.match(/\/Type \/Page\b/g)||[]).length,'Sizes:',JSON.stringify([...new Set(raw.match(/\/MediaBox\s*\[[^\]]+\]/g))]));
  }
  await call('Browser.close');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{clearInterval(keepAlive);ws?.close();chrome.kill();});
