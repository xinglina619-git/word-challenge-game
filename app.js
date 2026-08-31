const TITLES = [
  '词灵新生', '萌芽学徒', '荣耀课代表', '单词探索家', '拼写逍遥王',
  '语音魔法师', '句子炼金师', '词灵斗战神', '星河守护者', '词灵大师'
];

const SPIRITS = PetSystem.PETS;

const BACKGROUND_MUSIC_SRC = '/assets/snake-countdown-bgm.mp3';
const backgroundMusic = new Audio(BACKGROUND_MUSIC_SRC);
backgroundMusic.loop = true;
backgroundMusic.preload = 'auto';
backgroundMusic.volume = .28;

const PRAISE_VOICE_PROFILES = {
  'GOOD JOB': { rate: 1.05, pitch: 1.42, volume: .90, chime: [784, 988], cheerBursts: 2 },
  NICE: { rate: 1.04, pitch: 1.45, volume: .92, chime: [784, 988, 1175], cheerBursts: 2 },
  GREAT: { rate: 1.01, pitch: 1.48, volume: .94, chime: [659, 880, 1175], cheerBursts: 3 },
  EXCELLENT: { rate: .96, pitch: 1.52, volume: .96, chime: [659, 880, 1175, 1397], cheerBursts: 3 },
  UNBELIEVABLE: { rate: .88, pitch: 1.58, volume: .98, chime: [659, 988, 1319, 1760, 1976], cheerBursts: 4 }
};

function selectVoiceForRole(voices = [], role = 'learning', excludedURI = '') {
  const english = voices.filter(voice => /^en([-_]|$)/i.test(voice.lang || '') || /english/i.test(voice.name || ''));
  const pool = english.length ? english : voices;
  const available = pool.filter(voice => !excludedURI || voice.voiceURI !== excludedURI);
  const candidates = available.length ? available : pool;
  const preferences = role === 'praise'
    ? ['child', 'kid', 'young', 'cartoon', 'zira', 'hazel', 'salli', 'victoria', 'female']
    : ['child', 'kid', 'young', 'ana', 'jenny', 'aria', 'samantha', 'ava', 'natural'];
  return [...candidates].sort((a, b) => {
    const score = voice => preferences.reduce((sum, keyword, index) => (
      sum + ((voice.name || '').toLowerCase().includes(keyword) ? preferences.length - index : 0)
    ), 0);
    return score(b) - score(a);
  })[0] || null;
}

const SHOP_TOOLS = Object.freeze([
  { id: 'hint', icon: '🔮', name: '智慧镜', description: '提示一次最佳移动', price: 60 },
  { id: 'shuffle', icon: '🎲', name: '旋风骰', description: '重新排列一次棋盘', price: 90 },
  { id: 'addMoves', icon: '⏳', name: '时光沙漏', description: '当前关卡增加5步', price: 120 }
]);

const VISUAL_WORDS = Object.fromEntries(`
apple|🍎;banana|🍌;orange|🍊;pear|🍐;grape|🍇;watermelon|🍉;strawberry|🍓;lemon|🍋;peach|🍑;fruit|🍎;bread|🍞;rice|🍚;noodles|🍜;noodle|🍜;egg|🥚;milk|🥛;water|💧;juice|🧃;tea|🍵;coffee|☕;cake|🍰;cookie|🍪;candy|🍬;chocolate|🍫;hamburger|🍔;sandwich|🥪;ice cream|🍦;ice-cream|🍦;meat|🥩;chicken|🍗;fish|🐟;vegetable|🥬;carrot|🥕;salad|🥗;honey|🍯;salt|🧂;
cat|🐱;dog|🐶;bird|🐦;rabbit|🐰;duck|🦆;panda|🐼;tiger|🐯;lion|🦁;monkey|🐵;elephant|🐘;kangaroo|🦘;bear|🐻;horse|🐴;mouse|🐭;fox|🦊;bee|🐝;sheep|🐑;pig|🐷;frog|🐸;turtle|🐢;animal|🐾;sun|☀️;star|⭐;moon|🌙;cloud|☁️;rain|🌧️;wind|💨;tree|🌳;flower|🌸;rose|🌹;grass|🌿;bamboo|🎋;mountain|⛰️;river|🏞️;lake|🏞️;forest|🌲;beach|🏖️;
book|📘;pen|🖊️;pencil|✏️;ruler|📏;eraser|🧽;bag|🎒;schoolbag|🎒;desk|🪑;chair|🪑;table|🪵;clock|🕐;door|🚪;window|🪟;bed|🛏️;sofa|🛋️;fridge|🧊;umbrella|☂️;key|🔑;box|📦;phone|📱;computer|💻;keyboard|⌨️;screen|🖥️;camera|📷;video|🎬;car|🚗;bus|🚌;train|🚆;plane|✈️;ship|🚢;boat|⛵;bike|🚲;taxi|🚕;scooter|🛴;motorbike|🏍️;
shirt|👕;coat|🧥;dress|👗;shoe|👟;shoes|👟;sock|🧦;trousers|👖;hat|🧢;sweater|🧶;jacket|🧥;kite|🪁;ball|⚽;football|⚽;basketball|🏀;piano|🎹
`.trim().split(';').map(entry => entry.trim()).filter(Boolean).map(entry => entry.split('|')));

Object.assign(VISUAL_WORDS, Object.fromEntries(`
pencil case|🖍️;tooth|🦷;teeth|🦷;teddy bear|🧸;doll|🪆;puzzle|🧩;skipping rope|🪢;skip rope|🪢;
grandpa|👴;grandfather|👴;grandma|👵;grandmother|👵;father|👨;dad|👨;mother|👩;mum|👩;sister|👧;brother|👦;baby|👶;boy|👦;girl|👧;child|🧒;kid|🧒;family|👨‍👩‍👧‍👦;friend|🧑‍🤝‍🧑;classmate|🧑‍🤝‍🧑;student|🧑‍🎓;person|🧍;son|👦;
house|🏠;home|🏠;living room|🛋️;bedroom|🛏️;washroom|🚻;toilet|🚻;bathroom|🛁;kitchen|🍳;room|🚪;floor|🧱;closet|🚪;sink|🚰;stairs|🪜;stair|🪜;fan|🪭;blackboard|👩‍🏫;classroom|🏫;school|🏫;music classroom|🎵;computer classroom|💻;lunchroom|🍽️;playground|🛝;swimming pool|🏊;
spider|🕷️;deer|🦌;snake|🐍;dragon|🐉;cow|🐄;goat|🐐;pet|🐾;zoo|🦁;
orange juice|🧃;french fries|🍟;chips|🍟;sausage|🌭;breakfast|🍽️;lunch|🍱;dinner|🍽️;tomato|🍅;potato|🥔;soup|🍲;dessert|🍮;dumpling|🥟;dimsum|🥟;dimsums|🥟;pancake|🥞;bun|🥯;steak|🥩;coke|🥤;bottle|🍾;glass|🥛;cup|☕;can|🥫;chopstick|🥢;chopsticks|🥢;bowl|🥣;plate|🍽️;knife|🔪;fork|🍴;oil|🫗;
dance|💃;draw|🎨;drawing|🎨;draw pictures|🎨;ride a bike|🚲;play the piano|🎹;skate|⛸️;fly a kite|🪁;play football|⚽;play basketball|🏀;play tennis|🎾;tennis|🎾;ping-pong|🏓;table tennis|🏓;swim|🏊;swimming|🏊;run|🏃;running|🏃;walk|🚶;walking|🚶;climb|🧗;climbing|🧗;mountain climbing|🧗;fishing|🎣;go fishing|🎣;hiking|🥾;go hiking|🥾;camp|⛺;camping|⛺;ski|🎿;skiing|🎿;kung fu|🥋;learn kung fu|🥋;sports|🏃;play sports|🏃;jump|🤸;long jump|🤸;high jump|🤸;
t-shirt|👕;skirt|👗;jeans|👖;shorts|🩳;socks|🧦;boots|🥾;scarf|🧣;sunglasses|🕶️;sanDALS|🩴;trainers|👟;clothes|👚;
newspaper|📰;letter|✉️;invitation|💌;card|🃏;stamp|📮;comic|📖;poster|🪧;model|🧩;coloured pencil|🖍️;colored pencil|🖍️;watch|⌚;
read|📖;reading|📖;read books|📚;mop|🧹;mop the floor|🧹;sweep|🧹;sweep the floor|🧹;wash up|🧽;wash face|🧼;brush teeth|🪥;comb hair|🪮;get dressed|👕;set the table|🍽️;do a puzzle|🧩;do puzzle|🧩;watch tv|📺;tv|📺;
policeman|👮;policewoman|👮‍♀️;police officer|👮;doctor|🧑‍⚕️;nurse|👩‍⚕️;engineer|👷;manager|🧑‍💼;teacher|🧑‍🏫;driver|🚕;cartoonist|🎨;fireman|👨‍🚒;firefighter|👨‍🚒;farmer|🧑‍🌾;worker|👷;job|💼;
bookstore|📚;bookshop|📚;park|🏞️;supermarket|🛒;market|🛒;shop|🛍️;mall|🏬;cinema|🎦;museum|🏛️;hospital|🏥;bank|🏦;post office|📮;train station|🚉;station|🚉;restaurant|🍽️;police station|👮;hotel|🏨;palace|🏰;farm|🚜;city|🏙️;town|🏘️;street|🛣️;road|🛣️;crossing|🚸;gate|🚪;centre|🎯;center|🎯;place|📍;
snow|❄️;snowman|⛄;spring|🌸;summer|☀️;autumn|🍂;fall|🍂;winter|❄️;season|🍂;weather|🌦️;cloudy|☁️;rainy|🌧️;windy|💨;snowy|🌨️;wet|💦;temperature|🌡️;sky|🌌;
face|🙂;ear|👂;eye|👁️;nose|👃;mouth|👄;hair|💇;head|👤;hand|✋;finger|☝️;arm|💪;leg|🦵;foot|🦶;feet|🦶;heart|❤️;body|🧍;
morning|🌅;afternoon|🌤️;evening|🌆;night|🌙;noon|🕛;hour|🕐;date|📅;month|📅;weekday|📅;weekend|🗓️;tuesday|📅;wednesday|📅;thursday|📅;friday|📅;september|🍂;december|❄️;february|🌸;march|🌱;june|☀️;august|☀️;
art|🎨;music|🎵;music show|🎵;pe|🏃;science|🔬;maths|🔢;math|🔢;team|👥;meeting|👥;open day|🏫;test|📝;plan|📝;rule|📜;rules|📜;road sign|🚸;safety rules|⚠️;
country|🌍;england|🇬🇧;london|🇬🇧;australia|🇦🇺;china|🇨🇳;america|🇺🇸;new york|🗽;newyork|🗽;hong kong|🌆;hongkong|🌆;the great wall|🧱;great wall|🧱;summer palace|🏯;valley|🏞️;island|🏝️;underground|🚇;
travel|🧳;trip|🧳;tour|🧳;outdoors|🏕️;plant|🌱;traffic|🚦;traffic light|🚦;light|💡;safety|⚠️;direction|🧭;money|💰;stranger|👤;cut|✂️;match|🏆;surprise|🎁;life|🌱;ability|💪;a box of eggs|🥚;grow flowers|🌼;eat hamburgers|🍔;good at climbing|🧗
`.trim().split(';').map(entry => entry.trim()).filter(Boolean).map(entry => entry.toLowerCase().split('|'))));

Object.assign(VISUAL_WORDS, Object.fromEntries(`
new|✨;one|1️⃣;two|2️⃣;three|3️⃣;four|4️⃣;five|5️⃣;six|6️⃣;seven|7️⃣;eight|8️⃣;nine|9️⃣;ten|🔟;eleven|1️⃣1️⃣;twelve|1️⃣2️⃣;thirty|3️⃣0️⃣;
red|🔴;yellow|🟡;green|🟢;blue|🔵;purple|🟣;pink|🌸;black|⚫;white|⚪;colour|🎨;coloured|🎨;color|🎨;left|⬅️;right|➡️;left hand|👈;right hand|👉;
fly|🕊️;sleep|😴;eat|🍽️;cook|👩‍🍳;play|🛝;wash|🧼;feed|🥣;sing|🎤;drink|🥤;collect|🗃️;talk|🗣️;talking|🗣️;speak|🗣️;count|🔢;look for|🔎;write|✍️;spell|🔤;listen|👂;nod|🙂;help|🤝;teach|🧑‍🏫;put on|👕;buy|🛍️;
get up|⏰;wake up|⏰;wake (up)|⏰;go to school|🏫;go home|🏠;go to bed|🛏️;do my homework|📝;have breakfast|🍽️;have lunch|🍱;have dinner|🍽️;brush my teeth|🪥;wash my face|🧼;comb my hair|🪮;pack my schoolbag|🎒;have class|🏫;go to a school club|🎯;
fly-flying|🕊️;skate-skating|⛸️;skip-skipping|🪢;ride-riding|🚲;drink-drinking|🥤;swim-swimming|🏊;sing-singing|🎤;mopping the floor|🧹;washing up|🧽;setting the table|🍽️;on foot|🚶;
sunday|📅;monday|📅;saturday|📅;today|📅;tomorrow|➡️;sunny|☀️;cold|🥶;hot|🥵;cool|🍃;warm|🌤️;dry|🏜️;go skating|⛸️;go swimming|🏊;make a snowman|⛄;
chinese|🇨🇳;english|🇬🇧;show me|👀;look|👀;see|👀;quiet|🤫;keep quiet|🤫;face the speaker|🗣️;nod my head|🙂;listen to my teacher|👂;put up my hand|🙋;follow me|🚶;fly like a bird|🕊️;run like a horse|🐎;swim like a fish|🐟;jump like a monkey|🐒;walk like a bear|🐻;
class|🏫;a music show|🎵;dream|💭;ten o'clock|🕙;half past ten|🕥;ten thirty|🕥;nine ten|🕘;eight twenty|🕗;seven forty|🕗;six fifty|🕖;half an hour|🕧;
classroom rules|📜;don't run in the classroom|🚫;do your best|💪;take turns to speak|🔁;say nice words|💬;give a helping hand|🤝;put away your things|🧺;listen carefully|👂;on duty|🫡;line leader|🚶;lunch helper|🍱;teacher helper|🧑‍🏫;carry food boxes|📦;hand out food|🍱;hand out papers|📄;put away books|📚;keep to the right|➡️;get in line|🚶;hold the door|🚪;in the toilet|🚻;close the window|🪟;turn on the lights|💡;use the computer with care|💻;wash your hands|🧼;stop on red|🛑;look left|⬅️;look right|➡️;go on green|🟢;
hobby|🎨;children's palace|🏰;a cup of|☕;a bottle of|🍾;starter|🥗;main course|🍽️;smell|👃;sweet|🍬;salty|🧂;healthy|🥗;hungry|😋;fresh|🌿;western|🌍;sour|🍋;degree|🌡️;outside|🏕️;lunchtime|🍱;go camping|⛺;invite|💌;arrive|📍;call|📞;leave|👋;american|🇺🇸;australian|🇦🇺;the summer palace|🏯;take a walk|🚶;careful|⚠️;hurt|🤕;get hurt|🤕;sharp|🔪;watch out|⚠️;fall down|🤕;dangerous|⚠️;safe|✅;cross|🚸;in trouble|🆘;lost|🧭;straight ahead|⬆️;short cut|↗️;take the first right|↪️;on time|⏰
`.trim().split(';').map(entry => entry.trim()).filter(Boolean).map(entry => entry.toLowerCase().split('|'))));

