import { useState, useEffect } from "react";
import {
  Building2, DollarSign, FileText, Plus, ChevronLeft, ChevronRight,
  Edit3, Save, X, Loader2, Phone, Mail, BarChart3, ExternalLink,
  Check, Copy, Settings, MessageSquare, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import { supabase, dbLoadPlans, dbSavePlan, dbSavePlans, dbDeletePlan, dbLoadSettings, dbSaveSettings } from "./lib/supabase.js";
const MODEL = "claude-sonnet-4-6";
const BLUE="#29aae2",INK="#293132",BODY="#3d4f60",MUTED="#8a9bb0",RULE="#e2e8ed",FILL="#f5f7f9",GREEN="#16a34a",AMBER="#d97706",RED="#c0392b";

const STATUSES={
  new:          {label:"New",              bg:"#f0f9ff",color:BLUE},
  in_progress:  {label:"In Progress",      bg:"#f0fdf4",color:GREEN},
  closed:       {label:"Closed",           bg:"#dcfce7",color:"#15803d"},
  lost:         {label:"Lost",             bg:"#fef2f2",color:RED},
  no_response:  {label:"Never Heard Back", bg:"#f9fafb",color:"#9ca3af"},
};
// Statuses available for manual selection (outcomes only)
const OUTCOME_STATUSES=["closed","lost","no_response"];
const CALL_OUTCOMES={
  not_answered:   {label:"Not Answered",     color:MUTED},
  voicemail:      {label:"Voicemail Left",   color:BODY},
  brief:          {label:"Brief Chat",       color:AMBER},
  full:           {label:"Full Conversation",color:GREEN},
  not_interested: {label:"Not Interested",   color:RED},
};
const INTEREST={
  cold:           {label:"Cold",             color:MUTED},
  warm:           {label:"Warm",             color:AMBER},
  engaged:        {label:"Engaged",          color:GREEN},
  not_interested: {label:"Not Interested",   color:RED},
};

const DEFAULT_SETTINGS={name:"Matt Hightower",title:"401(k) Plan Consultant",firm:"Momentum Wealth Management",phone:"",email:"",};
const BLANK_PLAN={id:"",company:"",ein:"",assets:"",participants:"",avgBalance:"",planYear:"2024",provider:"",contactName:"",contactTitle:"",contactEmail:"",contactPhone:"",contactLinkedIn:"",address:"",status:"new",notes:"",dateAdded:new Date().toISOString().split("T")[0],outreach:{postcardSent:false,postcardDate:"",linkedInSent:false,linkedInDate:"",emailSent:false,emailDate:"",emailVariant:"A",letterSent:false,letterDate:"",replied:false},calls:[],analysis:null};


const DUMMY_PLAN = {
  id:"demo-001",
  company:"Columbus Cardiology Associates, P.C.",
  ein:"58-1234567",
  assets:"8030305",
  participants:"94",
  avgBalance:"85429",
  planYear:"2024",
  provider:"Nationwide",
  contactName:"Sarah Mitchell",
  contactTitle:"Practice Administrator",
  contactEmail:"smitchell@columbuscardiology.com",
  contactPhone:"(706) 555-0142",
  contactLinkedIn:"linkedin.com/in/sarah-mitchell-hightower",
  address:"1800 Whittlesey Road, Columbus, GA 31904",
  status:"in_progress",
  notes:"Nationwide has been their provider for 8+ years. Plan was set up by a broker who has since retired. Sarah seemed receptive when I introduced myself at the Chamber event last month.",
  dateAdded:"2026-08-01",
  outreach:{
    postcardSent:true,postcardDate:"2026-08-04",
    linkedInSent:false,linkedInDate:"",
    emailSent:false,emailDate:"",emailVariant:"A",
    letterSent:false,letterDate:"",replied:false,
  },
  calls:[{
    id:"call-001",
    date:"2026-08-05",
    outcome:"voicemail",
    duration:"",
    notes:"Left voicemail referencing the postcard. Following up Thursday.",
    rawTranscript:"",
    summary:null,
  }],
  analysis:{
    planType:"fee_benchmark",
    modelRationale:"94 participants at $85,429 average balance — stable salaried workforce within standard fee benchmarking range.",
    keyMetrics:{estimatedTotalCostPct:1.28,estimatedTotalCostDollar:102787,medianComparablePct:0.89,excessCostDollar:31338},
    prospectProfile:"Most likely the practice owner, administrator, or office manager. The plan was set up years ago and has not been seriously reviewed since. Physicians already think about liability in their clinical work, so the ERISA framing lands harder here.",
    postcardBridge:"I sent you something in the mail last week about your 401(k) — did you happen to see it? Good. When I looked at your filing and compared it to plans of similar size, one number stood out.",
    anchorNumber:"$31,338/yr",
    anchorContext:"Estimated excess annual cost vs. comparable plans — paid from participant accounts, not the practice budget.",
    findings:[
      {anchor:"$31,338/yr",anchorSub:"estimated excess annual cost",title:"Your plan is likely paying nearly 40 basis points more than comparable plans.",body:"The typical all-in cost for plans your size runs around 89 basis points. Your plan is estimated at 1.28%. On $8 million in assets, that difference works out to roughly $31,338 leaving participant accounts every year — not because of market performance, but because of how the plan is built."},
      {anchor:"1.28%",anchorSub:"estimated all-in cost",title:"Investment expenses are where most of the excess cost lives.",body:"At an estimated 0.62%, fund expenses are the largest single cost driver and the least visible. A lineup built around institutional-class or index funds can typically bring that number below 0.20% without reducing the quality or diversification of options available to your team."},
      {anchor:"ERISA §404(a)",anchorSub:"personal fiduciary duty",title:"You are personally responsible for ensuring these fees are reasonable.",body:"Under ERISA, plan fiduciaries — typically the practice owner or trustee, personally — have an ongoing legal obligation to ensure fees are reasonable. An independent benchmark, kept in the plan fiduciary file, is the standard way to demonstrate that process."}
    ],
    erisa404Line:"Under ERISA, the obligation to ensure your plan fees are reasonable is yours personally — not the practice as an entity.",
    solutionText:"A restructured plan built around institutional-class or index funds, with a competitive recordkeeping arrangement and transparent fee disclosure, would bring your all-in cost from around 1.28% into the 0.60-0.70% range. The assets transfer intact and the disruption to participants is minimal.",
    callArc:[
      "Reference the postcard, then land the $31,338 number — let it sit",
      "Translate it per person: $333/yr more than comparable plans per participant",
      "Name the personal ERISA liability — once, plainly, then move on",
      "Keep the ask small: offer the one-page fee benchmark summary"
    ],
    talkingPoints:[
      "Your plan is estimated at 1.28% all-in — comparable plans your size run 0.89%. On $8M that is $31,338 a year coming out of participant accounts.",
      "Each participant with an $85,000 average balance pays roughly $1,093/yr in fund costs alone. On a restructured plan that drops to $760 — $333 back in each account, per year.",
      "Investment expenses at ~0.62% are the primary driver. A lineup built around index funds brings that number well below 0.20% without changing the quality of options.",
      "This money does not go to the practice — it goes to fund companies. Fixing it does not cost you anything. It changes where the money goes.",
      "A documented independent fee benchmark is exactly what ERISA asks plan fiduciaries to maintain. This conversation starts that process."
    ],
    questionsToAsk:[
      "When did you last receive an independent benchmark of your plan fees against comparable plans?",
      "Do you know what your current advisor is being paid from plan assets each year?",
      "Have you reviewed the plan 408(b)(2) fee disclosure recently?"
    ],
    potentialObjections:[
      {objection:"Our advisor takes care of the plan — we are covered.",response:"Having an advisor does not transfer the fiduciary duty. The obligation to ensure fees are reasonable sits with you personally — not the advisor and not the practice entity."},
      {objection:"We have been with Nationwide for years and have not had any problems.",response:"No problems and working well for your employees are not the same thing. All I am offering is a clear look at the numbers — if everything checks out, this will be a short conversation."}
    ],
    internalHtml:"",
    clientHtml:"",
  }
};


const BLANK_CALL={id:"",date:new Date().toISOString().split("T")[0],outcome:"full",duration:"",notes:"",rawTranscript:"",summary:null};

const uid=()=>Math.random().toString(36).slice(2,10);
const fmtPhone=p=>{if(!p)return p;const d=p.replace(/\D/g,'');if(d.length===10)return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;if(d.length===11&&d[0]==='1')return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;return p;};
const fmtPhoneInput=v=>{const d=v.replace(/\D/g,'').slice(0,10);if(d.length<=3)return d;if(d.length<=6)return `(${d.slice(0,3)}) ${d.slice(3)}`;return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;};
const fmt=n=>{const v=Number(n);return v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v}`;};
const fmtF=n=>`$${Number(n).toLocaleString()}`;
const fmtPct=n=>`${Number(n).toFixed(2)}%`;
const fmtD=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):null;
const fmtDs=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}):null;
const buildLinkedIn=p=>{const first=p.contactName?.split(" ")[0]||"there";return `Hi ${first} — I sent you something in the mail recently about ${p.company||"your company"}'s 401(k). Thought I\'d connect here as well. —Matt`;};

async function loadData(key,fb){try{const r=await window.storage.get(key);return r?JSON.parse(r.value):fb;}catch{return fb;}}
async function saveData(key,val){try{await window.storage.set(key,JSON.stringify(val));}catch(e){console.error(e);}}

async function analyzePlan(plan,settings){
  const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan,settings})});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"Analysis failed");
  return data;
}
async function processTranscript(transcript,plan){
  const res=await fetch("/api/transcript",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript,plan})});
  if(!res.ok) throw new Error("Transcript processing failed");
  return res.json();
}
async function _processTranscriptOLD(transcript,plan){
  const prompt=`Review this Zoom transcript. Matt Hightower from Momentum Wealth called ${plan.company} about their 401(k).

Transcript:
${transcript.slice(0,4000)}

Return ONLY valid JSON:
{"callSummary":"2-3 sentence summary","interestLevel":"cold"|"warm"|"engaged"|"not_interested","keyPoints":["pt1","pt2","pt3"],"objections":["obj1","obj2"],"currentProvider":"name or not mentioned","nextSteps":"agreed step or none agreed","notableQuotes":["quote1"]}`;
  const res=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens:800,messages:[{role:"user",content:prompt}]})});
  const data=await res.json();
  return JSON.parse(data.content[0].text.replace(/```json|```/g,"").trim());
}

