export const resources = [
  {id:'pm',name:'Project manager',capacity:1,rate:65},
  {id:'design',name:'Design team',capacity:1,rate:55},
  {id:'fitout',name:'Fit-out crew',capacity:1,rate:40},
  {id:'it',name:'IT specialist',capacity:1,rate:60},
  {id:'ops',name:'Operations team',capacity:1,rate:35},
  {id:'external',name:'External approval',capacity:99,rate:0}
];
export const tasks = [
  {id:'A',name:'Confirm scope & lease',days:5,res:'pm',deps:[],fixed:5000},
  {id:'B',name:'Store design',days:8,res:'design',deps:['A'],fixed:3000},
  {id:'C',name:'Permit approval',days:10,res:'external',deps:['B'],fixed:2000},
  {id:'D',name:'Procure fixtures',days:12,res:'ops',deps:['B'],fixed:24000},
  {id:'E',name:'Site preparation',days:8,res:'fitout',deps:['C'],fixed:6000},
  {id:'F',name:'Electrical & cabling',days:8,res:'fitout',deps:['E'],fixed:8000},
  {id:'G',name:'Install fixtures',days:10,res:'fitout',deps:['E','D'],fixed:12000},
  {id:'H',name:'Configure POS & network',days:6,res:'it',deps:['F'],fixed:7000},
  {id:'I',name:'Recruit & train staff',days:8,res:'ops',deps:['A'],fixed:2000},
  {id:'J',name:'Stock & merchandising',days:5,res:'ops',deps:['G','I'],fixed:15000},
  {id:'K',name:'Test & opening readiness',days:4,res:'pm',deps:['H','J'],fixed:1000}
];
export const strategies=[
 {id:'cpm',name:'Dependency only',level:false,ot:0,contract:false},
 {id:'level',name:'Resource leveling',level:true,ot:0,contract:false},
 {id:'overtime',name:'Level + overtime',level:true,ot:.25,contract:false},
 {id:'contract',name:'Add fit-out contractor',level:true,ot:0,contract:true},
 {id:'combined',name:'Contractor + overtime',level:true,ot:.25,contract:true}
];
export function validate(ts,rs){
 const ids=new Set(ts.map(t=>t.id));
 for(const t of ts){
  if(!Number.isInteger(t.days)||t.days<1||t.days>60)throw Error(`${t.id}: duration must be a whole number from 1 to 60.`);
  if(!Number.isFinite(t.fixed)||t.fixed<0)throw Error(`${t.id}: fixed cost must be zero or higher.`);
  if(t.deps.some(d=>!ids.has(d)||d===t.id))throw Error(`${t.id}: dependencies must be other activity IDs.`);
  if(!rs.some(r=>r.id===t.res))throw Error(`${t.id}: select a valid resource.`);
 }
 for(const r of rs)if(!Number.isInteger(r.capacity)||r.capacity<1||!Number.isFinite(r.rate)||r.rate<0)throw Error('Resource capacity must be a positive whole number; rates must be zero or higher.');
 let done=new Set();
 while(done.size<ts.length){const next=ts.find(t=>!done.has(t.id)&&t.deps.every(d=>done.has(d)));if(!next)throw Error('Dependencies contain a cycle. Remove a dependency to continue.');done.add(next.id);}
}
export function simulate(ts,rs,strategy,shock='none',overhead=250){
 validate(ts,rs);
 const rmap=Object.fromEntries(rs.map(r=>[r.id,r]));
 const capacity=Object.fromEntries(rs.map(r=>[r.id,r.capacity+(strategy.contract&&r.id==='fitout'?1:0)]));
 const input=ts.map(t=>{
  const external=t.res==='external';
  const crew=!external&&strategy.contract&&t.res==='fitout'?2:1;
  const ot=external?0:strategy.ot;
  const duration=Math.ceil(t.days/(crew*(1+ot)))+(shock==='permit'&&t.id==='C'?5:0);
  const multiplier=crew===2?1.2:1;
  const labor=t.days*8*rmap[t.res].rate*multiplier*(1+1.5*ot)/(1+ot);
  return {...t,duration,crew,labor,cost:labor+t.fixed};
 });
 const byId=Object.fromEntries(input.map(t=>[t.id,t]));
 let pending=[...input],order=[];
 while(pending.length){const next=pending.find(t=>t.deps.every(d=>order.some(n=>n.id===d)));order.push(next);pending=pending.filter(t=>t!==next);}
 for(const t of order){t.es=Math.max(0,...t.deps.map(d=>byId[d].ef));t.ef=t.es+t.duration;}
 const cpmEnd=Math.max(...order.map(t=>t.ef));
 for(const t of [...order].reverse()){
  const successors=order.filter(n=>n.deps.includes(t.id));
  t.lf=successors.length?Math.min(...successors.map(n=>n.ls)):cpmEnd;
  t.ls=t.lf-t.duration;t.slack=t.ls-t.es;
  t.tail=t.duration+Math.max(0,...successors.map(n=>n.tail));
 }
 const usage=Object.fromEntries(rs.map(r=>[r.id,[]]));let placed={};pending=[...order];
 while(pending.length){
  const ready=pending.filter(t=>t.deps.every(d=>placed[d]));
  ready.sort((a,b)=>b.tail-a.tail||a.id.localeCompare(b.id));
  const t=ready[0];let start=Math.max(0,...t.deps.map(d=>placed[d].end));
  const unavailable=d=>shock==='absence'&&t.res==='fitout'&&d>=25&&d<30;
  if(strategy.level){
   while(Array.from({length:t.duration},(_,i)=>start+i).some(d=>unavailable(d)||(usage[t.res][d]||0)+t.crew>capacity[t.res])){
    start++;if(start>5000)throw Error('Unable to place an activity with this resource capacity.');
   }
  }
  t.start=start;t.end=start+t.duration;
  for(let d=start;d<t.end;d++)usage[t.res][d]=(usage[t.res][d]||0)+t.crew;
  placed[t.id]=t;pending=pending.filter(n=>n!==t);
 }
 const duration=Math.max(...input.map(t=>t.end));let conflicts=[];
 for(const r of rs.filter(r=>r.id!=='external'))for(let d=0;d<duration;d++){
  const available=shock==='absence'&&r.id==='fitout'&&d>=25&&d<30?0:capacity[r.id];
  if((usage[r.id][d]||0)>available)conflicts.push({res:r.id,day:d,used:usage[r.id][d],available});
 }
 const labor=input.reduce((s,t)=>s+t.labor,0),fixed=input.reduce((s,t)=>s+t.fixed,0);
 let cumulative=[0];for(let d=0;d<duration;d++)cumulative.push(cumulative[d]+overhead+input.reduce((s,t)=>s+(d>=t.start&&d<t.end?t.cost/t.duration:0),0));
 return {tasks:input,duration,cpmEnd,labor,fixed,overhead:overhead*duration,cost:labor+fixed+overhead*duration,usage,capacity,conflicts,cumulative,strategy,shock};
}