const TIPS = [
  '三消关需要达到目标积分，并认识足够多的不同单词。',
  '单词消除后会自动依次朗读英文和中文，词块随后直接消失。',
  '连续五次消对会触发金币爆发。',
  '四个相同词块会产生更强的范围消除。',
  '听发音时，注意单词开头和结尾的声音。',
  '错词会进入错词本，连续答对两次即可掌握。',
  '完成学习可以赚金币，为宠物购买食物。',
  '高级食物会带来更多成长值和更特别的互动。',
  '没有可消除组合时，棋盘会自动重新排列。'
];

function readAudioSettings(storage = localStorage) {
  const enabled = key => storage.getItem(key) !== 'off';
  return {
    music: enabled('word_spirit_music'),
    effects: enabled('word_spirit_effects'),
    speech: enabled('word_spirit_speech')
  };
}

function audioIcon(audio) {
  if (!audio.music && !audio.effects && !audio.speech) return '静音';
  return '声音';
}

const state = {
  token: localStorage.getItem('word_spirit_token') || localStorage.getItem('general_token'),
  user: null,
  view: 'loading',
  game: null,
  result: null,
  leaderboard: [],
  currentRank: null,
  notice: '',
  auth: { busy: false, error: '', success: '', phone: '', passwordVisible: false },
  tip: Math.floor(Math.random() * TIPS.length),
  tipTimer: null,
  audio: readAudioSettings(),
  audioPanel: false,
  petBusy: false,
  selectedPetId: '',
  lastPetQuote: ''
};

const app = document.querySelector('#app');
const GRADED = window.GAME_CONTENT.gradedMain;
const GRADE4 = window.GAME_CONTENT.grade4Book.units;
const TEXTBOOK = window.TEXTBOOK_WORDS?.grades || {};
let audioContext;
let learnedWordQueue = Promise.resolve();

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}
function shuffle(items) { return [...items].sort(() => Math.random() - .5); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  }).then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '请求失败');
    return data;
  });
}
function syncLearnedWord(word, result) {
  learnedWordQueue = learnedWordQueue.catch(() => {}).then(() => api('/api/learned-word', {
    method: 'POST', body: JSON.stringify({ word, result })
  }));
  return learnedWordQueue;
}
function normalizedProgress() {
  const p = state.user.progress ||= {};
  p.stage = Math.max(1, Number(p.stage || 1));
  p.coins = Math.max(0, Number(p.coins || 0));
  p.xp = Math.max(0, Number(p.xp || 0));
  p.tickets = Math.max(0, Number(p.tickets || 0));
  p.dust = Math.max(0, Number(p.dust || 0));
  p.streak = Math.max(0, Number(p.streak || 0));
  p.collected = Array.isArray(p.collected) ? p.collected : [];
  p.mistakes = p.mistakes && typeof p.mistakes === 'object' ? p.mistakes : {};
  p.spirits = p.spirits && typeof p.spirits === 'object' ? p.spirits : { lingling: 1 };
  p.spirits.lingling ||= 1;
  p.equipped = p.spirits[p.equipped] ? p.equipped : 'lingling';
  p.inventory = { hint: 3, shuffle: 2, addMoves: 1, ...(p.inventory || {}) };
  p.tutorials = {
    match3: Boolean(p.tutorials?.match3),
    pair: Boolean(p.tutorials?.pair)
  };
  p.draws = Math.max(0, Number(p.draws || 0));
  p.pity = Math.max(0, Number(p.pity || 0));
  p.bestCombo = Math.max(0, Number(p.bestCombo || 0));
  p.pet = PetSystem.normalizePetState(p.pet);
  p.learnedWords = ReviewGames.normalizeLearnedWords(p.learnedWords || p.collected);
  p.review = ReviewGames.normalizeReview(p.review);
  p.migrationVersion = Math.max(0, Number(p.migrationVersion || 0));
  return p;
}
function titleFor(stage) { return TITLES[Math.min(9, Math.floor((Math.max(1, stage) - 1) / 10))]; }
function gradeFor(level) { return Math.min(5, Math.ceil(level / 20)); }
function starsForGame(game) {
  if (game.mode === 'spelling') return ReviewGames.starsForSpelling(game.retryCount);
  if (game.mode === 'falling') return ReviewGames.starsForFalling(game.remainingRatios);
  if (game.mode === 'pair') {
    if (game.pairMistakes === 0) return 3;
    if (game.pairMistakes <= 2) return 2;
    return 1;
  }
  return game.moves >= 10 ? 3 : game.moves >= 5 ? 2 : 1;
}
function xpLevel(xp) { return Math.floor(xp / 100) + 1; }
function persistProgress() {
  return api('/api/progress', { method: 'PATCH', body: JSON.stringify(normalizedProgress()) })
    .then(data => { state.user = data.user; return data.user; });
}
function toast(message) {
  state.notice = message;
  render();
  setTimeout(() => { state.notice = ''; render(); }, 2100);
}

function tone(frequency, start = 0, duration = .12, type = 'sine', volume = .05) {
  if (!state.audio.effects) return;
  try {
    audioContext ||= new AudioContext();
    audioContext.resume();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now + start);
    gain.gain.setValueAtTime(.001, now + start);
    gain.gain.exponentialRampToValueAtTime(volume, now + start + .015);
    gain.gain.exponentialRampToValueAtTime(.001, now + start + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + .03);
  } catch {}
}
function noise(start = 0, duration = .08, volume = .025) {
  if (!state.audio.effects) return;
  try {
    audioContext ||= new AudioContext();
    const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * duration), audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain).connect(audioContext.destination);
    source.start(audioContext.currentTime + start);
  } catch {}
}
function soundPop(count = 1) {
  noise(0, .11 + Math.min(count, 8) * .012, .045);
  for (let i = 0; i < Math.min(8, count); i += 1) tone(480 + i * 105, i * .032, .12, i % 2 ? 'triangle' : 'square', .05);
}
function soundWrong() { tone(210, 0, .18, 'triangle', .025); }
function soundCombo(combo) {
  noise(0, .14, .035);
  [659, 784, 988, 1318].forEach((note, i) => tone(note + combo * 20, i * .065, .19, 'triangle', .065));
}
function soundCoinBurst() {
  noise(0, .55, .075);
  [659, 784, 988, 1175, 1568, 1976].forEach((note, i) => tone(note, i * .075, .28, 'triangle', .082));
}
function soundSpecial(kind, count = 3) {
  soundPop(count);
  if (kind === 'rocket') {
    for (let i = 0; i < 8; i += 1) tone(300 + i * 115, i * .035, .13, 'sawtooth', .045);
    noise(.22, .32, .09);
  }
  if (kind === 'burst') {
    tone(130, 0, .42, 'sawtooth', .08);
    noise(.08, .45, .11);
    [520, 740, 960].forEach((note, i) => tone(note, .12 + i * .055, .3, 'square', .045));
  }
  if (kind === 'rainbow') {
    [523, 659, 784, 1047, 1319, 1568].forEach((note, i) => tone(note, i * .07, .38, 'triangle', .075));
    noise(.28, .5, .08);
  }
}
function soundDraw(rarity) {
  if (rarity === '传说') {
    noise(0, .7, .085);
    [392, 523, 659, 784, 1047, 1319, 1568].forEach((note, i) => tone(note, i * .12, .42, 'triangle', .09));
  } else if (rarity === '稀有') {
    [523, 659, 784, 1047].forEach((note, i) => tone(note, i * .1, .3, 'triangle', .075));
  } else {
    [523, 659, 784].forEach((note, i) => tone(note, i * .08, .2, 'sine', .05));
  }
}
function startMusic() {
  if (!state.audio.music || !backgroundMusic.paused) return;
  backgroundMusic.play().catch(() => {});
}
function stopMusic(reset = false) {
  backgroundMusic.pause();
  if (reset) backgroundMusic.currentTime = 0;
}
function toggleAudioChannel(channel) {
  if (!['music', 'effects', 'speech'].includes(channel)) return;
  state.audio[channel] = !state.audio[channel];
  localStorage.setItem(`word_spirit_${channel}`, state.audio[channel] ? 'on' : 'off');
  if (channel === 'music') {
    if (state.audio.music) startMusic(); else stopMusic();
  }
  render();
}
function audioSettingsPanel() {
  const row = (channel, icon, label, note = '') => `<button class="audio-channel ${state.audio[channel] ? 'on' : 'off'}" data-action="toggle-audio" data-audio="${channel}" aria-pressed="${state.audio[channel]}"><span>${icon}</span><b>${label}</b><em>${state.audio[channel] ? '已开启' : '已关闭'}</em>${note ? `<small>${note}</small>` : ''}</button>`;
  return `<div class="modal-backdrop audio-backdrop"><section class="audio-panel" role="dialog" aria-modal="true" aria-label="声音设置"><div class="audio-panel-head"><div><small>学习环境</small><h2>声音设置</h2></div><button class="close" data-action="close-audio-settings" aria-label="关闭声音设置">×</button></div>${row('music', '🎵', '背景音乐')}${row('effects', '✨', '游戏音效')}${row('speech', '🔊', '单词朗读', '建议保留，帮助学习发音')}<button class="audio-help" data-action="play-help">查看玩法帮助</button></section></div>`;
}
let lastLearningVoiceURI = '';
let cachedSystemVoices = [];
let voiceReadyPromise = null;
function cacheSystemVoices(voices = []) {
  if (Array.isArray(voices) && voices.length) cachedSystemVoices = [...voices];
  return cachedSystemVoices;
}
function systemVoices() {
  return cacheSystemVoices(window.speechSynthesis?.getVoices?.() || []);
}
function waitForSystemVoices(timeout = 700) {
  const available = systemVoices();
  if (available.length || !('speechSynthesis' in window)) return Promise.resolve(available);
  if (voiceReadyPromise) return voiceReadyPromise;
  voiceReadyPromise = new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(systemVoices());
    };
    window.speechSynthesis.addEventListener?.('voiceschanged', finish, { once: true });
    setTimeout(finish, timeout);
  });
  return voiceReadyPromise;
}
function createLearningUtterance(word, voices = systemVoices()) {
  const voicePool = cacheSystemVoices(voices);
  const line = new SpeechSynthesisUtterance(word);
  line.lang = 'en-US';
  line.rate = .78;
  line.pitch = 1.18;
  line.volume = 1;
  line.voiceRole = 'learning';
  line.voice = selectVoiceForRole(voicePool, 'learning');
  return line;
}
function selectVoiceForLanguage(voices = [], language = 'zh') {
  const prefix = `${language}`.toLowerCase();
  return voices.find(voice => `${voice.lang || ''}`.toLowerCase().startsWith(prefix))
    || voices.find(voice => language === 'zh' && /xiaoxiao|huihui|yaoyao|chinese|mandarin/i.test(voice.name || ''))
    || null;
}
function createMeaningUtterance(text, voices = systemVoices()) {
  const line = new SpeechSynthesisUtterance(text);
  line.lang = 'zh-CN';
  line.rate = .86;
  line.pitch = 1.08;
  line.volume = 1;
  line.voiceRole = 'meaning';
  line.voice = selectVoiceForLanguage(cacheSystemVoices(voices), 'zh');
  return line;
}
function createLearningUtterances(record, voices = systemVoices()) {
  return [createLearningUtterance(record.word, voices), createMeaningUtterance(record.zh, voices)];
}
function createPraiseUtterance(praise, excludedURI = lastLearningVoiceURI, voices = systemVoices()) {
  const voicePool = cacheSystemVoices(voices);
  const profile = PRAISE_VOICE_PROFILES[praise] || PRAISE_VOICE_PROFILES['GOOD JOB'];
  const line = new SpeechSynthesisUtterance(`${praise}!`);
  line.lang = 'en-US';
  line.rate = profile.rate;
  line.pitch = profile.pitch;
  line.volume = profile.volume;
  line.voiceRole = 'praise';
  line.voice = selectVoiceForRole(voicePool, 'praise', excludedURI);
  return line;
}
function soundPraiseCue(praise) {
  const profile = PRAISE_VOICE_PROFILES[praise] || PRAISE_VOICE_PROFILES['GOOD JOB'];
  profile.chime.forEach((note, index) => tone(note, index * .055, .18 + index * .018, 'triangle', .035 + index * .004));
  for (let index = 0; index < profile.cheerBursts; index += 1) {
    const start = .08 + index * .105;
    noise(start, .055, .032 + index * .003);
    noise(start + .035, .035, .018);
  }
}
async function speakPraiseFallback(praise) {
  if (!state.audio.speech || !('speechSynthesis' in window)) return;
  await waitForSystemVoices();
  const line = createPraiseUtterance(praise, lastLearningVoiceURI);
  window.speechSynthesis.speak(line);
}
function cancelSpeech() {
  window.speechSynthesis?.cancel?.();
}
if ('speechSynthesis' in window) {
  cacheSystemVoices(window.speechSynthesis.getVoices?.() || []);
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cacheSystemVoices(window.speechSynthesis.getVoices?.() || []);
    voiceReadyPromise = null;
  });
}
async function speakWord(word) {
  if (!state.audio.speech || !('speechSynthesis' in window)) return;
  await waitForSystemVoices();
  const line = createLearningUtterance(word);
  lastLearningVoiceURI = line.voice?.voiceURI || '';
  cancelSpeech();
  window.speechSynthesis.speak(line);
}

