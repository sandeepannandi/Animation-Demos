export type InkPoint={x:number;y:number;t:number;pressure:number};
export type Stroke={points:InkPoint[]};
export type SignatureValue={strokes:Stroke[];svg:string};
export type Signature={strokes:Stroke[];drawing:boolean;replaying:boolean;clock:number;duration:number;cursor:InkPoint|null};
export const INK_W=340,INK_H=320;
export const createSignature=():Signature=>({strokes:[],drawing:false,replaying:false,clock:0,duration:0,cursor:null});
const distance=(a:InkPoint,b:InkPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const valid=(p:InkPoint)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.t);
export function beginInk(s:Signature,p:InkPoint){if(!valid(p)||s.strokes.length>=64)return;s.replaying=false;s.cursor=null;s.drawing=true;s.strokes.push({points:[{...p,x:clamp(p.x,12,328),y:clamp(p.y,12,308),pressure:clamp(p.pressure||.5,.1,1)}]});}
export function appendInk(s:Signature,p:InkPoint){if(!s.drawing||!valid(p))return;const points=s.strokes[s.strokes.length-1].points,last=points[points.length-1];if(points.length>=2400)return;const q={...p,x:clamp(p.x,12,328),y:clamp(p.y,12,308),t:Math.max(p.t,last.t),pressure:clamp(p.pressure||.5,.1,1)};if(distance(q,last)<.65)return;points.push(q);}
export function endInk(s:Signature){s.drawing=false;s.cursor=null;}
export function undoInk(s:Signature){s.drawing=false;s.replaying=false;s.strokes.pop();s.cursor=null;}
export function clearInk(s:Signature){Object.assign(s,createSignature());}
export function replayInk(s:Signature){if(!s.strokes.length)return;s.drawing=false;s.replaying=true;s.clock=0;s.duration=replayDuration(s);s.cursor=null;}
/** Replay preserves measured in-stroke timing, with bounded pen-up gaps and a comfortable duration. */
export function strokeDuration(stroke:Stroke){const p=stroke.points;return Math.max(.1,Math.min(4,(p[p.length-1].t-p[0].t)/1000));}
export function replayDuration(s:Signature){return s.strokes.reduce((n,v)=>n+strokeDuration(v)+.2,0)-.2;}
export function stepInk(s:Signature,dt:number,slow=false,reduce=false){if(!s.replaying)return;if(reduce){s.clock=s.duration;s.replaying=false;s.cursor=null;return;}s.clock+=Math.max(0,Math.min(.05,dt))*(slow?.3:1);if(s.clock>=s.duration+.25){s.replaying=false;s.cursor=null;}}
export type InkPiece={path:string;width:number;opacity:number};
const f=(n:number)=>Number(n.toFixed(3));
/** Catmull-Rom interpolation passes through measured points and joins smoothly. */
export function strokePieces(stroke:Stroke,until=Infinity):InkPiece[]{const points=stroke.points,out:InkPiece[]=[];if(points.length===1){const p=points[0];return [{path:`M ${f(p.x)} ${f(p.y)} l .01 .01`,width:2.4,opacity:1}];}let previousWidth=2.2;for(let i=1;i<points.length;i++){const p0=points[Math.max(0,i-2)],p1=points[i-1],p2=points[i],p3=points[Math.min(points.length-1,i+1)];const relative=(p2.t-points[0].t)/1000,prior=(p1.t-points[0].t)/1000;if(prior>until)break;const fraction=relative===prior?1:clamp((until-prior)/(relative-prior),0,1);if(fraction<=0)break;const c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};const speed=distance(p1,p2)/Math.max(8,p2.t-p1.t);const target=clamp(3.8-speed*1.2+(p2.pressure-.5)*1.3,1.35,4.5);const width=previousWidth*.6+target*.4;previousWidth=width;
 // Split the cubic exactly for the moving nib. No straight cut through the finished curve.
 const lerp=(a:{x:number;y:number},b:{x:number;y:number})=>({x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction});const a=lerp(p1,c1),b=lerp(c1,c2),c=lerp(c2,p2),d=lerp(a,b),e=lerp(b,c),tip=lerp(d,e);out.push({path:`M ${f(p1.x)} ${f(p1.y)} C ${f(a.x)} ${f(a.y)} ${f(d.x)} ${f(d.y)} ${f(tip.x)} ${f(tip.y)}`,width,opacity:1});if(fraction<1)break;}
 return out;}
export function inkScene(s:Signature){let offset=0;const pieces:InkPiece[]=[];let cursor:{x:number;y:number}|null=null;for(const stroke of s.strokes){const duration=strokeDuration(stroke),points=stroke.points,recorded=Math.max(.001,(points[points.length-1].t-points[0].t)/1000);const local=s.replaying?s.clock-offset:Infinity;if(local>0||(!s.replaying&&local===Infinity)){const until=local===Infinity?Infinity:local/duration*recorded;const segments=strokePieces(stroke,until);pieces.push(...segments);if(s.replaying&&local<=duration&&segments.length){const m=segments[segments.length-1].path.match(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)$/);if(m)cursor={x:+m[1],y:+m[2]};}}offset+=duration+.2;}return {pieces,cursor};}
export function signatureValue(s:Signature):SignatureValue{return {strokes:s.strokes.map(v=>({points:v.points.map(p=>({...p}))})),svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 320"><g fill="none" stroke="#20392f" stroke-linecap="round" stroke-linejoin="round">${s.strokes.flatMap(v=>strokePieces(v)).map(p=>`<path d="${p.path}" stroke-width="${f(p.width)}"/>`).join('')}</g></svg>`};}
