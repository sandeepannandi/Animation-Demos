import { beginTimeline, cancelTimeline, endTimeline, moveTimeline, timeAt, zoomTimeline, boundOffset, type TrimState } from './timelineMath';
export type Point = {x:number;y:number};
/** Absolute local positions prevent coordinate drift; switching finger count rebases. */
export function timelineGesture(s:TrimState) {
  let count=0, lastX=0, lastTime=0, distance=0, anchor=0;
  const move=(points:Point[],now:number)=> {
    const n=points.length;
    if(n===0) { if(count===1)endTimeline(s);else cancelTimeline(s);count=0;return; }
    if(n>=2) {
      const mid=(points[0].x+points[1].x)/2, dist=Math.max(8,Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y));
      if(count<2) {cancelTimeline(s);distance=dist;anchor=timeAt(s,mid);}
      else { zoomTimeline(s,dist/distance,mid);s.offset=anchor-(mid-20)/s.scale;boundOffset(s);distance=dist; }
      count=n;lastX=mid;lastTime=now;return;
    }
    const p=points[0];
    if(count!==1) {beginTimeline(s,p.x,p.y);lastX=p.x;lastTime=now;}
    else {const dt=Math.max(.008,Math.min(.1,(now-lastTime)/1000));moveTimeline(s,p.x,p.x-lastX,(p.x-lastX)/dt);lastX=p.x;lastTime=now;}
    count=1;
  };
  return {move,cancel:()=>{count=0;cancelTimeline(s);}};
}
