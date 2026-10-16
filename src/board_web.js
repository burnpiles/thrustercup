/* ================= high score board (thrustercup.com): Supabase, one column per twin ================= */
const TC_API=window.TC_CONFIG||{};
let uid=null,boards={alan:[],alex:[]},boardState='loading',ready={alan:false,alex:false};
try{uid=localStorage.getItem('thrustercup.pid');}catch(_){}
if(!uid||!/^[0-9a-f-]{36}$/.test(uid)){uid=(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);}));try{localStorage.setItem('thrustercup.pid',uid);}catch(_){}}
function setMsg(t,cls){const m=$('#postMsg');m.textContent=t;m.className=cls||'';}
function renderBoards(){
  for(const[n,max]of[['1',8],['2',15]])for(const tw of['alan','alex']){const ol=$('#list'+n+tw);if(!ol)continue;ol.textContent='';
    const note=t=>{const li=document.createElement('li');li.className='empty';li.textContent=t;ol.append(li);};
    if(boardState==='loading'){note('Loading…');continue;}
    if(boardState==='off'){note('Leaderboard coming online soon.');continue;}
    if(boardState==='error'){note('Could not load. Try again soon.');continue;}
    const rows=boards[tw];if(!rows.length){note('No scores yet. Be first!');continue;}
    rows.slice(0,max).forEach((r,i)=>{const li=document.createElement('li');if(r.id===uid)li.className='me';
      const rk=document.createElement('span');rk.className='rk';rk.textContent=i+1;
      const nm=document.createElement('span');nm.className='nm';nm.textContent=cleanName(r.name);
      const sc=document.createElement('span');sc.className='sc';sc.textContent=(Number(r.score)||0).toLocaleString();
      li.append(rk,nm,sc);ol.append(li);});}
  if(typeof fitSoon==='function')fitSoon();
}
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
let loadingBoards=false;
async function loadBoards(){
  if(!TC_API.url||!TC_API.key){boardState='off';renderBoards();return;}
  if(loadingBoards)return;loadingBoards=true;
  try{
    const r=await withTimeout(fetch(`${TC_API.url}/rest/v1/scores?select=twin,player_id,name,score&order=score.desc&limit=100`,{headers:{apikey:TC_API.key,Authorization:'Bearer '+TC_API.key}}),8000);
    if(!r.ok)throw new Error('http '+r.status);
    const rows=await r.json();const next={alan:[],alex:[]};
    for(const v of rows){if(!v||!next[v.twin])continue;const sc=Number(v.score);if(!okScore(sc))continue;next[v.twin].push({id:v.player_id,name:v.name,score:sc});}
    for(const tw of['alan','alex'])next[tw]=next[tw].slice(0,50);
    boards=next;ready.alan=ready.alex=true;boardState='ready';
  }catch(_){if(boardState!=='ready')boardState='error';}
  finally{loadingBoards=false;renderBoards();}
}
loadBoards();
setInterval(()=>{if(!document.hidden&&(state==='home'||!$('#boardOv').hidden||!$('#results').hidden))loadBoards();},30000);
async function moderate(){return true;}
$('#postForm').addEventListener('submit',async e=>{
  e.preventDefault();if(posted||$('#postBtn').disabled)return;
  const myRun=runId,myPick=pick,myScore=Math.round(finalScore),myMs=Math.round((car.finishT||0)*1000);
  if(!okScore(myScore)){setMsg('Score could not be verified.','bad');return;}
  const name=$('#nameIn').value.trim().replace(/\s+/g,' ');
  const prob=nameProblem(name);if(prob){setMsg(prob,'bad');return;}
  if(!TC_API.url){setMsg('The leaderboard is coming online soon. Your score is saved on this device.','bad');return;}
  $('#postBtn').disabled=true;setMsg('Posting…','');
  try{localStorage.setItem('thrustercup.name',name);}catch(_){}
  try{
    const r=await withTimeout(fetch(`${TC_API.url}/functions/v1/submit-score`,{method:'POST',headers:{'Content-Type':'application/json',apikey:TC_API.key},
      body:JSON.stringify({twin:myPick,playerId:uid,name,score:myScore,finishMs:myMs})}),10000);
    let j={};try{j=await r.json();}catch(_){}
    if(myRun!==runId)return;
    if(!r.ok||!j.ok){$('#postBtn').disabled=false;setMsg(j.error||'Could not post. Try again in a moment.','bad');return;}
    posted=true;
    setMsg(j.improved?`Posted ${myScore.toLocaleString()} as ${j.name||name}.`:`Name updated. Your best on the board is still ${Number(j.best||0).toLocaleString()}.`,'ok');
    loadBoards();
  }catch(err){if(myRun!==runId)return;$('#postBtn').disabled=false;setMsg('Could not post. Check your connection and try again.','bad');}
});
