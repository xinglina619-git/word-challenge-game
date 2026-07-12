const TITLES = [
  '词灵新生', '萌芽学徒', '荣耀课代表', '单词探索家', '拼写逍遥王',
  '语音魔法师', '句子炼金师', '词灵斗战神', '星河守护者', '词灵大师'
];

const SPIRITS = [
  { id: 'lingling', name: '灵灵', rarity: '初始', asset: '', skill: '提示目标词' },
  { id: 'sprout', name: '星芽灵', rarity: '普通', asset: '/assets/spirit-sprout-v2.png', skill: '开局增加1步' },
  { id: 'bubble', name: '泡泡灵', rarity: '普通', asset: '/assets/spirit-bubble-v1.png', skill: '连击金币+1' },
  { id: 'candy', name: '糖果灵', rarity: '普通', asset: '/assets/spirit-candy-v1.png', skill: '消除得分+5%' },
  { id: 'spark', name: '火花灵', rarity: '稀有', asset: '/assets/spirit-spark-v1.png', skill: '四连范围扩大' },
  { id: 'cloud', name: '云朵灵', rarity: '稀有', asset: '/assets/spirit-cloud-v1.png', skill: '失败时保留1次连击' },
  { id: 'moon', name: '月光灵', rarity: '稀有', asset: '/assets/spirit-moon-v1.png', skill: '每关免费提示1次' },
  { id: 'rainbow', name: '彩虹灵', rarity: '传说', asset: '/assets/spirit-rainbow-v2.png', skill: '五连奖励翻倍' }
];

const SPIRIT_MUSIC_THEMES = {
  lingling: {
    name: '星光启程', beat: .50, loopMs: 4000, wave: 'triangle', accentWave: 'square',
    melody: [659, 784, 880, 1047, 880, 784, 698, 784, 659, 784, 988, 1175, 988, 880, 784, 1047],
    bass: [131, 196, 147, 220], harmony: [523, 659, 784, 659, 587, 698, 784, 880]
  },
  sprout: {
    name: '萌芽森林', beat: .58, loopMs: 4640, wave: 'sine', accentWave: 'triangle',
    melody: [523, 659, 784, 659, 587, 698, 784, 880, 784, 698, 659, 587, 523, 587, 659, 784],
    bass: [131, 165, 147, 196], harmony: [392, 523, 587, 523, 440, 587, 659, 587]
  },
  bubble: {
    name: '泡泡水湾', beat: .46, loopMs: 3680, wave: 'sine', accentWave: 'sine',
    melody: [784, 988, 1175, 988, 880, 1047, 1319, 1047, 784, 880, 988, 1175, 1047, 988, 880, 784],
    bass: [196, 247, 220, 262], harmony: [587, 784, 880, 784, 659, 880, 988, 880]
  },
  candy: {
    name: '糖果巡游', beat: .44, loopMs: 3520, wave: 'triangle', accentWave: 'square',
    melody: [659, 880, 1047, 1319, 1175, 1047, 880, 988, 784, 988, 1175, 1397, 1319, 1175, 988, 880],
    bass: [165, 220, 196, 247], harmony: [523, 659, 784, 880, 659, 784, 880, 988]
  },
  spark: {
    name: '火花电台', beat: .42, loopMs: 3360, wave: 'sawtooth', accentWave: 'triangle',
    melody: [587, 784, 988, 1175, 784, 1047, 1319, 988, 659, 880, 1109, 1319, 988, 1175, 880, 784],
    bass: [147, 196, 165, 220], harmony: [440, 587, 659, 784, 523, 659, 784, 880]
  },
  cloud: {
    name: '云朵漫步', beat: .62, loopMs: 4960, wave: 'sine', accentWave: 'triangle',
    melody: [523, 659, 784, 880, 784, 659, 587, 659, 698, 784, 880, 988, 880, 784, 698, 659],
    bass: [131, 175, 147, 196], harmony: [392, 523, 659, 523, 440, 587, 698, 587]
  },
  moon: {
    name: '月光摇篮', beat: .68, loopMs: 5440, wave: 'triangle', accentWave: 'sine',
    melody: [440, 523, 659, 523, 494, 587, 698, 587, 440, 494, 587, 659, 587, 523, 494, 440],
    bass: [110, 147, 123, 165], harmony: [330, 440, 494, 440, 370, 494, 523, 494]
  },
  rainbow: {
    name: '彩虹庆典', beat: .40, loopMs: 3200, wave: 'triangle', accentWave: 'square',
    melody: [784, 988, 1175, 1568, 1319, 1175, 988, 1319, 880, 1047, 1319, 1760, 1568, 1319, 1175, 988],
    bass: [196, 262, 220, 294], harmony: [587, 784, 880, 988, 659, 880, 988, 1175]
  }
};

const PRAISE_VOICE_PROFILES = {
  GOOD: { rate: 1.05, pitch: 1.42, volume: .90, chime: [784, 988], cheerBursts: 2 },
  GREAT: { rate: 1.03, pitch: 1.46, volume: .92, chime: [784, 988, 1175], cheerBursts: 2 },
  EXCELLENT: { rate: .98, pitch: 1.50, volume: .94, chime: [659, 880, 1175, 1397], cheerBursts: 3 },
  AMAZING: { rate: .94, pitch: 1.54, volume: .96, chime: [784, 1047, 1319, 1568], cheerBursts: 3 },
  UNBELIEVABLE: { rate: .88, pitch: 1.58, volume: .98, chime: [659, 988, 1319, 1760, 1976], cheerBursts: 4 },
  'BONUS TIME': { rate: .96, pitch: 1.52, volume: 1, chime: [784, 1175, 1568, 1976, 2349], cheerBursts: 5 }
};

function musicThemeForSpirit(id) {
  return SPIRIT_MUSIC_THEMES[id] || SPIRIT_MUSIC_THEMES.lingling;
}

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

