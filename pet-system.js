(function exposePetSystem(root, factory) {
  const api = factory();
  root.PetSystem = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : window, function createPetSystem() {
  'use strict';

  const LEVEL_THRESHOLDS = Object.freeze([0, 60, 150, 280, 450, 680, 980, 1360, 1830, 2400]);
  const QUOTE_SCENES = Object.freeze([
    'home', 'start', 'combo', 'star1', 'star2', 'star3',
    'feedBasic', 'feedPremium', 'levelUp', 'retry', 'tap'
  ]);
  const FOODS = Object.freeze([
    Object.freeze({ id: 'starBiscuit', name: '星星饼干', icon: '🍪', price: 20, growth: 10, quoteScene: 'feedBasic' }),
    Object.freeze({ id: 'fruitCup', name: '鲜果杯', icon: '🍓', price: 50, growth: 30, quoteScene: 'feedBasic' }),
    Object.freeze({ id: 'nutritionMeal', name: '营养套餐', icon: '🍱', price: 100, growth: 70, quoteScene: 'feedPremium' }),
    Object.freeze({ id: 'celebrationCake', name: '庆典蛋糕', icon: '🎂', price: 180, growth: 140, quoteScene: 'feedPremium' })
  ]);

  const PET_SEEDS = Object.freeze([
    { id: 'lingling', name: '灵灵', species: '星光精灵', personality: '阳光、可靠', asset: '/assets/word-spirit.png', slogan: '每个单词，都是一颗新星！', marks: ['星光亮起来', '我会稳稳陪着你', '又点亮了一颗星', '向着星河出发'] },
    { id: 'sprout', name: '星芽灵', species: '森林芽灵', personality: '温柔、耐心', asset: '/assets/spirit-sprout-v2.png', slogan: '今天记住一点点，明天就会长成大树！', marks: ['小芽又长高啦', '一点点也是成长', '让知识慢慢发芽', '森林在为你鼓掌'] },
    { id: 'bubble', name: '泡泡灵', species: '水泡精灵', personality: '活泼、调皮', asset: '/assets/spirit-bubble-v1.png', slogan: '啵！这个单词被我们抓住啦！', marks: ['啵的一声答对啦', '泡泡要飞起来咯', '把难题吹成小泡泡', '咕噜咕噜继续冲'] },
    { id: 'candy', name: '糖果灵', species: '甜甜兽', personality: '可爱、乐观', asset: '/assets/spirit-candy-v1.png', slogan: '认真学习，比糖果还甜！', marks: ['甜甜的进步来啦', '这次表现像糖果一样棒', '把认真装进糖果罐', '再添一颗勇气糖'] },
    { id: 'spark', name: '火花灵', species: '闪电兽', personality: '勇敢、热血', asset: '/assets/spirit-spark-v1.png', slogan: '火花全开，再来一关！', marks: ['火花全开', '勇气已经点燃', '闪电速度向前冲', '把困难照亮吧'] },
    { id: 'cloud', name: '云朵灵', species: '云朵兽', personality: '悠闲、治愈', asset: '/assets/spirit-cloud-v1.png', slogan: '慢慢来，云朵也会飞到终点。', marks: ['慢慢来就很好', '坐上云朵再试一次', '轻轻松松向前飞', '云朵一直陪着你'] },
    { id: 'moon', name: '月光灵', species: '月光兽', personality: '安静、体贴', asset: '/assets/spirit-moon-v1.png', slogan: '别怕答错，月光会陪你再试一次。', marks: ['月光在这里', '安静想一想就好', '夜空记住了你的努力', '我陪你再试一次'] },
    { id: 'rainbow', name: '彩虹灵', species: '彩虹幻兽', personality: '欢乐、爱庆祝', asset: '/assets/spirit-rainbow-v2.png', slogan: '你把今天变成彩虹啦！', marks: ['彩虹庆典开始啦', '每一种颜色都在欢呼', '今天闪闪发亮', '把进步画成彩虹'] }
  ]);

  function buildQuotes(seed) {
    const [a, b, c, d] = seed.marks;
    return Object.freeze({
      home: Object.freeze([`${a}，今天想认识几个单词？`, `${b}，我们一起开始吧！`, `${c}，欢迎回来！`, `${d}，新的学习旅程要开始啦！`]),
      start: Object.freeze([`${a}，准备出发！`, `${b}，这一关交给我们！`, `${c}，先看清再行动。`, `${d}，认真又勇敢地开始吧！`]),
      combo: Object.freeze([`${a}，连击继续！`, `${b}，节奏太棒啦！`, `${c}，又连在一起了！`, `${d}，下一次也一定行！`]),
      star1: Object.freeze([`${a}，通关就是进步！`, `${b}，下一次会更熟练。`, `${c}，我们记住了新单词。`, `${d}，一步一步向前走！`]),
      star2: Object.freeze([`${a}，两颗星在向你眨眼！`, `${b}，这次表现很扎实。`, `${c}，再细心一点就是三星！`, `${d}，我们离满星很近啦！`]),
      star3: Object.freeze([`${a}，三星庆祝开始！`, `${b}，这一关漂亮拿下！`, `${c}，你的认真闪闪发光！`, `${d}，满星表现太精彩啦！`]),
      feedBasic: Object.freeze([`${a}，谢谢你的点心！`, `${b}，这一口真有力量。`, `${c}，肚子和心情都暖暖的。`, `${d}，我会好好长大！`]),
      feedPremium: Object.freeze([`${a}，这顿大餐太惊喜啦！`, `${b}，成长能量满满！`, `${c}，我要表演一个新动作！`, `${d}，谢谢你认真学习换来的美味！`]),
      levelUp: Object.freeze([`${a}，我升级啦！`, `${b}，我们的努力变成成长了。`, `${c}，新动作已经解锁！`, `${d}，一起向下一级出发！`]),
      retry: Object.freeze([`${a}，答错也能学会。`, `${b}，我们慢一点再试一次。`, `${c}，刚才的答案已经更熟悉了。`, `${d}，我相信你下一次能找到它！`]),
      tap: Object.freeze([`${a}，我听见你来找我啦！`, `${b}，今天也要做学习伙伴。`, `${c}，摸摸头就更有精神啦！`, `${d}，要不要一起再学一会儿？`])
    });
  }

  const PETS = Object.freeze(PET_SEEDS.map(seed => Object.freeze({
    id: seed.id,
    name: seed.name,
    species: seed.species,
    personality: seed.personality,
    asset: seed.asset,
    slogan: seed.slogan,
    quotes: buildQuotes(seed)
  })));
  const PET_IDS = Object.freeze(PETS.map(item => item.id));

  function petById(id) {
    return PETS.find(item => item.id === String(id || '')) || null;
  }

  function foodById(id) {
    return FOODS.find(item => item.id === String(id || '')) || null;
  }

  function petLevelForGrowth(value) {
    const growth = Math.max(0, Math.min(LEVEL_THRESHOLDS.at(-1), Number(value) || 0));
    let level = 1;
    LEVEL_THRESHOLDS.forEach((threshold, index) => {
      if (growth >= threshold) level = index + 1;
    });
    return level;
  }

  function petStageForLevel(value) {
    const level = Math.max(1, Math.min(10, Number(value) || 1));
    if (level >= 10) return 'best';
    if (level >= 7) return 'shining';
    if (level >= 4) return 'growing';
    return 'young';
  }

  function nextGrowthTarget(level) {
    const safeLevel = Math.max(1, Math.min(10, Number(level) || 1));
    return safeLevel >= 10 ? null : LEVEL_THRESHOLDS[safeLevel];
  }

  function quoteFor(speciesId, scene, previous = '', random = Math.random) {
    const lines = petById(speciesId)?.quotes?.[scene] || [];
    const alternatives = lines.filter(line => line !== previous);
    const pool = alternatives.length ? alternatives : lines;
    const index = Math.min(pool.length - 1, Math.max(0, Math.floor((Number(random()) || 0) * pool.length)));
    return pool[index] || '';
  }

  function validPetName(value) {
    return /^[\p{Script=Han}A-Za-z0-9]{1,8}$/u.test(String(value || '').trim());
  }

  function normalizePetState(input = {}) {
    const species = petById(input.speciesId);
    const growth = Math.max(0, Math.min(LEVEL_THRESHOLDS.at(-1), Number(input.growth) || 0));
    const requestedName = String(input.name || '').trim();
    return {
      speciesId: species?.id || '',
      name: species ? (validPetName(requestedName) ? requestedName : species.name) : '',
      adoptedAt: species ? String(input.adoptedAt || '').slice(0, 40) : '',
      growth,
      level: petLevelForGrowth(growth),
      foodInventory: Object.fromEntries(FOODS.map(food => [
        food.id,
        Math.max(0, Math.min(999, Number(input.foodInventory?.[food.id]) || 0))
      ]))
    };
  }

  return Object.freeze({
    LEVEL_THRESHOLDS,
    QUOTE_SCENES,
    FOODS,
    PETS,
    PET_IDS,
    petById,
    foodById,
    petLevelForGrowth,
    petStageForLevel,
    nextGrowthTarget,
    quoteFor,
    validPetName,
    normalizePetState
  });
});