function growthStage(level = 1) {
  const stage = PetSystem.petStageForLevel(level);
  return stage === 'best' ? 4 : stage === 'shining' ? 3 : stage === 'growing' ? 2 : 1;
}
function growthName(level = 1) { return ['幼年期', '成长期', '闪耀期', '最佳伙伴'][growthStage(level) - 1]; }
function activeSpirit() {
  if (!state.user) return SPIRITS[0];
  return spiritById(normalizedProgress().pet.speciesId);
}
function spiritFigure(className = '', spirit = activeSpirit(), level) {
  const owned = level ?? (state.user?.progress?.pet?.level || 1);
  const unique = spirit.asset ? 'unique-spirit' : '';
  const style = spirit.asset ? `--spirit-image:url('${spirit.asset}')` : '';
  return `<span class="spirit-figure ${unique} growth-stage-${growthStage(owned)} ${className}" style="${style}" role="img" aria-label="${spirit.species || spirit.name || '学习伙伴'}"></span>`;
}
function spiritById(id) { return SPIRITS.find(item => item.id === id) || SPIRITS[0]; }
function petSpeech(scene) {
  if (!state.user) return '';
  const pet = normalizedProgress().pet;
  if (!pet.speciesId) return '';
  const quote = PetSystem.quoteFor(pet.speciesId, scene, state.lastPetQuote);
  state.lastPetQuote = quote;
  return quote;
}
function petGrowthPercent(pet) {
  if (pet.level >= 10) return 100;
  const previous = PetSystem.LEVEL_THRESHOLDS[pet.level - 1];
  const next = PetSystem.nextGrowthTarget(pet.level);
  return Math.max(0, Math.min(100, (pet.growth - previous) / (next - previous) * 100));
}
function petTargetMessage(progress) {
  const pet = progress.pet;
  if (!pet.speciesId) return '先领取一只属于你的学习伙伴吧！';
  if (pet.level >= 10) return `${pet.name}已经成为最佳学习伙伴，继续一起认识新单词吧！`;
  const affordable = PetSystem.FOODS.filter(food => progress.coins >= food.price).at(-1);
  if (affordable) return `金币已经够买${affordable.name}，可以去商店为${pet.name}准备一份！`;
  const nextFood = PetSystem.FOODS[0];
  if (progress.coins < nextFood.price) return `再赚 ${nextFood.price - progress.coins} 金币，就可以买${nextFood.name}啦！`;
  return `还差 ${PetSystem.nextGrowthTarget(pet.level) - pet.growth} 点成长值，${pet.name}就能升级了！`;
}

function gradeBank(grade) {
  if (grade === 4) {
    return GRADE4.flatMap(unit => unit.words.map(([word, zh]) => ({ word, zh, icon: '✦', source: `四年级 Unit ${unit.id}` })));
  }
  if (TEXTBOOK[grade]?.length) {
    return TEXTBOOK[grade].map(item => ({ ...item, icon: '✦' }));
  }
  return (GRADED[grade] || GRADED[5] || []).map(item => ({ ...item, source: `${grade}年级` }));
}
function wordsForLevel(level) {
  const grade = gradeFor(level);
  const bank = gradeBank(grade);
  const local = (level - 1) % 20;
  const count = grade <= 2 ? 5 : 6;
  const start = (local * count) % bank.length;
  const words = Array.from({ length: count }, (_, i) => bank[(start + i) % bank.length]);
  if (level % 10 === 0 && state.user) {
    const mistakes = Object.keys(normalizedProgress().mistakes);
    mistakes.slice(0, 2).forEach((word, index) => {
      const found = bank.find(item => item.word === word);
      if (found) words[index] = found;
    });
  }
  return words;
}

function modeForLevel(level) {
  return [1, 2].includes(level % 4) ? 'match3' : 'pair';
}
function missionForLevel(level) {
  if (level % 10 === 0) return { type: 'boss', name: '错词Boss战', icon: '👾', bonus: '击败Boss，错词强化训练' };
  if (level % 5 === 0) return { type: 'treasure', name: '星愿宝箱关', icon: '🎁', bonus: '通关额外获得学习金币' };
  return { type: 'normal', name: modeForLevel(level) === 'match3' ? '单词三消战' : '中英配对战', icon: modeForLevel(level) === 'match3' ? '💥' : '🔗', bonus: '完成挑战，积累词灵成长能量' };
}
function makePairs(words) {
  return shuffle(words.flatMap((word, type) => [
    { type, lang: 'en', text: word.word, matched: false },
    { type, lang: 'zh', text: word.zh, matched: false }
  ]));
}

