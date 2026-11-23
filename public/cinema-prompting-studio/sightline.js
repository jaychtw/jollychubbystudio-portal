// Each choice pairs the viewer's intent with a camera instruction.
const choices = [
 ['Leave open','自由設定','',''],
 ['See where we are','先看清周遭','Wide establishing shot. Keep the subject small enough to read its surroundings.','環境遠景。讓主體在畫面中保持較小的比例，清楚呈現四周環境。'],
 ['Catch a tiny detail','看見微小細節','Cut to an extreme close-up. Fill the frame with the detail named in this beat.','切至大特寫，讓此段描述的細節填滿畫面。'],
 ['See through their eyes','從角色眼中看','Use a first-person point-of-view shot at the subject’s eye height.','採用第一人稱主觀鏡頭，視點維持在角色的眼睛高度。'],
 ['Stay beside the subject','與主體並行','Use a lateral tracking shot. Match the subject’s speed and keep its size steady as the background moves.','使用側向跟拍，配合主體速度，背景移動時維持主體在畫面中的大小。'],
 ['Gradually feel closer','逐漸靠近','Slowly dolly in toward the subject, allowing the background perspective to change.','攝影機緩慢向主體推進，讓背景透視關係隨距離改變。'],
 ['Discover what was behind','發現後方的事物','Rack focus from the near subject to the background detail while holding the framing steady.','固定構圖，將焦點由近處主體轉移到後方細節。'],
 ['Watch without intervening','靜靜旁觀','Use a locked-off shot. Let the action move within a stationary frame.','使用固定鏡頭，讓動作在靜止的畫框內發生。'],
 ['Follow a gaze sideways','跟著目光轉向','Pan horizontally from the starting subject toward the new point of attention, keeping the camera position fixed.','攝影機固定在原地水平搖攝，從起始主體轉向新的注意焦點。']
];
const examples = [
 {idea:'At a Taipei bus stop in the rain, a passenger recognizes someone through the last bus window.',ratio:'16:9',light:'Cool street reflections, warm shelter light.',sound:'Rain on the roof. Air brakes break the silence.',loop:false,beats:[
 {action:'The last bus rolls into the empty street.',seconds:3,choice:1},{action:'A drop slides down the glass. Behind it, a familiar face comes into focus.',seconds:4,choice:6},{action:'The passenger presses a palm against the glass.',seconds:3,choice:2}]},
 {idea:'A small bear and an axolotl take a quiet woodland stroll in a seamless loop.',ratio:'16:9',light:'Soft morning light under an even canopy.',sound:'A repeating rhythm of footsteps and distant birds.',loop:true,beats:[{action:'The pair walk past repeating ferns. End on the same stride phase as the opening.',seconds:10,choice:4}]}
];
const blank=()=>({idea:'',ratio:'16:9',light:'',sound:'',loop:false,beats:[{action:'',seconds:4,choice:0}]});
let draft=blank(),zh=false,saveFailed=false;
try{
 zh=localStorage.getItem('cinema.lang')==='zh';
 const restored=JSON.parse(localStorage.getItem('sightline.draft.v1'));
 if(restored && ['idea','light','sound'].every(k=>typeof restored[k]==='string') && Array.isArray(restored.beats)&&restored.beats.length && restored.beats.every(b=>typeof b.action==='string'&&choices[b.choice])) draft={...draft,...restored};
}catch{}
const L=(en,tw)=>zh?tw:en;
const get=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function compile(){
 if(!draft.idea.trim()&&!draft.beats.some(b=>b.action.trim()))return '';
 let end=0;
 const beats=draft.beats.map(b=>{
   const start=end;end+=Number(b.seconds);
   return [start+'–'+end+'s',b.action.trim(),choices[b.choice][zh?3:2]].filter(Boolean).join('  ');
 });
 return [end+'s · '+draft.ratio,draft.idea.trim(),beats.join('\n'),draft.light.trim()&&L('Light and look — ','光線與風格 — ')+draft.light.trim(),draft.sound.trim()&&L('Sound — ','聲音 — ')+draft.sound.trim(),draft.loop&&L('Seamless loop. Match the opening composition, motion phase and lighting at the join.','無縫循環。銜接點的構圖、動作相位與光線須與開場一致。')].filter(Boolean).join('\n\n');
}
function update(){
 const valid=draft.beats.every(b=>Number.isInteger(+b.seconds)&&+b.seconds>=1&&+b.seconds<=120);
 const output=valid?compile():'';
 get('out').textContent=output||(valid?L('Describe your scene or a beat to start.','輸入場景或動作，開始編寫。'):L('Give each beat a duration from 1 to 120 whole seconds.','請將每段長度設為 1 到 120 的整數秒。'));
 get('copy').disabled=get('download').disabled=!output;
 let time=0;
 draft.beats.forEach((b,i)=>{const start=time;time+=Number(b.seconds)||0;get('time'+i).textContent=valid?start+'–'+time+' s':'—';get('tech'+i).textContent=choices[b.choice][zh?3:2]});
 try{localStorage.setItem('sightline.draft.v1',JSON.stringify(draft))}catch{saveFailed=true}
 get('save').textContent=saveFailed?L('Draft storage is unavailable in this browser.','此瀏覽器無法儲存草稿。'):L('Draft saved in this browser.','草稿已儲存在此瀏覽器。');
}
function render(){
 document.documentElement.lang=zh?'zh-Hant':'en';get('lang').textContent=zh?'En':'繁';get('lang').setAttribute('aria-label',L('切換為繁體中文','Switch to English'));
 const beatRows=draft.beats.map((b,i)=>`<section class="beat"><div class="time">${L('BEAT','段落')} ${i+1} · <span id="time${i}"></span></div><label for="act${i}">${L('What changes on screen?','畫面中發生什麼變化？')}</label><textarea id="act${i}" data-key="action" data-i="${i}">${esc(b.action)}</textarea><div class="row"><div><label for="intent${i}">${L('Viewer attention','觀眾注意力')}</label><select id="intent${i}" data-key="choice" data-i="${i}">${choices.map((c,j)=>`<option value="${j}" ${+b.choice===j?'selected':''}>${c[zh?1:0]}</option>`).join('')}</select></div><div><label for="sec${i}">${L('Seconds','秒數')}</label><input type="number" min="1" max="120" step="1" id="sec${i}" data-key="seconds" data-i="${i}" value="${esc(b.seconds)}"></div></div><p class="hint" id="tech${i}"></p><div class="action">${[['up',L('Earlier','往前移'),i===0],['down',L('Later','往後移'),i===draft.beats.length-1],['remove',L('Remove beat','移除此段'),draft.beats.length===1]].map(([cmd,title,disabled])=>`<button data-cmd="${cmd}" data-i="${i}" ${disabled?'disabled':''}>${title}</button>`).join('')}</div></section>`).join('');
 get('editor').innerHTML=`<div class="head"><div class="eyebrow">${L('MODULE 01 / SEQUENCE EDITOR','模組 01 / 鏡頭編排')}</div><h1>Sightline</h1><p>${L('Write what you see. Direct what the viewer notices next.','寫下眼前的畫面，再決定觀眾接下來會注意到什麼。')}</p></div><div class="grid"><div class="form"><div class="box"><h2>${L('Scene','場景')}</h2><div class="action"><span class="hint">${L('Try a scene','試用範例')}</span><button data-demo="0">${L('Last bus','末班公車')}</button><button data-demo="1">${L('Woodland loop','林間循環')}</button></div><label for="idea">${L('What do you picture?','你腦中浮現什麼畫面？')}</label><textarea id="idea" data-key="idea" placeholder="${L('A place, a subject, and something about to change…','一個地點、一個主體，以及即將發生的變化⋯')}" >${esc(draft.idea)}</textarea><label for="ratio">${L('Frame shape','畫面比例')}</label><select id="ratio" data-key="ratio">${['16:9','9:16','1:1','4:3','2.39:1'].map(v=>`<option ${v===draft.ratio?'selected':''}>${v}</option>`).join('')}</select></div><div class="box"><h2>${L('Timed beats','段落時間軸')}</h2><p class="hint">${L('A beat is one change in attention or action. Several beats can share a continuous shot.','每段代表一次注意力或動作的轉變。一個連續鏡頭可包含多段。')}</p>${beatRows}<button id="add">＋ ${L('Add beat','新增段落')}</button></div><div class="box"><h2>${L('Look and sound','影像與聲音')}</h2>${[['light',L('Light, texture and palette','光線、質感與色調')],['sound',L('Sound or dialogue','聲音或對白')]].map(([key,label])=>`<label for="${key}">${label}</label><textarea id="${key}" data-key="${key}">${esc(draft[key])}</textarea>`).join('')}<label><input type="checkbox" data-key="loop" style="width:auto" ${draft.loop?'checked':''}> ${L('Match the ending to the opening for a loop','讓結尾銜接開頭，形成循環')}</label></div></div><aside class="box sticky"><p class="eyebrow">DIRECTOR’S OUTPUT</p><h2>${L('Video prompt','影片提示詞')}</h2><output id="out" aria-live="off"></output><div class="action"><button class="primary" id="copy">${L('Copy prompt','複製提示詞')}</button><button id="download">${L('Download .txt','下載 .txt')}</button></div><p role="status" id="notice" class="notice"></p><small id="save"></small></aside></div><footer><a href="index.html">${L('All three workspaces','返回工作區總覽')}</a></footer>`;
 update();
}
get('editor').addEventListener('input',e=>{
 const el=e.target,k=el.dataset.key;if(!k)return;
 if(el.dataset.i!==undefined) draft.beats[+el.dataset.i][k]=k==='choice'?+el.value:el.value;
 else draft[k]=el.type==='checkbox'?el.checked:el.value;
 get('notice').textContent='';update();
});
get('editor').addEventListener('click',async e=>{
 const el=e.target.closest('button');if(!el)return;
 if(el.dataset.demo!==undefined){
   if(JSON.stringify(draft)!==JSON.stringify(blank())&&!confirm(L('Replace the current draft with this example?','以此範例取代目前草稿？')))return;
   draft=JSON.parse(JSON.stringify(examples[+el.dataset.demo]));render();return;
 }
 if(el.id==='copy'){try{await navigator.clipboard.writeText(compile());get('notice').textContent=L('Prompt copied.','已複製提示詞。')}catch{const range=document.createRange();range.selectNodeContents(get('out'));const sel=getSelection();sel.removeAllRanges();sel.addRange(range);get('notice').textContent=L('Prompt selected. Use your browser’s Copy command.','已選取提示詞，請使用瀏覽器的複製功能。')}return}
 if(el.id==='download'){const url=URL.createObjectURL(new Blob([compile()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='sightline-prompt.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);return}
 let focus;
 if(el.id==='add'){draft.beats.push({action:'',choice:0,seconds:3});focus=draft.beats.length-1}
 else if(el.dataset.cmd){const i=Number(el.dataset.i);if(el.dataset.cmd==='remove'){draft.beats.splice(i,1);focus=Math.min(i,draft.beats.length-1)}else{focus=i+(el.dataset.cmd==='up'?-1:1);[draft.beats[i],draft.beats[focus]]=[draft.beats[focus],draft.beats[i]]}}
 else return;
 render();get('act'+focus).focus();
});
get('lang').onclick=()=>{zh=!zh;try{localStorage.setItem('cinema.lang',zh?'zh':'en')}catch{}render()};render();