function buildClientHTML(plan,a,s){
  const avg=Number(plan.avgBalance)||Math.round(Number(plan.assets)/Number(plan.participants));
  const findings=a.findings.map(f=>`<div class="finding"><span class="anc">${f.anchor}</span><span class="asub">${f.anchorSub}</span><div class="ftit">${f.title}</div><p class="fbod">${f.body}</p></div>`).join("");
  const intro=a.planType==="admin_complexity"
    ?"Running a 401(k) for a large, hourly workforce is a different challenge than most providers account for. Here is what your plan's public filing shows and where there is real room to make it work harder for your employees."
    :"Your plan looks fine from the outside. The costs that matter most do not appear on any statement your employees see. Here is what your plan's public filing actually shows.";
  const disc=a.planType==="fee_benchmark"
    ?"Comparable-plan figures reflect published industry medians from the 401k Averages Book, 26th Edition, and individual plan costs vary based on services, investments, and plan design."
    :"Industry context is drawn from the ICI/ISS MI Defined Contribution Plan Profile (2023), presented as general industry context only and not as a benchmark of this specific plan.";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>401(k) Plan Review — ${plan.company}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap" rel="stylesheet">
<style>:root{--b:#29aae2;--i:#293132;--d:#3d4f60;--m:#8a9bb0;--r:#e2e8ed;--f:#f5f7f9}*{margin:0;padding:0;box-sizing:border-box}@page{size:letter landscape;margin:.45in .6in}body{font-family:'IBM Plex Sans',sans-serif;font-weight:300;color:var(--i);background:#fff;width:9.8in;margin:0 auto;padding:.45in 0;font-size:9.5pt;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}.hdr{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:10px;border-bottom:2.5px solid var(--b);margin-bottom:22px}.wm{font-family:'Syne',sans-serif;font-size:11pt;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--i)}.wm em{color:var(--b);font-style:normal}.hr{font-size:7pt;color:var(--m);font-weight:400;letter-spacing:.06em;text-align:right;text-transform:uppercase;line-height:1.7}.irow{display:flex;gap:40px;align-items:flex-start;margin-bottom:24px;padding-bottom:22px;border-bottom:1px solid var(--r)}.il{flex:1}.ey{font-size:6.8pt;text-transform:uppercase;letter-spacing:.16em;color:var(--b);font-weight:500;margin-bottom:5px}.cn{font-family:'Syne',sans-serif;font-size:19pt;font-weight:700;color:var(--i);line-height:1.1;letter-spacing:-.01em;margin-bottom:9px}.ip{font-size:9.2pt;color:var(--d);line-height:1.72;font-weight:300}.snap{display:flex;flex-direction:column;gap:14px;min-width:1.6in;padding-left:32px;border-left:1px solid var(--r)}.sl{font-size:6.5pt;text-transform:uppercase;letter-spacing:.12em;color:var(--m);font-weight:500;margin-bottom:2px}.sv{font-size:16pt;font-weight:600;color:var(--i);line-height:1;font-feature-settings:"tnum" 1;letter-spacing:-.015em}.sv.sm{font-size:10pt;padding-top:3px;letter-spacing:0;font-weight:400}.sn{font-size:6.8pt;color:var(--m);margin-top:2px;font-weight:300}.se{font-size:6.8pt;text-transform:uppercase;letter-spacing:.16em;color:var(--b);font-weight:500;margin-bottom:14px}.fg{display:flex;gap:0;margin-bottom:22px}.finding{flex:1;padding-right:28px;margin-right:28px;border-right:1px solid var(--r)}.finding:last-child{border-right:none;padding-right:0;margin-right:0}.anc{font-size:34pt;font-weight:600;color:var(--b);line-height:1;letter-spacing:-.025em;font-feature-settings:"tnum" 1;display:block;margin-bottom:3px}.asub{font-size:6.5pt;text-transform:uppercase;letter-spacing:.1em;color:var(--m);font-weight:400;display:block;margin-bottom:8px;line-height:1.5}.ftit{font-family:'Syne',sans-serif;font-size:9.5pt;font-weight:700;color:var(--i);margin-bottom:5px;line-height:1.3}.fbod{font-size:8.5pt;color:var(--d);line-height:1.72;font-weight:300}.sol{background:var(--f);padding:14px 18px;margin-bottom:20px;border-left:3px solid var(--b)}.sey{font-size:6.5pt;text-transform:uppercase;letter-spacing:.14em;color:var(--b);font-weight:500;margin-bottom:6px}.sb{font-size:9pt;color:var(--i);line-height:1.72;font-weight:400}.cta{display:flex;justify-content:space-between;align-items:flex-end;padding-top:16px;border-top:1px solid var(--r);gap:20px}.ctab{font-size:9.2pt;color:var(--i);line-height:1.72;font-weight:400}.sig{text-align:right;flex-shrink:0;line-height:1.65}.sn2{font-family:'Syne',sans-serif;font-size:10.5pt;font-weight:700;color:var(--i);display:block;margin-bottom:2px}.sl2{font-size:8pt;color:var(--d);font-weight:300;display:block}.disc{margin-top:16px;padding-top:9px;border-top:1px solid var(--r);font-size:6.2pt;color:var(--m);line-height:1.55;font-weight:300}</style></head><body>
<div class="hdr"><div class="wm">MOMENTUM <em>WEALTH</em> MANAGEMENT</div><div class="hr">401(k) Plan Review&nbsp;&nbsp;|&nbsp;&nbsp;Prepared for Plan Fiduciary</div></div>
<div class="irow"><div class="il"><div class="ey">Plan Review</div><div class="cn">${plan.company}</div><p class="ip">${intro}</p></div>
<div class="snap"><div><div class="sl">Plan Assets</div><div class="sv">${fmt(Number(plan.assets))}</div></div><div><div class="sl">Participants</div><div class="sv">${Number(plan.participants).toLocaleString()}</div></div><div><div class="sl">Avg. Balance</div><div class="sv">${fmt(avg)}</div><div class="sn">per active participant</div></div><div><div class="sl">Source</div><div class="sv sm">Form 5500</div><div class="sn">DOL public filing</div></div></div></div>
<div class="se">What we found</div>
<div class="fg">${findings}</div>
<div class="sol"><div class="sey">What a better version looks like</div><p class="sb">${a.solutionText}</p></div>
<div class="cta"><p class="ctab">I\'d like to walk you through this in about 20 minutes — no presentation, no pressure. Just a straight conversation about whether there's something worth pursuing here.</p>
<div class="sig"><span class="sn2">${s.name}${s.title?`, ${s.title}`:""}</span><span class="sl2">${s.firm}&nbsp;&nbsp;|&nbsp;&nbsp;Columbus, GA</span>${s.phone?`<span class="sl2">${s.phone}</span>`:""}${s.email?`<span class="sl2">${s.email}</span>`:""}</div></div>
<div class="disc">This review is for informational purposes only and does not constitute investment advice or an offer of advisory services. Plan figures are drawn from publicly filed Form 5500 data and are believed accurate as of the plan year cited but are not guaranteed. ${disc} Momentum Wealth Management is registered as an investment adviser with the States of Georgia and Alabama. Registration does not imply any particular level of skill or expertise. This document does not create an advisory or fiduciary relationship. A copy of Momentum's Form ADV Part 2A is available upon request or at adviserinfo.sec.gov.</div>
</body></html>`;
}

function buildInternalHTML(plan,a,s){
  const avg=Number(plan.avgBalance)||Math.round(Number(plan.assets)/Number(plan.participants));
  const cost=a.planType==="fee_benchmark"&&a.keyMetrics.excessCostDollar>0?`<div class="mets"><div class="m"><div class="ml">Est. Total Cost</div><div class="mv">${fmtPct(a.keyMetrics.estimatedTotalCostPct)}</div><div class="ms">${fmtF(a.keyMetrics.estimatedTotalCostDollar)}/yr</div></div><div class="m"><div class="ml">Median Comparable</div><div class="mv">${fmtPct(a.keyMetrics.medianComparablePct)}</div><div class="ms">401k Averages Book, 26th Ed.</div></div><div class="m al"><div class="ml">Excess Annual Cost</div><div class="mv">${fmtF(a.keyMetrics.excessCostDollar)}</div><div class="ms">from participant accounts</div></div></div>`:"";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Internal Brief — ${plan.company}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap" rel="stylesheet">
<style>:root{--b:#29aae2;--i:#293132;--d:#3d4f60;--m:#8a9bb0;--r:#e2e8ed;--f:#f5f7f9;--red:#c0392b;--redl:#fef2f2}*{margin:0;padding:0;box-sizing:border-box}@page{size:letter;margin:.5in}body{font-family:'IBM Plex Sans',sans-serif;font-weight:300;color:var(--i);background:#fff;width:7.5in;margin:0 auto;padding:.5in 0;font-size:9pt;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}.hdr{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:10px;border-bottom:2.5px solid var(--b);margin-bottom:16px}.wm{font-family:'Syne',sans-serif;font-size:11pt;font-weight:700;letter-spacing:.2em;text-transform:uppercase}.wm em{color:var(--b);font-style:normal}.hr{font-size:7pt;color:var(--m);text-transform:uppercase;letter-spacing:.06em}.bdg{display:inline-block;padding:2px 8px;border-radius:3px;font-size:7pt;font-weight:500;letter-spacing:.08em;text-transform:uppercase;margin-left:10px;vertical-align:middle}.fee{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe}.adm{background:#fef3c7;color:#d97706;border:1px solid #fde68a}.co{font-family:'Syne',sans-serif;font-size:17pt;font-weight:700;margin-bottom:3px}.rat{font-size:8pt;color:var(--m);font-style:italic;margin-bottom:12px}.snap{display:flex;border:1px solid var(--r);border-left:3px solid var(--b);margin-bottom:12px}.sc{flex:1;padding:7px 11px;border-right:1px solid var(--r)}.sc:last-child{border-right:none}.sl{font-size:6.5pt;text-transform:uppercase;letter-spacing:.1em;color:var(--m);font-weight:500}.sv{font-size:12pt;font-weight:600;font-feature-settings:"tnum" 1;margin-top:2px}.mets{display:flex;gap:10px;margin-bottom:12px}.m{flex:1;padding:9px 11px;background:var(--f);border-left:3px solid var(--b)}.m.al{background:var(--redl);border-left-color:var(--red)}.ml{font-size:6.5pt;text-transform:uppercase;letter-spacing:.1em;color:var(--m);font-weight:500}.mv{font-size:14pt;font-weight:600;font-feature-settings:"tnum" 1;margin:2px 0 1px}.m.al .mv{color:var(--red)}.ms{font-size:6.8pt;color:var(--m)}.anb{background:var(--f);border-left:3px solid var(--b);padding:8px 12px;margin-bottom:12px;display:flex;align-items:baseline;gap:12px}.anbig{font-size:22pt;font-weight:600;color:var(--b);font-feature-settings:"tnum" 1;letter-spacing:-.02em}.anctx{font-size:8.5pt;color:var(--d)}.erisa{background:#fffbeb;border-left:3px solid #d97706;padding:8px 12px;font-size:8.5pt;color:var(--i);margin-bottom:12px;font-style:italic}h3{font-family:'Syne',sans-serif;font-size:7pt;text-transform:uppercase;letter-spacing:.14em;color:var(--b);font-weight:700;border-bottom:1px solid var(--r);padding-bottom:3px;margin:12px 0 7px}.tx{font-size:8.5pt;color:var(--d);line-height:1.7;margin-bottom:3px}.hl{background:var(--f);border-left:3px solid var(--b);padding:7px 11px;font-size:8.5pt;color:var(--i);margin-bottom:3px}ul{margin:0 0 4px 16px}li{font-size:8.5pt;color:var(--d);line-height:1.72;margin-bottom:3px}li b{color:var(--i)}.two{display:flex;gap:20px}.col{flex:1}.oq{font-size:8.5pt;color:var(--i);font-weight:500;margin-bottom:2px}.oa{font-size:8.5pt;color:var(--d);margin-bottom:7px;padding-left:10px;border-left:2px solid var(--r)}.foot{margin-top:16px;padding-top:8px;border-top:1px solid var(--r);font-size:6.8pt;color:var(--m);display:flex;justify-content:space-between}</style></head><body>
<div class="hdr"><div class="wm">MOMENTUM <em>WEALTH</em> MANAGEMENT</div><span class="hr">Internal Brief — Confidential</span></div>
<div class="co">${plan.company}<span class="bdg ${a.planType==="fee_benchmark"?"fee":"adm"}">${a.planType==="fee_benchmark"?"Fee Benchmark":"Admin Complexity"}</span></div>
<div class="rat">${a.modelRationale}</div>
<div class="snap"><div class="sc"><div class="sl">Assets</div><div class="sv">${fmtF(Number(plan.assets))}</div></div><div class="sc"><div class="sl">Participants</div><div class="sv">${Number(plan.participants).toLocaleString()}</div></div><div class="sc"><div class="sl">Avg. Balance</div><div class="sv">${fmtF(avg)}</div></div><div class="sc"><div class="sl">Plan Year</div><div class="sv">${plan.planYear}</div></div><div class="sc"><div class="sl">Provider</div><div class="sv" style="font-size:9pt;padding-top:2px">${plan.provider||"Unknown"}</div></div></div>
${cost}
<h3>Prospect Profile</h3><p class="tx">${a.prospectProfile}</p>
<h3>Call Opening — Postcard Bridge</h3><p class="hl">${a.postcardBridge}</p>
<h3>Lead With This Number</h3><div class="anb"><span class="anbig">${a.anchorNumber}</span><span class="anctx">${a.anchorContext}</span></div>
<h3>ERISA §404(a) — Personal Liability</h3><p class="erisa">${a.erisa404Line}</p>
<div class="two">
<div class="col"><h3>Call Sequence</h3><ul>${a.callArc.map((c,i)=>`<li><b>Step ${i+1}:</b> ${c}</li>`).join("")}</ul><h3>Talking Points</h3><ul>${a.talkingPoints.map(t=>`<li>${t}</li>`).join("")}</ul><h3>Questions to Ask</h3><ul>${a.questionsToAsk.map(q=>`<li>${q}</li>`).join("")}</ul></div>
<div class="col"><h3>Key Findings</h3><ul>${a.findings.map(f=>`<li><b>${f.anchor}</b> — ${f.title}</li>`).join("")}</ul><h3>Potential Objections</h3>${a.potentialObjections.map(o=>`<div class="oq">"${o.objection}"</div><div class="oa">${o.response}</div>`).join("")}</div>
</div>
${plan.notes?`<h3>Notes</h3><p class="tx">${plan.notes}</p>`:""}
<div class="foot"><span>${s.firm} — Internal Use Only</span><span>Generated ${new Date().toLocaleDateString()}</span></div>
</body></html>`;
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Badge({status}){const c=STATUSES[status]||STATUSES.new;return <span style={{display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:500,background:c.bg,color:c.color}}>{c.label}</span>;}

function Btn({children,onClick,variant="primary",small,disabled,icon,full}){
  const base={display:"inline-flex",alignItems:"center",gap:6,cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",fontWeight:500,border:"none",borderRadius:6,fontSize:small?11:13,padding:small?"4px 10px":"8px 16px",opacity:disabled?0.5:1,transition:"opacity 0.15s",width:full?"100%":undefined,justifyContent:full?"center":undefined};
  const v={primary:{...base,background:BLUE,color:"#fff"},secondary:{...base,background:FILL,color:INK,border:`1px solid ${RULE}`},ghost:{...base,background:"transparent",color:BODY},green:{...base,background:"#f0fdf4",color:GREEN,border:"1px solid #bbf7d0"}};
  return <button style={v[variant]||v.primary} onClick={onClick} disabled={disabled}>{icon}{children}</button>;
}

function Field({label,value,onChange,type="text",placeholder,half,third}){
  const flex=third?"0 0 calc(33% - 8px)":half?"0 0 calc(50% - 8px)":"1 0 100%";
  const lbl={display:"block",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4};
  const inp={width:"100%",padding:"7px 10px",border:`1px solid ${RULE}`,borderRadius:6,fontFamily:"inherit",fontSize:13,color:INK,background:"#fff",outline:"none"};
  return(
    <div style={{flex,minWidth:0}}>
      {label&&<label style={lbl}>{label}</label>}
      {type==="textarea"?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...inp,resize:"vertical",minHeight:70}}/>
      :type==="select"?<select value={value} onChange={e=>onChange(e.target.value)} style={inp}>{Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inp}/>}
    </div>
  );
}

function Card({children,style}){return <div style={{background:"#fff",border:`1px solid ${RULE}`,borderRadius:4,padding:18,...style}}>{children}</div>;}

function SectionHead({children,action}){
  return(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:INK,letterSpacing:".01em",margin:0}}>{children}</h3>
        {action&&<div style={{paddingTop:2}}>{action}</div>}
      </div>
      <div style={{width:24,height:2,background:BLUE,marginBottom:10}}></div>
    </div>
  );
}