const DRAW_ITEMS = [
  { id: 'hint', name: '智慧镜', icon: '🔮', amount: 2, rarity: '道具', description: '提示两次最佳移动' },
  { id: 'shuffle', name: '旋风骰', icon: '🎲', amount: 2, rarity: '道具', description: '重新排列两次棋盘' },
  { id: 'addMoves', name: '时光沙漏', icon: '⏳', amount: 1, rarity: '道具', description: '在关卡中增加5步' }
];

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
  '三消关可以自由选择单词，累计达到目标积分即可过关。',
  '单词消除时会自动朗读，并弹出对应的中文意思。',
  '连续五次消对会触发金币爆发。',
  '四个相同词块会产生更强的范围消除。',
  '听发音时，注意单词开头和结尾的声音。',
  '错词会进入错词本，连续答对两次即可掌握。',
  '每完成五关可以获得一张免费抽卡券。',
  '抽到重复词灵会自动变成进化星尘。',
  '没有可消除组合时，棋盘会自动重新排列。'
];

const state = {
  token: localStorage.getItem('word_spirit_token') || localStorage.getItem('general_token'),
  user: null,
  view: 'loading',
  game: null,
  result: null,
  drawResult: null,
  drawing: false,
  leaderboard: [],
  currentRank: null,
  notice: '',
  auth: { busy: false, error: '', passwordVisible: false },
  tip: Math.floor(Math.random() * TIPS.length),
  tipTimer: null,
  music: localStorage.getItem('word_spirit_music') !== 'off'
};

const app = document.querySelector('#app');
const GRADED = window.GAME_CONTENT.gradedMain;
const GRADE4 = window.GAME_CONTENT.grade4Book.units;
const TEXTBOOK = window.TEXTBOOK_WORDS?.grades || {};
let audioContext;
let bgmTimer;
let currentMusicThemeId = 'lingling';
const bgmNodes = new Set();

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
  p.draws = Math.max(0, Number(p.draws || 0));
  p.pity = Math.max(0, Number(p.pity || 0));
  p.bestCombo = Math.max(0, Number(p.bestCombo || 0));
  return p;
}
function titleFor(stage) { return TITLES[Math.min(9, Math.floor((Math.max(1, stage) - 1) / 10))]; }
function gradeFor(level) { return Math.min(5, Math.ceil(level / 20)); }
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
function trackBgmNode(node) {
  bgmNodes.add(node);
  node.addEventListener?.('ended', () => bgmNodes.delete(node), { once: true });
  return node;
}
function bgmTone(frequency, start, duration, type, volume) {
  try {
    audioContext ||= new AudioContext();
    audioContext.resume();
    const now = audioContext.currentTime;
    const oscillator = trackBgmNode(audioContext.createOscillator());
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now + start);
    gain.gain.setValueAtTime(.001, now + start);
    gain.gain.exponentialRampToValueAtTime(volume, now + start + .018);
    gain.gain.exponentialRampToValueAtTime(.001, now + start + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + .03);
  } catch {}
}
function bgmNoise(start, duration, volume) {
  try {
    audioContext ||= new AudioContext();
    const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * duration), audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = trackBgmNode(audioContext.createBufferSource());
    const gain = audioContext.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain).connect(audioContext.destination);
    source.start(audioContext.currentTime + start);
  } catch {}
}
function clearScheduledBgm() {
  bgmNodes.forEach(node => {
    try { node.stop(); } catch {}
  });
  bgmNodes.clear();
}
function scheduleMusic(themeId = currentMusicThemeId) {
  if (!state.music) return;
  const theme = musicThemeForSpirit(themeId);
  const beat = theme.beat;
  const leadVolume = theme.wave === 'sawtooth' ? .012 : .019;
  theme.melody.forEach((note, i) => bgmTone(note, i * beat / 2, .15, i % 4 === 3 ? theme.accentWave : theme.wave, leadVolume));
  theme.bass.forEach((note, i) => bgmTone(note, i * beat * 2, beat * .82, 'sine', .016));
  theme.harmony.forEach((note, i) => bgmTone(note, i * beat, .12, theme.accentWave, .008));
  for (let i = 0; i < 16; i += 1) {
    if (i % 4 === 0) bgmTone(78 + (themeId === 'bubble' ? 18 : 0), i * beat / 2, .12, 'sine', .027);
    if (i % 4 === 2) bgmNoise(i * beat / 2, .07, .012);
    if (themeId === 'spark' || themeId === 'rainbow') bgmNoise(i * beat / 2 + beat * .24, .02, .004);
  }
}
function stopMusic() {
  clearInterval(bgmTimer);
  bgmTimer = null;
  clearScheduledBgm();
}
function startMusic(themeId = activeSpirit().id) {
  const nextThemeId = SPIRIT_MUSIC_THEMES[themeId] ? themeId : 'lingling';
  if (!state.music) {
    currentMusicThemeId = nextThemeId;
    return;
  }
  if (bgmTimer && currentMusicThemeId === nextThemeId) return;
  stopMusic();
  currentMusicThemeId = nextThemeId;
  const theme = musicThemeForSpirit(nextThemeId);
  scheduleMusic(nextThemeId);
  bgmTimer = setInterval(() => scheduleMusic(currentMusicThemeId), theme.loopMs);
}
function restartMusicForSpirit(id) {
  const nextThemeId = SPIRIT_MUSIC_THEMES[id] ? id : 'lingling';
  if (state.music) startMusic(nextThemeId);
  else currentMusicThemeId = nextThemeId;
}
function toggleMusic() {
  state.music = !state.music;
  localStorage.setItem('word_spirit_music', state.music ? 'on' : 'off');
  if (state.music) startMusic(activeSpirit().id); else stopMusic();
  render();
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
function createPraiseUtterance(praise, excludedURI = lastLearningVoiceURI, voices = systemVoices()) {
  const voicePool = cacheSystemVoices(voices);
  const profile = PRAISE_VOICE_PROFILES[praise] || PRAISE_VOICE_PROFILES.GOOD;
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
  const profile = PRAISE_VOICE_PROFILES[praise] || PRAISE_VOICE_PROFILES.GOOD;
  profile.chime.forEach((note, index) => tone(note, index * .055, .18 + index * .018, 'triangle', .035 + index * .004));
  for (let index = 0; index < profile.cheerBursts; index += 1) {
    const start = .08 + index * .105;
    noise(start, .055, .032 + index * .003);
    noise(start + .035, .035, .018);
  }
}
async function speakPraiseFallback(praise) {
  if (!('speechSynthesis' in window)) return;
  await waitForSystemVoices();
  const line = createPraiseUtterance(praise, lastLearningVoiceURI);
  window.speechSynthesis.speak(line);
}
if ('speechSynthesis' in window) {
  cacheSystemVoices(window.speechSynthesis.getVoices?.() || []);
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cacheSystemVoices(window.speechSynthesis.getVoices?.() || []);
    voiceReadyPromise = null;
  });
}
async function speakWord(word) {
  if (!('speechSynthesis' in window)) return;
  await waitForSystemVoices();
  const line = createLearningUtterance(word);
  lastLearningVoiceURI = line.voice?.voiceURI || '';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(line);
}

