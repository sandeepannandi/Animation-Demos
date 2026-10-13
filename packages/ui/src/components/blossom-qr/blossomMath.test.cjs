const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app='../../../../../apps/showcase/node_modules/';
const ts=require(app+'typescript'),qr=require(app+'qrcode-generator'),jsQR=require(app+'jsqr');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname+'/blossomMath.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,Math,Array,require});const m=mod.exports;
let n=0;function test(name,fn){fn();console.log('ok',++n,name)}
function matrix(text,level='M'){const q=qr(0,level);q.addData(text);q.make();const c=q.getModuleCount();return Array.from({length:c},(_,r)=>Array.from({length:c},(_,k)=>q.isDark(r,k)))}
function frame(modules,progress,canvas,yaw=Math.PI/4,spread=.3){const s=m.buildScene(modules),cfg=m.makeConfig(canvas,modules.length);const pos=[],rgb=[],shadow=[0,0,0,0];const v=m.layoutScene(progress,yaw,s,cfg,spread,pos,rgb,shadow);return{s,cfg,pos,rgb,v,shadow}}
function raster(f,canvas){const img=new Uint8ClampedArray(canvas*canvas*4);for(let i=0;i<img.length;i+=4){img[i]=img[i+1]=img[i+2]=255;img[i+3]=255}
 for(let t=0;t<f.v;t+=3){const P=[0,1,2].map(k=>[f.pos[(t+k)*2],f.pos[(t+k)*2+1]]),C=[f.rgb[t*3],f.rgb[t*3+1],f.rgb[t*3+2]];
  const minx=Math.max(0,Math.floor(Math.min(...P.map(p=>p[0])))),maxx=Math.min(canvas-1,Math.ceil(Math.max(...P.map(p=>p[0])))),miny=Math.max(0,Math.floor(Math.min(...P.map(p=>p[1])))),maxy=Math.min(canvas-1,Math.ceil(Math.max(...P.map(p=>p[1]))));
  const [a,b,c]=P,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-9)continue;
  for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){const px=x+.5,py=y+.5,w1=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/den,w2=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/den,w3=1-w1-w2;if(w1>=-1e-6&&w2>=-1e-6&&w3>=-1e-6){const o=(y*canvas+x)*4;img[o]=C[0]*255;img[o+1]=C[1]*255;img[o+2]=C[2]*255}}}
 return img}
const url='https://nativelet.netlify.app/';
test('final frame decodes at progress 1',()=>{for(const level of['M','Q'])for(const canvas of[320,480,640]){const f=frame(matrix(url,level),1,canvas);const r=jsQR(raster(f,canvas),canvas,canvas);assert(r&&r.data===url,`${level} ${canvas}`)}});
test('final frame ignores yaw',()=>{const a=frame(matrix(url),1,400,0),b=frame(matrix(url),1,400,2.5);assert.deepEqual(a.pos.slice(0,a.v*2).map(v=>+v.toFixed(6)),b.pos.slice(0,b.v*2).map(v=>+v.toFixed(6)))});
test('final frame is flat: one quad per module',()=>{const mx=matrix(url),f=frame(mx,1,400);assert.equal(f.v,mx.length*mx.length*6)});
test('tree frame decodes poorly or not at all',()=>{const f=frame(matrix(url),0,500);assert.equal(jsQR(raster(f,500),500,500),null)});
test('tree has height and side faces',()=>{const f=frame(matrix(url),0,400);assert(f.v>matrix(url).length**2*6)});
test('tree stays inside the canvas',()=>{for(const yaw of[0,.8,Math.PI/4,2.4,4]){const f=frame(matrix(url),0,500,yaw);for(let i=0;i<f.v;i++){assert(f.pos[i*2]>=-1&&f.pos[i*2]<=501,'x');assert(f.pos[i*2+1]>=-1&&f.pos[i*2+1]<=501,'y '+yaw+' '+f.pos[i*2+1])}}});
test('flat colours keep contrast with the ground',()=>{const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];const L=lum(m.CREAM);for(const c of[m.ROSE_DARK,m.GREEN_DARK,m.BARK_DARK])assert(L/lum(c)>4,'contrast '+c)});
test('canopy light modules rise too',()=>{const mx=matrix(url),s=m.buildScene(mx),mid=(s.size-1)/2;let risen=0;for(let i=0;i<s.height.length;i++){const d=Math.hypot(s.cols[i]-mid,s.rows[i]-mid);if(!mx[s.rows[i]][s.cols[i]]&&d>1.5&&d<s.size*.37&&s.height[i]>3)risen++}assert(risen>20)});
test('tall columns settle before short ones',()=>{assert(m.columnProgress(.5,10,.3)>m.columnProgress(.5,1,.3))});
test('every column ends flat',()=>{const s=m.buildScene(matrix(url));for(let i=0;i<s.height.length;i++)assert.equal(m.columnProgress(1,s.height[i],.3),1)});
test('different payloads decode',()=>{for(const t of['hi','https://example.com/a?b=1&c=2','Blossom QR 2026']){const f=frame(matrix(t),1,500);assert.equal(jsQR(raster(f,500),500,500).data,t)}});
test('depth order is back to front for sides',()=>{const f=frame(matrix(url),0,300);assert(f.v%3===0)});
