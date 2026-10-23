export type Point={x:number;y:number};
export type Anchor={p:Point;incoming:Point;outgoing:Point;mode:'smooth'|'corner'};
export type PathValue={anchors:Anchor[];svg:string;length:number};
export type Editor={anchors:Anchor[];selected:number;distance:number;playing:boolean;zoom:number;pan:Point;reveal:number;history:Anchor[][]};
export const W=340,H=320;
export const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
export const sub=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y});
export const mul=(a:Point,n:number):Point=>({x:a.x*n,y:a.y*n});
export const length=(a:Point)=>Math.hypot(a.x,a.y);
export const mix=(a:Point,b:Point,t:number)=>add(mul(a,1-t),mul(b,t));
export const clone=(a:Anchor[]):Anchor[]=>a.map(n=>({p:{...n.p},incoming:{...n.incoming},outgoing:{...n.outgoing},mode:n.mode}));
export function initialAnchors():Anchor[]{return [
 {p:{x:40,y:220},incoming:{x:0,y:0},outgoing:{x:58,y:0},mode:'corner'},
 {p:{x:174,y:94},incoming:{x:-48,y:0},outgoing:{x:48,y:0},mode:'smooth'},
 {p:{x:300,y:205},incoming:{x:-52,y:0},outgoing:{x:0,y:0},mode:'corner'}];}