function growthStage(count = 1) { return count >= 4 ? 3 : count >= 2 ? 2 : 1; }
function growthName(count = 1) { return ['幼年', '成长', '闪耀'][growthStage(count) - 1]; }
function activeSpirit() {
  if (!state.user) return SPIRITS[0];
  return spiritById(normalizedProgress().equipped);
}
function spiritFigure(className = '', spirit = activeSpirit(), count) {
  const owned = count ?? (state.user?.progress?.spirits?.[spirit.id] || 1);
  const unique = spirit.asset ? 'unique-spirit' : '';
  const style = spirit.asset ? `--spirit-image:url('${spirit.asset}')` : '';
  return `<span class="spirit-figure ${unique} growth-stage-${growthStage(owned)} ${className}" style="${style}" role="img" aria-label="${spirit.name}"></span>`;
}
function spiritById(id) { return SPIRITS.find(item => item.id === id) || SPIRITS[0]; }

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
  if (level % 5 === 0) return { type: 'treasure', name: '星愿宝箱关', icon: '🎁', bonus: '通关额外获得金币和抽卡券' };
  return { type: 'normal', name: modeForLevel(level) === 'match3' ? '单词三消战' : '中英配对战', icon: modeForLevel(level) === 'match3' ? '💥' : '🔗', bonus: '完成挑战，积累词灵成长能量' };
}
function makePairs(words) {
  return shuffle(words.flatMap((word, type) => [
    { type, lang: 'en', text: word.word, matched: false },
    { type, lang: 'zh', text: word.zh, matched: false }
  ]));
}

