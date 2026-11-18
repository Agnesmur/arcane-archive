'use strict';
const Q=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const STORAGE='arcane_archive_v1';const CONFIG='arcane_archive_config_v1';const SESSION='arcane_archive_session_v1';let state;try{state=JSON.parse(localStorage.getItem(STORAGE))}catch{}if(!state||!Array.isArray(state.games)||!Array.isArray(state.builds))state={games:[firstGame],builds:[defaultBuild]};// Миграция v4 → v5. Не меняем пользовательские сборки с изменённым планом прокачки.
const oldDefaultPhases=[{level:13,stats:{"VGR":12,"END":6,"VIT":7,"STR":11,"DEX":8,"ADP":9},priority:"Старт",text:"На старте: изучи атаки и перекаты."},{level:20,stats:{"VGR":15,"END":8,"VIT":7,"STR":11,"DEX":8,"ADP":11},priority:"HP > END = ADP",text:"Сначала здоровье, затем выносливость и адаптивность."},{level:30,stats:{"VGR":17,"END":11,"VIT":7,"STR":12,"DEX":9,"ADP":14},priority:"END = ADP > HP > STR = DEX",text:"Укрепляй выживаемость; начинай готовить требования к двум мечам."},{level:40,stats:{"VGR":18,"END":12,"VIT":7,"STR":15,"DEX":13,"ADP":15},priority:"DEX > STR > HP = END = ADP",text:"Цель: 15 STR / 13 DEX для Power Stance с двумя Longsword."},{level:50,stats:{"VGR":20,"END":14,"VIT":7,"STR":15,"DEX":17,"ADP":17},priority:"DEX > HP = END = ADP",text:"Два клинка уже доступны — улучшаем урон и комфорт."},{level:60,stats:{"VGR":20,"END":16,"VIT":7,"STR":15,"DEX":22,"ADP":20},priority:"DEX > ADP > END",text:"Двигайся к 24 DEX для двух Uchigatana, проверь AGL в характеристиках."},{level:70,stats:{"VGR":23,"END":18,"VIT":7,"STR":16,"DEX":24,"ADP":22},priority:"HP = DEX > END = ADP > STR",text:"24 DEX хватает для Power Stance с двумя Uchigatana."},{level:80,stats:{"VGR":26,"END":20,"VIT":7,"STR":18,"DEX":25,"ADP":24},priority:"HP > STR = END = ADP > DEX",text:"Больше здоровья, выносливости и комфортных перекатов."},{level:90,stats:{"VGR":28,"END":23,"VIT":7,"STR":19,"DEX":28,"ADP":25},priority:"DEX > END > HP > STR = ADP",text:"Усиливаем любимую пару клинков."},{level:100,stats:{"VGR":30,"END":25,"VIT":7,"STR":20,"DEX":33,"ADP":25},priority:"DEX > HP = END > STR",text:"Готовый ориентир для билда; дальше подстраивай под оружие."}];
for(const b of state.builds){
 if(b.id!=='ds2-knight-power'||b.buildRevision>=5)continue;
 const untouched=JSON.stringify(b.phases)===JSON.stringify(oldDefaultPhases);
 if(!untouched)continue;
 const doneTitles=new Set((b.items||[]).filter(i=>i.done).map(i=>i.title));
 Object.assign(b,{title:defaultBuild.title,subtitle:defaultBuild.subtitle,description:defaultBuild.description,weapon:defaultBuild.weapon,weaponStages:structuredClone(defaultBuild.weaponStages),tips:defaultBuild.tips,phases:structuredClone(defaultBuild.phases),items:structuredClone(defaultBuild.items).map(i=>({...i,done:doneTitles.has(i.title)||(i.id==='i1'&&doneTitles.has('Освоить стартовый Broadsword'))})),buildRevision:5});
 if(!b.phases.some(p=>p.level===Number(b.selectedPhase)))b.selectedPhase=13;
}
// Перевод стандартного рыцаря на маршрут А/Б: сохраняем выполнение старых задач.
function upgradeDS2Build(builds){
 const b=builds.find(x=>x.id===defaultBuild.id&&x.gameId==='ds2');
 if(!b||(Number(b.buildRevision)||0)>=12)return;
 const oldDone=new Set((b.items||[]).filter(i=>i.done).map(i=>i.title));
 const alias={
  'Купить Утигатану':['Купить Утигатану'],
  'Купить второй Палаш':['Купить второй Палаш'],
  'Получить Чёрную катану':['Получить Чёрную катану'],
  'Достичь 16 STR / 9 DEX':['Достичь 16 STR / 9 DEX'],
  'Довести DEX до 40':['Довести DEX до 40'],
  'Обменять душу Гибкого часового':['Если не хочется фармить: обменять душу Гибкого часового'],
  'Проверить клавиши Power Stance':['Освоить парные атаки'],
  'Достичь 22 STR / 37 DEX':['Опционально: 22 STR / 37 DEX']};
 const oldSelected=Number(b.selectedPhase)||13;
 const updated=structuredClone(defaultBuild);
 updated.created=b.created||updated.created;
 updated.public=!!b.public;
 updated.selectedPhase=updated.phases.some(p=>p.level===oldSelected)?oldSelected:13;
 updated.items=updated.items.map(i=>({...i,done:oldDone.has(i.title)||(alias[i.title]||[]).some(a=>oldDone.has(a))}));
 // Сохраняем собственные заметки пользователя отдельно от новых советов.
 if(b.userNotes)updated.userNotes=b.userNotes;
 Object.assign(b,updated);
}
upgradeDS2Build(state.builds);
// Добавляем новый тип билда без изменения уже существующей библиотеки.
if(!state.games.some(g=>g.id===JOURNEY_GAME.id))state.games.push(structuredClone(JOURNEY_GAME));
const existingJourney=state.builds.find(b=>b.id===JOURNEY_LILITH.id);
if(!existingJourney){
 state.builds.push(structuredClone(JOURNEY_LILITH));
}else if((existingJourney.journeyRevision||0)<3){
 const merged=structuredClone(JOURNEY_LILITH);
 const taskDone=new Map();
 const gearDone=new Map();
 for(const ch of existingJourney.chapters||[]){
  for(const t of ch.tasks||[]) taskDone.set(`${ch.id}::${t.title}`,!!t.done);
  for(const g of ch.gear||[]) gearDone.set(`${ch.id}::${g.slot}::${g.name}`,!!g.done);
 }
 merged.public=existingJourney.public||false;
 merged.created=existingJourney.created||merged.created;
 merged.selectedChapter=existingJourney.selectedChapter||merged.selectedChapter;
 merged.profile={...merged.profile,...existingJourney.profile,portrait:JOURNEY_LILITH.profile?.portrait||existingJourney.profile?.portrait||''};
 merged.notes=existingJourney.notes&&existingJourney.notes!==''?existingJourney.notes:merged.notes;
 merged.chapters=merged.chapters.map(ch=>{
  const old=(existingJourney.chapters||[]).find(x=>x.id===ch.id)||{};
  return {...ch,
   tasks:(ch.tasks||[]).map(t=>({...t,done:taskDone.get(`${ch.id}::${t.title}`)||false})),
   gear:(ch.gear||[]).map(g=>({...g,done:gearDone.get(`${ch.id}::${g.slot}::${g.name}`)||false})),
   selected:old.selected||ch.selected
  };
 });
 const idx=state.builds.findIndex(b=>b.id===existingJourney.id);
 state.builds[idx]=merged;
}
// Сквозной билд: новые планы по уровням не заменяют пользовательские заметки и заклинания.
function applyJourneyLevelPlans(builds){
 const b=builds.find(x=>x.id===JOURNEY_LILITH.id&&x.type==='journey');
 if(!b)return;
 for(const id of ['sod','tob']){
  const chapter=b.chapters?.find(x=>x.id===id);
  const template=JOURNEY_LILITH.chapters.find(x=>x.id===id);
  if(chapter&&!Array.isArray(chapter.levelPlan))chapter.levelPlan=structuredClone(template.levelPlan);
  if(chapter&&chapter.levelPlan?.length===0)chapter.levelPlan=structuredClone(template.levelPlan);
  if(chapter){if(!chapter.xp||/^(До 500|До 8 000|500 000|8 000 000)/.test(chapter.xp))chapter.xp=template.xp;if(!chapter.level||['10–11','18+'].includes(chapter.level))chapter.level=template.level;}
 }
 b.journeyRevision=Math.max(b.journeyRevision||0,JOURNEY_LILITH.journeyRevision||0);
}
applyJourneyLevelPlans(state.builds);
localStorage.setItem(STORAGE,JSON.stringify(state));
let config;try{config=JSON.parse(localStorage.getItem(CONFIG))||{}}catch{config={}}config={...PUBLIC_CLOUD,...config};let session;try{session=JSON.parse(localStorage.getItem(SESSION))}catch{};let route={page:'home'},editing=false,authMode='login',shareBuild=null;let cloudBusy=false;const saveLocal=()=>localStorage.setItem(STORAGE,JSON.stringify(state));saveLocal();
const qs=(s)=>encodeURIComponent(s);const base=()=>location.href.split('#')[0];const nav=(path)=>{location.hash=path};const notify=(t)=>{document.querySelector('.toast')?.remove();let el=document.createElement('div');el.className='toast';el.textContent=t;document.body.append(el);setTimeout(()=>el.remove(),3800)};
function current(){return state.builds.find(x=>x.id===route.id)}function game(id){return state.games.find(g=>g.id===id)}function isCloud(){return !!(config.url&&config.key&&session?.access_token)}