function CopyBtn({text}){
  const [ok,setOk]=useState(false);
  const go=()=>navigator.clipboard.writeText(text).then(()=>{setOk(true);setTimeout(()=>setOk(false),2000);});
  return <Btn onClick={go} variant={ok?"green":"secondary"} small icon={ok?<Check size={11}/>:<Copy size={11}/>}>{ok?"Copied":"Copy"}</Btn>;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsView({settings,onSave}){
  const [s,setS]=useState(settings);
  const set=f=>v=>setS(p=>({...p,[f]:v}));
  return(
    <div>
      <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:INK,marginBottom:6}}>Settings</h2>
      <p style={{fontSize:13,color:MUTED,marginBottom:24}}>Matt's contact info populates all generated documents automatically.</p>
      <Card style={{maxWidth:580}}>
        <SectionHead>Contact Information</SectionHead>
        <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
          <Field label="Full Name"    value={s.name}     onChange={set("name")}     placeholder="Matt Hightower"              half/>
          <Field label="Title"        value={s.title}    onChange={set("title")}    placeholder="401(k) Plan Consultant"      half/>
          <Field label="Firm"         value={s.firm}     onChange={set("firm")}     placeholder="Momentum Wealth Management"/>
          <Field label="Phone"        value={s.phone}    onChange={v=>set("phone")(fmtPhoneInput(v))}    placeholder="(706) 555-0100"              half/>
          <Field label="Email"        value={s.email}    onChange={set("email")}    type="email" placeholder="matt@momentumwealth.us" half/>
        </div>
        <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}>
          <Btn onClick={()=>onSave(s)} icon={<Save size={13}/>}>Save Settings</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({plans,onSelect,onNew}){
  const total=plans.length,assets=plans.reduce((s,p)=>s+Number(p.assets||0),0);
  const active=plans.filter(p=>p.status==="in_progress").length;
  const closed=plans.filter(p=>p.status==="closed").length;

  const [filterTab,setFilterTab]=useState("active");
  const [sortBy,setSortBy]=useState("dateAdded");
  const [sortDir,setSortDir]=useState("desc");

  const lastActivity=p=>{
    const dates=[
      p.dateAdded,
      p.outreach?.postcardDate,
      p.outreach?.linkedInDate,
      p.outreach?.emailDate,
      p.outreach?.letterDate,
      ...(p.calls||[]).map(c=>c.date),
    ].filter(Boolean).sort().reverse();
    return dates[0]||p.dateAdded||"";
  };

  const filtered=plans.filter(p=>{
    if(filterTab==="active") return ["new","in_progress"].includes(p.status);
    if(filterTab==="won")    return p.status==="closed";
    if(filterTab==="lost")   return ["lost","no_response"].includes(p.status);
    return true;
  });

  const sorted=[...filtered].sort((a,b)=>{
    let av,bv;
    if(sortBy==="company")      {av=a.company?.toLowerCase()||"";bv=b.company?.toLowerCase()||"";}
    else if(sortBy==="assets")  {av=Number(a.assets||0);bv=Number(b.assets||0);}
    else if(sortBy==="participants"){av=Number(a.participants||0);bv=Number(b.participants||0);}
    else if(sortBy==="avgBalance"){av=Number(a.avgBalance||0);bv=Number(b.avgBalance||0);}
    else if(sortBy==="status")  {av=a.status||"";bv=b.status||"";}
    else                        {av=lastActivity(a);bv=lastActivity(b);}
    if(av<bv) return sortDir==="asc"?-1:1;
    if(av>bv) return sortDir==="asc"?1:-1;
    return 0;
  });

  const onSort=field=>{
    if(sortBy===field) setSortDir(d=>d==="asc"?"desc":"asc");
    else{setSortBy(field);setSortDir("desc");}
  };

  const SortTh=({field,children,right})=>{
    const active=sortBy===field;
    return(
      <th onClick={()=>onSort(field)} style={{padding:"10px 14px",textAlign:"left",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:active?BLUE:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}>
        {children}<span style={{display:"inline-block",width:10,marginLeft:2,opacity:active?1:0,fontSize:9}}>{sortDir==="asc"?"↑":"↓"}</span>
      </th>
    );
  };

  const tabs=[
    {k:"active",l:"Active",   count:plans.filter(p=>["new","in_progress"].includes(p.status)).length},
    {k:"won",   l:"Won",      count:plans.filter(p=>p.status==="closed").length},
    {k:"lost",  l:"Lost",     count:plans.filter(p=>["lost","no_response"].includes(p.status)).length},
  ];

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:INK,letterSpacing:-0.3}}>Pipeline</h2>
          <p style={{fontSize:13,color:MUTED,marginTop:2}}>Track outreach across {total} plan{total!==1?"s":""} · {fmtF(assets)} in assets under review</p>
        </div>
        <Btn onClick={onNew} icon={<Plus size={13}/>}>Add Plan</Btn>
      </div>

      {/* Stats row */}
      <div style={{display:"flex",gap:12,marginBottom:24}}>
        {[
          {label:"Total Plans",    val:total,       icon:<Building2 size={15} color={BLUE}/>},
          {label:"In Progress",    val:active,      icon:<BarChart3 size={15} color={BLUE}/>},
          {label:"Closed",         val:closed,      icon:<Check size={15} color={BLUE}/>},
          {label:"Assets Reviewed",val:fmtF(assets),icon:<DollarSign size={15} color={BLUE}/>},
        ].map(s=>(
          <div key={s.label} style={{flex:1,background:"#fff",border:`1px solid ${RULE}`,borderLeft:`3px solid ${BLUE}`,borderRadius:4,padding:"20px 18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
              {s.icon}
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em"}}>{s.label}</span>
            </div>
            <div style={{fontFamily:"'IBM Plex Sans'",fontSize:22,fontWeight:600,color:INK,fontFeatureSettings:'"tnum" 1',letterSpacing:-.5,lineHeight:1}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:`1px solid ${RULE}`}}>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setFilterTab(t.k)}
            style={{background:"none",border:"none",borderBottom:`2px solid ${filterTab===t.k?BLUE:"transparent"}`,cursor:"pointer",padding:"8px 18px",fontFamily:"inherit",fontSize:13,fontWeight:filterTab===t.k?600:300,color:filterTab===t.k?BLUE:MUTED,marginBottom:-1,display:"flex",alignItems:"center",gap:7,transition:"all 0.15s"}}>
            {t.l}
            <span style={{fontSize:11,fontWeight:600,background:filterTab===t.k?BLUE:RULE,color:filterTab===t.k?"#fff":MUTED,borderRadius:999,padding:"1px 7px",lineHeight:"18px"}}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {sorted.length===0?(
        <div style={{textAlign:"center",padding:"56px 0",color:MUTED,border:`1px solid ${RULE}`,borderRadius:4,background:"#fff"}}>
          <BarChart3 size={28} color={RULE} style={{margin:"0 auto 12px"}}/>
          <p style={{fontSize:14,fontWeight:500,color:BODY,marginBottom:6}}>
            {filterTab==="active"?"No active plans yet.":filterTab==="won"?"No closed plans yet.":"No lost plans yet."}
          </p>
          <p style={{fontSize:12}}>
            {filterTab==="active"?<span>Use <strong>Prospect</strong> to find plans or <strong>Add Plan</strong> to add one manually.</span>:"Plans move here when you update their status."}
          </p>
        </div>
      ):(
        <div style={{background:"#fff",border:`1px solid ${RULE}`,borderRadius:4,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:FILL,borderBottom:`1px solid ${RULE}`}}>
                <SortTh field="company">Company</SortTh>
                <th style={{padding:"10px 14px",textAlign:"left",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em"}}>Status</th>
                <SortTh field="assets">Assets</SortTh>
                <SortTh field="participants">Participants</SortTh>
                <SortTh field="avgBalance">Avg Balance</SortTh>
                <SortTh field="dateAdded">Last Activity</SortTh>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p,i)=>{
                const la=lastActivity(p);
                return(
                  <tr key={p.id} onClick={()=>onSelect(p)}
                    style={{borderBottom:i<sorted.length-1?`1px solid ${RULE}`:"none",cursor:"pointer",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=FILL}
                    onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                    <td style={{padding:"12px 14px"}}>
                      <div style={{fontWeight:500,color:INK,fontSize:13}}>{p.company}</div>
                      {p.ein&&<div style={{fontSize:11,color:MUTED,marginTop:1}}>EIN: {p.ein}</div>}
                    </td>
                    <td style={{padding:"12px 14px"}}><Badge status={p.status}/></td>
                    <td style={{padding:"12px 14px",fontFamily:"'IBM Plex Sans'",fontSize:13,fontWeight:500,color:INK,fontFeatureSettings:'"tnum" 1',whiteSpace:"nowrap"}}>{p.assets?fmtF(Number(p.assets)):"—"}</td>
                    <td style={{padding:"12px 14px",fontFamily:"'IBM Plex Sans'",fontSize:13,color:INK}}>{p.participants?Number(p.participants).toLocaleString():"—"}</td>
                    <td style={{padding:"12px 14px",fontFamily:"'IBM Plex Sans'",fontSize:13,color:INK,whiteSpace:"nowrap"}}>{p.avgBalance?fmtF(Number(p.avgBalance)):"—"}</td>
                    <td style={{padding:"12px 14px",fontSize:12,color:MUTED,whiteSpace:"nowrap"}}>{la?fmtDs(la):"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function PlanDetail({plan,onBack,onUpdate,onEdit,settings}){
  const [generating,setGenerating]=useState(false);
  const [genErr,setGenErr]=useState(null);
  const [notes,setNotes]=useState(plan.notes||"");
  const [notesDirty,setNotesDirty]=useState(false);
  const [showCallForm,setShowCallForm]=useState(false);
  const [expandedCall,setExpandedCall]=useState(null);
  const [showStatusPicker,setShowStatusPicker]=useState(false);

  const avg=Number(plan.avgBalance)||(plan.assets&&plan.participants?Math.round(Number(plan.assets)/Number(plan.participants)):null);
  const a=plan.analysis;

  const generate=async()=>{
    setGenerating(true);setGenErr(null);
    try{
      const r=await analyzePlan(plan,settings);
      onUpdate({...plan,analysis:{...r,internalHtml:buildInternalHTML(plan,r,settings),clientHtml:buildClientHTML(plan,r,settings)}});
    }catch{setGenErr("Generation failed. Check your connection and try again.");}
    finally{setGenerating(false);}
  };

  const openDoc=type=>{const h=type==="internal"?a?.internalHtml:a?.clientHtml;if(!h)return;const w=window.open("","_blank");if(w){w.document.write(h);w.document.close();}};

  const saveNotes=()=>{onUpdate({...plan,notes});setNotesDirty(false);};

  const saveCall=c=>{
    const calls=[...(plan.calls||[]),c];
    const nextStatus=plan.status==="new"?"in_progress":plan.status;
    onUpdate({...plan,calls,status:nextStatus});
    setShowCallForm(false);
  };

  const mark=(field,dateField)=>{
    const today=new Date().toISOString().split("T")[0];
    const nextStatus=plan.status==="new"?"in_progress":plan.status;
    onUpdate({...plan,status:nextStatus,outreach:{...plan.outreach,[field]:true,[dateField]:plan.outreach[dateField]||today}});
  };

  const liMsg=buildLinkedIn(plan);

  const Step=({num,label,done,date,onMark,copyContent,extra})=>(
    <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:`1px solid ${RULE}`}}>
      <div style={{width:20,height:20,borderRadius:"50%",background:done?BLUE:FILL,border:`1.5px solid ${done?BLUE:RULE}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
        {done?<Check size={11} color="#fff"/>:<span style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,lineHeight:1,display:"block"}}>{num}</span>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:13,fontWeight:done?300:500,color:done?MUTED:INK,textDecoration:done?"line-through":"none"}}>{label}</span>
          {done&&date&&<span style={{fontSize:11,color:MUTED}}>{fmtDs(date)}</span>}
        </div>
        {extra}
      </div>
      <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center"}}>
        {copyContent&&<CopyBtn text={copyContent}/>}
        {!done&&onMark&&<Btn onClick={onMark} small variant="secondary" icon={<Check size={10}/>}>Done</Btn>}
      </div>
    </div>
  );

  return(
    <div>
      {/* Back */}
      <button onClick={onBack}
        style={{background:"#fff",border:`1px solid ${RULE}`,borderRadius:999,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4,color:BODY,fontSize:12,marginBottom:20,padding:"5px 14px 5px 9px",fontFamily:"inherit",fontWeight:500,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=BLUE;e.currentTarget.style.color=BLUE;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=RULE;e.currentTarget.style.color=BODY;}}>
        <ChevronLeft size={13}/> Pipeline
      </button>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          {a&&<span style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.14em",color:MUTED,display:"block",marginBottom:4}}>{a.planType==="fee_benchmark"?"Fee Benchmark":"Admin Complexity"}</span>}
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:700,color:INK,letterSpacing:-.3,marginBottom:6,lineHeight:1.1}}>{plan.company}</h2>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{position:"relative"}}>
              <div onClick={()=>setShowStatusPicker(!showStatusPicker)} style={{cursor:"pointer",userSelect:"none"}}>
                <Badge status={plan.status}/>
              </div>
              {showStatusPicker&&(
                <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,background:"#fff",border:`1px solid ${RULE}`,borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.10)",zIndex:100,minWidth:180,overflow:"hidden"}}>
                  <div style={{padding:"8px 14px 4px",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.12em"}}>Mark outcome</div>
                  {OUTCOME_STATUSES.map(k=>{const v=STATUSES[k];return(
                    <div key={k} onClick={()=>{onUpdate({...plan,status:k});setShowStatusPicker(false);}}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",cursor:"pointer",background:plan.status===k?FILL:"#fff",borderBottom:`1px solid ${RULE}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=FILL}
                      onMouseLeave={e=>e.currentTarget.style.background=plan.status===k?FILL:"#fff"}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:v.color,flexShrink:0}}/>
                      <span style={{fontSize:12,fontWeight:plan.status===k?600:400,color:INK}}>{v.label}</span>
                    </div>
                  );})}
                </div>
              )}
            </div>
            {plan.ein&&<span style={{fontSize:11,color:MUTED}}>EIN: {plan.ein}</span>}
            {plan.planYear&&<span style={{fontSize:11,color:MUTED}}>Plan Year: {plan.planYear}</span>}
          </div>
        </div>
        <Btn onClick={onEdit} variant="secondary" small icon={<Edit3 size={12}/>}>Edit</Btn>
      </div>

      {/* Stats row */}
      <div style={{display:"flex",gap:0,marginBottom:22,paddingBottom:18,borderBottom:`1px solid ${RULE}`}}>
        {[
          {label:"Plan Assets",    val:plan.assets?fmtF(Number(plan.assets)):"—"},
          {label:"Participants",   val:plan.participants?Number(plan.participants).toLocaleString():"—"},
          {label:"Avg. Balance",   val:avg?fmtF(avg):"—"},
          {label:"Provider",       val:plan.provider||"—"},
        ].map((m,i)=>(
          <div key={m.label} style={{flex:1,paddingLeft:i===0?0:18,paddingRight:18,borderLeft:i===0?"none":`1px solid ${RULE}`}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>{m.label}</div>
            <div style={{fontFamily:"'IBM Plex Sans'",fontSize:15,fontWeight:600,color:INK,fontFeatureSettings:'"tnum" 1',letterSpacing:-.3,whiteSpace:"nowrap"}}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Fee benchmark metrics — only when analysis exists */}
      {a&&a.planType==="fee_benchmark"&&(
        <div style={{display:"flex",gap:0,marginBottom:20,border:`1px solid ${RULE}`,borderRadius:4,overflow:"hidden"}}>
          <div style={{flex:1,padding:"18px 20px",borderRight:`1px solid ${RULE}`}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:8}}>Current plan</div>
            <div style={{fontFamily:"'IBM Plex Sans'",fontSize:30,fontWeight:600,color:INK,letterSpacing:"-0.025em",fontFeatureSettings:'"tnum" 1',lineHeight:1,marginBottom:5,whiteSpace:"nowrap"}}>{fmtPct(a.keyMetrics.estimatedTotalCostPct)}</div>
            <div style={{fontSize:11,color:MUTED}}>Estimated all-in cost</div>
          </div>
          <div style={{flex:1,padding:"18px 20px",borderRight:`1px solid ${RULE}`}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:8}}>Median comparable</div>
            <div style={{fontFamily:"'IBM Plex Sans'",fontSize:30,fontWeight:600,color:INK,letterSpacing:"-0.025em",fontFeatureSettings:'"tnum" 1',lineHeight:1,marginBottom:5,whiteSpace:"nowrap"}}>{fmtPct(a.keyMetrics.medianComparablePct)}</div>
            <div style={{fontSize:11,color:MUTED}}>401k Averages Book</div>
          </div>
          <div style={{flex:1.2,padding:"18px 20px",background:"#eaf5fb",borderLeft:`4px solid ${BLUE}`}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:BLUE,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:8}}>Difference</div>
            <div style={{fontFamily:"'IBM Plex Sans'",fontSize:30,fontWeight:600,color:INK,letterSpacing:"-0.025em",fontFeatureSettings:'"tnum" 1',lineHeight:1,marginBottom:5,whiteSpace:"nowrap"}}>{fmtF(a.keyMetrics.excessCostDollar)}/yr</div>
            <div style={{fontSize:11,color:BODY}}>From participant accounts — not the budget</div>
          </div>
        </div>
      )}

      {/* Documents — full width */}
      <Card style={{marginBottom:20}}>
        <SectionHead action={
          <Btn onClick={generate} disabled={generating} small
            icon={generating?<Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/>:<FileText size={11}/>}>
            {generating?"Analyzing...":a?"Regenerate":"Generate Documents"}
          </Btn>
        }>Documents</SectionHead>

        {genErr&&<div style={{display:"flex",gap:6,alignItems:"center",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:4,padding:"7px 10px",fontSize:11,color:RED,marginBottom:12}}><AlertCircle size={11}/>{genErr}</div>}

        {!a?(
          <div style={{textAlign:"center",padding:"20px 0",color:MUTED}}>
            <FileText size={22} color={RULE} style={{margin:"0 auto 8px"}}/>
            <p style={{fontSize:13}}>Generate the internal brief and client letter for this plan.</p>
          </div>
        ):(
          <div>
            <div style={{display:"flex",gap:12,marginBottom:10}}>
              {[
                {key:"internal",label:"Internal Brief",   desc:"Call prep · talking points · strategy",  accent:"#1a8bbf",border:"#1a8bbf"},
                {key:"client",  label:"Client Letter",    desc:"Landscape · print-ready · mail-ready",   accent:BLUE,border:BLUE},
              ].map(d=>(
                <div key={d.key} onClick={()=>openDoc(d.key)}
                  style={{flex:1,border:`1px solid ${RULE}`,borderTop:`3px solid ${d.accent}`,borderRadius:4,padding:"14px 16px",cursor:"pointer",transition:"border-color 0.15s,box-shadow 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 2px 8px rgba(0,0,0,0.08)`;}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <FileText size={13} color={d.accent}/>
                    <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:INK,fontSize:13}}>{d.label}</span>
                  </div>
                  <p style={{fontSize:11,color:MUTED,marginBottom:10}}>{d.desc}</p>
                  <div style={{display:"flex",alignItems:"center",gap:3,color:d.accent,fontSize:11,fontWeight:500}}>
                    <ExternalLink size={10}/> Open to print
                  </div>
                </div>
              ))}
            </div>
            <p style={{fontSize:11,color:MUTED,fontStyle:"italic"}}>{a.modelRationale}</p>
          </div>
        )}
      </Card>

      {/* Two-column main */}
      <div style={{display:"flex",gap:20}}>

        {/* Left: Outreach + Calls */}
        <div style={{flex:"1 1 0",minWidth:0,display:"flex",flexDirection:"column",gap:16}}>

          <Card>
            <SectionHead>Outreach Sequence</SectionHead>
            <Step num={1} label="Postcard mailed" done={plan.outreach?.postcardSent} date={plan.outreach?.postcardDate} onMark={()=>mark("postcardSent","postcardDate")}/>
            <Step num={2} label="LinkedIn connection request" done={plan.outreach?.linkedInSent} date={plan.outreach?.linkedInDate} onMark={()=>mark("linkedInSent","linkedInDate")} copyContent={liMsg}
              extra={
                <div style={{marginTop:7,background:FILL,borderRadius:4,padding:"8px 10px"}}>
                  <p style={{fontSize:11,color:BODY,lineHeight:1.6,marginBottom:4}}>{liMsg}</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10,color:liMsg.length>280?RED:MUTED}}>{liMsg.length}/300</span>
                    {plan.contactLinkedIn&&<a href={`https://${plan.contactLinkedIn.replace(/^https?:\/\//,"")}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:BLUE,display:"flex",alignItems:"center",gap:3,textDecoration:"none"}}><ExternalLink size={10}/>Open LinkedIn</a>}
                  </div>
                </div>
              }/>
            <Step num={3} label={`Phone call${plan.calls?.length?" ("+plan.calls.length+" logged)":""}`} done={(plan.calls?.length||0)>0} date={plan.calls?.[0]?.date}
              extra={<div style={{marginTop:5}}><Btn onClick={()=>setShowCallForm(true)} small variant="secondary" icon={<Phone size={10}/>}>{plan.calls?.length?"Log Another":"Log Call"}</Btn></div>}/>
            <Step num={4} label="Email sent" done={plan.outreach?.emailSent} date={plan.outreach?.emailDate} onMark={()=>mark("emailSent","emailDate")}/>
            <div style={{borderBottom:"none"}}><Step num={5} label="Letter mailed" done={plan.outreach?.letterSent} date={plan.outreach?.letterDate} onMark={()=>mark("letterSent","letterDate")}/></div>
          </Card>

          <Card>
            <SectionHead action={<Btn onClick={()=>setShowCallForm(true)} small variant="secondary" icon={<Plus size={11}/>}>Log Call</Btn>}>Call Log</SectionHead>
            {showCallForm&&<CallLogger plan={plan} onSave={saveCall} onCancel={()=>setShowCallForm(false)}/>}
            {(!plan.calls||plan.calls.length===0)&&!showCallForm
              ?<p style={{fontSize:12,color:MUTED,textAlign:"center",padding:"16px 0"}}>No calls logged yet.</p>
              :<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[...(plan.calls||[])].reverse().map(c=>{
                  const oc=CALL_OUTCOMES[c.outcome];
                  const open=expandedCall===c.id;
                  return(
                    <div key={c.id} style={{border:`1px solid ${RULE}`,borderRadius:4,overflow:"hidden"}}>
                      <div onClick={()=>setExpandedCall(open?null:c.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer",background:open?FILL:"#fff"}}>
                        <Phone size={13} color={MUTED}/>
                        <span style={{fontSize:13,fontWeight:500,color:INK,flex:1}}>{fmtD(c.date)}</span>
                        {c.duration&&<span style={{fontSize:11,color:MUTED}}>{c.duration}</span>}
                        <span style={{fontSize:11,fontWeight:500,color:oc?.color||MUTED}}>{oc?.label||c.outcome}</span>
                        {c.summary&&<span style={{fontSize:11,fontWeight:500,color:INTEREST[c.summary.interestLevel]?.color||MUTED,background:FILL,padding:"1px 8px",borderRadius:10}}>{INTEREST[c.summary.interestLevel]?.label}</span>}
                        {open?<ChevronUp size={13} color={MUTED}/>:<ChevronDown size={13} color={MUTED}/>}
                      </div>
                      {open&&(
                        <div style={{padding:"10px 12px",borderTop:`1px solid ${RULE}`,background:"#fff"}}>
                          {c.notes&&<p style={{fontSize:12,color:BODY,lineHeight:1.65,marginBottom:8}}>{c.notes}</p>}
                          {c.summary&&(
                            <div style={{background:FILL,borderRadius:4,padding:10}}>
                              <div style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:BLUE,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7}}>AI Summary</div>
                              <p style={{fontSize:12,color:BODY,lineHeight:1.65,marginBottom:8}}>{c.summary.callSummary}</p>
                              {c.summary.keyPoints?.length>0&&<div style={{marginBottom:6}}>{c.summary.keyPoints.map((p,i)=><div key={i} style={{fontSize:11,color:BODY,lineHeight:1.6,paddingLeft:10,borderLeft:`2px solid ${RULE}`,marginBottom:2}}>{p}</div>)}</div>}
                              {c.summary.nextSteps&&c.summary.nextSteps!=="none agreed"&&<div style={{fontSize:12,color:INK,fontWeight:500}}>Next step: <span style={{fontWeight:400,color:BODY}}>{c.summary.nextSteps}</span></div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            }
          </Card>
        </div>

        {/* Right: Contact + Notes */}
        <div style={{width:260,flexShrink:0,display:"flex",flexDirection:"column",gap:16}}>

          <Card>
            <SectionHead>Contact</SectionHead>
            {plan.contactName?(
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:INK,marginBottom:2}}>{plan.contactName}</div>
                {plan.contactTitle&&<div style={{fontSize:12,color:MUTED,marginBottom:12}}>{plan.contactTitle}</div>}
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {plan.contactEmail&&<a href={`mailto:${plan.contactEmail}`} style={{display:"flex",alignItems:"center",gap:7,color:BODY,fontSize:12,textDecoration:"none"}}><Mail size={12} color={MUTED}/>{plan.contactEmail}</a>}
                  {plan.contactPhone&&<a href={`tel:${plan.contactPhone}`} style={{display:"flex",alignItems:"center",gap:7,color:BODY,fontSize:12,textDecoration:"none"}}><Phone size={12} color={MUTED}/>{fmtPhone(plan.contactPhone)}</a>}
                  {plan.contactLinkedIn&&<a href={`https://${plan.contactLinkedIn.replace(/^https?:\/\//,"")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:7,color:BLUE,fontSize:12,textDecoration:"none"}}><ExternalLink size={12}/>LinkedIn</a>}
                </div>
              </div>
            ):<p style={{fontSize:12,color:MUTED}}>No contact added yet.</p>}
            {plan.address&&<a href={`https://maps.google.com/?q=${encodeURIComponent(plan.address)}`} target="_blank" rel="noreferrer" style={{display:"block",marginTop:10,fontSize:11,color:BLUE,lineHeight:1.5,textDecoration:"none"}}>{plan.address}</a>}
          </Card>

          <Card>
            <SectionHead>Notes</SectionHead>
            <textarea
              value={notes}
              onChange={e=>{setNotes(e.target.value);setNotesDirty(e.target.value!==plan.notes);}}
              placeholder="Add notes about this prospect..."
              style={{width:"100%",minHeight:100,padding:"8px 10px",border:`1px solid ${RULE}`,borderRadius:4,fontFamily:"inherit",fontSize:12,color:INK,resize:"vertical",outline:"none",lineHeight:1.6}}
            />
            {notesDirty&&(
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                <Btn onClick={saveNotes} small icon={<Save size={10}/>}>Save</Btn>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}


function PlanForm({initial,onSave,onCancel,onDelete}){
  const isNew=!initial?.id;
  const [p,setP]=useState(initial||{...BLANK_PLAN,id:uid(),dateAdded:new Date().toISOString().split("T")[0]});
  const [confirmDelete,setConfirmDelete]=useState(false);
  const set=f=>v=>setP(prev=>({...prev,[f]:v}));

  const save=()=>{
    if(!p.company.trim()) return;
    onSave({...p,status:p.status||"new"});
  };

  return(
    <div style={{maxWidth:680}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:INK,letterSpacing:-0.3}}>{isNew?"Add Plan":"Edit Plan"}</h2>
          {!isNew&&<p style={{fontSize:13,color:MUTED,marginTop:2}}>{initial.company}</p>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
          <Btn onClick={save} icon={<Save size={13}/>}>Save Plan</Btn>
        </div>
      </div>

      <Card style={{marginBottom:16}}>
        <SectionHead>Plan Information</SectionHead>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Company name" value={p.company} onChange={set("company")} placeholder="Columbus Cardiology Associates, P.C."/></div>
          <Field label="EIN"        value={p.ein}          onChange={set("ein")}          placeholder="58-1234567"/>
          <Field label="Plan year"  value={p.planYear}     onChange={set("planYear")}     placeholder="2024"/>
          <Field label="Plan assets" value={p.assets}      onChange={set("assets")}       placeholder="8030305"/>
          <Field label="Participants" value={p.participants} onChange={set("participants")} placeholder="94"/>
          <Field label="Avg balance" value={p.avgBalance}  onChange={set("avgBalance")}   placeholder="85429"/>
          <Field label="Provider"   value={p.provider}     onChange={set("provider")}     placeholder="Nationwide"/>
        </div>
      </Card>

      <Card style={{marginBottom:16}}>
        <SectionHead>Contact</SectionHead>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Contact name"  value={p.contactName}  onChange={set("contactName")}  placeholder="Sarah Mitchell"/>
          <Field label="Title"         value={p.contactTitle} onChange={set("contactTitle")} placeholder="Practice Administrator"/>
          <Field label="Email"         value={p.contactEmail} onChange={set("contactEmail")} placeholder="sarah@example.com"/>
          <Field label="Phone"         value={p.contactPhone} onChange={v=>set("contactPhone")(fmtPhoneInput(v))} placeholder="(706) 555-0100"/>
          <Field label="LinkedIn"      value={p.contactLinkedIn} onChange={set("contactLinkedIn")} placeholder="linkedin.com/in/sarah-mitchell"/>
          <div style={{gridColumn:"1/-1"}}><Field label="Address" value={p.address} onChange={set("address")} placeholder="1800 Whittlesey Road, Columbus, GA 31904"/></div>
        </div>
      </Card>

      <Card>
        <SectionHead>Notes</SectionHead>
        <textarea value={p.notes} onChange={e=>set("notes")(e.target.value)}
          placeholder="Any context about this prospect..."
          style={{width:"100%",minHeight:80,padding:"8px 10px",border:`1px solid ${RULE}`,borderRadius:4,fontFamily:"inherit",fontSize:13,color:INK,resize:"vertical",outline:"none",lineHeight:1.6}}/>
      </Card>

      {!isNew&&onDelete&&(
        <div style={{marginTop:16}}>
          {!confirmDelete?(
            <button onClick={()=>setConfirmDelete(true)}
              style={{width:"100%",padding:"10px 16px",background:FILL,border:`1px solid ${RULE}`,borderRadius:4,cursor:"pointer",fontFamily:"inherit",fontSize:13,color:MUTED,fontWeight:400,textAlign:"center"}}>
              Delete this plan
            </button>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:12,background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:4,padding:"10px 14px"}}>
              <span style={{fontSize:12,color:RED,flex:1}}>Delete this plan? This cannot be undone.</span>
              <Btn onClick={onDelete} variant="danger" small>Delete</Btn>
              <Btn onClick={()=>setConfirmDelete(false)} variant="ghost" small>Cancel</Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Prospect ─────────────────────────────────────────────────────────────────

const DEFAULT_TARGETS=[
  {id:"t1",type:"city",value:"Columbus",state:"GA"},
  {id:"t2",type:"zip",value:"31901"},
  {id:"t3",type:"zip",value:"31903"},
  {id:"t4",type:"zip",value:"31904"},
  {id:"t5",type:"zip",value:"31906"},
  {id:"t6",type:"zip",value:"31907"},
  {id:"t7",type:"city",value:"Phenix City",state:"AL"},
  {id:"t8",type:"zip",value:"36867"},
];

const MOCK_RESULTS=[
  {ein:"58-2345001",company:"West Georgia Orthopedic Group, P.C.",assets:4850000,participants:62,avgBalance:78226,planYear:2024,provider:"Fidelity",address:"7015 Moon Rd",city:"Columbus",state:"GA",zip:"31909",adminName:"Dr. James Whitfield",adminPhone:"(706) 324-8800"},
  {ein:"58-2345002",company:"Pediatric Associates of Columbus, LLC",assets:2100000,participants:38,avgBalance:55263,planYear:2024,provider:"Nationwide",address:"1520 Manchester Expy",city:"Columbus",state:"GA",zip:"31904",adminName:"Renee Calloway",adminPhone:"(706) 571-0220"},
  {ein:"58-2345003",company:"Columbus Dental Partners, P.C.",assets:1680000,participants:24,avgBalance:70000,planYear:2024,provider:"Principal",address:"5601 Whitesville Rd",city:"Columbus",state:"GA",zip:"31904",adminName:"Columbus Dental Partners, P.C.",adminPhone:"(706) 660-1100"},
  {ein:"58-2345004",company:"Peachtree Dermatology & Aesthetics",assets:3200000,participants:45,avgBalance:71111,planYear:2024,provider:"Transamerica",address:"1800 Talbotton Rd",city:"Columbus",state:"GA",zip:"31901",adminName:"Angela Merritt",adminPhone:"(706) 507-3400"},
  {ein:"58-2345005",company:"River Valley Internal Medicine Group",assets:5800000,participants:78,avgBalance:74359,planYear:2024,provider:"Empower",address:"710 Center St",city:"Columbus",state:"GA",zip:"31901",adminName:"River Valley Internal Medicine Group",adminPhone:"(706) 494-2800"},
  {ein:"58-2345006",company:"Columbus Eye Associates, P.C.",assets:2750000,participants:41,avgBalance:67073,planYear:2024,provider:"MassMutual",address:"3000 Gentian Blvd",city:"Columbus",state:"GA",zip:"31907",adminName:"Dr. Patricia Nguyen",adminPhone:"(706) 324-2020"},
  {ein:"58-2345007",company:"Muscogee Anesthesia Associates",assets:6100000,participants:52,avgBalance:117308,planYear:2024,provider:"John Hancock",address:"710 Center St Ste 200",city:"Columbus",state:"GA",zip:"31901",adminName:"Muscogee Anesthesia Associates",adminPhone:"(706) 660-6200"},
  {ein:"58-2345008",company:"Bradley Engineering Solutions, Inc.",assets:3450000,participants:67,avgBalance:51493,planYear:2024,provider:"Voya",address:"233 12th St",city:"Columbus",state:"GA",zip:"31901",adminName:"Thomas Bradley",adminPhone:"(706) 221-3300"},
  {ein:"58-2345009",company:"Phenix City Surgical Center, LLC",assets:2900000,participants:44,avgBalance:65909,planYear:2024,provider:"Nationwide",address:"2000 Pepperell Pkwy",city:"Phenix City",state:"AL",zip:"36867",adminName:"Phenix City Surgical Center, LLC",adminPhone:"(334) 298-7700"},
  {ein:"58-2345010",company:"Columbus Accounting & Tax Group",assets:1200000,participants:18,avgBalance:66667,planYear:2024,provider:"Principal",address:"1148 Broadway",city:"Columbus",state:"GA",zip:"31901",adminName:"Howard Finch",adminPhone:"(706) 596-0400"},
  {ein:"58-2345011",company:"Brookstone Senior Living, LLC",assets:1850000,participants:312,avgBalance:5929,planYear:2024,provider:"Paychex",address:"7100 Macon Rd",city:"Columbus",state:"GA",zip:"31909",adminName:"Brookstone Senior Living, LLC",adminPhone:"(706) 568-4400"},
  {ein:"58-2345012",company:"Columbus Regional Healthcare System",assets:8900000,participants:2840,avgBalance:3134,planYear:2024,provider:"Fidelity",address:"710 Center St",city:"Columbus",state:"GA",zip:"31901",adminName:"Columbus Regional Healthcare System",adminPhone:"(706) 494-4262"},
  {ein:"58-2345013",company:"Chattahoochee Valley Hospitality Group",assets:920000,participants:287,avgBalance:3206,planYear:2024,provider:"ADP",address:"800 Front Ave",city:"Columbus",state:"GA",zip:"31901",adminName:"Chattahoochee Valley Hospitality Group",adminPhone:"(706) 324-1800"},
  {ein:"58-2345014",company:"Golden Park Properties & Management",assets:680000,participants:198,avgBalance:3434,planYear:2024,provider:"Paychex",address:"100 4th St",city:"Columbus",state:"GA",zip:"31901",adminName:"Marcus Golden",adminPhone:"(706) 689-2200"},
  {ein:"58-2345015",company:"Phenix City School District",assets:4200000,participants:1840,avgBalance:2283,planYear:2024,provider:"TIAA",address:"1212 Dobbs Ave",city:"Phenix City",state:"AL",zip:"36867",adminName:"Phenix City School District",adminPhone:"(334) 298-0152"},
  {ein:"58-2345016",company:"Valley National Security Services",assets:740000,participants:334,avgBalance:2216,planYear:2024,provider:"ADP",address:"3601 Macon Rd",city:"Columbus",state:"GA",zip:"31907",adminName:"Valley National Security Services",adminPhone:"(706) 562-9900"},
  {ein:"58-2345017",company:"Columbus Marriott, Inc.",assets:560000,participants:201,avgBalance:2786,planYear:2024,provider:"Empower",address:"800 Front Ave",city:"Columbus",state:"GA",zip:"31901",adminName:"Columbus Marriott, Inc.",adminPhone:"(706) 324-1800"},
  {ein:"58-2345018",company:"Comfort Systems Southeast, LLC",assets:1100000,participants:423,avgBalance:2601,planYear:2024,provider:"ADP",address:"5555 Buena Vista Rd",city:"Columbus",state:"GA",zip:"31907",adminName:"Comfort Systems Southeast, LLC",adminPhone:"(706) 327-5500"},
  {ein:"58-2345019",company:"Synovus Mortgage Corp",assets:12400000,participants:187,avgBalance:66310,planYear:2024,provider:"Vanguard",address:"1111 Bay Ave",city:"Columbus",state:"GA",zip:"31901",adminName:"Synovus Mortgage Corp",adminPhone:"(706) 649-2311"},
  {ein:"58-2345020",company:"W.C. Bradley Co. Affiliates",assets:22000000,participants:284,avgBalance:77465,planYear:2024,provider:"Fidelity",address:"1017 Front Ave",city:"Columbus",state:"GA",zip:"31901",adminName:"W.C. Bradley Co. Affiliates",adminPhone:"(706) 571-6000"},
];

async function searchEFAST2(targets){
  const res=await fetch("/api/efast2",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({targets})});
  if(!res.ok) throw new Error("Search failed");
  return res.json();
}

function getModel(r){
  const avg=r.avgBalance||Math.round(r.assets/r.participants);
  return r.participants<2000&&avg>15000?"fee_benchmark":"admin_complexity";
}

function ProspectTab({plans,onAddPlans,targets,onTargetsChange,sizeFilter,onSizeFilterChange,results,onResultsChange}){
  const [addInput,setAddInput]=useState({type:"zip",value:"",state:""});
  const [showAddForm,setShowAddForm]=useState(false);
  const [searching,setSearching]=useState(false);
  const [selected,setSelected]=useState(new Set());
  const [sortBy,setSortBy]=useState("assets");
  const [sortDir,setSortDir]=useState("desc");
  const setTargets=onTargetsChange;
  const setSizeFilter=onSizeFilterChange;

  const existingEINs=new Set(plans.map(p=>p.ein).filter(Boolean));

  const doSearch=async()=>{
    setSearching(true);onResultsChange(null);setSelected(new Set());
    try{const data=await searchEFAST2(targets);onResultsChange(data);}
    finally{setSearching(false);}
  };

  const sortedResults=[...(results||[])].sort((a,b)=>{
    let av,bv;
    if(sortBy==="company"){av=(a.company||"").toLowerCase();bv=(b.company||"").toLowerCase();}
    else if(sortBy==="participants"){av=Number(a.participants||0);bv=Number(b.participants||0);}
    else if(sortBy==="avgBalance"){av=Number(a.avgBalance||0);bv=Number(b.avgBalance||0);}
    else{av=Number(a.assets||0);bv=Number(b.assets||0);}
    if(av<bv)return sortDir==="asc"?-1:1;
    if(av>bv)return sortDir==="asc"?1:-1;
    return 0;
  });

  const filtered=sortedResults.filter(r=>{
    if(sizeFilter==="small") return r.assets>=1e6&&r.assets<5e6;
    if(sizeFilter==="mid")   return r.assets>=5e6&&r.assets<20e6;
    if(sizeFilter==="large") return r.assets>=20e6;
    return true;
  });

  const onSort=field=>{
    if(sortBy===field)setSortDir(d=>d==="asc"?"desc":"asc");
    else{setSortBy(field);setSortDir("desc");}
  };

  const ProspectSortTh=({field,children})=>{
    const active=sortBy===field;
    return(
      <th onClick={()=>onSort(field)} style={{padding:"10px 14px 10px 0",textAlign:"left",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:active?BLUE:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}>
        {children}<span style={{display:"inline-block",width:10,marginLeft:2,opacity:active?1:0,fontSize:9}}>{sortDir==="asc"?"↑":"↓"}</span>
      </th>
    );
  };

  const available=filtered.filter(r=>!existingEINs.has(r.ein));
  const allSelected=available.length>0&&selected.size===available.length;

  const toggleSelect=ein=>{
    const next=new Set(selected);
    if(next.has(ein))next.delete(ein);else next.add(ein);
    setSelected(next);
  };

  const toggleAll=()=>setSelected(allSelected?new Set():new Set(available.map(r=>r.ein)));

  const addToPipeline=()=>{
    const toAdd=filtered.filter(r=>selected.has(r.ein)).map(r=>({
      id:uid(),company:r.company,ein:r.ein,
      assets:String(r.assets),participants:String(r.participants),avgBalance:String(r.avgBalance),
      planYear:String(r.planYear),provider:r.provider||"",
      contactName:r.adminName||"",
      contactTitle:r.adminName&&r.adminName!==r.company?"Plan Administrator":"",
      contactEmail:"",contactPhone:r.adminPhone||"",contactLinkedIn:"",
      address:`${r.address}, ${r.city}, ${r.state} ${r.zip}`,
      status:"new",notes:"",dateAdded:new Date().toISOString().split("T")[0],
      outreach:{postcardSent:false,postcardDate:"",linkedInSent:false,linkedInDate:"",emailSent:false,emailDate:"",emailVariant:"A",letterSent:false,letterDate:"",replied:false},
      calls:[],analysis:null,
    }));
    onAddPlans(toAdd);
    setSelected(new Set());
  };

  const removeTarget=id=>setTargets(prev=>prev.filter(t=>t.id!==id));

  const addTarget=()=>{
    if(!addInput.value.trim())return;
    setTargets(prev=>[...prev,{id:uid(),type:addInput.type,value:addInput.value.trim().toUpperCase(),state:addInput.state.trim().toUpperCase()}]);
    setAddInput({type:"zip",value:"",state:""});
    setShowAddForm(false);
  };

  const inp={padding:"6px 10px",border:`1px solid ${RULE}`,borderRadius:4,fontFamily:"inherit",fontSize:12,color:INK,background:"#fff",outline:"none"};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:INK,letterSpacing:-0.3}}>Prospect</h2>
          <p style={{fontSize:13,color:MUTED,marginTop:2}}>Search public 401(k) filings and add promising plans to your pipeline</p>
        </div>
      </div>

      {/* Config card */}
      <Card style={{marginBottom:20}}>
        <div style={{display:"flex",gap:32,flexWrap:"wrap",alignItems:"flex-start",marginBottom:18}}>

          {/* Targets */}
          <div style={{flex:1,minWidth:280}}>
            <SectionHead>Search targets</SectionHead>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:showAddForm?12:0}}>
              {targets.map(t=>(
                <div key={t.id} style={{display:"inline-flex",alignItems:"center",gap:5,background:"#eaf5fb",border:"1px solid #b8dff2",borderRadius:999,padding:"4px 10px 4px 12px",fontSize:12,color:INK,fontWeight:400}}>
                  <span style={{fontFamily:"'IBM Plex Sans'"}}>{t.type==="zip"?t.value:`${t.value}, ${t.state}`}</span>
                  <button onClick={()=>removeTarget(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:MUTED,padding:0,lineHeight:1,display:"flex",alignItems:"center",marginLeft:2}}><X size={10}/></button>
                </div>
              ))}
              {!showAddForm&&(
                <button onClick={()=>setShowAddForm(true)} style={{display:"inline-flex",alignItems:"center",gap:4,background:"none",border:`1px dashed ${RULE}`,borderRadius:999,padding:"4px 12px",fontSize:12,color:MUTED,cursor:"pointer",fontFamily:"inherit"}}>
                  <Plus size={10}/> Add location
                </button>
              )}
            </div>
            {showAddForm&&(
              <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap",paddingTop:4}}>
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Type</div>
                  <select value={addInput.type} onChange={e=>setAddInput(p=>({...p,type:e.target.value}))} style={inp}>
                    <option value="zip">ZIP Code</option>
                    <option value="city">City, State</option>
                  </select>
                </div>
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{addInput.type==="zip"?"ZIP Code":"City"}</div>
                  <input value={addInput.value} onChange={e=>setAddInput(p=>({...p,value:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addTarget()} placeholder={addInput.type==="zip"?"31905":"Columbus"} style={{...inp,width:100}}/>
                </div>
                {addInput.type==="city"&&(
                  <div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>State</div>
                    <input value={addInput.state} onChange={e=>setAddInput(p=>({...p,state:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addTarget()} placeholder="GA" maxLength={2} style={{...inp,width:54}}/>
                  </div>
                )}
                <Btn onClick={addTarget} small icon={<Check size={10}/>}>Add</Btn>
                <Btn onClick={()=>{setShowAddForm(false);setAddInput({type:"zip",value:"",state:""}); }} variant="ghost" small>Cancel</Btn>
              </div>
            )}
          </div>

          {/* Size filter */}
          <div>
            <SectionHead>Plan size</SectionHead>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[{k:"all",l:"All sizes"},{k:"small",l:"$1M – $5M"},{k:"mid",l:"$5M – $20M"},{k:"large",l:"$20M+"}].map(f=>(
                <button key={f.k} onClick={()=>setSizeFilter(f.k)}
                  style={{padding:"5px 12px",borderRadius:999,border:`1px solid ${sizeFilter===f.k?BLUE:RULE}`,background:sizeFilter===f.k?"#eaf5fb":"#fff",color:sizeFilter===f.k?BLUE:BODY,fontSize:12,fontWeight:sizeFilter===f.k?500:300,cursor:"pointer",fontFamily:"inherit",transition:"all 0.1s"}}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <Btn onClick={doSearch} disabled={searching||targets.length===0} icon={searching?<Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>:<BarChart3 size={13}/>}>
            {searching?"Searching EFAST2...":"Search Plans"}
          </Btn>
          {results&&<span style={{fontSize:12,color:MUTED}}>{filtered.length} plans found &nbsp;·&nbsp; <strong style={{color:GREEN}}>{available.length} new</strong> &nbsp;·&nbsp; {filtered.length-available.length} already in pipeline</span>}
        </div>
      </Card>

      {/* Results table */}
      {results&&filtered.length>0&&(
        <div style={{background:"#fff",border:`1px solid ${RULE}`,borderRadius:4,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:FILL,borderBottom:`1px solid ${RULE}`}}>
                <th style={{width:36,padding:"10px 14px",textAlign:"left"}}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{cursor:"pointer"}}/>
                </th>
                    <ProspectSortTh field="company">Company</ProspectSortTh>
                  <th style={{padding:"10px 12px 10px 0",textAlign:"left",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em"}}>Location</th>
                  <ProspectSortTh field="assets">Assets</ProspectSortTh>
                  <ProspectSortTh field="participants">Participants</ProspectSortTh>
                  <ProspectSortTh field="avgBalance">Avg Balance</ProspectSortTh>
                  <th style={{padding:"10px 12px 10px 0",textAlign:"left",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em"}}>Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r,i)=>{
                const tracking=existingEINs.has(r.ein);
                const checked=selected.has(r.ein);
                const model=getModel(r);
                const avg=r.avgBalance||Math.round(r.assets/r.participants);
                return(
                  <tr key={r.ein}
                    onClick={()=>!tracking&&toggleSelect(r.ein)}
                    style={{borderBottom:i<filtered.length-1?`1px solid ${RULE}`:"none",cursor:tracking?"default":"pointer",background:checked?"#f0f8ff":tracking?"#fafafa":"#fff",opacity:tracking?0.55:1,transition:"background 0.1s"}}
                    onMouseEnter={e=>{if(!tracking&&!checked)e.currentTarget.style.background=FILL;}}
                    onMouseLeave={e=>{if(!tracking&&!checked)e.currentTarget.style.background=checked?"#f0f8ff":"#fff";}}>
                    <td style={{padding:"11px 14px"}}>
                      {tracking
                        ?<span style={{fontFamily:"'Syne',sans-serif",fontSize:8,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>In pipeline</span>
                        :<input type="checkbox" checked={checked} onChange={()=>toggleSelect(r.ein)} onClick={e=>e.stopPropagation()} style={{cursor:"pointer"}}/>
                      }
                    </td>
                    <td style={{padding:"11px 12px 11px 0"}}>
                      <div style={{fontWeight:500,color:INK,fontSize:13}}>{r.company}</div>
                      {r.provider&&<div style={{fontSize:11,color:MUTED,marginTop:1}}>Provider: {r.provider}</div>}
                    </td>
                    <td style={{padding:"11px 12px 11px 0",fontSize:12,color:BODY,whiteSpace:"nowrap"}}>{r.city}, {r.state} {r.zip}</td>
                    <td style={{padding:"11px 12px 11px 0",fontFamily:"'IBM Plex Sans'",fontSize:13,fontWeight:500,color:INK,fontFeatureSettings:'"tnum" 1',whiteSpace:"nowrap"}}>{fmtF(r.assets)}</td>
                    <td style={{padding:"11px 12px 11px 0",fontFamily:"'IBM Plex Sans'",fontSize:13,color:INK}}>{r.participants.toLocaleString()}</td>
                    <td style={{padding:"11px 12px 11px 0",fontFamily:"'IBM Plex Sans'",fontSize:13,color:INK}}>{fmtF(avg)}</td>
                    <td style={{padding:"11px 0 11px 0"}}>
                      <span style={{display:"inline-block",padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:600,background:model==="fee_benchmark"?"#eff6ff":"#fef3c7",color:model==="fee_benchmark"?"#2563eb":"#d97706",border:`1px solid ${model==="fee_benchmark"?"#bfdbfe":"#fde68a"}`}}>
                        {model==="fee_benchmark"?"Fee Benchmark":"Admin"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {results&&filtered.length===0&&(
        <div style={{textAlign:"center",padding:"40px 0",color:MUTED}}>
          <p style={{fontSize:13,marginBottom:8}}>No plans found for the current search and filters.</p>
          <p style={{fontSize:12}}>This may mean the DOL EFAST2 API returned no matches for these locations — try adjusting your search targets or size filter.</p>
        </div>
      )}

      {/* Sticky action bar */}
      {selected.size>0&&(
        <div style={{position:"sticky",bottom:24,display:"flex",justifyContent:"center",marginTop:20,pointerEvents:"none"}}>
          <div style={{pointerEvents:"all",background:INK,borderRadius:999,padding:"12px 20px",display:"flex",alignItems:"center",gap:16,boxShadow:"0 4px 24px rgba(0,0,0,0.2)"}}>
            <span style={{color:"rgba(255,255,255,0.8)",fontSize:13}}>{selected.size} plan{selected.size>1?"s":""} selected</span>
            <Btn onClick={addToPipeline} icon={<Plus size={13}/>}>Add to Pipeline</Btn>
            <button onClick={()=>setSelected(new Set())} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.45)",padding:0,display:"flex",alignItems:"center"}}><X size={14}/></button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const signIn=async()=>{
    setLoading(true);setError("");
    const{error}=await supabase.auth.signInWithPassword({email,password});
    if(error)setError(error.message);
    setLoading(false);
  };

  return(
    <div style={{
      minHeight:"100vh",
      background:"#29aae2",
      backgroundImage:`
        radial-gradient(ellipse 55% 200% at -8% 50%, rgba(252,252,252,0.72) 0%, rgba(252,252,252,0) 58%),
        radial-gradient(ellipse 50% 200% at 108% 50%, rgba(252,252,252,0.60) 0%, rgba(252,252,252,0) 55%),
        radial-gradient(ellipse 100% 100% at 55% 50%, #29aae2 0%, transparent 70%),
        radial-gradient(ellipse 50% 100% at 110% 0%, #1a8bbf 0%, transparent 55%)
      `,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'IBM Plex Sans',system-ui,sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');`}</style>
      <div style={{width:380,background:"#fff",borderRadius:6,boxShadow:"0 12px 48px rgba(0,0,0,0.15)",overflow:"hidden"}}>

        {/* Blue top rule */}
        <div style={{height:3,background:BLUE}}/>

        <div style={{padding:"36px 36px 32px"}}>
          {/* Wordmark */}
          <div style={{marginBottom:28}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:".2em",textTransform:"uppercase",color:INK,marginBottom:4}}>
              MOMENTUM <span style={{color:BLUE}}>WEALTH</span> MANAGEMENT
            </div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:700,color:INK,letterSpacing:"-.02em",lineHeight:1.1}}>Reach</div>
          </div>

          {/* Email */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="you@momentumwealth.com"
              style={{width:"100%",padding:"9px 11px",border:`1px solid ${RULE}`,borderRadius:4,fontFamily:"inherit",fontSize:13,color:INK,outline:"none",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=BLUE}
              onBlur={e=>e.target.style.borderColor=RULE}/>
          </div>

          {/* Password */}
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:700,color:MUTED,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e=>e.key==="Enter"&&signIn()}
              style={{width:"100%",padding:"9px 11px",border:`1px solid ${RULE}`,borderRadius:4,fontFamily:"inherit",fontSize:13,color:INK,outline:"none",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=BLUE}
              onBlur={e=>e.target.style.borderColor=RULE}/>
          </div>

          {error&&<div style={{fontSize:12,color:RED,marginBottom:14,padding:"8px 11px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:4}}>{error}</div>}

          <Btn onClick={signIn} full disabled={loading||!email||!password}
            icon={loading?<Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>:undefined}>
            {loading?"Signing in...":"Sign in"}
          </Btn>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 36px",borderTop:`1px solid ${RULE}`,background:FILL}}>
          <p style={{fontSize:10,color:MUTED,margin:0,lineHeight:1.5}}>Investment advisory services offered through Momentum Wealth Management LLC, an investment adviser principally registered in the State of Georgia.</p>
        </div>
      </div>
    </div>
  );
}


// ─── App ──────────────────────────────────────────────────────────────────────

export default function App(){
  const [session,setSession]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [plans,setPlans]=useState([]);
  const [settings,setSettings]=useState(DEFAULT_SETTINGS);
  const [loading,setLoading]=useState(false);
  const [view,setView]=useState("dashboard");
  const [navTab,setNavTab]=useState("pipeline");
  const [selected,setSelected]=useState(null);
  const [savedMsg,setSavedMsg]=useState(false);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      setAuthLoading(false);
      if(session){loadUserData(session.user.id);}
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setSession(session);
      if(session){loadUserData(session.user.id);}
      else{setPlans([]);setSettings(DEFAULT_SETTINGS);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const loadUserData=async(userId)=>{
    try{
      const [p,s]=await Promise.all([
        dbLoadPlans(userId).catch(e=>{console.error("plans load failed:",e);return [];}),
        dbLoadSettings(userId).catch(e=>{console.error("settings load failed:",e);return null;})
      ]);
      setPlans(p||[]);
      setSettings(s||DEFAULT_SETTINGS);
    }catch(e){
      console.error("loadUserData error:",e);
    }finally{
      setLoading(false);
    }
  };

  const persistPlans=async u=>{setPlans(u);const uid=session?.user?.id;if(uid)await dbSavePlans(u,uid);};
  const handleAddPlans=async toAdd=>{
    const next=[...plans,...toAdd];
    await persistPlans(next);
    setNavTab("pipeline");
    setView("dashboard");
  };
  const persistSettings=async s=>{setSettings(s);const uid=session?.user?.id;if(uid)await dbSaveSettings(s,uid);setSavedMsg(true);setTimeout(()=>setSavedMsg(false),2500);};
  const handleSave=async p=>{
    const n=plans.find(x=>x.id===p.id)?plans.map(x=>x.id===p.id?p:x):[...plans,p];
    setPlans(n);const uid=session?.user?.id;if(uid)await dbSavePlan(p,uid);setSelected(p);setView("detail");
  };
  const handleDelete=async()=>{
    const uid=session?.user?.id;if(uid&&live)await dbDeletePlan(live.id,uid);
    const n=plans.filter(p=>p.id!==live?.id);setPlans(n);setSelected(null);setView("dashboard");
  };
  const handleUpdate=async p=>{const n=plans.map(x=>x.id===p.id?p:x);await persistPlans(n);setSelected(p);};
  const live=selected?plans.find(p=>p.id===selected.id)||selected:null;

  const Tab=({id,label,icon})=>(
    <button onClick={()=>{setNavTab(id);if(id==="pipeline")setView("dashboard");}} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"0 16px",height:"100%",color:navTab===id?"#fff":"rgba(255,255,255,0.4)",fontSize:12,fontWeight:navTab===id?500:400,letterSpacing:"0.04em",borderBottom:navTab===id?"2px solid rgba(255,255,255,0.9)":"2px solid transparent",transition:"color 0.15s"}}>
      {icon}{label}
    </button>
  );

  if(authLoading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:FILL}}>
      <Loader2 size={24} style={{animation:"spin 1s linear infinite",color:BLUE}}/>
    </div>
  );

  if(!session) return <LoginScreen/>;

  return(
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",background:FILL,minHeight:"100vh"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}button:focus-visible{outline:2px solid ${BLUE};outline-offset:2px}.nav-bar{background:#29aae2;background-image:radial-gradient(ellipse 55% 200% at -8% 50%,rgba(252,252,252,0.72) 0%,rgba(252,252,252,0) 58%),radial-gradient(ellipse 50% 200% at 108% 50%,rgba(252,252,252,0.60) 0%,rgba(252,252,252,0) 55%),radial-gradient(ellipse 100% 100% at 55% 50%,#29aae2 0%,transparent 70%),radial-gradient(ellipse 50% 100% at 110% 0%,#1a8bbf 0%,transparent 55%)}.nav-bar::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:0.12;background-image:url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E');background-size:160px 160px}`}</style>
      <div className="nav-bar" style={{height:52,position:"relative"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"stretch",height:"100%"}}>
        <div style={{display:"flex",alignItems:"center"}}>
          <img src="data:image/png;base64,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" alt="Momentum Wealth Management" style={{height:32,width:"auto",display:"block"}}/>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:"#fff",marginLeft:10,opacity:0.9}}>REACH</span>
        </div>
        <div style={{display:"flex",alignItems:"stretch",marginLeft:"auto"}}>
          <Tab id="pipeline" label="Pipeline"  icon={<BarChart3 size={13}/>}/>
          <Tab id="prospect" label="Prospect"  icon={<Plus size={13}/>}/>
          <Tab id="settings" label="Settings"  icon={<Settings size={13}/>}/>
        </div>
        {savedMsg&&<div style={{display:"flex",alignItems:"center",gap:5,color:"#4ade80",fontSize:12,marginLeft:16}}><Check size={13}/>Settings saved</div>}
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px"}}>
        {loading
          ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 0",color:MUTED,gap:8}}><Loader2 size={18} style={{animation:"spin 1s linear infinite"}}/>Loading...</div>
          :navTab==="prospect"?<ProspectTab plans={plans} onAddPlans={handleAddPlans} targets={prospectTargets} onTargetsChange={setProspectTargets} sizeFilter={prospectSizeFilter} onSizeFilterChange={setProspectSizeFilter} results={prospectResults} onResultsChange={setProspectResults}/>
          :navTab==="settings"?<SettingsView settings={settings} onSave={persistSettings}/>
          :view==="dashboard"?<Dashboard plans={plans} onSelect={p=>{setSelected(p);setView("detail");}} onNew={()=>setView("new")}/>
          :view==="new"?<PlanForm onSave={handleSave} onCancel={()=>setView("dashboard")}/>
          :view==="edit"&&live?<PlanForm initial={live} onSave={handleSave} onCancel={()=>setView("detail")} onDelete={handleDelete}/>
          :view==="detail"&&live?<PlanDetail plan={live} onBack={()=>setView("dashboard")} onUpdate={handleUpdate} onEdit={()=>setView("edit")} settings={settings}/>
          :null}
      </div>
    </div>
  );
}
