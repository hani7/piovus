const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const work = path.resolve('tmp/maintenance-preview');
fs.mkdirSync(work, {recursive:true});
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9239', `--user-data-dir=${work}/profile`, 'about:blank'], {windowsHide:true, stdio:'ignore'});
let ws;
const keepAlive=setInterval(()=>{},1000);
async function main() {
  let targets;
  for(let i=0;i<100;i++) {
    try { targets=await (await fetch('http://127.0.0.1:9239/json')).json(); break; } catch { await new Promise(r=>setTimeout(r,200)); }
  }
  ws = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let id=0; const pending=new Map();
  ws.addEventListener('message', e=>{const m=JSON.parse(e.data); if(pending.has(m.id)){const p=pending.get(m.id); pending.delete(m.id); m.error?p.reject(m.error):p.resolve(m.result);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await call('Page.enable');

  await call('Page.navigate',{url:pathToFileURL(path.resolve('maintenance_piove_cosmetics.html')).href});
  for(let i=0;i<100;i++){if(await evaluate('document.readyState')==='complete')break;await new Promise(r=>setTimeout(r,100));}
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const width of [1440,390,320]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    await new Promise(r=>setTimeout(r,100));
    const check=await evaluate(`({width:innerWidth,documentWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,images:Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0),title:document.title,links:Array.from(document.querySelectorAll('a')).map(a=>a.getAttribute('href'))})`);
    console.log(JSON.stringify(check));
    if(check.documentWidth>width || !check.images)throw new Error('Layout or image failure');
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:check.height,scale:1}});
    fs.writeFileSync(path.join(work,`preview-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  await call('Browser.close');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{clearInterval(keepAlive);ws?.close();chrome.kill();});