const SIZE = 6;
function tileType(tile) { return typeof tile === 'object' ? tile.type : tile; }
function tileFace(tile) { return typeof tile === 'object' ? tile.face : 'en'; }
function faceChoicesForWord() {
  return ['en', 'zh'];
}
function makeTile(type, words) {
  const faces = faceChoicesForWord(words[type]);
  return { type, face: faces[Math.floor(Math.random() * faces.length)] };
}
function isMixedMeaningLine(line, board) {
  const faces = line.map(index => tileFace(board[index]));
  return faces.includes('en') && faces.some(face => face !== 'en');
}
function indexOf(row, col) { return row * SIZE + col; }
function cellOf(index) { return { row: Math.floor(index / SIZE), col: index % SIZE }; }
function adjacent(a, b) {
  const x = cellOf(a); const y = cellOf(b);
  return Math.abs(x.row - y.row) + Math.abs(x.col - y.col) === 1;
}
function swap(board, a, b) {
  const copy = [...board];
  [copy[a], copy[b]] = [copy[b], copy[a]];
  return copy;
}
function findMatchLines(board) {
  const lines = [];
  for (let row = 0; row < SIZE; row += 1) {
    let start = 0;
    for (let col = 1; col <= SIZE; col += 1) {
      if (col < SIZE && tileType(board[indexOf(row, col)]) === tileType(board[indexOf(row, start)])) continue;
      if (board[indexOf(row, start)] != null && col - start >= 3) {
        lines.push(Array.from({ length: col - start }, (_, i) => indexOf(row, start + i)));
      }
      start = col;
    }
  }
  for (let col = 0; col < SIZE; col += 1) {
    let start = 0;
    for (let row = 1; row <= SIZE; row += 1) {
      if (row < SIZE && tileType(board[indexOf(row, col)]) === tileType(board[indexOf(start, col)])) continue;
      if (board[indexOf(start, col)] != null && row - start >= 3) {
        lines.push(Array.from({ length: row - start }, (_, i) => indexOf(start + i, col)));
      }
      start = row;
    }
  }
  return lines.filter(line => isMixedMeaningLine(line, board));
}
function possibleMoves(board) {
  const moves = [];
  for (let index = 0; index < board.length; index += 1) {
    const { row, col } = cellOf(index);
    for (const next of [col < SIZE - 1 ? index + 1 : -1, row < SIZE - 1 ? index + SIZE : -1]) {
      if (next < 0 || (
        tileType(board[index]) === tileType(board[next])
        && tileFace(board[index]) === tileFace(board[next])
      )) continue;
      const changed = swap(board, index, next);
      const lines = findMatchLines(changed);
      if (lines.length) moves.push({ a: index, b: next, words: [...new Set(lines.map(line => tileType(changed[line[0]])))] });
    }
  }
  return moves;
}
function tutorialForGame(game, progress) {
  const mode = game.mode;
  if (progress.tutorials?.[mode]) return { active: false, mode, cells: [], step: 0 };
  if (mode === 'match3') {
    const move = possibleMoves(game.board)[0];
    return { active: Boolean(move), mode, cells: move ? [move.a, move.b] : [], step: 0 };
  }
  const first = game.pairs.findIndex(card => !card.matched);
  const second = game.pairs.findIndex((card, index) => (
    index !== first && !card.matched && card.type === game.pairs[first]?.type && card.lang !== game.pairs[first]?.lang
  ));
  return { active: first >= 0 && second >= 0, mode, cells: first >= 0 && second >= 0 ? [first, second] : [], step: 0 };
}
function coverageGoalFor(words) { return Math.min(4, words.length); }
function coverageComplete(game) { return game.mode !== 'match3' || game.learnedTypes.length >= game.coverageGoal; }
function levelComplete(game) {
  return game.mode === 'match3'
    ? game.score >= game.scoreGoal && coverageComplete(game)
    : game.done >= game.goal;
}
function unlearnedMove(game) {
  const learned = new Set(game.learnedTypes);
  return possibleMoves(game.board).find(move => move.words.some(type => !learned.has(type))) || null;
}
function makeBoard(words) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const board = [];
    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const { row, col } = cellOf(index);
      const blocked = new Set();
      if (col >= 2 && tileType(board[index - 1]) === tileType(board[index - 2])) blocked.add(tileType(board[index - 1]));
      if (row >= 2 && tileType(board[index - SIZE]) === tileType(board[index - SIZE * 2])) blocked.add(tileType(board[index - SIZE]));
      const choices = words.map((_, type) => type).filter(type => !blocked.has(type));
      const type = choices[Math.floor(Math.random() * choices.length)];
      board.push(makeTile(type, words));
    }
    if (possibleMoves(board).length) return board;
  }
  throw new Error('无法生成含有中英混合消除机会的棋盘');
}
function chooseTarget(game) {
  let moves = possibleMoves(game.board);
  if (!moves.length) {
    game.board = makeBoard(game.words);
    moves = possibleMoves(game.board);
  }
  const move = moves[Math.floor(Math.random() * moves.length)];
  const type = move?.words[Math.floor(Math.random() * move.words.length)] ?? 0;
  game.targetType = type;
  game.target = game.words[type];
  game.hintCells = [];
}
function newGame(level) {
  const words = wordsForLevel(level);
  const mode = modeForLevel(level);
  const mission = missionForLevel(level);
  const game = {
    runId: `${Date.now()}-${level}-${Math.random().toString(36).slice(2, 10)}`,
    level,
    grade: gradeFor(level),
    mode,
    mission,
    words,
    board: makeBoard(words),
    pairs: makePairs(words),
    target: null,
    targetType: 0,
    selected: null,
    hintCells: [],
    pairMistakes: 0,
    moves: mode === 'match3' ? 24 - Math.min(5, Math.floor((level - 1) / 20)) : words.length + 5,
    goal: mode === 'match3' ? 0 : words.length,
    scoreGoal: mode === 'match3'
      ? 360 + gradeFor(level) * 70 + ((level - 1) % 20) * 12 + (mission.type === 'boss' ? 120 : 0)
      : 0,
    done: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    sessionCoins: 0,
    busy: false,
    effect: '',
    exploding: [],
    learnedTypes: [],
    coverageGoal: coverageGoalFor(words),
    praise: '',
    tutorial: null,
    message: mode === 'match3' ? `自由寻找三连，达到积分并认识 ${coverageGoalFor(words)} 个不同单词` : '点击中文和对应英文，完成配对'
  };
  if (mode === 'pair') game.target = words[0];
  return game;
}
function newSpellingGame(level, words, random = Math.random) {
  const selected = ReviewGames.selectReviewWords(words, 2, random);
  return {
    runId: `${Date.now()}-${level}-spell-${Math.random().toString(36).slice(2, 10)}`,
    level,
    grade: gradeFor(level),
    mode: 'spelling',
    mission: { type: 'normal', name: '字母拼写挑战', icon: '🔤', bonus: '连续复习2个学过的单词，通关额外获得20金币' },
    questions: selected.map(item => ({ ...item, letters: ReviewGames.shuffledLetters(item.word, random), selectedIndices: [], wrongAttempts: 0 })),
    questionIndex: 0,
    retryCount: 0,
    done: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    sessionCoins: 0,
    busy: false,
    message: '听发音、看中文，再按顺序点出英文单词',
    petQuote: ''
  };
}
function currentSpellingQuestion(game) { return game?.questions?.[game.questionIndex] || null; }
function spellingAnswer(game = state.game) {
  const question = currentSpellingQuestion(game);
  return question ? question.selectedIndices.map(index => question.letters[index]?.letter || '').join('') : '';
}
function chooseSpellingLetter(index, game = state.game) {
  const question = currentSpellingQuestion(game);
  if (!question || game.busy || question.selectedIndices.includes(index) || !question.letters[index]) return false;
  question.selectedIndices.push(index);
  if (game === state.game) render();
  return true;
}
function undoSpellingLetter(game = state.game) {
  const question = currentSpellingQuestion(game);
  if (!question || game.busy || !question.selectedIndices.length) return false;
  question.selectedIndices.pop();
  if (game === state.game) render();
  return true;
}
function clearSpellingLetters(game = state.game) {
  const question = currentSpellingQuestion(game);
  if (!question || game.busy) return false;
  question.selectedIndices = [];
  if (game === state.game) render();
  return true;
}
function applySpellingAnswer(game) {
  const question = currentSpellingQuestion(game);
  if (!question) return { status: 'failed' };
  const answer = spellingAnswer(game);
  if (answer === question.word.replace(/[^a-z]/gi, '').toLowerCase()) {
    game.done += 1;
    game.score += 200;
    game.combo += 1;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    game.questionIndex += 1;
    return { status: game.done >= game.questions.length ? 'complete' : 'correct', question };
  }
  question.wrongAttempts += 1;
  game.retryCount += 1;
  game.combo = 0;
  question.selectedIndices = [];
  return { status: question.wrongAttempts >= 2 ? 'failed' : 'retry', question };
}
function spellingView(game) {
  const question = currentSpellingQuestion(game);
  if (!question) return '<main class="spelling-page"><p>正在准备拼写题…</p></main>';
  const answer = spellingAnswer(game);
  return `<main class="game-page spelling-page">
    <div class="special-game-head"><button data-action="leave-game">‹</button><div><small>低频复习关 · 第 ${game.level} 关</small><b>字母拼写 ${Math.min(game.done + 1, 2)}/2</b></div><span>答错 ${game.retryCount} 次</span></div>
    <div class="goal-progress"><i style="width:${game.done / 2 * 100}%"></i></div>
    <section class="spelling-card">
      <small>看中文，听英文</small><h1>${esc(question.zh)}</h1>
      <button class="listen-word-button" data-speak-word="${esc(question.word)}" aria-label="播放这个英文单词">🔊 播放英文发音</button>
      <div class="spelling-slots" aria-label="当前拼写">${[...question.word.replace(/[^a-z]/gi, '')].map((_, index) => `<span>${esc(answer[index] || '')}</span>`).join('')}</div>
      <div class="spelling-letters">${question.letters.map((item, index) => `<button data-spelling-letter="${index}" aria-label="选择字母 ${item.letter}" ${question.selectedIndices.includes(index) || game.busy ? 'disabled' : ''}>${item.letter.toUpperCase()}</button>`).join('')}</div>
      <p class="game-message">${esc(game.message)}</p>
      ${game.petQuote ? `<div class="pet-speech-bubble"><p>${esc(game.petQuote)}</p></div>` : ''}
      <div class="spelling-actions"><button data-action="undo-spelling" ${!question.selectedIndices.length || game.busy ? 'disabled' : ''}>撤回一个</button><button data-action="clear-spelling" ${!question.selectedIndices.length || game.busy ? 'disabled' : ''}>重新选择</button><button class="primary" data-action="submit-spelling" ${answer.length !== question.word.replace(/[^a-z]/gi, '').length || game.busy ? 'disabled' : ''}>确认拼写</button></div>
    </section>
  </main>`;
}
let fallingTimerHandle = null;
let fallingTransitionHandle = null;
function newFallingGame(level, words, tutorialActive = false, random = Math.random) {
  const selected = ReviewGames.selectReviewWords(words, 5, random);
  const questions = selected.map(item => ({ ...item, choices: ReviewGames.buildMeaningChoices(item, selected, random) }));
  const durationMs = ReviewGames.fallDurationForGrade(gradeFor(level));
  return {
    runId: `${Date.now()}-${level}-fall-${Math.random().toString(36).slice(2, 10)}`,
    level,
    grade: gradeFor(level),
    mode: 'falling',
    mission: { type: 'normal', name: '单词落体挑战', icon: '🪂', bonus: '连续认出5个学过的单词，通关额外获得30金币' },
    questions,
    tutorialQuestion: tutorialActive && questions[0] ? { ...questions[0], choices: [...questions[0].choices] } : null,
    tutorialActive: Boolean(tutorialActive && questions[0]),
    questionIndex: 0,
    durationMs,
    remainingMs: durationMs,
    remainingRatios: [],
    startedAt: 0,
    timerRunning: false,
    pendingQuestionStart: false,
    done: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    sessionCoins: 0,
    busy: false,
    message: tutorialActive ? '这是不会失败的练习题：看英文，选择正确中文' : '在单词落到底部前，选出正确中文释义',
    petQuote: ''
  };
}
function currentFallingQuestion(game = state.game) {
  return game?.tutorialActive ? game.tutorialQuestion : game?.questions?.[game.questionIndex] || null;
}
function applyFallingChoice(game, choiceIndex, elapsedMs = 0) {
  const question = currentFallingQuestion(game);
  if (!question) return { status: 'failed' };
  const correct = question.choices[choiceIndex] === question.zh;
  if (game.tutorialActive) {
    if (!correct) return { status: 'tutorial-retry', question };
    game.tutorialActive = false;
    game.remainingMs = game.durationMs;
    return { status: 'tutorial-complete', question };
  }
  if (!correct) return { status: 'failed', question };
  const ratio = Math.max(0, Math.min(1, (game.durationMs - Math.max(0, elapsedMs)) / game.durationMs));
  game.remainingRatios.push(ratio);
  game.done += 1;
  game.score += 180 + Math.round(ratio * 80);
  game.combo += 1;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  game.questionIndex += 1;
  game.remainingMs = game.durationMs;
  return { status: game.done >= game.questions.length ? 'complete' : 'correct', question };
}
function fallingView(game) {
  const question = currentFallingQuestion(game);
  if (!question) return '<main class="falling-page"><p>正在准备落体题…</p></main>';
  const progress = game.tutorialActive ? '引导题' : `第 ${Math.min(game.done + 1, 5)}/5 题`;
  const animationState = game.timerRunning ? 'running' : 'paused';
  return `<main class="game-page falling-page">
    <div class="special-game-head"><button data-action="leave-game">‹</button><div><small>低频复习关 · 第 ${game.level} 关</small><b>${progress}</b></div><span>${Math.ceil(game.remainingMs / 1000)}秒</span></div>
    <div class="goal-progress"><i style="width:${game.done / 5 * 100}%"></i></div>
    ${game.tutorialActive ? '<div class="falling-tutorial-note"><b>第一次练习，不会失败</b><span>看清下落的英文，再点下方正确中文；答错会继续提示。</span></div>' : ''}
    <section class="falling-arena" style="--fall-duration:${Math.max(100, game.remainingMs)}ms;--fall-state:${animationState}">
      <div class="falling-word"><small>English</small><b>${esc(question.word)}</b></div>
      <div class="fall-guide" aria-hidden="true">↓ 在到底前选择 ↓</div>
    </section>
    <p class="game-message">${esc(game.message)}</p>
    ${game.petQuote ? `<div class="pet-speech-bubble"><p>${esc(game.petQuote)}</p></div>` : ''}
    <div class="falling-choices">${question.choices.map((choice, index) => `<button data-falling-choice="${index}" ${game.busy ? 'disabled' : ''}>${esc(choice)}</button>`).join('')}</div>
  </main>`;
}
function clearFallingTimer() {
  if (fallingTimerHandle != null) clearTimeout(fallingTimerHandle);
  if (fallingTransitionHandle != null) clearTimeout(fallingTransitionHandle);
  fallingTimerHandle = null;
  fallingTransitionHandle = null;
  if (state.game?.mode === 'falling') state.game.timerRunning = false;
}
function scheduleFallingQuestion(delay) {
  if (fallingTransitionHandle != null) clearTimeout(fallingTransitionHandle);
  fallingTransitionHandle = setTimeout(() => {
    fallingTransitionHandle = null;
    if (document.hidden) {
      if (state.game?.mode === 'falling') state.game.pendingQuestionStart = true;
      return;
    }
    startFallingQuestion();
  }, delay);
}
function pauseFallingTimer() {
  const game = state.game;
  if (!game || game.mode !== 'falling') return;
  if (!game.timerRunning) {
    if (fallingTransitionHandle != null) {
      clearTimeout(fallingTransitionHandle);
      fallingTransitionHandle = null;
      game.pendingQuestionStart = true;
    }
    return;
  }
  game.remainingMs = Math.max(0, game.remainingMs - (Date.now() - game.startedAt));
  clearFallingTimer();
}
function resumeFallingTimer() {
  const game = state.game;
  if (!game || game.mode !== 'falling' || state.view !== 'game' || game.timerRunning) return;
  if (game.pendingQuestionStart) {
    game.pendingQuestionStart = false;
    startFallingQuestion();
    return;
  }
  if (game.busy) return;
  game.startedAt = Date.now();
  game.timerRunning = true;
  fallingTimerHandle = setTimeout(handleFallingTimeout, Math.max(1, game.remainingMs));
  render();
}
function startFallingQuestion() {
  const game = state.game;
  if (!game || game.mode !== 'falling') return;
  clearFallingTimer();
  game.remainingMs = game.durationMs;
  game.busy = false;
  resumeFallingTimer();
}
async function chooseFallingMeaning(index) {
  const game = state.game;
  const question = currentFallingQuestion(game);
  if (!game || game.mode !== 'falling' || !question || game.busy) return;
  pauseFallingTimer();
  game.busy = true;
  const elapsedMs = game.durationMs - game.remainingMs;
  const outcome = applyFallingChoice(game, index, elapsedMs);
  if (outcome.status === 'tutorial-retry') {
    game.message = `提示：${question.word} 的意思是“${question.zh}”，再选一次吧`;
    game.petQuote = petSpeech('retry');
    soundWrong();
    game.busy = false;
    render();
    scheduleFallingQuestion(650);
    return;
  }
  if (outcome.status === 'tutorial-complete') {
    game.message = '练习完成！现在开始正式5题';
    game.petQuote = petSpeech('start');
    soundPop(4);
    try {
      const data = await api('/api/review/tutorial-complete', { method: 'POST', body: '{}' });
      state.user = data.user;
    } catch {}
    game.busy = false;
    render();
    scheduleFallingQuestion(750);
    return;
  }
  if (outcome.status === 'failed') {
    recordMistake(question);
    syncLearnedWord(question.word, 'wrong').catch(() => {});
    game.message = `正确答案是“${question.zh}”`;
    game.petQuote = petSpeech('retry');
    soundWrong();
    game.busy = false;
    return finishLevel(false);
  }
  game.message = `${question.word} = ${question.zh}，答对啦！`;
  game.petQuote = petSpeech('combo');
  soundSpecial('pop', 5 + game.combo);
  try {
    const data = await syncLearnedWord(question.word, 'review');
    state.user = data.user;
  } catch {}
  await speakReviewWordAndWait(question);
  render();
  await sleep(250);
  game.busy = false;
  if (outcome.status === 'complete') return finishLevel(true);
  startFallingQuestion();
}
function handleFallingTimeout() {
  const game = state.game;
  const question = currentFallingQuestion(game);
  if (!game || game.mode !== 'falling' || !question) return;
  fallingTimerHandle = null;
  game.timerRunning = false;
  game.remainingMs = 0;
  if (game.tutorialActive) {
    game.message = `时间到了也没关系：${question.word} 是“${question.zh}”，再练一次`;
    game.petQuote = petSpeech('retry');
    render();
    scheduleFallingQuestion(850);
    return;
  }
  recordMistake(question);
  syncLearnedWord(question.word, 'wrong').catch(() => {});
  game.message = `时间到，正确答案是“${question.zh}”`;
  game.petQuote = petSpeech('retry');
  soundWrong();
  finishLevel(false);
}
function completeTutorial(game) {
  if (!game?.tutorial?.active) return;
  const progress = normalizedProgress();
  progress.tutorials[game.mode] = true;
  game.tutorial = { ...game.tutorial, active: false };
  persistProgress().catch(() => {});
}
function tutorialLayer(game) {
  if (!game.tutorial?.active) return '';
  const firstStep = game.tutorial.step === 0;
  const text = game.mode === 'match3'
    ? firstStep ? '先点发光词块' : '再点旁边发光词块，交换成三个相同单词'
    : firstStep ? '先点发光的词牌' : '再找它发光的中英搭档';
  return `<div class="tutorial-layer"><div class="tutorial-card"><small>第一次玩 · ${firstStep ? '第 1 步' : '第 2 步'}</small><b>${text}</b><button data-action="complete-tutorial">我会了</button></div></div>`;
}
function collapseBoard(game, removed) {
  const board = [...game.board];
  removed.forEach(index => { board[index] = null; });
  for (let col = 0; col < SIZE; col += 1) {
    const kept = [];
    for (let row = SIZE - 1; row >= 0; row -= 1) {
      const value = board[indexOf(row, col)];
      if (value != null) kept.push(value);
    }
    for (let row = SIZE - 1, i = 0; row >= 0; row -= 1, i += 1) {
      const type = Math.floor(Math.random() * game.words.length);
      board[indexOf(row, col)] = i < kept.length ? kept[i] : makeTile(type, game.words);
    }
  }
  game.board = board;
}
function expandedRemoval(lines, board) {
  const removed = new Set(lines.flat());
  let special = '';
  const longest = Math.max(...lines.map(line => line.length));
  if (longest >= 5) {
    special = 'rainbow';
    const type = tileType(board[lines.find(line => line.length === longest)[0]]);
    board.forEach((value, index) => { if (tileType(value) === type) removed.add(index); });
  } else if (longest >= 4) {
    special = 'rocket';
    const anchor = cellOf(lines.find(line => line.length === longest)[1]);
    for (let i = 0; i < SIZE; i += 1) {
      removed.add(indexOf(anchor.row, i));
      removed.add(indexOf(i, anchor.col));
    }
  } else if (lines.length >= 2) {
    special = 'burst';
    const anchor = cellOf(lines[0][Math.floor(lines[0].length / 2)]);
    for (let r = Math.max(0, anchor.row - 1); r <= Math.min(SIZE - 1, anchor.row + 1); r += 1) {
      for (let c = Math.max(0, anchor.col - 1); c <= Math.min(SIZE - 1, anchor.col + 1); c += 1) removed.add(indexOf(r, c));
    }
  }
  return { removed, special };
}
async function settleBoard(game, removed, depth = 0) {
  collapseBoard(game, removed);
  game.exploding = [];
  game.praise = '';
  render();
  await sleep(560);
  const cascades = findMatchLines(game.board);
  if (cascades.length && depth < 6) {
    const next = expandedRemoval(cascades, game.board);
    const cascadeTypes = [...new Set(cascades.map(line => tileType(game.board[line[0]])))];
    game.score += next.removed.size * 4;
    game.effect = 'cascade';
    game.exploding = [...next.removed];
    announceElimination(game, cascadeTypes);
    game.praise = playPraise(next.special || 'cascade', next.removed.size, depth + 2);
    soundSpecial(next.special || 'pop', next.removed.size);
    render();
    return settleBoard(game, next.removed, depth + 1);
  }
  game.effect = '';
  game.exploding = [];
  game.praise = '';
  if (!possibleMoves(game.board).length) game.board = makeBoard(game.words);
}
function recordMistake(word) {
  const p = normalizedProgress();
  const current = p.mistakes[word.word] || { wrongCount: 0, correctStreak: 0, reviewCount: 0 };
  p.mistakes[word.word] = { ...current, wrongCount: current.wrongCount + 1, correctStreak: 0, lastWrongAt: new Date().toISOString() };
}
function recordMastered(word) {
  const p = normalizedProgress();
  if (!p.collected.includes(word.word)) p.collected.push(word.word);
  p.learnedWords = ReviewGames.recordLearnedWord(p.learnedWords, word.word, word.zh, 'correct');
  syncLearnedWord(word.word, 'correct').catch(() => {});
  const mistake = p.mistakes[word.word];
  if (mistake) {
    mistake.correctStreak = (mistake.correctStreak || 0) + 1;
    mistake.reviewCount = (mistake.reviewCount || 0) + 1;
    if (mistake.correctStreak >= 2) delete p.mistakes[word.word];
  }
}
async function submitSpellingAnswer() {
  const game = state.game;
  const question = currentSpellingQuestion(game);
  if (!game || game.mode !== 'spelling' || !question || game.busy) return;
  game.busy = true;
  const outcome = applySpellingAnswer(game);
  if (outcome.status === 'correct' || outcome.status === 'complete') {
    game.message = `${question.word} 拼写正确！`;
    game.petQuote = petSpeech('combo');
    soundSpecial('pop', 5 + game.combo);
    try {
      const data = await syncLearnedWord(question.word, 'review');
      state.user = data.user;
    } catch {}
    speakWord(question.word);
    if (outcome.status === 'complete') {
      game.busy = false;
      return finishLevel(true);
    }
    game.busy = false;
    render();
    return;
  }
  recordMistake(question);
  syncLearnedWord(question.word, 'wrong').catch(() => {});
  game.message = `正确拼写是 ${question.word.toUpperCase()}，再认真试一次`;
  game.petQuote = petSpeech('retry');
  soundWrong();
  speakWord(question.word);
  game.busy = false;
  if (outcome.status === 'failed') return finishLevel(false);
  render();
}
async function speakWords(records) {
  if (!state.audio.speech || !('speechSynthesis' in window) || !records.length) return;
  const voices = await waitForSystemVoices();
  records.slice(0, 3).flatMap(record => createLearningUtterances(record, voices)).forEach((line, index) => {
    if (!index) lastLearningVoiceURI = line.voice?.voiceURI || '';
    window.speechSynthesis.speak(line);
  });
}
function syncLearnedWord(word, result) {
  learnedWordQueue = learnedWordQueue.catch(() => {}).then(() => api('/api/learned-word', {
    method: 'POST', body: JSON.stringify({ word, result })
  }));
  return learnedWordQueue;
}
async function speakReviewWordAndWait(record) {
  if (!state.audio.speech || !('speechSynthesis' in window) || !record) return;
  const voices = await waitForSystemVoices();
  const lines = createLearningUtterances(record, voices);
  if (!lines.length) return;
  cancelSpeech();
  await new Promise(resolve => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    lines.at(-1).onend = done;
    lines.at(-1).onerror = done;
    lines.forEach((line, index) => {
      if (!index) lastLearningVoiceURI = line.voice?.voiceURI || '';
      window.speechSynthesis.speak(line);
    });
    setTimeout(done, 2600);
  });
}
function praiseForEffect(kind, count = 3, combo = 1) {
  if (kind === 'rainbow' || combo >= 5) return 'UNBELIEVABLE';
  if (kind === 'coin-burst' || kind === 'rocket' || kind === 'burst' || count >= 9) return 'EXCELLENT';
  if (kind === 'cascade' || combo >= 3 || count >= 6) return 'GREAT';
  if (combo >= 2 || count >= 4) return 'NICE';
  return 'GOOD JOB';
}
function playPraise(kind, count, combo) {
  const praise = praiseForEffect(kind, count, combo);
  soundPraiseCue(praise);
  speakPraiseFallback(praise);
  return praise;
}
function announceElimination(game, types) {
  const learned = types.map(type => game.words[type]).filter(Boolean);
  if (!learned.length) return;
  game.learnedTypes = [...new Set([...game.learnedTypes, ...types])];
  learned.forEach(recordMastered);
  speakWords(learned);
}
async function selectCell(index) {
  const game = state.game;
  if (!game || game.mode !== 'match3' || game.busy) return;
  if (game.selected == null) {
    if (game.tutorial?.active && index !== game.tutorial.cells[0]) {
      game.message = '先点发光的词块，我会陪你完成第一步';
      render();
      return;
    }
    game.selected = index;
    if (game.tutorial?.active) game.tutorial.step = 1;
    render();
    return;
  }
  if (game.selected === index) {
    game.selected = null;
    render();
    return;
  }
  if (!adjacent(game.selected, index)) {
    if (game.tutorial?.active) {
      game.message = '再点旁边发光的词块';
      render();
      return;
    }
    game.selected = index;
    render();
    return;
  }
  if (game.tutorial?.active && index !== game.tutorial.cells[1]) {
    game.message = '再点旁边发光的词块';
    render();
    return;
  }
  game.busy = true;
  const a = game.selected;
  const b = index;
  game.selected = null;
  game.board = swap(game.board, a, b);
  render();
  await sleep(180);
  const lines = findMatchLines(game.board);
  if (!lines.length) {
    game.board = swap(game.board, a, b);
    game.combo = 0;
    game.message = '这两个相邻词块还不能组成三连，看看发光提示';
    const suggested = possibleMoves(game.board)[0];
    game.hintCells = suggested ? [suggested.a, suggested.b] : [];
    game.effect = 'shake';
    soundWrong();
    game.busy = false;
    render();
    setTimeout(() => { if (state.game === game) { game.effect = ''; render(); } }, 380);
    return;
  }

  completeTutorial(game);
  game.moves -= 1;
  const matchedTypes = new Set(lines.map(line => tileType(game.board[line[0]])));
  const expanded = expandedRemoval(lines, game.board);
  const comboBonus = Math.min(50, game.combo * 5);
  game.score += expanded.removed.size * 12 + comboBonus;
  game.effect = expanded.special || 'pop';
  game.exploding = [...expanded.removed];
  game.combo += 1;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  announceElimination(game, [...matchedTypes]);
  const learnedNames = [...matchedTypes].map(type => game.words[type].word).join('、');
  game.message = `${learnedNames} 消除成功！积分继续上涨`;
  soundSpecial(expanded.special || 'pop', expanded.removed.size);
  soundCombo(game.combo);
  if (game.combo % 5 === 0) {
    game.effect = 'coin-burst';
    game.sessionCoins += 15;
    game.score += 150;
    soundCoinBurst();
  }
  game.praise = playPraise(game.effect, expanded.removed.size, game.combo);
  render();
  await settleBoard(game, expanded.removed);
  game.busy = false;
  if (levelComplete(game)) return finishLevel(true);
  if (game.moves <= 0) return finishLevel(false);
  if (game.score >= game.scoreGoal && !coverageComplete(game)) {
    game.message = `积分达标！再认识 ${game.coverageGoal - game.learnedTypes.length} 个新词`;
    const move = unlearnedMove(game);
    if (move) game.hintCells = [move.a, move.b];
    else {
      game.board = makeBoard(game.words);
      const retry = unlearnedMove(game);
      game.hintCells = retry ? [retry.a, retry.b] : [];
    }
  } else game.message = `当前 ${game.score} 分，再得 ${Math.max(0, game.scoreGoal - game.score)} 分过关`;
  render();
}