export function createEditor(anchors=initialAnchors()):Editor{if(anchors.length<2||anchors.length>12||anchors.some(a=>![a.p,a.incoming,a.outgoing].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))))throw new Error('Motion path requires 2–12 finite anchors');return {anchors:clone(anchors),selected:1,distance:0,playing:true,zoom:1,pan:{x:0,y:0},reveal:0,history:[]};}
export function control(a:Anchor[],i:number):Point[]{return [a[i].p,add(a[i].p,a[i].outgoing),add(a[i+1].p,a[i+1].incoming),a[i+1].p];}
export function cubic(q:Point[],t:number):Point{const s=1-t;return {x:s*s*s*q[0].x+3*s*s*t*q[1].x+3*s*t*t*q[2].x+t*t*t*q[3].x,y:s*s*s*q[0].y+3*s*s*t*q[1].y+3*s*t*t*q[2].y+t*t*t*q[3].y};}
export function tangent(q:Point[],t:number):Point{const s=1-t;return add(add(mul(sub(q[1],q[0]),3*s*s),mul(sub(q[2],q[1]),6*s*t)),mul(sub(q[3],q[2]),3*t*t));}
export type Arc={segment:number;t:number;distance:number;p:Point};
/** Dense chord integration; positions are inverted by distance, not Bezier parameter. */
export function arcTable(anchors:Anchor[],steps=120):Arc[]{const table:Arc[]=[{segment:0,t:0,distance:0,p:anchors[0].p}];let distance=0,last=anchors[0].p;for(let i=0;i<anchors.length-1;i++){const q=control(anchors,i);for(let j=1;j<=steps;j++){const t=j/steps,p=cubic(q,t);distance+=length(sub(p,last));table.push({segment:i,t,distance,p});last=p;}}return table;}
export function atDistance(table:Arc[],distance:number){const total=table[table.length-1].distance,d=total>0?Math.max(0,Math.min(total,distance)):0;let lo=0,hi=table.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(table[mid].distance<d)lo=mid;else hi=mid;}const a=table[lo],b=table[hi],f=(d-a.distance)/(b.distance-a.distance||1);const segment=b.segment,t=a.segment===b.segment?a.t+(b.t-a.t)*f:b.t*f;return {p:mix(a.p,b.p,f),segment,t};}
const fmt=(n:number)=>Number(n.toFixed(3)).toString();
export function svgPath(a:Anchor[]){let s=`M ${fmt(a[0].p.x)} ${fmt(a[0].p.y)}`;for(let i=0;i<a.length-1;i++){const q=control(a,i);s+=` C ${q.slice(1).map(p=>`${fmt(p.x)} ${fmt(p.y)}`).join(' ')}`;}return s;}
export function pathValue(a:Anchor[]):PathValue{const t=arcTable(a);return {anchors:clone(a),svg:svgPath(a),length:t[t.length-1].distance};}
export function remember(s:Editor){s.history.push(clone(s.anchors));if(s.history.length>30)s.history.shift();}
export function undo(s:Editor){const a=s.history.pop();if(a){s.anchors=a;s.selected=Math.min(s.selected,a.length-1);s.reveal=0;}}
/** Exact de Casteljau split. Endpoint modes become corner if necessary to preserve the original curve. */
export function splitSegment(s:Editor,i:number,t=.5){if(s.anchors.length>=12||i<0||i>=s.anchors.length-1||t<=0||t>=1)return false;remember(s);const q=control(s.anchors,i),a=mix(q[0],q[1],t),b=mix(q[1],q[2],t),c=mix(q[2],q[3],t),d=mix(a,b,t),e=mix(b,c,t),p=mix(d,e,t);s.anchors[i].outgoing=sub(a,q[0]);s.anchors[i+1].incoming=sub(c,q[3]);s.anchors.splice(i+1,0,{p,incoming:sub(d,p),outgoing:sub(e,p),mode:'smooth'});s.selected=i+1;s.reveal=0;return true;}
export function setMode(s:Editor,mode:'smooth'|'corner'){const a=s.anchors[s.selected];if(a.mode===mode)return;remember(s);a.mode=mode;if(mode==='smooth'){let dir=length(a.outgoing)>1e-6?a.outgoing:mul(a.incoming,-1);if(length(dir)<1e-6)dir={x:36,y:0};const u=mul(dir,1/length(dir));a.outgoing=mul(u,length(a.outgoing)||36);a.incoming=mul(u,-(length(a.incoming)||36));}}
export function moveHandle(a:Anchor,key:'incoming'|'outgoing',p:Point){a[key]=sub(p,a.p);if(a.mode==='smooth'){const other=key==='incoming'?'outgoing':'incoming',n=length(a[key]);if(n>1e-6)a[other]=mul(a[key],-length(a[other])/n);}}
export function screen(s:Editor,p:Point):Point{return {x:(p.x-W/2)*s.zoom+W/2+s.pan.x,y:(p.y-H/2)*s.zoom+H/2+s.pan.y};}
export function world(s:Editor,p:Point):Point{return {x:(p.x-W/2-s.pan.x)/s.zoom+W/2,y:(p.y-H/2-s.pan.y)/s.zoom+H/2};}
export function zoom(s:Editor,factor:number){s.zoom=Math.max(.75,Math.min(2,s.zoom*factor));}
export function tick(s:Editor,dt:number,slow=false,reduce=false){s.reveal=reduce?1:1-(1-s.reveal)*Math.exp(-Math.min(dt,.05)*12*(slow?.25:1));if(s.playing&&!reduce)s.distance+=48*Math.min(dt,.05)*(slow?.25:1);}
export type Hit={kind:'anchor'|'incoming'|'outgoing';index:number};
export function hit(s:Editor,p:Point):Hit|null{const a=s.anchors[s.selected];for(const key of ['incoming','outgoing'] as const){if((key==='incoming'&&s.selected===0)||(key==='outgoing'&&s.selected===s.anchors.length-1))continue;if(length(sub(p,screen(s,add(a.p,a[key]))))<17)return {kind:key,index:s.selected};}for(let i=s.anchors.length-1;i>=0;i--)if(length(sub(p,screen(s,s.anchors[i].p)))<19)return {kind:'anchor',index:i};return null;}
export function gesture(s:Editor){let active:Hit|null=null,origin:Point|null=null,pan={x:0,y:0},snapshot:Anchor[]|null=null,moved=false;return {
 down(p:Point){active=hit(s,p);origin=p;pan={...s.pan};moved=false;snapshot=clone(s.anchors);if(active){if(s.selected!==active.index)s.reveal=0;s.selected=active.index;}},
 move(p:Point){if(!origin)return;if(!moved&&length(sub(p,origin))<2)return;if(!moved&&active)remember(s);moved=true;if(!active){s.pan=add(pan,sub(p,origin));return;}const a=s.anchors[active.index],q=world(s,p);if(active.kind==='anchor')a.p=q;else moveHandle(a,active.kind,q);},
 up(){origin=null;active=null;snapshot=null;},
 cancel(){if(snapshot){s.anchors=snapshot;if(moved&&active)s.history.pop();s.pan=pan;}origin=null;active=null;snapshot=null;},
};}
