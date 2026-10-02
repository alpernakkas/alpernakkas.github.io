import {tasks,resources,strategies,simulate} from './engine.js';
import {currentClass,leaveClass} from './class-session.js';
const classAccess=currentClass();
if(!classAccess){
 window.location.replace('./login.html');
}else{
document.documentElement.dataset.classAccess='ready';
document.getElementById('class-name').textContent=classAccess.name;
document.getElementById('class-sign-out').addEventListener('click',()=>{leaveClass();window.location.replace('./login.html');});
const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
const money=n=>new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD',maximumFractionDigits:0}).format(n);
const num=n=>new Intl.NumberFormat('en-SG',{maximumFractionDigits:0}).format(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ts=clone(tasks),rs=clone(resources),tab='tasks';
const baseline=simulate(tasks,resources,strategies[1]);
$('strategy').innerHTML=strategies.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');$('strategy').value='level';
$('goal').value=baseline.duration;$('budget').value=Math.ceil(baseline.cost/1000)*1000;
const notes={cpm:'Earliest dates from dependencies. Shared resources may be overbooked.',level:'Wait for available people. Task effort and team capacity stay unchanged.',overtime:'Level resources with 2 extra hours per workday on all labor activities.',contract:'Add one fit-out crew. Two crews work together on each fit-out activity.',combined:'Two fit-out crews plus 2 hours of overtime per workday on labor activities.'};
function render(){
 try{
  const overhead=Number($('overhead').value),goal=Number($('goal').value),budget=Number($('budget').value);
  if(!Number.isFinite(overhead)||overhead<0||overhead>10000)throw Error('Daily overhead must be between 0 and 10,000 SGD.');
  if(!Number.isInteger(goal)||goal<1||goal>1000)throw Error('Opening deadline must be a whole number from 1 to 1,000 workdays.');
  if(!Number.isFinite(budget)||budget<0||budget>10000000)throw Error('Budget must be between 0 and 10,000,000 SGD.');
  const strategy=strategies.find(s=>s.id===$('strategy').value),shock=$('shock').value;
  const result=simulate(ts,rs,strategy,shock,overhead),alternatives=strategies.map(s=>simulate(ts,rs,s,shock,overhead));
  $('error').hidden=true;$('strategy-note').textContent=notes[strategy.id];
  const late=result.duration-goal,over=result.cost-budget;
  $('stats').innerHTML=`<div class="stat"><span class="label">PROJECT DURATION</span><strong>${result.duration} <small>workdays</small></strong><p class="${late>0?'bad':'good'}">${late>0?`${late} days after deadline`:late===0?'Meets the deadline':`${-late} days before deadline`} · baseline ${baseline.duration}d</p></div><div class="stat"><span class="label">TOTAL PROJECT COST</span><strong>${money(result.cost)}</strong><p class="${over>0?'bad':'good'}">${money(Math.abs(over))} ${over>0?'over':'under'} budget</p></div><div class="stat"><span class="label">RESOURCE CONFLICTS</span><strong>${result.conflicts.length} <small>resource-days</small></strong><p class="${result.conflicts.length?'bad':'good'}">${result.conflicts.length?'This schedule needs a capacity fix':'Feasible with the modeled capacity'}</p></div>`;
  $('schedule-status').innerHTML=`<div class="status ${result.conflicts.length?'warn':''}">${result.conflicts.length?'Overbooked resources: this plan cannot be executed as shown.':`Resource-feasible plan · ${result.duration-result.cpmEnd} workdays beyond the dependency-only finish.`}</div>`;
  const end=Math.max(result.duration,goal),ticks=Array.from({length:11},(_,i)=>`<span style="left:${i*10}%">${Math.round(i*end/10)}</span>`).join('');
  $('gantt').innerHTML=`<div class="gantt"><div class="g-axis"><span>ACTIVITY / WORKDAYS</span><div class="ticks">${ticks}</div></div>${result.tasks.map(t=>{
   const conflict=result.conflicts.some(c=>c.res===t.res&&c.day>=t.start&&c.day<t.end);
   return `<div class="g-row"><div class="g-name" title="${esc(t.name)}"><b>${t.id}</b>${esc(t.name)}</div><div class="track"><span class="deadline" style="left:${goal/end*100}%" title="Deadline: ${goal} workdays"></span><span class="bar ${t.slack===0?'critical':''} ${conflict?'conflict':''}" style="left:${t.start/end*100}%;width:${t.duration/end*100}%" title="${esc(t.name)}: days ${t.start+1}–${t.end}; ${t.duration} days; ${t.crew} crew(s); cost ${money(t.cost)}; dependency slack ${t.slack} days">${t.duration}</span></div></div>`;
  }).join('')}</div>`;
  $('workload').innerHTML=rs.filter(r=>r.id!=='external').map(r=>`<div class="heat-row"><span class="heat-label">${esc(r.name)}<br><b>${result.capacity[r.id]} available</b></span><div class="cells" role="img" aria-label="${esc(r.name)} daily workload, ${result.conflicts.filter(c=>c.res===r.id).length} overbooked workdays">${Array.from({length:result.duration},(_,d)=>{
   const used=result.usage[r.id][d]||0,absence=shock==='absence'&&r.id==='fitout'&&d>=25&&d<30,capacity=absence?0:result.capacity[r.id];
   return `<span class="cell ${used>capacity?'over':absence?'absent':used?'used':''}" title="Day ${d+1}: ${used} of ${capacity} ${esc(r.name)} units"></span>`;
  }).join('')}</div></div>`).join('')+`<div class="heat-axis"><span>Day 1</span><span>Day ${result.duration}</span></div>`;
  const maxCost=Math.max(result.cost,budget)*1.08||1,x=d=>45+d/result.duration*350,y=c=>170-c/maxCost*145;
  const points=result.cumulative.map((c,d)=>`${x(d)},${y(c)}`).join(' ');
  $('cost-chart').innerHTML=`<svg class="cost" viewBox="0 0 420 210" role="img" aria-label="Cumulative cost reaches ${money(result.cost)} on day ${result.duration}; budget ${money(budget)}"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#269e9f" stop-opacity=".2"/><stop offset="1" stop-color="#269e9f" stop-opacity="0"/></linearGradient></defs>${[0,.5,1].map(f=>`<line x1="45" x2="395" y1="${y(maxCost*f)}" y2="${y(maxCost*f)}" stroke="#e3ebef"/><text x="37" y="${y(maxCost*f)+4}" text-anchor="end" font-size="12" fill="#536b7b">${Math.round(maxCost*f/1000)}k</text>`).join('')}<polygon points="45,170 ${points} 395,170" fill="url(#fill)"/><line x1="45" x2="395" y1="${y(budget)}" y2="${y(budget)}" stroke="#b85c54" stroke-dasharray="5 4"/><text x="395" y="${Math.max(14,y(budget)-7)}" text-anchor="end" font-size="12" fill="#a1463f">Budget ${money(budget)}</text><polyline points="${points}" fill="none" stroke="#007e79" stroke-width="3"/><circle cx="395" cy="${y(result.cost)}" r="4" fill="#007e79"/><text x="45" y="194" font-size="12" fill="#536b7b">Day 1</text><text x="395" y="194" font-size="12" fill="#536b7b" text-anchor="end">Day ${result.duration}</text></svg>`;
  $('cost-breakdown').innerHTML=`<div class="breakdown"><span>Labor<b>${money(result.labor)}</b></span><span>Materials & fees<b>${money(result.fixed)}</b></span><span>Overhead<b>${money(result.overhead)}</b></span></div>`;
  $('comparisons').innerHTML=`<table><thead><tr><th>APPROACH</th><th>DURATION</th><th>TOTAL COST</th><th>VS. ORIGINAL BASELINE</th><th>ASSESSMENT</th><th></th></tr></thead><tbody>${alternatives.map(a=>{
   const feasible=!a.conflicts.length,meets=a.duration<=goal&&a.cost<=budget&&feasible;
   return `<tr class="${a.strategy.id===strategy.id?'selected':''}"><td>${a.strategy.name}</td><td>${a.duration} days</td><td>${money(a.cost)}</td><td>${a.duration-baseline.duration>0?'+':''}${a.duration-baseline.duration} days / ${a.cost>=baseline.cost?'+':''}${((a.cost/baseline.cost-1)*100).toFixed(1)}%</td><td><span class="tag ${meets?'':'warn'}">${!feasible?'Resource conflicts':meets?'Meets both targets':a.duration>goal&&a.cost>budget?'Late & over budget':a.duration>goal?'Misses deadline':'Over budget'}</span></td><td><button class="choose" data-strategy="${a.strategy.id}" aria-label="Inspect ${a.strategy.name}">${a.strategy.id===strategy.id?'Selected':'Inspect'}</button></td></tr>`;
  }).join('')}</tbody></table>`;
  const feasible=alternatives.filter(a=>!a.conflicts.length),meets=feasible.filter(a=>a.duration<=goal&&a.cost<=budget).sort((a,b)=>a.cost-b.cost),fast=[...feasible].sort((a,b)=>a.duration-b.duration||a.cost-b.cost)[0];
  $('insight').innerHTML=meets.length?`<b>Comparison guide:</b> ${meets[0].strategy.name} is the lowest-cost tested approach that meets both targets: ${meets[0].duration} workdays for ${money(meets[0].cost)}. ${meets.length} of the tested approaches meet your constraints. Discuss whether its productivity assumptions are credible.`:`<b>Comparison guide:</b> None of the tested approaches meets both targets. The fastest feasible option is ${fast.strategy.name} at ${fast.duration} workdays and ${money(fast.cost)}. ${fast.duration>goal?`It still needs ${fast.duration-goal} fewer workdays.`:`It meets the deadline.`} ${fast.cost>budget?`It needs ${money(fast.cost-budget)} more budget.`:'It stays within budget.'} Consider changing scope, dependencies, or the opening target.`;
 }catch(e){$('error').hidden=false;$('error').textContent=e.message+' Charts show the last valid plan.';}
}
function editor(){
 $('tasks-tab').setAttribute('aria-pressed',tab==='tasks');$('resources-tab').setAttribute('aria-pressed',tab==='resources');
 $('editor').innerHTML=tab==='tasks'?`<table><thead><tr><th>ID</th><th>ACTIVITY</th><th>BASE DAYS</th><th>RESOURCE</th><th>PREDECESSORS</th><th>MATERIALS / FEES (SGD)</th></tr></thead><tbody>${ts.map(t=>`<tr><td>${t.id}</td><td class="task-name">${esc(t.name)}</td><td><input data-task="${t.id}" data-field="days" aria-label="${esc(t.name)} base duration" type="number" min="1" max="60" step="1" value="${t.days}"></td><td><select data-task="${t.id}" data-field="res" aria-label="${esc(t.name)} resource">${rs.map(r=>`<option value="${r.id}" ${r.id===t.res?'selected':''}>${esc(r.name)}</option>`).join('')}</select></td><td><input class="deps" data-task="${t.id}" data-field="deps" aria-label="${esc(t.name)} predecessor IDs, separated by commas" value="${t.deps.join(', ')}" placeholder="None"></td><td><input class="money" data-task="${t.id}" data-field="fixed" aria-label="${esc(t.name)} materials and fees" type="number" min="0" step="100" value="${t.fixed}"></td></tr>`).join('')}</tbody></table><p class="chart-note">Base days represent 8-hour effort for one resource unit. External approval is elapsed time. Enter predecessor IDs separated by commas; leave blank for no dependency.</p>`:`<table><thead><tr><th>RESOURCE</th><th>AVAILABLE UNITS</th><th>HOURLY RATE (SGD)</th></tr></thead><tbody>${rs.filter(r=>r.id!=='external').map(r=>`<tr><td>${esc(r.name)}</td><td><input data-resource="${r.id}" data-field="capacity" aria-label="${esc(r.name)} capacity" type="number" min="1" max="20" step="1" value="${r.capacity}"></td><td><input data-resource="${r.id}" data-field="rate" aria-label="${esc(r.name)} hourly rate" type="number" min="0" step="5" value="${r.rate}"></td></tr>`).join('')}</tbody></table><p class="chart-note">Each unit can work on one activity at a time. Extra capacity permits parallel tasks; only the contractor approaches put two crews on each fit-out activity. Absence removes all fit-out capacity on days 26–30.</p>`;
}
['strategy','shock','overhead','goal','budget'].forEach(id=>$(id).addEventListener('change',render));
$('comparisons').addEventListener('click',e=>{const b=e.target.closest('[data-strategy]');if(b){$('strategy').value=b.dataset.strategy;render();}});
$('editor').addEventListener('change',e=>{const el=e.target,f=el.dataset.field;if(!f)return;if(el.dataset.task){const t=ts.find(t=>t.id===el.dataset.task);t[f]=f==='deps'?[...new Set(el.value.toUpperCase().split(/[ ,]+/).filter(Boolean))]:f==='res'?el.value:Number(el.value);}else if(el.dataset.resource){rs.find(r=>r.id===el.dataset.resource)[f]=Number(el.value);}render();});
$('tasks-tab').addEventListener('click',()=>{tab='tasks';editor();});$('resources-tab').addEventListener('click',()=>{tab='resources';editor();});
$('challenge').addEventListener('click',()=>{$('goal').value=Math.max(1,baseline.duration-10);$('budget').value=Math.floor(baseline.cost*1.1);render();$('challenge').textContent='Challenge targets applied';});
$('reset').addEventListener('click',()=>{ts=clone(tasks);rs=clone(resources);$('strategy').value='level';$('shock').value='none';$('overhead').value=250;$('goal').value=baseline.duration;$('budget').value=Math.ceil(baseline.cost/1000)*1000;$('challenge').textContent='Try the 2-week challenge';editor();render();});
editor();render();
}