async function selectPair(index) {
  const game = state.game;
  if (!game || game.mode !== 'pair' || game.busy) return;
  const card = game.pairs[index];
  if (!card || card.matched) return;
  if (game.selected == null) {
    if (game.tutorial?.active && index !== game.tutorial.cells[0]) {
      game.message = '先点发光的词牌';
      render();
      return;
    }
    game.selected = index;
    if (game.tutorial?.active) game.tutorial.step = 1;
    if (card.lang === 'en') speakWord(card.text);
    render();
    return;
  }
  if (game.selected === index) {
    game.selected = null;
    render();
    return;
  }
  if (game.tutorial?.active && index !== game.tutorial.cells[1]) {
    game.message = '再点发光的中英搭档';
    render();
    return;
  }
  const firstIndex = game.selected;
  const first = game.pairs[firstIndex];
  game.selected = null;
  game.busy = true;
  game.moves -= 1;
  const correct = first.type === card.type && first.lang !== card.lang;
  if (correct) {
    completeTutorial(game);
    game.learnedTypes = [...new Set([...game.learnedTypes, card.type])];
    first.matched = true;
    card.matched = true;
    game.done += 1;
    game.combo += 1;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    game.score += 80 + game.combo * 15;
    game.effect = game.combo % 5 === 0 ? 'coin-burst' : game.combo >= 3 ? 'burst' : 'pair-pop';
    game.exploding = [firstIndex, index];
    game.message = `${game.words[card.type].word} 配对成功！`;
    recordMastered(game.words[card.type]);
    speakWord(game.words[card.type].word);
    soundSpecial(game.combo >= 3 ? 'burst' : 'pop', 4 + game.combo);
    if (game.combo % 5 === 0) {
      game.sessionCoins += 15;
      game.score += 150;
      soundCoinBurst();
    }
    game.praise = playPraise(game.effect, 4 + game.combo, game.combo);
  } else {
    game.pairMistakes += 1;
    game.combo = 0;
    game.effect = 'shake';
    game.praise = '';
    game.message = '这两个还不是搭档，再观察一下';
    recordMistake(game.words[first.type]);
    recordMistake(game.words[card.type]);
    soundWrong();
  }
  render();
  await sleep(correct ? (game.effect === 'coin-burst' ? 760 : 520) : 480);
  game.effect = '';
  game.exploding = [];
  game.praise = '';
  game.busy = false;
  if (game.done >= game.goal) return finishLevel(true);
  if (game.moves <= 0) return finishLevel(false);
  render();
}

async function finishLevel(win) {
  const game = state.game;
  if (!game) return;
  clearFallingTimer();
  try { await learnedWordQueue; } catch {}
  if (!win) {
    persistProgress().catch(() => {});
    state.result = { win: false, level: game.level, mode: game.mode, score: game.score || 0, combo: game.maxCombo || 0, learned: game.learnedTypes?.length ?? game.done ?? 0, petQuote: petSpeech('retry') };
    state.view = 'result';
    render();
    return;
  }
  const stars = starsForGame(game);
  const missionCoins = game.mission.type === 'treasure' ? 30 : game.mission.type === 'boss' ? 20 : 0;
  const specialCoins = game.mode === 'spelling' ? 20 : game.mode === 'falling' ? 30 : 0;
  const fallbackReward = {
    coins: 12 + game.grade * 4 + stars * 4 + game.sessionCoins + missionCoins + specialCoins,
    xp: 30 + game.grade * 8 + stars * 5 + (game.mission.type === 'boss' ? 20 : 0)
  };
  let reward = fallbackReward;
  let saved = false;
  try {
    await persistProgress();
    const data = await api('/api/game/complete', {
      method: 'POST',
      body: JSON.stringify({
        runId: game.runId,
        level: game.level,
        mode: game.mode,
        stars,
        missionType: game.mission.type,
        sessionCoins: game.sessionCoins,
        maxCombo: game.maxCombo
      })
    });
    state.user = data.user;
    reward = data.reward;
    saved = true;
  } catch (error) {
    state.notice = `成绩暂时没有保存成功：${error.message}`;
  }
  state.result = {
    win: true,
    level: game.level,
    score: game.score,
    combo: game.maxCombo,
    learned: game.learnedTypes?.length ?? game.done ?? 0,
    stars,
    xp: reward.xp,
    coins: reward.coins,
    mission: game.mission,
    missionCoins,
    saved,
    petQuote: petSpeech(stars === 3 ? 'star3' : stars === 2 ? 'star2' : 'star1')
  };
  state.view = 'result';
  soundCoinBurst();
  render();
}
function useHint() {
  const game = state.game; const p = normalizedProgress();
  if (!game || game.busy) return;
  if (p.inventory.hint <= 0) return toast('提示灯已经用完了');
  if (game.mode === 'pair') {
    const first = game.pairs.findIndex(card => !card.matched);
    if (first < 0) return;
    const second = game.pairs.findIndex((card, index) => index !== first && !card.matched && card.type === game.pairs[first].type);
    game.hintCells = [first, second];
  } else {
    const move = possibleMoves(game.board).find(item => item.words.includes(game.targetType)) || possibleMoves(game.board)[0];
    if (!move) return;
    game.hintCells = [move.a, move.b];
  }
  p.inventory.hint -= 1;
  persistProgress().catch(() => {});
  render();
}
function shuffleGame() {
  const game = state.game; const p = normalizedProgress();
  if (!game || game.busy) return;
  if (p.inventory.shuffle <= 0) return toast('重新排阵道具已经用完了');
  p.inventory.shuffle -= 1;
  if (game.mode === 'pair') {
    game.pairs = shuffle(game.pairs);
    game.selected = null;
    game.hintCells = [];
  } else {
    game.board = makeBoard(game.words);
    game.hintCells = [];
  }
  persistProgress().catch(() => {});
  soundPop(4);
  render();
}
function addMoves() {
  const game = state.game; const p = normalizedProgress();
  if (!game || game.busy) return;
  if (p.inventory.addMoves <= 0) return toast('加五步道具已经用完了');
  p.inventory.addMoves -= 1;
  game.moves += 5;
  persistProgress().catch(() => {});
  render();
}

