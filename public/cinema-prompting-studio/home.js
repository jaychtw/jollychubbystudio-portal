const rooms=[
 ['Sightline','sightline.html','Direct a sequence','編排鏡頭節奏','Describe what catches your eye, place each change on a timeline, and export a timed video prompt.','描述觀眾注意到的細節，安排每次變化的時機，匯出帶有時間標記的影片提示詞。'],
 ['FrameCraft','framecraft_interactive_cinematography_frame_builder.html','Compose a frame','設計畫面構圖','Arrange elements in a frame and inspect the prompt that describes their positions.','在畫面中排列元素，查看描述位置與構圖的提示詞。'],
 ['CinePrompt Studio','cineprompt_studio_video_idea_to_cinematography_translator.html','Explore camera settings','探索攝影設定','Combine your video idea with choices from the cinematography deck and build a shot list.','輸入影片構想，搭配攝影選項，整理成分鏡清單。']
];
let zh=false;try{zh=localStorage.getItem('cinema.lang')==='zh'}catch{}
function paint(){
 document.documentElement.lang=zh?'zh-Hant':'en';
 document.querySelectorAll('[data-en]').forEach(el=>el.textContent=zh?el.dataset.zh:el.dataset.en);
 const lang=document.querySelector('#lang');lang.textContent=zh?'En':'繁';lang.setAttribute('aria-label',zh?'Switch to English':'切換為繁體中文');
 document.querySelector('#cards').innerHTML=rooms.map(([name,path,en,tw,desc,descTw],i)=>`<article class="card"><p class="eyebrow">${zh?'模組':'MODULE'} 0${i+1} / ${zh?tw:en}</p><h3>${name}</h3><p>${zh?descTw:desc}</p><a class="link ${i?'':'primary'}" href="${path}">${zh?'開啟':'Open'} ${name}</a></article>`).join('');
}
document.querySelector('#lang').onclick=()=>{zh=!zh;try{localStorage.setItem('cinema.lang',zh?'zh':'en')}catch{}paint()};paint();
