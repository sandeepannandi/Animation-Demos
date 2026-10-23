/** Source seconds are the only unit of data. Screen coordinates never escape this model. */
export const TW = 340, TH = 300, LEFT = 20, RIGHT = 320, TRACK_Y = 142;
export type TrimRange = { start: number; end: number; playhead: number };
export type TrimState = TrimRange & { duration: number; scale: number; offset: number; velocity: number; active: number; finger: number; glow: number; targetScale: number; anchor: number; anchorX: number; snap: number; snapValue: number; };
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export function createTimeline(duration = 120, initial?: Partial<TrimRange>): TrimState {
  const d = Number.isFinite(duration) ? Math.max(1, duration) : 120;
  const start = clamp(initial?.start ?? d * .2, 0, d - Math.min(.25, d));
  const end = clamp(initial?.end ?? d * .7, start + Math.min(.25, d), d);
  return { duration: d, start, end, playhead: clamp(initial?.playhead ?? start + (end-start)*.4, start, end), scale: 300/d, targetScale: 300/d, offset: 0, velocity: 0, active: 0, finger: 170, glow: 0, anchor: d/2, anchorX: 170, snap: 0, snapValue: 0 };
}
export const timeAt = (s: TrimState, x: number) => (x - LEFT) / s.scale + s.offset;
export const xAt = (s: TrimState, t: number) => LEFT + (t - s.offset) * s.scale;
export const minSpan = (s: TrimState) => Math.min(.25, s.duration);
export function boundOffset(s: TrimState) { s.offset = clamp(s.offset, 0, Math.max(0, s.duration - 300/s.scale)); }
export function zoomTimeline(s: TrimState, factor: number, x: number, immediate = true) {
  const t = timeAt(s, x);
  const scale = clamp(s.scale * factor, 300/s.duration, 180);
  s.anchor = t; s.anchorX = clamp(x, LEFT, RIGHT); s.targetScale = scale;
  if (immediate) { s.scale = scale; s.offset = t - (s.anchorX-LEFT)/scale; boundOffset(s); }
  s.velocity = 0;
}
export function beginTimeline(s: TrimState, x: number, y: number) {
  s.velocity = 0; s.targetScale = s.scale; s.finger = x;
  const a = Math.abs(x-xAt(s,s.start)), b = Math.abs(x-xAt(s,s.end));
  s.active = y >= 120 && y <= 230 && Math.min(a,b) < 24 ? (a <= b ? 1 : 2) : y < 127 && Math.abs(x-xAt(s,s.playhead)) < 25 ? 3 : 4;
  s.snap = 0;
}
export function moveTimeline(s: TrimState, x: number, dx: number, velocity: number) {
  s.finger = x;
  if (s.active === 4) { s.offset -= dx/s.scale; boundOffset(s); s.velocity = -velocity/s.scale; return; }
  const t = clamp(timeAt(s,x),0,s.duration);
  if (s.active === 1) s.start = Math.min(t,s.end-minSpan(s));
  if (s.active === 2) s.end = Math.max(t,s.start+minSpan(s));
  if (s.active === 3) s.playhead = clamp(t,s.start,s.end);
  s.playhead = clamp(s.playhead,s.start,s.end);
}
export function endTimeline(s: TrimState) {
  if (s.active > 0 && s.active < 4) { s.snap = s.active; s.velocity = 0; const key=s.snap===1?"start":s.snap===2?"end":"playhead"; const interval=Math.max(.01,tickInterval(s.scale)/5); const lo=key==="end"?s.start+minSpan(s):key==="playhead"?s.start:0, hi=key==="start"?s.end-minSpan(s):key==="playhead"?s.end:s.duration; s.snapValue=clamp(Math.round(s[key]/interval)*interval,lo,hi); }
  s.active = 0;
}
export function cancelTimeline(s: TrimState) { s.active = 0; s.velocity = 0; s.snap = 0; s.targetScale = s.scale; }
export function tickInterval(scale: number) {
  const raw = 56/scale, p = Math.pow(10,Math.floor(Math.log10(raw))), r = raw/p;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10)*p;
}
export function stepTimeline(s: TrimState, dt: number, reduced = false) {
  dt = clamp(dt,0,.04);
  const k = reduced ? 1 : 1-Math.exp(-18*dt);
  s.glow += ((s.active ? 1 : 0)-s.glow)*k;
  if (Math.abs(s.targetScale-s.scale) > .001) {
    s.scale += (s.targetScale-s.scale)*k;
    s.offset = s.anchor-(s.anchorX-LEFT)/s.scale; boundOffset(s);
  }
  if (s.active > 0 && s.active < 4) {
    const edge = s.finger < LEFT+28 ? -(LEFT+28-s.finger)/28 : s.finger > RIGHT-28 ? (s.finger-RIGHT+28)/28 : 0;
    if (edge) { s.offset += clamp(edge,-2,2)*110*dt/s.scale; boundOffset(s); moveTimeline(s,s.finger,0,0); }
  } else if (!s.active && Math.abs(s.velocity) > .005) {
    if (reduced) s.velocity = 0;
    else { s.offset += s.velocity*dt; s.velocity *= Math.exp(-5.5*dt); const before=s.offset; boundOffset(s); if(s.offset!==before) s.velocity=0; }
  }
  if (s.snap) {
    const key = s.snap === 1 ? 'start' : s.snap === 2 ? 'end' : 'playhead';
    const target=s.snapValue;
    s[key] += (target-s[key])*k;
    s.start=clamp(s.start,0,s.end-minSpan(s)); s.end=clamp(s.end,s.start+minSpan(s),s.duration); s.playhead=clamp(s.playhead,s.start,s.end);
    if(Math.abs(s[key]-target)<.0001) {s[key]=target;s.snap=0;}
  }
}
export const rangeValue = (s: TrimState): TrimRange => ({start:s.start,end:s.end,playhead:s.playhead});
export function formatTime(t: number) { const m=Math.floor(t/60), sec=Math.floor(t%60), f=Math.floor((t%1)*100); return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(f).padStart(2,'0')}`; }
export function demoWaveform(n=900) { return Array.from({length:n},(_,i)=> clamp(.12+Math.abs(Math.sin(i*.37)*Math.cos(i*.073))*.54+Math.sin(i*.011)**8*.28,.03,1)); }
export type TimelineThumbnail = {time:number;uri:string};
export function thumbnailLayout(s:TrimState, thumbnails:readonly TimelineThumbnail[]) {
 const result:{uri:string;x:number;y:number;w:number;h:number;clipX:number;clipW:number}[]=[];
 for(let i=0;i<thumbnails.length;i++){const frame=thumbnails[i],end=thumbnails[i+1]?.time??s.duration,x=xAt(s,frame.time),w=(end-frame.time)*s.scale,clipX=Math.max(LEFT,x),clipW=Math.max(0,Math.min(RIGHT,x+w)-clipX);if(clipW>0&&w>0)result.push({uri:frame.uri,x,y:96,w,h:34,clipX,clipW});}
 return result;
}
export type Shape = { kind:'rect'|'line'; x:number; y:number; w:number; h:number; color:string; opacity:number; r?:number };
export type Label = { x:number; y:number; text:string; size:number; color:string; opacity:number; align?:'left'|'center'|'right' };
export function timelineScene(s: TrimState, samples: readonly number[]) {
  const shapes:Shape[]=[], labels:Label[]=[];
  const rect=(x:number,y:number,w:number,h:number,color:string,opacity=1,r=0)=>shapes.push({kind:'rect',x,y,w:Math.max(0,w),h,color,opacity,r});
  rect(0,0,TW,TH,'#141618',1,10);
  labels.push({x:20,y:27,text:'TIMELINE TRIM',size:10,color:'#a6aaa8',opacity:1});
  labels.push({x:320,y:27,text:`${(s.scale*s.duration/300).toFixed(1)}×`,size:11,color:'#e5e8e5',opacity:1,align:'right'});
  const a=clamp(xAt(s,s.start),LEFT,RIGHT), b=clamp(xAt(s,s.end),LEFT,RIGHT), p=xAt(s,s.playhead);
  rect(LEFT,TRACK_Y,300,72,'#202425',1,5);
  rect(a,TRACK_Y,b-a,72,'#d4ddcf',.1);
  // Fixed pixel-density bars sample actual source positions at every zoom level.
  for(let x=LEFT+2;x<RIGHT;x+=3) {
    const t=timeAt(s,x), idx=clamp(Math.floor(t/s.duration*samples.length),0,samples.length-1);
    const amp=clamp(samples[idx]??0,0,1), h=5+amp*54;
    rect(x,178-h/2,1.5,h,t>=s.start&&t<=s.end?'#dce7d7':'#656d69',.95,.7);
  }
  // Logarithmic ruler LOD. Old and new tick families crossfade, avoiding pop-in.
  const raw=64/s.scale, base=Math.pow(2,Math.floor(Math.log2(raw))), mix=Math.log2(raw/base);
  for(let family=0;family<2;family++) {
    const interval=base*(family?2:1), alpha=family?mix:1-mix;
    for(let t=Math.ceil(s.offset/interval)*interval;t<=Math.min(s.duration,s.offset+300/s.scale)+1e-7;t+=interval) {
      const x=xAt(s,t);rect(x,239,1,10,'#a0aaa4',alpha);
      labels.push({x,y:266,text:t<60?`${Number(t.toFixed(2))}s`:`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`,size:10,color:'#a0aaa4',opacity:alpha,align:'center'});
    }
  }
  rect(LEFT,231,300,1,'#434b45');
  for(const [t,k] of [[s.start,1],[s.end,2]]) {
    const x=xAt(s,t);if(x<LEFT-8||x>RIGHT+8)continue;
    const stretch=s.active===k? s.glow*5:0;
    rect(x-7,139-stretch,14,78+stretch*2,'#dce7d7',1,4);
    rect(x-1,163-stretch/2,2,30+stretch,'#333b33',1,1);
  }
  if(p>=LEFT&&p<=RIGHT) { rect(p-1,89,2,136,'#fff',.9);rect(p-5,88,10,9,'#fff',1,2); labels.push({x:clamp(p,48,292),y:72,text:formatTime(s.playhead),size:11,color:'#fff',opacity:1,align:'center'}); }
  rect(LEFT,287,300,2,'#424943',1,1);
  rect(LEFT+s.offset/s.duration*300,286,Math.min(300,300/s.scale/s.duration*300),4,'#dce7d7',1,2);
  return {shapes,labels};
}