function shell(content, active = 'home') {
  const p = normalizedProgress();
  return `<div class="app-shell">
    <header class="topbar">
      <button class="brand" data-action="home">${spiritFigure('brand-spirit')}<span><b>词灵星球</b><small>英语单词消消乐</small></span></button>
      <div class="top-actions"><button class="audio-settings-button" data-action="audio-settings" aria-label="声音设置">🔊<span>${audioIcon(state.audio)}</span></button>${p.pet.speciesId ? `<span>🐾 Lv.${p.pet.level}</span>` : ''}<span>🪙 ${p.coins}</span><button class="profile" data-action="profile">${esc(state.user.profile.nickname)}</button></div>
    </header>
    ${content}
    <nav class="bottom-nav">
      <button class="${active === 'home' ? 'active' : ''}" data-action="home">🪐<span>星球</span></button>
      <button class="${active === 'game' ? 'active' : ''}" data-action="play">◆<span>消消乐</span></button>
      <button class="${active === 'pet' ? 'active' : ''}" data-action="pet-home">🐾<span>宠物</span></button>
      <button class="${active === 'shop' ? 'active' : ''}" data-action="shop">🛍️<span>商店</span></button>
      <button class="${active === 'rank' ? 'active' : ''}" data-action="leaderboard">♛<span>排行</span></button>
    </nav>${state.audioPanel ? audioSettingsPanel() : ''}
  </div>${state.notice ? `<div class="toast">${esc(state.notice)}</div>` : ''}`;
}
function authView() {
  const login = state.view === 'login';
  const mode = login ? 'login' : 'register';
  return `<main class="auth-page"><section class="auth-card">
    ${spiritFigure('auth-spirit')}
    <p>英语单词消消乐</p><h1>词灵星球</h1><small>学习赚金币，陪伴属于你的宠物一起成长。</small>
    <div class="auth-tabs" role="tablist"><button class="${login ? 'active' : ''}" data-action="switch-login" type="button" role="tab" aria-selected="${login}" ${state.auth.busy ? 'disabled' : ''}>登录</button><button class="${!login ? 'active' : ''}" data-action="switch-register" type="button" role="tab" aria-selected="${!login}" ${state.auth.busy ? 'disabled' : ''}>注册</button></div>
    <form id="auth-form" aria-busy="${state.auth.busy}">
      <label>家长手机号<input required name="phone" inputmode="numeric" autocomplete="tel" maxlength="11" placeholder="请输入11位手机号" value="${esc(state.auth.phone)}"></label>
      <label>密码<span class="password-field"><input required name="password" type="${state.auth.passwordVisible ? 'text' : 'password'}" autocomplete="${login ? 'current-password' : 'new-password'}" minlength="6" placeholder="至少6位密码"><button type="button" class="password-toggle" data-action="toggle-password">${state.auth.passwordVisible ? '隐藏' : '显示'}</button></span></label>
      ${login ? '' : '<label>玩家昵称<input required name="nickname" maxlength="12" placeholder="例如：闪闪"></label>'}
      ${state.auth.success ? `<div class="form-success" role="status">${esc(state.auth.success)}</div>` : ''}
      ${state.auth.error ? `<div class="form-error" role="alert" tabindex="-1">${esc(state.auth.error)}</div>` : ''}
      <button class="primary" type="submit" ${state.auth.busy ? 'disabled' : ''}>${authSubmitLabel(mode, state.auth.busy)}</button>
      ${login ? '<button class="auth-help" type="button" data-action="forgot-password">忘记密码？在本机恢复</button>' : ''}
    </form><small class="privacy">家庭试玩版，不展示手机号，不包含充值或付费内容。</small>
  </section></main>`;
}

function authSubmitLabel(mode, busy) {
  if (busy) return mode === 'login' ? '正在登录…' : '正在注册…';
  return mode === 'login' ? '进入词灵星球' : '创建玩家';
}

function applyRegistrationSuccess(data) {
  state.token = null;
  state.user = null;
  state.view = 'login';
  state.auth.busy = false;
  state.auth.error = '';
  state.auth.success = data.message;
  state.auth.phone = data.phone;
  state.auth.passwordVisible = false;
  render();
  document.querySelector('#auth-form input[name="password"]')?.focus();
}
function resetPasswordView() {
  return `<main class="auth-page"><section class="auth-card compact-auth">
    ${spiritFigure('auth-spirit')}
    <p>家长帮助</p><h1>重新设置密码</h1><small>为了保护家庭账号，只能在运行游戏的这台电脑上操作。</small>
    <form id="reset-password-form">
      <label>家长手机号<input required name="phone" inputmode="numeric" autocomplete="tel" maxlength="11" placeholder="请输入注册手机号"></label>
      <label>新密码<span class="password-field"><input required name="password" type="${state.auth.passwordVisible ? 'text' : 'password'}" autocomplete="new-password" minlength="6" placeholder="至少6位新密码"><button type="button" class="password-toggle" data-action="toggle-password">${state.auth.passwordVisible ? '隐藏' : '显示'}</button></span></label>
      <label>再次输入<input required name="confirmPassword" type="${state.auth.passwordVisible ? 'text' : 'password'}" autocomplete="new-password" minlength="6" placeholder="再次输入新密码"></label>
      ${state.auth.error ? `<div class="form-error" role="alert" tabindex="-1">${esc(state.auth.error)}</div>` : ''}
      <button class="primary" type="submit" ${state.auth.busy ? 'disabled' : ''}>${state.auth.busy ? '正在重置…' : '重置并进入游戏'}</button>
      <button class="auth-help" type="button" data-action="back-login">返回登录</button>
    </form>
  </section></main>`;
}
function homeView() {
  const p = normalizedProgress();
  const level = Math.min(100, p.stage);
  const tip = level === 1 && p.collected.length === 0
    ? '完成有效消除后会自动依次朗读英文和中文，词块随后直接消失。'
    : TIPS[state.tip];
  if (!p.pet.speciesId) {
    return shell(`<main class="home-page">
      <section class="hero pet-welcome-hero"><div><p>免费的学习伙伴</p><h1>${esc(state.user.profile.nickname)}，先领取一只宠物吧！</h1><p>8种宠物都很可爱，每个账号只能选择一只，领取后品类不能更换。</p><button class="play-main" data-action="pet-store">领取我的学习伙伴</button></div>${spiritFigure('hero-spirit', SPIRITS[0], 1)}</section>
      <section class="home-section learning"><h2>也可以先看看学习内容</h2><div class="learning-grid"><button data-action="play"><span>▶️</span><b>开始第 ${level} 关</b><small>${gradeFor(level)}年级</small></button><button data-action="levels"><span>🗺️</span><b>选择关卡</b><small>1～${level} 关可玩</small></button><button data-action="mistakes"><span>📝</span><b>错词本</b><small>${Object.keys(p.mistakes).length} 个待复习</small></button></div></section>
    </main>`);
  }
  const pet = PetSystem.petById(p.pet.speciesId);
  const nextTarget = PetSystem.nextGrowthTarget(p.pet.level);
  return shell(`<main class="home-page">
    <section class="hero">
      <div><p>当前称号 · ${titleFor(level)}</p><h1>${esc(state.user.profile.nickname)}，今天和${esc(p.pet.name)}学几个词？</h1><div class="hero-stats"><span>第 ${level} 关</span><span>${gradeFor(level)}年级</span><span>${esc(pet.species)}</span></div><button class="play-main" data-action="play">开始学习 ▶</button></div>
      <button class="hero-spirit-wrap pet-interact" data-action="pet-tap">${spiritFigure('hero-spirit', pet, p.pet.level)}<small>${esc(p.pet.name)} · ${growthName(p.pet.level)} · Lv.${p.pet.level}</small></button>
    </section>
    <section class="level-progress pet-growth-card"><div><b>${esc(p.pet.name)} · Lv.${p.pet.level}</b><span>${p.pet.level >= 10 ? '已经满级' : `${p.pet.growth}/${nextTarget} 成长值`}</span></div><i class="pet-growth-bar"><em style="width:${petGrowthPercent(p.pet)}%"></em></i><small>${esc(petTargetMessage(p))}</small></section>
    <section class="home-section learning"><h2>继续学习</h2><div class="learning-grid">
      <button data-action="play"><span>▶️</span><b>继续第 ${level} 关</b><small>${gradeFor(level)}年级</small></button>
      <button data-action="levels"><span>🗺️</span><b>选择关卡</b><small>1～${level} 关可玩</small></button>
      <button data-action="mistakes"><span>📝</span><b>错词本</b><small>${Object.keys(p.mistakes).length} 个待复习</small></button>
    </div></section>
    <section class="home-section rewards"><h2>成长奖励</h2><div class="reward-grid">
      <button data-action="pet-home"><span>🐾</span><b>宠物之家</b><small>喂养、互动和改名</small></button>
      <button data-action="shop"><span>🍓</span><b>食物与道具</b><small>拥有 ${p.coins} 金币</small></button>
      <button data-action="levels"><span>⭐</span><b>挑战更多关卡</b><small>学习就能赚金币</small></button>
    </div></section>
    ${state.lastPetQuote ? `<section class="pet-speech-bubble"><b>${esc(p.pet.name)}说</b><p>${esc(state.lastPetQuote)}</p></section>` : ''}
    <section class="tip-card"><span>💡</span><div><b>学习小提示</b><p>${esc(tip)}</p></div></section>
  </main>`);
}
function levelIntroView() {
  const game = state.game;
  if (!game) return homeView();
  const modeDetails = {
    match3: { icon: '💥', name: '三消战斗', text: `自由寻找三连，达到 ${game.scoreGoal} 分并认识 ${game.coverageGoal} 个不同单词` },
    pair: { icon: '🔗', name: '中英配对', text: '点击一个中文词牌和它对应的英文词牌' },
    spelling: { icon: '🔤', name: '字母拼写', text: '看中文、听英文，连续拼写2个已经学过的单词' },
    falling: { icon: '🪂', name: '单词落体', text: '看下落的英文，在三个中文释义中选出正确答案' }
  }[game.mode];
  return shell(`<main class="mission-intro ${game.mission.type}">
    <div class="mission-icon">${game.mission.icon}</div>
    <p>第 ${game.level} 关 · ${game.grade}年级</p>
    <h1>${game.mission.name}</h1>
    <div class="mode-card"><b>${modeDetails.icon} ${modeDetails.name}</b><span>${modeDetails.text}</span></div>
    <small>${game.mission.bonus}</small>
    ${spiritFigure('intro-spirit')}
    <button class="primary" data-action="enter-level">准备好了，出发！</button>
    <button class="ghost" data-action="home">返回星球</button>
  </main>`, 'game');
}
function effectLayer(game) {
  if (!['pop', 'pair-pop', 'burst', 'rocket', 'rainbow', 'cascade', 'coin-burst'].includes(game.effect)) return '';
  return `<div class="fx-layer ${game.effect}" aria-hidden="true">
    ${Array.from({ length: game.effect === 'rainbow' || game.effect === 'coin-burst' ? 38 : 24 }, (_, i) => `<i style="--i:${i};--x:${(i * 47) % 100}%;--y:${(i * 73) % 100}%"></i>`).join('')}
    ${game.effect === 'rocket' ? '<b class="fx-title">🚀 火箭横扫！</b>' : ''}
    ${game.effect === 'rainbow' ? '<b class="fx-title">🌈 彩虹全消！</b>' : ''}
    ${game.effect === 'burst' ? '<b class="fx-title">💥 连锁爆破！</b>' : ''}
    ${game.praise ? `<strong class="praise-shout">${esc(game.praise)}</strong>` : ''}
  </div>`;
}
const HIGH_CONFIDENCE_PAIR_PICTURES = new Set(`
apple;banana;orange;pear;grape;watermelon;strawberry;lemon;peach;bread;rice;noodles;noodle;egg;milk;water;juice;tea;coffee;cake;cookie;candy;chocolate;hamburger;sandwich;ice cream;ice-cream;chicken;fish;vegetable;carrot;salad;honey;salt;
cat;dog;bird;rabbit;duck;panda;tiger;lion;monkey;elephant;kangaroo;bear;horse;mouse;fox;bee;sheep;pig;frog;turtle;spider;deer;snake;cow;goat;
sun;star;moon;cloud;rain;tree;flower;rose;grass;bamboo;mountain;river;lake;forest;beach;
book;pen;pencil;ruler;eraser;bag;schoolbag;clock;door;window;bed;sofa;fridge;umbrella;key;box;phone;computer;keyboard;screen;camera;car;bus;train;plane;ship;boat;bike;taxi;scooter;motorbike;
shirt;coat;dress;shoe;shoes;sock;socks;trousers;hat;sweater;jacket;t-shirt;skirt;jeans;shorts;boots;scarf;sunglasses;sandals;trainers;kite;football;basketball;piano;
pencil case;tooth;teeth;teddy bear;doll;puzzle;skipping rope;skip rope;house;toilet;sink;
orange juice;french fries;chips;sausage;tomato;potato;soup;dumpling;dimsum;dimsums;pancake;bun;steak;coke;bottle;glass;cup;can;chopstick;chopsticks;bowl;plate;knife;fork;
newspaper;letter;stamp;comic;coloured pencil;colored pencil;watch;
face;ear;eye;nose;mouth;hair;hand;finger;arm;leg;foot;feet;heart;
hospital;traffic light;snowman
`.trim().split(';').map(word => word.trim()).filter(Boolean));

