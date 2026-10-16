import re,json,sys,os
SRC='src/game.html'
cfg=json.load(open('src/config.json')) if os.path.exists('src/config.json') else {}
s=open(SRC).read()
a=s.index('/* ================= high score board');b=s.index('function updTicker')
s=s[:a]+open('src/board_web.js').read()+'\n'+s[b:]
old="const SHARE_BASE='https://claude.ai/artifact/2NXtfn34bwUoTmUMz4xNdM';"
assert s.count(old)==1;s=s.replace(old,"const SHARE_BASE='https://thrustercup.com/';")
s=s.replace("SHARE_BASE+'#c-'","SHARE_BASE+'#c-'")
# title line already first; build a proper document head
assert s.startswith('<title>Thruster Cup</title>')
s=s[len('<title>Thruster Cup</title>'):]
DESC='Race Alan or Alex Stokes in a retro 16-bit stunt racer. Flip, spin, loop and boost to the top of the leaderboard.'
head=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Thruster Cup | Stokes Twins Stunt Racer</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#0c0830">
<link rel="canonical" href="https://thrustercup.com/">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Thruster Cup">
<meta property="og:type" content="website">
<meta property="og:url" content="https://thrustercup.com/">
<meta property="og:title" content="Thruster Cup | Stokes Twins Stunt Racer">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="https://thrustercup.com/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Thruster Cup | Stokes Twins Stunt Racer">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="https://thrustercup.com/og.png">
<script>window.TC_CONFIG={json.dumps({k:cfg[k] for k in ('url','key') if k in cfg})};</script>
'''
s=head+s
# body/html close
if '</html>' not in s: s=s.rstrip()+'\n</html>\n'
os.makedirs('public',exist_ok=True)
open('public/index.html','w').write(s)
js=re.findall(r'<script>(.*?)</script>',s,re.S)
pass
print('built',len(s))
