import React,{useMemo,useRef,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {TimelineTrim,type TimelineTrimHandle} from './TimelineTrim';
import {demoThumbnails} from './timelineFixture';
import {createTimeline,demoWaveform,formatTime,rangeValue} from './timelineMath';
export default function Example({onFeedback}:{onFeedback?:()=>void}){
 const ref=useRef<TimelineTrimHandle>(null),[slow,setSlow]=useState(false),[range,setRange]=useState(rangeValue(createTimeline())),samples=useMemo(()=>demoWaveform(),[]);
 const button=(label:string,action:()=>void)=><Pressable key={label} accessibilityRole="button" onPress={action} style={{minHeight:40,minWidth:40,paddingHorizontal:12,justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:'#ccd3c6',backgroundColor:'#f8faf5'}}><Text style={{color:'#30372e',fontSize:12}}>{label}</Text></Pressable>;
 return <View style={{alignItems:'center',gap:14,paddingVertical:14}}><TimelineTrim ref={ref} duration={120} waveform={samples} thumbnails={demoThumbnails} onChange={setRange} onFeedback={onFeedback} slowMotion={slow}/><Text style={{color:'#292e29',fontSize:14,fontVariant:['tabular-nums']}}>{formatTime(range.start)}   →   {formatTime(range.end)}</Text><View style={{flexDirection:'row',gap:6}}>{button('Zoom out',()=>ref.current?.zoom(.5))}{button('Zoom in',()=>ref.current?.zoom(2))}{button(`Slow motion: ${slow?'on':'off'}`,()=>setSlow(v=>!v))}</View><View style={{flexDirection:'row',gap:6}}>{button('Start −',()=>ref.current?.adjust('start',-1))}{button('Start +',()=>ref.current?.adjust('start',1))}{button('End −',()=>ref.current?.adjust('end',-1))}{button('End +',()=>ref.current?.adjust('end',1))}{button('Reset',()=>ref.current?.reset())}</View><Text style={{color:'#64705f',fontSize:12,textAlign:'center',lineHeight:20}}>Pinch to zoom. Drag the ruler to pan.{'\n'}Hold a trim handle near an edge to keep scrolling.</Text></View>;
}
