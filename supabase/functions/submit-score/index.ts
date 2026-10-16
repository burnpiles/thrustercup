// @ts-nocheck
// Thruster Cup: validate and record a leaderboard score.
// Writes go through here only; the table is read-only to the public.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/* ---- name filter (same rules as the game client) ---- */
const BAD_SUB=['fuck','fuk','fck','phuck','shit','sht','bitch','btch','biatch','cunt','dick','cock','pussy','pusy','asshole','asshat','asswipe','dumbass','jackass','nigg','niga','nigr','faggot','slut','whore','porn','penis','vagina','boob','titties','nazi','hitler','retard','twat','wank','jizz','dildo','horny','milf','chink','kike','wetback','tranny','molest','pedo','killyourself','suicide','bastard','bollock','skank','nude','naked','sexy','onlyfans','cocaine','heroin','kkk','nutsack','scrotum','testicle','orgasm','rape','meth','spic','anal','anus','sex'];
const BAD_WORD=['ass','cum','hoe','fag','kys','damn','crap','piss','arse','thot','weed','isis','terror','shooter','prick','tits','tit','nut','nuts','balls','die','kill','gay','homo','lesbo','perv','hell','sux','suck','sucks'];
const LEET={'0':'o','1':'i','2':'z','3':'e','4':'a','5':'s','6':'g','7':'t','8':'b','9':'g','@':'a','$':'s','!':'i','+':'t','|':'i'};
const OK_WORDS=['class','pass','grass','glass','bass','mass','sass','assist','classic','cassie','sussex','essex','analytic','analyst','analog','canal','banal','janus','hancock','peacock','cockpit','cocktail','shuttlecock','dickens','benedick','title','cumulus','arsenal','cocoa','scrap','method','something','methane','metheus','grape','drape','scrape','trapez','rapeseed','torpedo','speedo','spicy','spice','spicuous','auspic','hitchcock','scunthorpe','shitake','shiitake','sextant','sexton','middlesex'];
const stretch=w=>new RegExp(w.replace(/(.)\1*/g,m=>m[0]+(m.length>1?`{${m.length},}`:'+')));
const HARD_RX=['dumbass','jackass','badass','fatass','smartass','assface','asshat','asswipe','asshole','fuck','shit','cunt','nigg','bitch'].map(w=>stretch(w));
const BAD_RX=BAD_SUB.map(stretch),WORD_RX=BAD_WORD.map(w=>new RegExp('^'+stretch(w).source+'$'));
const deleet=x=>x.toLowerCase().split('').map(c=>LEET[c]||c).join('');
function nameProblem(raw){
  const s=String(raw||'').trim().replace(/\s+/g,' ');
  if(s.length<2)return 'Use at least 2 characters.';
  if(s.length>12)return 'Keep it to 12 characters.';
  if(!/^[A-Za-z0-9 _.\-]+$/.test(s))return 'Letters, numbers, spaces, - _ and . only.';
  if(!/[A-Za-z]/.test(s))return 'Include at least one letter.';
  const NO="That name isn't allowed. Pick something else.";
  const flat=deleet(s).replace(/[^a-z]/g,'');for(const rx of HARD_RX)if(rx.test(flat))return NO;
  let t=deleet(s).replace(/[^a-z]/g,'');for(const w of OK_WORDS)t=t.split(w).join('#');
  for(const rx of BAD_RX)if(rx.test(t))return NO;
  const toks=deleet(s.replace(/([a-z])([A-Z])/g,'$1 $2')).split(/[^a-z]+/).filter(Boolean);
  toks.push(deleet(s).replace(/[^a-z]/g,''));
  for(const tk of toks)for(const rx of WORD_RX)if(rx.test(tk))return NO;
  return null;
}

const ALLOWED_ORIGINS = new Set([
  "https://thrustercup.com", "https://www.thrustercup.com",
]);
function corsFor(origin: string | null) {
  const ok = !!origin && (ALLOWED_ORIGINS.has(origin) || /^https:\/\/thrustercup[a-z0-9-]*\.vercel\.app$/.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : "https://thrustercup.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const cors = corsFor(req.headers.get("origin"));
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { ok: false, error: "Method not allowed." });
  let b: any;
  try { const txt = await req.text(); if (txt.length > 2000) return reply(413, { ok: false, error: "Too big." }); b = JSON.parse(txt); }
  catch { return reply(400, { ok: false, error: "Bad request." }); }

  const twin = b?.twin, pid = String(b?.playerId || ""), score = Number(b?.score), finishMs = Number(b?.finishMs);
  const name = String(b?.name || "").trim().replace(/\s+/g, " ");
  if (twin !== "alan" && twin !== "alex") return reply(400, { ok: false, error: "Pick Alan or Alex." });
  if (!UUID.test(pid)) return reply(400, { ok: false, error: "Bad player id." });
  if (!Number.isInteger(score) || score < 0 || score > 500000) return reply(400, { ok: false, error: "Score could not be verified." });
  if (!Number.isInteger(finishMs) || finishMs < 10000 || finishMs > 900000) return reply(400, { ok: false, error: "Score could not be verified." });
  const prob = nameProblem(name);
  if (prob) return reply(400, { ok: false, error: prob });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ipKey = "ip:" + await sha(ip);
  const [a, c] = await Promise.all([
    sb.rpc("rate_hit", { p_bucket: "p:" + pid, p_limit: 6, p_window_seconds: 60 }),
    sb.rpc("rate_hit", { p_bucket: ipKey, p_limit: 40, p_window_seconds: 600 }),
  ]);
  if (a.error || c.error) return reply(500, { ok: false, error: "Could not post. Try again in a moment." });
  if (!a.data || !c.data) return reply(429, { ok: false, error: "Slow down a little, then try again." });

  const { data, error } = await sb.rpc("submit_score", { p_twin: twin, p_player: pid, p_name: name, p_score: score, p_finish_ms: finishMs });
  if (error) return reply(500, { ok: false, error: "Could not post. Try again in a moment." });
  const row = Array.isArray(data) ? data[0] : data;
  return reply(200, { ok: true, name, best: row?.best ?? score, improved: !!row?.improved });
});
