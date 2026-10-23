import sys,re,xml.etree.ElementTree as E

def rows(path):
 nodes=list(E.parse(path).iter('node'))
 d={}
 for n in nodes:
  t=n.get('text','')
  if re.fullmatch(r'[A-E]',t):
   x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
   d[t]=(y1+y2)/2
 return d,nodes

b,bn=rows(sys.argv[1]); a,an=rows(sys.argv[2])
common=sorted(set(b)&set(a))
assert len(common)>=3,('row labels missing',sorted(b),sorted(a))
def spacing(d):
 ys=[d[k] for k in common]
 return (ys[-1]-ys[0])/(len(ys)-1)
sb,sa=spacing(b),spacing(a)
assert sa>sb*1.4,('row label spacing did not expand',sb,sa)
sel=lambda nodes:any(n.get('text')=='1 seat' for n in nodes)
assert sel(bn) and sel(an),'seat selection changed during pinch'
print('seat pinch verified: row spacing',round(sb,1),'->',round(sa,1),'selection kept')
