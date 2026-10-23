#!/usr/bin/env python3
"""Fail closed on crash/error/dead processes, incomplete route evidence or empty artifacts.
This is a safety gate, not proof of interaction correctness. Inspect screenshots too.
"""
import argparse,pathlib,re,sys
p=argparse.ArgumentParser();p.add_argument('directory',type=pathlib.Path);p.add_argument('--routes',default='');a=p.parse_args()
root=a.directory; failures=[]
summaries=list(root.rglob('summary.txt'))
if not summaries:failures.append('No summary.txt evidence found')
combined='\n'.join(x.read_text(errors='replace') for x in summaries)
if not combined.strip():failures.append('Empty summary evidence')
for path in summaries:
 for line in path.read_text(errors='replace').splitlines():
  if re.search(r'\bcrash=yes\b|\bjserr=[1-9]\d*\b|\balive=(?:no)?(?:\s|$)|\b(?:failed|failure)=yes\b',line,re.I):failures.append(f'{path}: {line}')
for path in root.rglob('*logcat*.txt'):
 text=path.read_text(errors='replace')
 if re.search(r'FATAL EXCEPTION|Fatal signal \d+|JavascriptException|ANR in com\.[\w.]*nativelet|Process: com\.[\w.]*nativelet',text,re.I):failures.append(f'{path}: fatal native/JS/ANR evidence')
for route in filter(None,a.routes.split(',')):
 match=re.search(rf'^{re.escape(route)} crash=no jserr=0 alive=yes\b',combined,re.M)
 if not match:failures.append(f'Missing clean route summary: {route}')
 for suffix in ['-1.png','-2.png','.logcat.txt','.start.txt']:
  path=root/f'{route}{suffix}'
  if not path.is_file() or not path.stat().st_size:failures.append(f'Missing or empty artifact: {path}')
if failures:
 print('\n'.join(failures),file=sys.stderr);sys.exit(1)
print(f'Fail-closed gate passed: {len(summaries)} summaries, {len(list(root.rglob("*.png")))} screenshots. Visual/gesture inspection still required.')