const SIZE = 6;
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
      if (col < SIZE && board[indexOf(row, col)] === board[indexOf(row, start)]) continue;
      if (board[indexOf(row, start)] != null && col - start >= 3) {
        lines.push(Array.from({ length: col - start }, (_, i) => indexOf(row, start + i)));
      }
      start = col;
    }
  }
  for (let col = 0; col < SIZE; col += 1) {
    let start = 0;
    for (let row = 1; row <= SIZE; row += 1) {
      if (row < SIZE && board[indexOf(row, col)] === board[indexOf(start, col)]) continue;
      if (board[indexOf(start, col)] != null && row - start >= 3) {
        lines.push(Array.from({ length: row - start }, (_, i) => indexOf(start + i, col)));
      }
      start = row;
    }
  }
  return lines;
}
function possibleMoves(board) {
  const moves = [];
  for (let index = 0; index < board.length; index += 1) {
    const { row, col } = cellOf(index);
    for (const next of [col < SIZE - 1 ? index + 1 : -1, row < SIZE - 1 ? index + SIZE : -1]) {
      if (next < 0 || board[index] === board[next]) continue;
      const changed = swap(board, index, next);
      const lines = findMatchLines(changed);
      if (lines.length) moves.push({ a: index, b: next, words: [...new Set(lines.map(line => changed[line[0]]))] });
    }
  }
  return moves;
}
function makeBoard(wordCount) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const board = [];
    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const { row, col } = cellOf(index);
      const blocked = new Set();
      if (col >= 2 && board[index - 1] === board[index - 2]) blocked.add(board[index - 1]);
      if (row >= 2 && board[index - SIZE] === board[index - SIZE * 2]) blocked.add(board[index - SIZE]);
      const choices = Array.from({ length: wordCount }, (_, i) => i).filter(i => !blocked.has(i));
      board.push(choices[Math.floor(Math.random() * choices.length)]);
    }
    if (possibleMoves(board).length) return board;
  }
  return Array.from({ length: SIZE * SIZE }, (_, i) => i % wordCount);
}
function chooseTarget(game) {
  let moves = possibleMoves(game.board);
  if (!moves.length) {
    game.board = makeBoard(game.words.length);
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
    level,
    grade: gradeFor(level),
    mode,
    mission,
    words,
    board: makeBoard(words.length),
    pairs: makePairs(words),
    target: null,
    targetType: 0,
    selected: null,
    hintCells: [],
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
    meaningFlash: null,
    memoryWords: [],
    praise: '',
    message: mode === 'match3' ? '自由寻找三连，达到目标积分即可通关' : '点击中文和对应英文，完成配对'
  };
  if (mode === 'pair') game.target = words[0];
  return game;
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
      board[indexOf(row, col)] = i < kept.length ? kept[i] : Math.floor(Math.random() * game.words.length);
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
    const type = board[lines.find(line => line.length === longest)[0]];
    board.forEach((value, index) => { if (value === type) removed.add(index); });
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
  game.meaningFlash = null;
  game.praise = '';
  render();
  await sleep(560);
  const cascades = findMatchLines(game.board);
  if (cascades.length && depth < 6) {
    const next = expandedRemoval(cascades, game.board);
    const cascadeTypes = [...new Set(cascades.map(line => game.board[line[0]]))];
    game.score += next.removed.size * 4;
    game.effect = 'cascade';
    game.exploding = [...next.removed];
    announceElimination(game, cascadeTypes, true);
    game.praise = playPraise(next.special || 'cascade', next.removed.size, depth + 2);
    soundSpecial(next.special || 'pop', next.removed.size);
    render();
    await flyMeaningToMemory(game, 1500);
    return settleBoard(game, next.removed, depth + 1);
  }
  game.effect = '';
  game.exploding = [];
  game.meaningFlash = null;
  game.praise = '';
  if (!possibleMoves(game.board).length) game.board = makeBoard(game.words.length);
}
function recordMistake(word) {
  const p = normalizedProgress();
  const current = p.mistakes[word.word] || { wrongCount: 0, correctStreak: 0, reviewCount: 0 };
  p.mistakes[word.word] = { ...current, wrongCount: current.wrongCount + 1, correctStreak: 0, lastWrongAt: new Date().toISOString() };
}
function recordMastered(word) {
  const p = normalizedProgress();
  if (!p.collected.includes(word.word)) p.collected.push(word.word);
  const mistake = p.mistakes[word.word];
  if (mistake) {
    mistake.correctStreak = (mistake.correctStreak || 0) + 1;
    mistake.reviewCount = (mistake.reviewCount || 0) + 1;
    if (mistake.correctStreak >= 2) delete p.mistakes[word.word];
  }
}
async function speakWords(words) {
  if (!('speechSynthesis' in window) || !words.length) return;
  await waitForSystemVoices();
  window.speechSynthesis.cancel();
  words.slice(0, 3).forEach((word, index) => {
    const line = createLearningUtterance(word);
    line.pitch += index * .025;
    if (!index) lastLearningVoiceURI = line.voice?.voiceURI || '';
    window.speechSynthesis.speak(line);
  });
}
function praiseForEffect(kind, count = 3, combo = 1) {
  if (kind === 'coin-burst') return 'BONUS TIME';
  if (kind === 'rainbow') return 'UNBELIEVABLE';
  if (kind === 'rocket' || kind === 'burst' || count >= 9) return 'AMAZING';
  if (kind === 'cascade' || combo >= 3 || count >= 6) return 'EXCELLENT';
  if (combo >= 2 || count >= 4) return 'GREAT';
  return 'GOOD';
}
function playPraise(kind, count, combo) {
  const praise = praiseForEffect(kind, count, combo);
  soundPraiseCue(praise);
  speakPraiseFallback(praise);
  return praise;
}
function announceElimination(game, types, cascade = false) {
  const learned = types.map(type => game.words[type]).filter(Boolean);
  if (!learned.length) return;
  game.meaningFlash = { words: learned.slice(0, 3), cascade };
  learned.forEach(recordMastered);
  speakWords(learned.map(item => item.word));
}
async function flyMeaningToMemory(game, hold = 1500) {
  await sleep(hold);
  if (!game.meaningFlash) return;
  const words = game.meaningFlash.words;
  game.meaningFlash = { ...game.meaningFlash, flying: true };
  render();
  await sleep(520);
  game.effect = '';
  game.exploding = [];
  game.praise = '';
  game.memoryWords = words;
  game.meaningFlash = null;
  render();
}
async function selectCell(index) {
  const game = state.game;
  if (!game || game.mode !== 'match3' || game.busy) return;
  if (game.selected == null) {
    game.selected = index;
    render();
    return;
  }
  if (game.selected === index) {
    game.selected = null;
    render();
    return;
  }
  if (!adjacent(game.selected, index)) {
    game.selected = index;
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
    game.message = '这一步没有形成三连，再试一次';
    game.effect = 'shake';
    soundWrong();
    game.busy = false;
    render();
    setTimeout(() => { if (state.game === game) { game.effect = ''; render(); } }, 380);
    return;
  }

  game.moves -= 1;
  const matchedTypes = new Set(lines.map(line => game.board[line[0]]));
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
  await flyMeaningToMemory(game, game.effect === 'coin-burst' ? 1800 : 1500);
  await settleBoard(game, expanded.removed);
  game.busy = false;
  if (game.score >= game.scoreGoal) return finishLevel(true);
  if (game.moves <= 0) return finishLevel(false);
  game.message = `当前 ${game.score} 分，再得 ${Math.max(0, game.scoreGoal - game.score)} 分过关`;
  render();
}

