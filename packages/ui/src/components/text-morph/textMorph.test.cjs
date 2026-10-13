const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('../../../../../apps/showcase/node_modules/typescript');
function load(f,deps={}){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname+'/'+f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:'ES2019'}}).outputText,{exports:m.exports,require:n=>deps[n],Math,Uint8ClampedArray,Array,Object});return m.exports}
const m=load('textMorphMath.ts');const scene=load('scene.ts',{'./textMorphMath':m});
const text=load('lighthouseText.ts').LIGHTHOUSE_TEXT;
let n=0;function test(name,fn){fn();console.log('ok',++n,name)}
const measure=()=>6;

test('wrapping keeps every line inside the width and drops only spaces',()=>{
  const l=m.layoutParagraph('aa bbb cccc dd eeeee',30,10,measure);
  assert.equal(l.glyphs.length,'aabbbccccddeeeee'.length);
  for(const g of l.glyphs)assert(g.x+g.w<=30.0001,'glyph past width '+g.x);
  assert.equal(l.height,10*(Math.max(...l.glyphs.map(g=>g.y))/10+1));
});

const img=scene.lighthouseImage(96);
const cfg=m.makeConfig(320);
const d=m.buildMorph(text,img,cfg,()=>cfg.fontSize*0.55);

test('one glyph per non-space character, all on the page',()=>{
  assert.equal(d.count,text.replace(/\s/g,'').length);
  for(let i=0;i<d.count;i++){assert(d.sx[i]>0&&d.sx[i]<cfg.width);assert(d.sy[i]>0&&d.sy[i]<cfg.height,'glyph '+i+' off page: '+d.sy[i]);}
});

test('picture points are distinct, inside the card, and sorted into bands',()=>{
  const seen=new Set();
  for(let i=0;i<d.count;i++){
    assert(d.ex[i]>=cfg.margin&&d.ex[i]<=cfg.width-cfg.margin);
    assert(d.ey[i]>=cfg.margin&&d.ey[i]<=cfg.height-cfg.margin);
    seen.add(Math.round(d.ex[i]*2)+','+Math.round(d.ey[i]*2));
  }
  assert(seen.size>d.count*0.97,'too many coincident targets: '+seen.size+'/'+d.count);
});

const out=new Array(d.count*7);
test('end frames are exact: page at 0, picture at 1, no rotation',()=>{
  m.layoutGlyphs(0,d,[.1,.1,.1],out);
  for(let i=0;i<d.count;i++){assert(Math.abs(out[i*7]-d.sx[i])<1e-6&&Math.abs(out[i*7+1]-d.sy[i])<1e-6);assert(out[i*7+2]===0);assert(Math.abs(out[i*7+3]-d.fontSize)<1e-6);}
  m.layoutGlyphs(1,d,[.1,.1,.1],out);
  for(let i=0;i<d.count;i++){assert(Math.abs(out[i*7]-d.ex[i])<1e-6&&Math.abs(out[i*7+1]-d.ey[i])<1e-6,'glyph '+i);assert(Math.abs(out[i*7+2])<1e-9);assert(Math.abs(out[i*7+4]-d.cr[i])<1e-9);}
});

test('mid-flight glyphs actually move off both end positions',()=>{
  m.layoutGlyphs(0.5,d,[.1,.1,.1],out);
  let off=0;for(let i=0;i<d.count;i++){if(Math.hypot(out[i*7]-d.sx[i],out[i*7+1]-d.sy[i])>2&&Math.hypot(out[i*7]-d.ex[i],out[i*7+1]-d.ey[i])>2)off++;}
  assert(off>d.count*0.4,'only '+off+' glyphs in flight');
});

test('progress is reversible: same p gives the same frame',()=>{
  const a=new Array(d.count*7),b=new Array(d.count*7);
  m.layoutGlyphs(0.37,d,[.1,.1,.1],a);m.layoutGlyphs(0.9,d,[.1,.1,.1],b);m.layoutGlyphs(0.37,d,[.1,.1,.1],b);
  assert.deepEqual(a,b);
});

test('picture glyphs gather where the picture is bright',()=>{
  // Moon disc centre in image uv (0.74,0.2): its pixels are bright; sky corner is dark.
  const box=cfg.width-2*cfg.margin,box2=cfg.height-2*cfg.margin;
  const inDisc=(x,y)=>Math.hypot((x-cfg.margin)/box-0.74,(y-cfg.margin)/box2-0.2)<0.1;
  const inSky=(x,y)=>(x-cfg.margin)/box<0.2&&(y-cfg.margin)/box2<0.3;
  let moon=0,sky=0;for(let i=0;i<d.count;i++){if(inDisc(d.ex[i],d.ey[i]))moon++;if(inSky(d.ex[i],d.ey[i]))sky++;}
  // disc area ~0.04, sky corner area 0.06: a bright disc should hold more glyphs.
  assert(moon>sky*2,'moon '+moon+' vs sky corner '+sky);
});