function visualCandidatesForWord(word) {
  const raw = String(word || '').toLowerCase().trim()
    .replace(/[“”"‘’]/g, '')
    .replace(/[.!?,:;()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const spaced = raw.replace(/[-–—/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const withoutArticle = spaced.replace(/^(a|an|the)\s+/, '');
  return [...new Set([raw, spaced, withoutArticle])];
}
function visualForWord(word) {
  const candidates = visualCandidatesForWord(word);
  const spaced = candidates[1] || candidates[0] || '';
  for (const candidate of candidates) {
    if (VISUAL_WORDS[candidate]) return VISUAL_WORDS[candidate];
  }
  if (spaced.endsWith('ies') && VISUAL_WORDS[`${spaced.slice(0, -3)}y`]) return VISUAL_WORDS[`${spaced.slice(0, -3)}y`];
  if (spaced.endsWith('s') && VISUAL_WORDS[spaced.slice(0, -1)]) return VISUAL_WORDS[spaced.slice(0, -1)];
  return '';
}
function visualForPairWord(word) {
  const candidates = visualCandidatesForWord(word);
  for (const candidate of candidates) {
    if (HIGH_CONFIDENCE_PAIR_PICTURES.has(candidate)) return VISUAL_WORDS[candidate] || '';
  }
  return '';
}
function pairFace(card, word) {
  const picture = card.lang === 'zh' ? visualForPairWord(word.word) : '';
  if (picture) return `<small>看图配词</small><span class="pair-picture" role="img" aria-label="${esc(word.zh)}">${picture}</span>`;
  return `<small>${card.lang === 'en' ? 'English' : '中文'}</small><b>${esc(card.text)}</b>`;
}
function tileFaceHtml(tile, word) {
  const face = tile.face === 'en' ? 'en' : 'zh';
  const text = face === 'zh' ? word.zh : word.word;
  return `<span class="tile-text ${face}">${esc(text)}</span>`;
}
function gameView() {
  const game = state.game;
  const p = normalizedProgress();
  if (!game) return homeView();
  if (game.mode === 'spelling') return shell(spellingView(game), 'game');
  if (game.mode === 'falling') return shell(fallingView(game), 'game');
  return shell(`<main class="game-page">
    <div class="game-head"><button data-action="leave-game">‹</button><div><b>第 ${game.level} 关 · ${game.grade}年级</b><span>${game.mode === 'match3' ? `${game.score}/${game.scoreGoal} 目标积分` : `${game.done}/${game.goal} 个配对`}</span></div><div><b>${game.moves}</b><span>剩余步数</span></div></div>
    <div class="goal-progress"><i style="width:${Math.min(100, game.mode === 'match3' ? game.score / game.scoreGoal * 100 : game.done / game.goal * 100)}%"></i></div>
    <p class="game-message">${esc(game.message)}</p>
    <section class="${game.mode === 'match3' ? 'board' : 'pair-board'} ${game.effect}" style="--types:${game.words.length}">
      ${game.mode === 'match3' ? game.board.map((tile, index) => {
        const word = game.words[tile.type];
        return `<button class="tile type-${tile.type} ${game.selected === index ? 'selected' : ''} ${game.hintCells.includes(index) ? 'hint' : ''} ${game.tutorial?.active && game.tutorial.cells.includes(index) ? 'tutorial-focus' : ''} ${game.exploding.includes(index) ? 'exploding' : ''}" data-cell="${index}" ${game.busy ? 'disabled' : ''}>${tileFaceHtml(tile, word)}</button>`;
      }).join('') : game.pairs.map((card, index) => `<button class="pair-card ${card.lang} type-${card.type} ${game.selected === index ? 'selected' : ''} ${game.hintCells.includes(index) ? 'hint' : ''} ${game.tutorial?.active && game.tutorial.cells.includes(index) ? 'tutorial-focus' : ''} ${card.matched ? 'matched' : ''} ${game.exploding.includes(index) ? 'exploding' : ''}" data-pair="${index}" aria-label="${esc(card.text)}" ${game.busy || card.matched ? 'disabled' : ''}>${pairFace(card, game.words[card.type])}</button>`).join('')}
      ${effectLayer(game)}
      ${game.effect === 'coin-burst' ? '<div class="coin-explosion"><b>五星连捷！</b><span>🪙 +15</span></div>' : ''}
    </section>${tutorialLayer(game)}
    <div class="tools">
      <button data-action="hint"><b>💡 ${p.inventory.hint}</b><span>提示</span></button>
      <button data-action="shuffle"><b>🔀 ${p.inventory.shuffle}</b><span>${game.mode === 'match3' ? '重排' : '重新摆放'}</span></button>
      <button data-action="add-moves"><b>＋5 ${p.inventory.addMoves}</b><span>加步数</span></button>
    </div>
    <div class="score-row"><span>得分 <b>${game.score}</b></span><span>当前连击 <b>${game.combo}</b></span><span>最高连击 <b>${game.maxCombo}</b></span></div>
  </main>`, 'game');
}
function resultView() {
  const r = state.result;
  const p = normalizedProgress();
  const pet = p.pet.speciesId ? PetSystem.petById(p.pet.speciesId) : SPIRITS[0];
  return shell(`<main class="result-page ${r.win ? 'win' : 'lose'}">
    ${spiritFigure('result-spirit', pet, p.pet.level)}
    <p>${r.win ? '关卡完成' : r.mode === 'falling' ? '这次没有及时选对' : r.mode === 'spelling' ? '这个单词还需要再练习' : '步数用完啦'}</p>
    <h1>${r.win ? ['漂亮！全部消掉啦！', '这关也被你拿下了！', `${esc(p.pet.name || pet.name)}正在为你鼓掌！`][r.level % 3] : '差一点就成功了'}</h1>
    ${r.petQuote ? `<div class="pet-speech-bubble result-pet-speech"><b>${esc(p.pet.name || pet.name)}说</b><p>${esc(r.petQuote)}</p></div>` : ''}
    ${r.win ? `<div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>${r.mission?.type !== 'normal' ? `<div class="mission-reward">${r.mission.icon} ${r.mission.name}奖励已开启</div>` : ''}<div class="reward-row"><span>经验 +${r.xp}</span><span>金币 +${r.coins}</span></div>${r.saved === false ? '<small class="save-warning">网络恢复后请重新完成本关，奖励才会存入账号。</small>' : ''}` : ''}
    <div class="result-stats"><span>得分 <b>${r.score}</b></span><span>本关认识 <b>${r.learned || 0} 个词</b></span><span>最高连击 <b>${r.combo}</b></span></div>
    <button class="primary" data-action="${r.win ? 'next-level' : 'retry'}">${r.win ? (r.level >= 100 ? '返回星球' : '下一关') : '重新挑战'}</button>
    ${p.pet.speciesId ? '<button class="ghost" data-action="pet-home">去看看宠物</button>' : ''}
    <button class="ghost" data-action="home">返回主页</button>
  </main>`, 'game');
}
function levelsView() {
  const p = normalizedProgress();
  return shell(`<main class="list-page"><div class="page-title"><span>🗺️</span><div><p>关卡星图</p><h1>选择学习进度</h1></div></div>
    <div class="level-grid">${Array.from({ length: 100 }, (_, i) => i + 1).map(level => `<button data-level="${level}" class="${level <= p.stage ? 'open' : 'locked'}" ${level > p.stage ? 'disabled' : ''}><b>${level}</b><small>${gradeFor(level)}年级</small></button>`).join('')}</div>
  </main>`);
}
function petStoreView() {
  const p = normalizedProgress();
  if (p.pet.speciesId) return petHomeView();
  const selectedId = PetSystem.petById(state.selectedPetId)?.id || SPIRITS[0].id;
  const selected = PetSystem.petById(selectedId);
  const initialPetName = p.pet.needsBreedSelection ? p.pet.name : '';
  state.selectedPetId = selectedId;
  return shell(`<main class="list-page pet-store-page">
    <div class="page-title"><span>🐾</span><div><p>选择学习伙伴</p><h1>6种小狗，只领取其中一只</h1></div></div>
    <div class="permanent-choice-note"><b>领取免费，但选择是永久的</b><span>领取后可以随时免费改名，宠物品类不能更换。请先预览，再确认领取。</span></div>
    <div class="pet-catalog-grid">${SPIRITS.map(spirit => `<button type="button" class="pet-catalog-card ${spirit.id === selectedId ? 'selected' : ''}" data-action="select-pet" data-pet-id="${spirit.id}" aria-pressed="${spirit.id === selectedId}">
      ${spiritFigure('catalog-spirit', spirit, 1)}<small>${esc(spirit.species)} · ${esc(spirit.personality)}</small><h2>${esc(spirit.species)}</h2><p>期待和你一起学习、成长。</p><b>${spirit.id === selectedId ? '已选中，查看预览' : '选择预览'}</b>
    </button>`).join('')}</div>
    <section class="pet-adopt-preview">${spiritFigure('adopt-preview-spirit', selected, 1)}<div><small>${esc(selected.species)} · ${esc(selected.personality)}</small><h2>领取${esc(selected.species)}</h2><p>期待和你一起学习、成长。</p>
      <form id="pet-adopt-form"><input type="hidden" name="speciesId" value="${selected.id}"><label>给它取名字<input required maxlength="8" name="name" value="${esc(initialPetName)}" pattern="[A-Za-z0-9一-龥]{1,8}" title="1至8个中文、英文或数字"></label><button class="primary" ${state.petBusy ? 'disabled' : ''}>${state.petBusy ? '正在领取…' : '确认领取这只宠物'}</button></form>
    </div></section>
  </main>`, 'pet');
}
function petHomeView() {
  const p = normalizedProgress();
  if (!p.pet.speciesId) return petStoreView();
  const pet = PetSystem.petById(p.pet.speciesId);
  const nextTarget = PetSystem.nextGrowthTarget(p.pet.level);
  return shell(`<main class="list-page pet-home-page">
    <div class="page-title"><span>🏡</span><div><p>宠物之家</p><h1>${esc(p.pet.name)}今天也在等你</h1></div></div>
    <section class="pet-room-card">
      <button class="pet-room-figure pet-interact" data-action="pet-tap">${spiritFigure('home-pet-spirit', pet, p.pet.level)}<span>轻轻点我互动</span></button>
      <div class="pet-room-info"><small>${esc(pet.species)} · ${esc(pet.personality)} · ${growthName(p.pet.level)}</small><h2>${esc(p.pet.name)} · Lv.${p.pet.level}</h2><p>“${esc(pet.slogan)}”</p>
        <i class="pet-growth-bar"><em style="width:${petGrowthPercent(p.pet)}%"></em></i><b>${p.pet.level >= 10 ? '已达到最高等级' : `${p.pet.growth}/${nextTarget} 成长值`}</b><span>${esc(petTargetMessage(p))}</span>
      </div>
    </section>
    ${state.lastPetQuote ? `<section class="pet-speech-bubble"><b>${esc(p.pet.name)}说</b><p>${esc(state.lastPetQuote)}</p></section>` : ''}
    <section class="pet-home-section"><h2>喂养背包</h2><p>食物由学习获得的金币兑换。宠物不会饥饿、生病或退级。</p><div class="food-shop-grid">${PetSystem.FOODS.map(food => `<article class="food-card ${food.price >= 100 ? 'premium' : ''}"><div>${food.icon}</div><h3>${food.name}</h3><p>成长值 +${food.growth}</p><small>库存 ${p.pet.foodInventory[food.id]}</small><button data-action="feed-pet" data-food-id="${food.id}" ${state.petBusy || p.pet.level >= 10 || p.pet.foodInventory[food.id] <= 0 ? 'disabled' : ''}>${p.pet.level >= 10 ? '已经满级' : '喂给宠物'}</button></article>`).join('')}</div></section>
    <section class="pet-home-section pet-rename-card"><h2>免费改名</h2><form id="pet-rename-form"><input required maxlength="8" name="name" value="${esc(p.pet.name)}" pattern="[A-Za-z0-9一-龥]{1,8}" title="1至8个中文、英文或数字"><button ${state.petBusy ? 'disabled' : ''}>保存名字</button></form><small>名字可以随时修改；已经领取的${esc(pet.species)}不会改变。</small></section>
    <button class="primary" data-action="shop">去商店兑换食物</button>
  </main>`, 'pet');
}
function shopView() {
  const p = normalizedProgress();
  return shell(`<main class="list-page"><div class="page-title"><span>🛍️</span><div><p>学习金币商店</p><h1>拥有 🪙 ${p.coins}</h1></div></div>
    <p class="shop-note">这里只使用闯关赚到的金币，不含充值、付费或随机抽取。</p>
    <section class="shop-section"><h2>宠物食物</h2>${p.pet.speciesId ? `<p>越优质的食物成长值越高，高级食物还会触发更丰富的庆祝动作。</p>` : '<p class="adopt-reminder">先领取一只宠物，才能为它兑换食物。</p>'}<div class="food-shop-grid">${PetSystem.FOODS.map(food => `<article class="food-card ${food.price >= 100 ? 'premium' : ''}"><div>${food.icon}</div><h3>${food.name}</h3><p>成长值 +${food.growth}</p><small>${p.pet.speciesId ? `库存 ${p.pet.foodInventory[food.id]}` : '等待领取宠物'}</small><button data-action="buy-shop-item" data-shop-item="${food.id}" ${state.petBusy || !p.pet.speciesId || p.pet.level >= 10 || p.coins < food.price ? 'disabled' : ''}>🪙 ${food.price} 兑换</button></article>`).join('')}</div></section>
    <section class="shop-section"><h2>学习道具</h2><div class="shop-grid">${SHOP_TOOLS.map(item => `<article><div>${item.icon}</div><h2>${item.name}</h2><p>${item.description}</p><small>库存 ${p.inventory[item.id] || 0}</small><button data-action="buy-shop-item" data-shop-item="${item.id}" ${state.petBusy || p.coins < item.price ? 'disabled' : ''}>🪙 ${item.price} 兑换</button></article>`).join('')}</div></section>
  </main>`);
}
function mistakesView() {
  const items = Object.entries(normalizedProgress().mistakes);
  return shell(`<main class="list-page"><div class="page-title"><span>📝</span><div><p>错词本</p><h1>${items.length} 个词等待掌握</h1></div></div>
    ${items.length ? `<div class="mistake-list">${items.map(([word, item]) => `<article><b>${esc(word)}</b><span>累计错 ${item.wrongCount || 1} 次</span><small>连续答对 ${(item.correctStreak || 0)}/2 后移除</small></article>`).join('')}</div>` : `<div class="empty">${spiritFigure('empty-spirit')}<h2>错词本空空的</h2><p>继续保持。</p></div>`}
  </main>`);
}
function leaderboardView() {
  if (!state.leaderboard.length) return shell('<main class="loading">正在加载排行榜…</main>', 'rank');
  return shell(`<main class="list-page"><div class="page-title"><span>🏆</span><div><p>词灵排行榜</p><h1>我的排名：第 ${state.currentRank || '-'} 名</h1></div></div>
    <div class="rank-list">${state.leaderboard.map(item => `<article class="${item.id === state.user.id ? 'me' : ''}"><b>${item.rank}</b>${spiritFigure('rank-spirit')}<div><strong>${esc(item.nickname)}</strong><small>${titleFor(item.stage)} · 掌握 ${item.words} 词</small></div><span>第 ${item.stage} 关<br>🪙 ${item.coins}</span></article>`).join('')}</div>
  </main>`, 'rank');
}
function profileView() {
  return shell(`<div class="modal-backdrop"><section class="profile-modal">${spiritFigure('profile-spirit')}<h1>玩家档案</h1><form id="profile-form"><label>昵称<input required maxlength="12" name="nickname" value="${esc(state.user.profile.nickname)}"></label><button class="primary">保存</button></form><button class="ghost" data-action="logout">退出账号</button><button class="close" data-action="home">×</button></section></div>`);
}
function render() {
  if (!state.user) {
    app.innerHTML = state.view === 'reset-password' ? resetPasswordView() : authView();
    return;
  }
  if (state.view === 'game') app.innerHTML = gameView();
  else if (state.view === 'intro') app.innerHTML = levelIntroView();
  else if (state.view === 'result') app.innerHTML = resultView();
  else if (state.view === 'levels') app.innerHTML = levelsView();
  else if (state.view === 'pet-store') app.innerHTML = petStoreView();
  else if (state.view === 'pet-home') app.innerHTML = petHomeView();
  else if (state.view === 'mistakes') app.innerHTML = mistakesView();
  else if (state.view === 'shop') app.innerHTML = shopView();
  else if (state.view === 'leaderboard') app.innerHTML = leaderboardView();
  else if (state.view === 'profile') app.innerHTML = profileView();
  else app.innerHTML = homeView();
}

async function openLeaderboard() {
  state.view = 'leaderboard';
  state.leaderboard = [];
  render();
  try {
    const data = await api('/api/leaderboard');
    state.leaderboard = data.entries;
    state.currentRank = data.currentRank;
  } catch (error) { toast(error.message); }
  render();
}
async function startLevel(level) {
  cancelSpeech();
  clearFallingTimer();
  const safeLevel = Math.max(1, Math.min(100, level));
  let assignment = { mode: modeForLevel(safeLevel), words: [] };
  try {
    const data = await api('/api/review/assign', { method: 'POST', body: JSON.stringify({ level: safeLevel }) });
    state.user = data.user;
    assignment = data;
  } catch {}
  if (assignment.mode === 'spelling' && assignment.words?.length >= 2) state.game = newSpellingGame(safeLevel, assignment.words);
  else if (assignment.mode === 'falling' && assignment.words?.length >= 5) state.game = newFallingGame(safeLevel, assignment.words, !normalizedProgress().review.fallingTutorialDone);
  else state.game = newGame(safeLevel);
  if (['match3', 'pair'].includes(state.game.mode)) state.game.tutorial = tutorialForGame(state.game, normalizedProgress());
  state.result = null;
  state.view = 'intro';
  render();
}
function operationId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
async function adoptPet(speciesId, name) {
  const pet = PetSystem.petById(speciesId);
  if (!pet || !PetSystem.validPetName(name)) return toast('请选择宠物，并填写1至8个中文、英文或数字作为名字');
  if (!globalThis.confirm(`确认领取“${pet.species}”并命名为“${name}”吗？领取后不能更换宠物品类。`)) return;
  state.petBusy = true;
  render();
  try {
    const data = await api('/api/pet/adopt', { method: 'POST', body: JSON.stringify({ speciesId, name }) });
    state.user = data.user;
    state.lastPetQuote = petSpeech('home');
    state.view = 'pet-home';
    soundSpecial('burst', 7);
    toast(`${name}已经成为你的专属学习伙伴！`);
  } catch (error) { toast(error.message); }
  finally { state.petBusy = false; render(); }
}
async function renamePet(name) {
  if (!PetSystem.validPetName(name)) return toast('宠物名字需为1至8个中文、英文或数字');
  state.petBusy = true;
  render();
  try {
    const data = await api('/api/pet/name', { method: 'PATCH', body: JSON.stringify({ name }) });
    state.user = data.user;
    state.lastPetQuote = petSpeech('tap');
    toast('新名字保存好了');
  } catch (error) { toast(error.message); }
  finally { state.petBusy = false; render(); }
}
async function buyShopItem(itemId) {
  state.petBusy = true;
  render();
  try {
    const data = await api('/api/shop/purchase', { method: 'POST', body: JSON.stringify({ itemId, operationId: operationId('buy') }) });
    state.user = data.user;
    soundCoinBurst();
    toast('兑换成功，已经放进背包');
  } catch (error) { toast(error.message); }
  finally { state.petBusy = false; render(); }
}
async function feedPet(foodId) {
  const food = PetSystem.foodById(foodId);
  if (!food) return;
  state.petBusy = true;
  render();
  try {
    const data = await api('/api/pet/feed', { method: 'POST', body: JSON.stringify({ foodId, operationId: operationId('feed') }) });
    state.user = data.user;
    const leveledUp = data.feeding?.newLevel > data.feeding?.oldLevel;
    state.lastPetQuote = petSpeech(leveledUp ? 'levelUp' : food.quoteScene);
    if (food.price >= 100) soundSpecial('burst', 8);
    else soundPop(5);
    toast(leveledUp ? `${normalizedProgress().pet.name}升级啦！` : `成长值 +${food.growth}`);
  } catch (error) { toast(error.message); }
  finally { state.petBusy = false; render(); }
}
async function loadUser() {
  if (!state.token) {
    state.view = 'login';
    render();
    return;
  }
  try {
    const data = await api('/api/me');
    state.user = data.user;
    normalizedProgress();
    state.view = 'home';
  } catch {
    localStorage.removeItem('word_spirit_token');
    localStorage.removeItem('general_token');
    state.token = null;
    state.view = 'login';
  }
  render();
}

document.addEventListener('pointerdown', () => startMusic());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseFallingTimer();
  else resumeFallingTimer();
});
document.addEventListener('click', async event => {
  const speakButton = event.target.closest('[data-speak-word]');
  if (speakButton) return speakWord(speakButton.dataset.speakWord);
  const cell = event.target.closest('[data-cell]');
  if (cell) return selectCell(Number(cell.dataset.cell));
  const pair = event.target.closest('[data-pair]');
  if (pair) return selectPair(Number(pair.dataset.pair));
  const spellingLetter = event.target.closest('[data-spelling-letter]');
  if (spellingLetter) return chooseSpellingLetter(Number(spellingLetter.dataset.spellingLetter));
  const fallingChoice = event.target.closest('[data-falling-choice]');
  if (fallingChoice) return chooseFallingMeaning(Number(fallingChoice.dataset.fallingChoice));
  const level = event.target.closest('[data-level]');
  if (level) return startLevel(Number(level.dataset.level));
  const shopButton = event.target.closest('[data-shop-item]');
  if (shopButton && shopButton.dataset.action === 'buy-shop-item') return buyShopItem(shopButton.dataset.shopItem);
  const foodButton = event.target.closest('[data-food-id]');
  if (foodButton && foodButton.dataset.action === 'feed-pet') return feedPet(foodButton.dataset.foodId);
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (state.game && ['home', 'leave-game', 'levels', 'pet-home', 'pet-store', 'shop', 'leaderboard', 'profile'].includes(action)) cancelSpeech();
  if (action === 'switch-login' || action === 'switch-register') {
    if (state.auth.busy) return;
    state.auth.phone = document.querySelector('#auth-form input[name="phone"]')?.value || state.auth.phone;
    state.auth.error = '';
    state.auth.success = '';
    state.view = action === 'switch-login' ? 'login' : 'register';
    render();
  }
  if (action === 'toggle-password') {
    state.auth.passwordVisible = !state.auth.passwordVisible;
    document.querySelectorAll('input[name="password"],input[name="confirmPassword"]').forEach(input => { input.type = state.auth.passwordVisible ? 'text' : 'password'; });
    event.target.textContent = state.auth.passwordVisible ? '隐藏' : '显示';
    return;
  }
  if (action === 'forgot-password') { state.auth.error = ''; state.auth.success = ''; state.view = 'reset-password'; render(); }
  if (action === 'back-login') { state.auth.error = ''; state.auth.success = ''; state.view = 'login'; render(); }
  if (action === 'home' || action === 'leave-game') { clearFallingTimer(); state.view = 'home'; state.game = null; render(); }
  if (action === 'play') startLevel(Math.min(100, normalizedProgress().stage));
  if (action === 'levels') { state.view = 'levels'; render(); }
  if (action === 'enter-level') {
    state.view = 'game';
    state.lastPetQuote = petSpeech('start');
    render();
    if (state.game?.mode === 'falling') startFallingQuestion();
  }
  if (action === 'pet-store') { state.view = normalizedProgress().pet.speciesId ? 'pet-home' : 'pet-store'; render(); }
  if (action === 'pet-home') { state.view = normalizedProgress().pet.speciesId ? 'pet-home' : 'pet-store'; render(); }
  if (action === 'select-pet') { state.selectedPetId = event.target.closest('[data-pet-id]')?.dataset.petId || SPIRITS[0].id; render(); }
  if (action === 'pet-tap') { state.lastPetQuote = petSpeech('tap'); soundPop(3); render(); }
  if (action === 'mistakes') { state.view = 'mistakes'; render(); }
  if (action === 'shop') { state.view = 'shop'; render(); }
  if (action === 'leaderboard') openLeaderboard();
  if (action === 'profile') { state.view = 'profile'; render(); }
  if (action === 'audio-settings') { state.audioPanel = true; render(); }
  if (action === 'close-audio-settings') { state.audioPanel = false; render(); }
  if (action === 'toggle-audio') toggleAudioChannel(event.target.closest('[data-audio]')?.dataset.audio);
  if (action === 'complete-tutorial') { completeTutorial(state.game); render(); }
  if (action === 'play-help') {
    state.audioPanel = false;
    if (state.game) {
      state.game.tutorial = tutorialForGame(state.game, { tutorials: { [state.game.mode]: false } });
      state.view = 'game';
      render();
    } else toast('进入任意关卡后，可以跟着发光提示练习玩法');
  }
  if (action === 'speak') speakWord(state.game.target.word);
  if (action === 'pair-rule') toast('先点中文或英文，再点它的正确搭档');
  if (action === 'hint') useHint();
  if (action === 'shuffle') shuffleGame();
  if (action === 'add-moves') addMoves();
  if (action === 'undo-spelling') undoSpellingLetter();
  if (action === 'clear-spelling') clearSpellingLetters();
  if (action === 'submit-spelling') submitSpellingAnswer();
  if (action === 'retry') startLevel(state.result.level);
  if (action === 'next-level') {
    if (state.result.level >= 100) { state.view = 'home'; render(); }
    else startLevel(state.result.level + 1);
  }
  if (action === 'logout') {
    try { await api('/api/logout', { method: 'POST' }); } catch {}
    cancelSpeech();
    clearFallingTimer();
    stopMusic(true);
    state.token = null;
    state.user = null;
    localStorage.removeItem('word_spirit_token');
    localStorage.removeItem('general_token');
    state.view = 'login';
    render();
  }
});
document.addEventListener('submit', async event => {
  if (event.target.id === 'auth-form') {
    event.preventDefault();
    if (state.auth.busy) return;
    const login = state.view === 'login';
    const payload = Object.fromEntries(new FormData(event.target).entries());
    state.auth.busy = true;
    state.auth.error = '';
    state.auth.success = '';
    state.auth.phone = String(payload.phone || '').trim();
    render();
    try {
      const data = await api(login ? '/api/login' : '/api/register', { method: 'POST', body: JSON.stringify(payload) });
      if (!login) {
        applyRegistrationSuccess(data);
        return;
      }
      state.token = data.token;
      localStorage.setItem('word_spirit_token', data.token);
      state.user = data.user;
      normalizedProgress();
      startMusic();
      state.auth.busy = false;
      state.view = 'home';
      render();
    } catch (error) {
      state.auth.busy = false;
      state.auth.error = error.message;
      render();
      document.querySelector('.form-error')?.focus();
    }
  }
  if (event.target.id === 'reset-password-form') {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    state.auth.busy = true;
    state.auth.error = '';
    render();
    try {
      const data = await api('/api/password/reset-local', { method: 'POST', body: JSON.stringify(payload) });
      state.token = data.token;
      localStorage.setItem('word_spirit_token', data.token);
      state.user = data.user;
      normalizedProgress();
      startMusic();
      state.auth.busy = false;
      state.view = 'home';
      render();
    } catch (error) {
      state.auth.busy = false;
      state.auth.error = error.message;
      render();
      document.querySelector('.form-error')?.focus();
    }
  }
  if (event.target.id === 'profile-form') {
    event.preventDefault();
    try {
      const data = await api('/api/profile', { method: 'PATCH', body: JSON.stringify(Object.fromEntries(new FormData(event.target).entries())) });
      state.user = data.user;
      state.view = 'home';
      render();
    } catch (error) { toast(error.message); }
  }
  if (event.target.id === 'pet-adopt-form') {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    adoptPet(String(payload.speciesId || ''), String(payload.name || '').trim());
  }
  if (event.target.id === 'pet-rename-form') {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    renamePet(String(payload.name || '').trim());
  }
});

state.tipTimer = setInterval(() => {
  let next = state.tip;
  while (next === state.tip) next = Math.floor(Math.random() * TIPS.length);
  state.tip = next;
  if (state.user && state.view === 'home') render();
}, 3 * 60 * 1000);

loadUser();
