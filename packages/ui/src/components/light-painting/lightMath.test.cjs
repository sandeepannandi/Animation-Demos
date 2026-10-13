const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app='../../../../../apps/showcase/node_modules/';
const ts=require(app+'typescript');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname+'/lightMath.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,Math});const m=mod.exports;
let n=0;function test(name,fn){fn();console.log('ok',++n,name)}

test('rope hangs at rest length below the anchor',()=>{
  const r=m.createRope({anchor:{x:100,y:0},segments:8,length:160});
  for(let i=0;i<600;i++)m.stepRopeFixed(r,1/60,{damping:.99});
  const b=m.bulbPosition(r);
  assert(Math.abs(b.x-100)<2,'x settles under anchor, got '+b.x);
  assert(Math.abs(b.y-160)<4,'y settles near full length, got '+b.y);
});

test('rope never stretches past its length',()=>{
  const r=m.createRope({anchor:{x:100,y:0},segments:8,length:160});
  for(let i=0;i<400;i++){
    const t=i<200?{x:100+120*Math.sin(i/8),y:40+30*Math.cos(i/5)}:null;
    m.stepRopeFixed(r,1/60,{dragTarget:t});
    // While the bulb is pinned to the finger the bulb link may stretch (by
    // design - the cord is elastic); every other link stays at rest length,
    // and a free rope never overstretches anywhere.
    const last=t?r.nodes.length-2:r.nodes.length-1;
    for(let k=0;k<last;k++){
      const d=Math.hypot(r.nodes[k+1].x-r.nodes[k].x,r.nodes[k+1].y-r.nodes[k].y);
      assert(d<=r.rest*1.02,'segment '+k+' overstretched: '+d);
    }
  }
});

test('fixed timestep is deterministic',()=>{
  const run=()=>{const r=m.createRope({anchor:{x:50,y:0},segments:6,length:120});
    for(let i=0;i<300;i++)m.stepRopeFixed(r,1/60,{dragTarget:i<150?{x:200,y:80}:null});
    const b=m.bulbPosition(r);return [b.x,b.y]};
  assert.deepEqual(run(),run());
});

test('released bulb swings, then loses energy',()=>{
  const r=m.createRope({anchor:{x:100,y:0},segments:8,length:160});
  for(let i=0;i<120;i++)m.stepRopeFixed(r,1/60,{dragTarget:{x:220,y:60}});
  let first=0,late=0;
  for(let i=0;i<1200;i++){m.stepRopeFixed(r,1/60,{});const a=Math.abs(m.bulbPosition(r).x-100);
    if(i<120)first=Math.max(first,a);if(i>=900)late=Math.max(late,a)}
  assert(first>80,'released bulb actually swings across, first-2s peak '+first);
  assert(late<40,'swing decays, last-5s peak '+late);
});

function flatScene(size,depthValue=.2){
  const albedo=new Uint8ClampedArray(size*size*4),depth=new Float32Array(size*size);
  for(let i=0;i<size*size;i++){albedo[i*4]=200;albedo[i*4+1]=120;albedo[i*4+2]=60;albedo[i*4+3]=255;depth[i]=depthValue}
  return{albedo,depth};
}
function shade(size,albedo,depth,bx,by){
  const out=new Uint8ClampedArray(size*size*4);
  m.shadeBuffer({size,albedo,depth,bulb:{x:bx,y:by},bulbZ:.6,intensity:1,ambient:.05,out});
  return out;
}
const lum=(out,i)=>(out[i*4]*.2126+out[i*4+1]*.7152+out[i*4+2]*.0722);

test('light falls off with distance on a flat wall',()=>{
  const size=96,{albedo,depth}=flatScene(size);
  const out=shade(size,albedo,depth,48,20);
  const near=lum(out,22*size+48),far=lum(out,(size-4)*size+48);
  assert(near>far*1.5,'near '+near+' far '+far);
});

test('albedo tints the light',()=>{
  const size=64,{albedo,depth}=flatScene(size);
  const out=shade(size,albedo,depth,32,32);
  const i=(32*size+32)*4;
  assert(out[i]>out[i+1]&&out[i+1]>out[i+2],'red wall stays warm');
});

test('raised geometry casts a shadow away from the bulb',()=>{
  const size=120,{albedo,depth}=flatScene(size);
  // wall block: raised square at center-left
  for(let y=50;y<70;y++)for(let x=40;x<52;x++)depth[y*size+x]=.8;
  const out=shade(size,albedo,depth,30,60); // bulb to the LEFT of the block
  const litSide=lum(out,60*size+30);        // left of block: lit
  const behind=lum(out,60*size+75);         // right of block: shadowed
  const clear=lum(out,105*size+30);         // same distance from bulb (45px), clear line below it
  assert(litSide>behind*1.8,'lit '+litSide+' shadow '+behind);
  assert(clear>behind*1.8,'blocker, not distance, makes the shadow: clear '+clear+' behind '+behind);
});

test('shadow march does not self-shadow a flat wall',()=>{
  const size=80,{albedo,depth}=flatScene(size);
  const out=shade(size,albedo,depth,40,40);
  // every pixel well above ambient floor
  for(let i=0;i<size*size;i+=97)assert(lum(out,i)>8,'pixel '+i+' too dark');
});

test('elastic cord stretches under drag and springs back',()=>{
  const r=m.createRope({anchor:{x:100,y:0},segments:8,length:160});
  for(let i=0;i<200;i++)m.stepRopeFixed(r,1/60,{dragTarget:{x:100,y:400},elasticity:.08});
  const stretched=m.bulbPosition(r).y;
  assert(Math.abs(stretched-400)<1,'bulb pins to the finger while dragging, y '+stretched);
  assert(Math.hypot(r.nodes[4].x-r.nodes[3].x,r.nodes[4].y-r.nodes[3].y)>r.rest,'mid cord visibly stretched');
  for(let i=0;i<600;i++)m.stepRopeFixed(r,1/60,{elasticity:.08});
  const settled=m.bulbPosition(r).y;
  assert(Math.abs(settled-160)<14,'springs back near rest, y '+settled);
});
