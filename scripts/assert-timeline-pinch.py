import sys,re,xml.etree.ElementTree as E

def read(path):
 nodes=list(E.parse(path).iter('node'))
 text=[n.get('text','') for n in nodes]
 zoom=[float(v[:-1]) for v in text if re.fullmatch(r'\d+\.\d+×',v)]
 ranges=[v for v in text if '→' in v]
 assert len(zoom)==1 and len(ranges)==1,(zoom,ranges)
 target=next(n for n in nodes if n.get('content-desc','').startswith('Timeline trim.'))
 x1,y1,x2,y2=map(int,re.findall(r'\d+',target.get('bounds')))
 ticks=[]
 for n in nodes:
  t=n.get('text','')
  if re.fullmatch(r'\d+(\.\d+)?s',t):sec=float(t[:-1])
  elif re.fullmatch(r'\d+:\d{2}',t):m,s=t.split(':');sec=int(m)*60+int(s)
  else:continue
  a,b,c,d=map(int,re.findall(r'\d+',n.get('bounds')))
  # Center-aligned tick label width80. Ignore clipping near outer edges.
  x=((a+c)/2-x1)*340/(x2-x1)
  if 65<x<275:ticks.append((sec,x))
 assert len(ticks)>=2,('Missing interior ruler ticks',ticks)
 ticks.sort();a,b=ticks[0],ticks[-1]
 scale=(b[1]-a[1])/(b[0]-a[0]);anchor=a[0]+(170-a[1])/scale
 return zoom[0],ranges[0],anchor,scale
before,after=map(read,sys.argv[1:])
assert before[0]==1,before
assert after[0]>1.5,(before,after)
assert before[1]==after[1],('Selection changed',before,after)
# Two native pixels of location rounding + text label integer placement per end.
# Convert measured source canvas tolerance to seconds, rather than widen to green.
tolerance=3/before[3]+3/after[3]
assert abs(before[2]-after[2])<=tolerance,('Pinch anchor drift',before,after,tolerance)
print('pinch verified zoom/range/anchor',before,after,'anchor tolerance seconds',tolerance)
