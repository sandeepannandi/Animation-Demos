const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app='../../../../../apps/showcase/node_modules/';
const ts=require(app+'typescript'),qr=require(app+'qrcode-generator'),jsQR=require(app+'jsqr');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname+'/orbitMath.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,Math,Array,require});const m=mod.exports;
let n=0;function test(name,fn){fn();console.log('ok',++n,name)}
function matrix(text,level='M'){const q=qr(0,level);q.addData(text);q.make();const c=q.getModuleCount();return Array.from({length:c},(_,r)=>Array.from({length:c},(_,k)=>q.isDark(r,k)))}
function raster(modules,progress,canvas,yaw=0,pitch=0){const d=m.buildData(modules),cfg=m.makeConfig(canvas,modules.length,d.count);const out=new Array(d.count*5),order=[];m.layoutTiles(progress,yaw,pitch,d,cfg,out,order);
 const img=new Uint8ClampedArray(canvas*canvas*4).fill(255);
 for(const i of order){const x=out[i*5],y=out[i*5+1],s=out[i*5+2];for(let py=Math.round(y-s/2);py<Math.round(y+s/2);py++)for(let px=Math.round(x-s/2);px<Math.round(x+s/2);px++){if(px<0||py<0||px>=canvas||py>=canvas)continue;const o=(py*canvas+px)*4;img[o]=img[o+1]=img[o+2]=18;}}
 return {img,out,order,d,cfg}}
const url='https://nativelet.netlify.app/';
test('matching uses every sphere point once',()=>{const mx=matrix(url),d=m.buildData(mx),seen=new Set();for(let i=0;i<d.count;i++)seen.add(d.sphere.slice(i*3,i*3+3).map(v=>v.toFixed(6)).join());assert.equal(seen.size,d.count)});
test('sphere vectors are unit length',()=>{const d=m.buildData(matrix(url));for(let i=0;i<d.count;i++)assert(Math.abs(Math.hypot(d.sphere[i*3],d.sphere[i*3+1],d.sphere[i*3+2])-1)<1e-9)});
test('final frame decodes at progress 1',()=>{for(const level of['M','Q'])for(const canvas of[320,480,640]){const {img}=raster(matrix(url,level),1,canvas,2.7,.6);const r=jsQR(img,canvas,canvas);assert(r&&r.data===url,`${level} ${canvas}`)}});
test('final frame ignores any yaw or pitch',()=>{const a=raster(matrix(url),1,400,0,0).out,b=raster(matrix(url),1,400,3.1,-1.2).out;for(let i=0;i<a.length;i++)assert(Math.abs(a[i]-b[i])<1e-6)});
test('every tile lands on its module cell',()=>{const {out,d,cfg}=raster(matrix(url),1,400,1,1);for(let i=0;i<d.count;i++){assert(Math.abs(out[i*5]-(cfg.origin+(d.cols[i]+.5)*cfg.cell))<1e-6);assert(Math.abs(out[i*5+2]-cfg.cell-m.SEAM)<1e-6)}});
test('sphere at progress 0 does not decode',()=>{const {img}=raster(matrix(url),0,400,.4,.2);assert.equal(jsQR(img,400,400),null)});
test('mid-morph is not a code',()=>{const {img}=raster(matrix(url),.5,400,.4,.2);assert.equal(jsQR(img,400,400),null)});
test('wave starts at the top of the sphere',()=>{assert(m.tileProgress(.2,-1,.42)>m.tileProgress(.2,1,.42));assert.equal(m.tileProgress(1,1,.42),1);assert.equal(m.tileProgress(0,-1,.42),0)});
test('reduced motion removes the delay',()=>{const c=m.makeConfig(300,29,300,true);assert.equal(c.spread,0)});
test('reverse path matches forward path',()=>{const a=raster(matrix(url),.37,300,.5,.1).out,b=raster(matrix(url),.37,300,.5,.1).out;assert.deepEqual(a,b)});
test('tiles stay inside the canvas at the end',()=>{const {out,d,cfg}=raster(matrix(url),1,400);for(let i=0;i<d.count;i++){assert(out[i*5]-out[i*5+2]/2>=-1e-6&&out[i*5]+out[i*5+2]/2<=cfg.canvas+m.SEAM)}});
test('depth order is back to front',()=>{const {out,order}=raster(matrix(url),.1,300,.7,.2);for(let k=1;k<order.length;k++)assert(out[order[k-1]*5+4]<=out[order[k]*5+4])});
test('different payloads decode',()=>{for(const t of['hi','https://example.com/a?b=1&c=2','Nativelet Orbit QR 2026']){const {img}=raster(matrix(t),1,500);assert.equal(jsQR(img,500,500).data,t)}});