async function selectPair(index) {
  const game = state.game;
  if (!game || game.mode !== 'pair' || game.busy) return;
  const card = game.pairs[index];
  if (!card || card.matched) return;
  if (game.selected == null) {
    game.selected = index;
    if (card.lang === 'en') speakWord(card.text);
    render();
    return;
  }
  if (game.selected === index) {
    game.selected = null;
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
  if (correct) game.memoryWords = [game.words[card.type]];
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
  const p = normalizedProgress();
  if (!win) {
    state.result = { win: false, level: game.level, score: game.score, combo: game.maxCombo };
    state.view = 'result';
    render();
    return;
  }
  const stars = game.moves >= 10 ? 3 : game.moves >= 5 ? 2 : 1;
  const xp = 30 + game.grade * 8 + stars * 5 + (game.mission.type === 'boss' ? 20 : 0);
  const missionCoins = game.mission.type === 'treasure' ? 30 : game.mission.type === 'boss' ? 20 : 0;
  const coins = 12 + game.grade * 4 + stars * 4 + game.sessionCoins + missionCoins;
  const ticket = game.level % 20 === 0 ? 2 : game.level % 5 === 0 ? 1 : 0;
  p.stage = Math.max(p.stage, Math.min(100, game.level + 1));
  p.xp += xp;
  p.coins += coins;
  p.tickets += ticket;
  p.streak += 1;
  p.bestCombo = Math.max(p.bestCombo, game.maxCombo);
  try { await persistProgress(); } catch {}
  state.result = { win: true, level: game.level, score: game.score, combo: game.maxCombo, stars, xp, coins, ticket, mission: game.mission, missionCoins };
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
    game.board = makeBoard(game.words.length);
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
      <div class="top-actions"><button class="music" data-action="music">${state.music ? '♫' : '♪×'}</button><span>🎟 ${p.tickets}</span><span>🪙 ${p.coins}</span><button class="profile" data-action="profile">${esc(state.user.profile.nickname)}</button></div>
    </header>
    ${content}
    <nav class="bottom-nav">
      <button class="${active === 'home' ? 'active' : ''}" data-action="home">🪐<span>星球</span></button>
      <button class="${active === 'game' ? 'active' : ''}" data-action="play">◆<span>消消乐</span></button>
      <button class="${active === 'draw' ? 'active' : ''}" data-action="draw">✦<span>抽卡</span></button>
      <button class="${active === 'collection' ? 'active' : ''}" data-action="collection">▦<span>词灵</span></button>
      <button class="${active === 'rank' ? 'active' : ''}" data-action="leaderboard">♛<span>排行</span></button>
    </nav>
  </div>${state.notice ? `<div class="toast">${esc(state.notice)}</div>` : ''}`;
}
function authView() {
  const login = state.view === 'login';
  return `<main class="auth-page"><section class="auth-card">
    ${spiritFigure('auth-spirit')}
    <p>英语单词消消乐</p><h1>词灵星球</h1><small>消除单词，收集词灵，让每次升级都有新发现。</small>
    <div class="auth-tabs"><button class="${login ? 'active' : ''}" data-action="switch-login">登录</button><button class="${!login ? 'active' : ''}" data-action="switch-register">注册</button></div>
    <form id="auth-form">
      <label>家长手机号<input required name="phone" inputmode="numeric" autocomplete="tel" maxlength="11" placeholder="请输入11位手机号"></label>
      <label>密码<span class="password-field"><input required name="password" type="${state.auth.passwordVisible ? 'text' : 'password'}" autocomplete="${login ? 'current-password' : 'new-password'}" minlength="6" placeholder="至少6位密码"><button type="button" class="password-toggle" data-action="toggle-password">${state.auth.passwordVisible ? '隐藏' : '显示'}</button></span></label>
      ${login ? '' : '<label>玩家昵称<input required name="nickname" maxlength="12" placeholder="例如：闪闪"></label>'}
      ${state.auth.error ? `<div class="form-error" role="alert" tabindex="-1">${esc(state.auth.error)}</div>` : ''}
      <button class="primary" type="submit" ${state.auth.busy ? 'disabled' : ''}>${state.auth.busy ? '正在进入…' : login ? '进入词灵星球' : '创建玩家'}</button>
      ${login ? '<button class="auth-help" type="button" data-action="forgot-password">忘记密码？在本机恢复</button>' : ''}
    </form><small class="privacy">家庭试玩版，不展示手机号，不包含付费抽卡。</small>
  </section></main>`;
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
  const nextTicket = 5 - ((level - 1) % 5);
  const owned = Object.keys(p.spirits).length;
  const power = 100 + Object.values(p.spirits).reduce((sum, count) => sum + growthStage(count) * 25, 0) + Object.values(p.inventory).reduce((sum, count) => sum + count * 3, 0);
  const equipped = spiritById(p.equipped);
  return shell(`<main class="home-page">
    <section class="hero">
      <div><p>当前称号 · ${titleFor(level)}</p><h1>${esc(state.user.profile.nickname)}，今天消几个词？</h1><div class="hero-stats"><span>第 ${level} 关</span><span>${gradeFor(level)}年级</span><span>词灵 ${owned}/${SPIRITS.length}</span></div><button class="play-main" data-action="play">开始消除 ▶</button></div>
      <div class="hero-spirit-wrap">${spiritFigure('hero-spirit', equipped, p.spirits[equipped.id])}<small>${equipped.name} · ${growthName(p.spirits[equipped.id])} · 战力 ${power}</small></div>
    </section>
    <section class="level-progress"><div><b>成长等级 ${xpLevel(p.xp)}</b><span>${p.xp % 100}/100 XP</span></div><i><em style="width:${p.xp % 100}%"></em></i><small>再完成 ${nextTicket} 关获得免费抽卡券</small></section>
    <div class="home-grid">
      <button data-action="draw"><span>🎟</span><b>免费抽卡</b><small>${p.tickets} 张抽卡券</small></button>
      <button data-action="collection"><span>✨</span><b>词灵图鉴</b><small>已收集 ${owned} 只</small></button>
      <button data-action="mistakes"><span>📝</span><b>错词本</b><small>${Object.keys(p.mistakes).length} 个待复习</small></button>
      <button data-action="levels"><span>🗺️</span><b>选择关卡</b><small>1～${level} 关可玩</small></button>
      <button data-action="shop"><span>🛍️</span><b>金币道具屋</b><small>用游戏金币兑换增强道具</small></button>
    </div>
    <section class="tip-card"><span>💡</span><div><b>词灵小提示</b><p>${esc(TIPS[state.tip])}</p></div></section>
  </main>`);
}
function levelIntroView() {
  const game = state.game;
  if (!game) return homeView();
  const modeText = game.mode === 'match3' ? `自由寻找三连，消除时学习发音和中文，累计达到 ${game.scoreGoal} 分` : '点击一个中文词牌和它对应的英文词牌';
  return shell(`<main class="mission-intro ${game.mission.type}">
    <div class="mission-icon">${game.mission.icon}</div>
    <p>第 ${game.level} 关 · ${game.grade}年级</p>
    <h1>${game.mission.name}</h1>
    <div class="mode-card"><b>${game.mode === 'match3' ? '💥 三消战斗' : '🔗 中英配对'}</b><span>${modeText}</span></div>
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
function memoryInline(game) {
  const label = '本次学习词';
  if (!game.memoryWords.length) {
    return `<div class="target-memory-slot empty"><small>${label}</small><span>消除后显示单词与中文</span></div>`;
  }
  return `<div class="target-memory-slot has-word"><small>${label}</small><div>${game.memoryWords.map(word => `<b><span>${esc(word.word)}</span><em>${esc(word.zh)}</em></b>`).join('')}</div></div>`;
}
function gameView() {
  const game = state.game;
  const p = normalizedProgress();
  if (!game) return homeView();
  return shell(`<main class="game-page">
    <div class="game-head"><button data-action="leave-game">‹</button><div><b>第 ${game.level} 关 · ${game.grade}年级</b><span>${game.mode === 'match3' ? `${game.score}/${game.scoreGoal} 目标积分` : `${game.done}/${game.goal} 个配对`}</span></div><div><b>${game.moves}</b><span>剩余步数</span></div></div>
    <section class="target-card ${game.mode}">
      ${spiritFigure(`target-spirit ${game.combo >= 5 ? 'excited' : ''}`)}
      ${game.mode === 'match3'
        ? `<div class="target-summary"><small>自由三消积分关</small><h1>目标 ${game.scoreGoal} 分</h1><button class="score-chip">当前 ${game.score} 分</button></div>`
        : `<div class="target-summary"><small>${game.mission.name}</small><h1>找到中英搭档</h1><button data-action="pair-rule">中文＋英文</button></div>`}
      ${memoryInline(game)}
      <div class="combo"><b>${game.combo}</b><span>连击</span></div>
    </section>
    <div class="goal-progress"><i style="width:${Math.min(100, game.mode === 'match3' ? game.score / game.scoreGoal * 100 : game.done / game.goal * 100)}%"></i></div>
    <p class="game-message">${esc(game.message)}</p>
    <section class="${game.mode === 'match3' ? 'board' : 'pair-board'} ${game.effect}" style="--types:${game.words.length}">
      ${game.mode === 'match3' ? game.board.map((type, index) => {
        const word = game.words[type];
        return `<button class="tile type-${type} ${game.selected === index ? 'selected' : ''} ${game.hintCells.includes(index) ? 'hint' : ''} ${game.exploding.includes(index) ? 'exploding' : ''}" data-cell="${index}" ${game.busy ? 'disabled' : ''}><span>${esc(word.word)}</span><small>${word.icon || '✦'}</small></button>`;
      }).join('') : game.pairs.map((card, index) => `<button class="pair-card ${card.lang} type-${card.type} ${game.selected === index ? 'selected' : ''} ${game.hintCells.includes(index) ? 'hint' : ''} ${card.matched ? 'matched' : ''} ${game.exploding.includes(index) ? 'exploding' : ''}" data-pair="${index}" aria-label="${esc(card.text)}" ${game.busy || card.matched ? 'disabled' : ''}>${pairFace(card, game.words[card.type])}</button>`).join('')}
      ${effectLayer(game)}
      ${game.meaningFlash ? `<div class="meaning-pop ${game.meaningFlash.cascade ? 'cascade-word' : ''} ${game.meaningFlash.flying ? 'flying' : ''}"><small>${game.meaningFlash.cascade ? '连锁学习' : '本次消除'}</small>${game.meaningFlash.words.map(word => `<div><b>${esc(word.word)}</b><span>${esc(word.zh)}</span></div>`).join('')}</div>` : ''}
      ${game.effect === 'coin-burst' ? '<div class="coin-explosion"><b>五星连捷！</b><span>🪙 +15</span></div>' : ''}
    </section>
    <div class="tools">
      <button data-action="hint"><b>💡 ${p.inventory.hint}</b><span>提示</span></button>
      <button data-action="shuffle"><b>🔀 ${p.inventory.shuffle}</b><span>${game.mode === 'match3' ? '重排' : '重新摆放'}</span></button>
      <button data-action="add-moves"><b>＋5 ${p.inventory.addMoves}</b><span>加步数</span></button>
    </div>
    <div class="score-row"><span>得分 <b>${game.score}</b></span><span>最高连击 <b>${game.maxCombo}</b></span></div>
  </main>`, 'game');
}
function resultView() {
  const r = state.result;
  return shell(`<main class="result-page ${r.win ? 'win' : 'lose'}">
    ${spiritFigure('result-spirit')}
    <p>${r.win ? '关卡完成' : '步数用完啦'}</p>
    <h1>${r.win ? ['漂亮！全部消掉啦！', '这关也被你拿下了！', '词灵都在为你鼓掌！'][r.level % 3] : '差一点就成功了'}</h1>
    ${r.win ? `<div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>${r.mission?.type !== 'normal' ? `<div class="mission-reward">${r.mission.icon} ${r.mission.name}奖励已开启</div>` : ''}<div class="reward-row"><span>经验 +${r.xp}</span><span>金币 +${r.coins}</span>${r.ticket ? `<span>抽卡券 +${r.ticket}</span>` : ''}</div>` : ''}
    <div class="result-stats"><span>得分 <b>${r.score}</b></span><span>最高连击 <b>${r.combo}</b></span></div>
    <button class="primary" data-action="${r.win ? 'next-level' : 'retry'}">${r.win ? (r.level >= 100 ? '返回星球' : '下一关') : '重新挑战'}</button>
    <button class="ghost" data-action="home">返回主页</button>
  </main>`, 'game');
}
function levelsView() {
  const p = normalizedProgress();
  return shell(`<main class="list-page"><div class="page-title"><span>🗺️</span><div><p>关卡星图</p><h1>选择学习进度</h1></div></div>
    <div class="level-grid">${Array.from({ length: 100 }, (_, i) => i + 1).map(level => `<button data-level="${level}" class="${level <= p.stage ? 'open' : 'locked'}" ${level > p.stage ? 'disabled' : ''}><b>${level}</b><small>${gradeFor(level)}年级</small></button>`).join('')}</div>
  </main>`);
}
function drawView() {
  const p = normalizedProgress();
  const result = state.drawResult;
  const isItem = result?.type === 'item';
  const revealRarity = result?.rarity || '';
  return shell(`<main class="draw-page">
    <div class="draw-sky ${state.drawing ? 'drawing' : ''} ${result ? `reveal-${revealRarity}` : ''}">
      ${state.drawing
        ? '<div class="summon-capsule"><i></i><b>星愿正在回应……</b></div>'
        : isItem
          ? `<div class="item-reveal-icon">${result.icon}</div>`
          : spiritFigure('draw-spirit', result ? spiritById(result.id) : activeSpirit(), result?.count)}
      ${result && !state.drawing ? `<div class="draw-reveal"><small>${result.rarity}</small><h1>${result.name}</h1><p>${isItem ? `${result.description} · 数量 +${result.amount}` : result.duplicate ? `重复词灵转化为 ${result.dust} 星尘，并积累成长能量` : result.skill}</p>${!isItem ? `<b>${growthName(result.count)}形态</b>` : ''}</div>` : state.drawing ? '' : '<div><p>免费成长抽卡</p><h1>召唤词灵与增强道具</h1><small>每10抽稀有保底 · 每30抽传说保底</small></div>'}
    </div>
    <div class="draw-info"><span>🎟 抽卡券 <b>${p.tickets}</b></span><span>✨ 星尘 <b>${p.dust}</b></span><span>稀有保底 <b>${p.pity}/10</b></span><span>传说保底 <b>${p.draws % 30}/30</b></span></div>
    <button class="draw-button" data-action="draw-card" ${p.tickets <= 0 || state.drawing ? 'disabled' : ''}>${state.drawing ? '星光汇聚中…' : '消耗1张抽卡券'}</button>
    <p class="fair-note">公开概率：普通词灵50% · 增强道具20% · 稀有词灵25% · 传说词灵5%。抽卡券只通过学习获得，不出售。</p>
  </main>`, 'draw');
}
function collectionView() {
  const p = normalizedProgress();
  return shell(`<main class="list-page"><div class="page-title"><span>✨</span><div><p>词灵图鉴</p><h1>${Object.keys(p.spirits).length}/${SPIRITS.length} 已收集</h1></div></div>
    <div class="spirit-grid">${SPIRITS.map(spirit => {
      const count = p.spirits[spirit.id] || 0;
      return `<article class="${count ? 'owned' : 'unknown'} ${p.equipped === spirit.id ? 'equipped' : ''}">${spiritFigure('card-spirit', spirit, count || 1)}<small>${count ? `${spirit.rarity} · ${growthName(count)}` : '尚未发现'}</small><h2>${count ? spirit.name : '？？？'}</h2><p>${count ? spirit.skill : '通过免费抽卡获得'}</p>${count ? `<div class="growth-dots"><i></i><i class="${count >= 2 ? 'on' : ''}"></i><i class="${count >= 4 ? 'on' : ''}"></i></div><button data-action="equip-spirit" data-spirit="${spirit.id}" ${p.equipped === spirit.id ? 'disabled' : ''}>${p.equipped === spirit.id ? '正在陪伴' : '设为伙伴'}</button>` : ''}</article>`;
    }).join('')}</div>
  </main>`, 'collection');
}
function shopView() {
  const p = normalizedProgress();
  const offers = [
    { id: 'hint', icon: '🔮', name: '智慧镜', description: '提示一次最佳移动', price: 60 },
    { id: 'shuffle', icon: '🎲', name: '旋风骰', description: '重新排列棋盘', price: 90 },
    { id: 'addMoves', icon: '⏳', name: '时光沙漏', description: '当前关卡增加5步', price: 120 }
  ];
  return shell(`<main class="list-page"><div class="page-title"><span>🛍️</span><div><p>金币道具屋</p><h1>拥有 🪙 ${p.coins}</h1></div></div>
    <p class="shop-note">所有金币均由学习和闯关获得，道具不会收费出售。</p>
    <div class="shop-grid">${offers.map(item => `<article><div>${item.icon}</div><h2>${item.name}</h2><p>${item.description}</p><small>库存 ${p.inventory[item.id] || 0}</small><button data-action="buy-item" data-item="${item.id}" data-price="${item.price}" ${p.coins < item.price ? 'disabled' : ''}>🪙 ${item.price} 兑换</button></article>`).join('')}</div>
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
  else if (state.view === 'draw') app.innerHTML = drawView();
  else if (state.view === 'collection') app.innerHTML = collectionView();
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
async function drawCard() {
  const p = normalizedProgress();
  if (p.tickets <= 0) return toast('完成关卡即可获得免费抽卡券');
  p.tickets -= 1;
  p.draws += 1;
  p.pity += 1;
  state.drawResult = null;
  state.drawing = true;
  render();
  [220, 260, 320, 420, 560].forEach((note, index) => tone(note, index * .2, .28, 'triangle', .04));
  await sleep(1450);
  const legendGuaranteed = p.draws % 30 === 0;
  const rareGuaranteed = p.pity >= 10;
  const roll = Math.random();
  if (!legendGuaranteed && !rareGuaranteed && roll < .2) {
    const item = DRAW_ITEMS[Math.floor(Math.random() * DRAW_ITEMS.length)];
    p.inventory[item.id] = (p.inventory[item.id] || 0) + item.amount;
    state.drawResult = { ...item, type: 'item' };
    state.drawing = false;
    soundDraw('道具');
    try { await persistProgress(); } catch {}
    render();
    return;
  }
  let pool;
  if (legendGuaranteed || (!rareGuaranteed && roll >= .95)) pool = SPIRITS.filter(item => item.rarity === '传说');
  else if (rareGuaranteed || roll >= .7) pool = SPIRITS.filter(item => item.rarity === '稀有');
  else pool = SPIRITS.filter(item => item.rarity === '普通');
  const spirit = pool[Math.floor(Math.random() * pool.length)];
  const duplicate = Boolean(p.spirits[spirit.id]);
  const dust = spirit.rarity === '传说' ? 30 : spirit.rarity === '稀有' ? 15 : 6;
  if (duplicate) {
    p.spirits[spirit.id] += 1;
    p.dust += dust;
  } else p.spirits[spirit.id] = 1;
  if (spirit.rarity === '稀有' || spirit.rarity === '传说') p.pity = 0;
  state.drawResult = { ...spirit, duplicate, dust, count: p.spirits[spirit.id], type: 'spirit' };
  state.drawing = false;
  soundDraw(spirit.rarity);
  try { await persistProgress(); } catch {}
  render();
}
function startLevel(level) {
  state.game = newGame(Math.max(1, Math.min(100, level)));
  state.result = null;
  state.view = 'intro';
  render();
}
async function equipSpirit(id) {
  const p = normalizedProgress();
  if (!p.spirits[id]) return;
  p.equipped = id;
  restartMusicForSpirit(id);
  soundCombo(growthStage(p.spirits[id]));
  try { await persistProgress(); } catch {}
  toast(`${spiritById(id).name}已加入，主题曲「${musicThemeForSpirit(id).name}」开始播放`);
}
async function buyItem(id, price) {
  const p = normalizedProgress();
  if (!Object.hasOwn(p.inventory, id) || !Number.isFinite(price)) return;
  if (p.coins < price) return toast('金币还不够，继续闯关就能获得');
  p.coins -= price;
  p.inventory[id] += 1;
  try { await persistProgress(); } catch {}
  soundCoinBurst();
  toast('兑换成功，道具已经放进背包');
}
async function loadUser() {
  if (!state.token) {
    state.view = 'register';
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

document.addEventListener('pointerdown', startMusic, { once: true });
document.addEventListener('click', async event => {
  const cell = event.target.closest('[data-cell]');
  if (cell) return selectCell(Number(cell.dataset.cell));
  const pair = event.target.closest('[data-pair]');
  if (pair) return selectPair(Number(pair.dataset.pair));
  const level = event.target.closest('[data-level]');
  if (level) return startLevel(Number(level.dataset.level));
  const spiritButton = event.target.closest('[data-spirit]');
  if (spiritButton && spiritButton.dataset.action === 'equip-spirit') return equipSpirit(spiritButton.dataset.spirit);
  const itemButton = event.target.closest('[data-item]');
  if (itemButton && itemButton.dataset.action === 'buy-item') return buyItem(itemButton.dataset.item, Number(itemButton.dataset.price));
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'switch-login') { state.auth.error = ''; state.view = 'login'; render(); }
  if (action === 'switch-register') { state.auth.error = ''; state.view = 'register'; render(); }
  if (action === 'toggle-password') {
    state.auth.passwordVisible = !state.auth.passwordVisible;
    document.querySelectorAll('input[name="password"],input[name="confirmPassword"]').forEach(input => { input.type = state.auth.passwordVisible ? 'text' : 'password'; });
    event.target.textContent = state.auth.passwordVisible ? '隐藏' : '显示';
    return;
  }
  if (action === 'forgot-password') { state.auth.error = ''; state.view = 'reset-password'; render(); }
  if (action === 'back-login') { state.auth.error = ''; state.view = 'login'; render(); }
  if (action === 'home' || action === 'leave-game') { state.view = 'home'; state.game = null; render(); }
  if (action === 'play') startLevel(Math.min(100, normalizedProgress().stage));
  if (action === 'levels') { state.view = 'levels'; render(); }
  if (action === 'enter-level') {
    state.view = 'game';
    render();
  }
  if (action === 'draw') { state.view = 'draw'; state.drawResult = null; render(); }
  if (action === 'draw-card') drawCard();
  if (action === 'collection') { state.view = 'collection'; render(); }
  if (action === 'mistakes') { state.view = 'mistakes'; render(); }
  if (action === 'shop') { state.view = 'shop'; render(); }
  if (action === 'leaderboard') openLeaderboard();
  if (action === 'profile') { state.view = 'profile'; render(); }
  if (action === 'music') toggleMusic();
  if (action === 'speak') speakWord(state.game.target.word);
  if (action === 'pair-rule') toast('先点中文或英文，再点它的正确搭档');
  if (action === 'hint') useHint();
  if (action === 'shuffle') shuffleGame();
  if (action === 'add-moves') addMoves();
  if (action === 'retry') startLevel(state.result.level);
  if (action === 'next-level') {
    if (state.result.level >= 100) { state.view = 'home'; render(); }
    else startLevel(state.result.level + 1);
  }
  if (action === 'logout') {
    try { await api('/api/logout', { method: 'POST' }); } catch {}
    stopMusic();
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
    const login = state.view === 'login';
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const button = event.target.querySelector('button[type="submit"]');
    state.auth.busy = true;
    state.auth.error = '';
    button.disabled = true;
    button.textContent = login ? '正在进入…' : '正在创建…';
    try {
      const data = await api(login ? '/api/login' : '/api/register', { method: 'POST', body: JSON.stringify(payload) });
      state.token = data.token;
      localStorage.setItem('word_spirit_token', data.token);
      state.user = data.user;
      const progress = normalizedProgress();
      restartMusicForSpirit(progress.equipped);
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
      const progress = normalizedProgress();
      restartMusicForSpirit(progress.equipped);
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
});

state.tipTimer = setInterval(() => {
  let next = state.tip;
  while (next === state.tip) next = Math.floor(Math.random() * TIPS.length);
  state.tip = next;
  if (state.user && state.view === 'home') render();
}, 3 * 60 * 1000);

loadUser();
