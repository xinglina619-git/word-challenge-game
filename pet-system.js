(function exposePetSystem(root, factory) {
  const api = factory();
  root.PetSystem = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : window, function createPetSystem() {
  'use strict';

  const LEVEL_THRESHOLDS = Object.freeze([0, 60, 150, 280, 450, 680, 980, 1360, 1830, 2400]);
  const QUOTE_SCENES = Object.freeze(['welcome', 'hunger', 'feedBasic', 'feedPremium', 'levelUp', 'tap', 'maxLevel']);
  const FOODS = Object.freeze([
    Object.freeze({ id: 'starBiscuit', name: '星星饼干', icon: '🍪', price: 20, growth: 10, quoteScene: 'feedBasic' }),
    Object.freeze({ id: 'fruitCup', name: '鲜果杯', icon: '🍓', price: 50, growth: 30, quoteScene: 'feedBasic' }),
    Object.freeze({ id: 'nutritionMeal', name: '营养套餐', icon: '🍱', price: 100, growth: 70, quoteScene: 'feedPremium' }),
    Object.freeze({ id: 'celebrationCake', name: '庆典蛋糕', icon: '🎂', price: 180, growth: 140, quoteScene: 'feedPremium' })
  ]);

  const LEGACY_PET_IDS = Object.freeze(['lingling', 'sprout', 'bubble', 'candy', 'spark', 'cloud', 'moon', 'rainbow']);
  const PET_SEEDS = Object.freeze([
    { id: 'poodle', species: '贵宾犬', personality: '聪明、亲人', asset: '/assets/dogs/poodle-poses.png', cue: '小卷毛', mood: '开心' },
    { id: 'husky', species: '哈士奇', personality: '活泼、好奇', asset: '/assets/dogs/husky-poses.png', cue: '亮眼睛', mood: '神气' },
    { id: 'tibetanMastiff', species: '藏獒', personality: '稳重、勇敢', asset: '/assets/dogs/tibetan-mastiff-poses.png', cue: '暖鬃毛', mood: '安心' },
    { id: 'goldenRetriever', species: '金毛寻回犬', personality: '温柔、可靠', asset: '/assets/dogs/golden-retriever-poses.png', cue: '金耳朵', mood: '温暖' },
    { id: 'corgi', species: '柯基犬', personality: '热情、机灵', asset: '/assets/dogs/corgi-poses.png', cue: '小短腿', mood: '有精神' },
    { id: 'shibaInu', species: '柴犬', personality: '独立、可爱', asset: '/assets/dogs/shiba-inu-poses.png', cue: '卷尾巴', mood: '满足' }
  ]);

  function buildQuotes(seed) {
    return Object.freeze({
      welcome: Object.freeze([`我的${seed.cue}已经准备好啦！`, '谢谢你选择我，我们会成为好朋友！', '这里就是我们的宠物屋啦！', '以后请多多关照，我会陪你一起成长！']),
      hunger: Object.freeze(['主人，我的肚子咕咕叫啦。', '我有一点点饿，可以陪我吃点东西吗？', `我的${seed.cue}在提醒我该吃饭啦。`, '闻到香香的味道，我想吃一小口啦！']),
      feedBasic: Object.freeze(['谢谢主人，这一口真香！', `吃完点心，我感觉${seed.mood}极了！`, '肚子和心情都暖暖的。', '我吃得好饱呀！', '谢谢你认真学习换来的点心！', '吃饱啦，我想去散散步！']),
      feedPremium: Object.freeze(['哇，好丰盛的大餐，谢谢主人！', '成长能量满满，我想跳起来啦！', `我的${seed.cue}都开心起来啦！`, '吃得好满足，我要睡个香香的午觉！', '这顿饭让我充满了力量！', '谢谢你一直这么认真地照顾我！']),
      levelUp: Object.freeze(['我升级啦，快看我的新特技！', '我们的努力变成新的本领啦！', '长大一点点，也开心一大步！', '谢谢主人，我学会新动作啦！']),
      tap: Object.freeze(['我听见你来找我啦！', `摸摸${seed.cue}，今天也很开心！`, '我在宠物屋等你回来呢。', '要不要看看我学会的特技？']),
      maxLevel: Object.freeze(['我已经长大啦，谢谢主人一直陪着我！', '所有特技都学会啦，摸摸我吧！', '我们是最棒的学习伙伴！', '食物留在背包里，今天陪我玩一会儿吧！'])
    });
  }

  const PETS = Object.freeze(PET_SEEDS.map(seed => Object.freeze({
    id: seed.id,
    species: seed.species,
    personality: seed.personality,
    asset: seed.asset,
    quotes: buildQuotes(seed)
  })));
  const PET_IDS = Object.freeze(PETS.map(item => item.id));
  const TRICKS = Object.freeze([
    Object.freeze({ id: 'tailWelcome', level: 2, name: '摇尾欢迎', pose: 'stand', animation: 'wag', effect: 'hearts' }),
    Object.freeze({ id: 'happyBounce', level: 3, name: '开心蹦跳', pose: 'stand', animation: 'bounce', effect: 'stars' }),
    Object.freeze({ id: 'spin', level: 4, name: '转圈圈', pose: 'stand', animation: 'spin', effect: 'stars' }),
    Object.freeze({ id: 'shakePaw', level: 5, name: '握手', pose: 'paw', animation: 'paw', effect: 'hearts' }),
    Object.freeze({ id: 'rollOver', level: 6, name: '打滚', pose: 'stand', animation: 'roll', effect: 'stars' }),
    Object.freeze({ id: 'chaseTail', level: 7, name: '追尾巴', pose: 'stand', animation: 'chase', effect: 'paws' }),
    Object.freeze({ id: 'dance', level: 8, name: '跳舞', pose: 'paw', animation: 'dance', effect: 'stars' }),
    Object.freeze({ id: 'takeWalk', level: 9, name: '散步出发', pose: 'walk', animation: 'walk', effect: 'paws' }),
    Object.freeze({ id: 'sleepWell', level: 10, name: '安心睡觉', pose: 'sleep', animation: 'sleep', effect: 'sleep' })
  ]);

  function petById(id) {
    return PETS.find(item => item.id === String(id || '')) || null;
  }

  function foodById(id) {
    return FOODS.find(item => item.id === String(id || '')) || null;
  }

  function trickById(id) { return TRICKS.find(item => item.id === String(id || '')) || null; }

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

  function nextTrickForLevel(level) {
    const safeLevel = Math.max(1, Math.min(10, Number(level) || 1));
    return TRICKS.find(item => item.level > safeLevel) || null;
  }

  function unlockedTricks(level) {
    const safeLevel = Math.max(1, Math.min(10, Number(level) || 1));
    return TRICKS.filter(item => item.level <= safeLevel);
  }

  function tricksUnlockedBetween(oldLevel, newLevel) {
    const before = Math.max(1, Number(oldLevel) || 1);
    const after = Math.max(before, Math.min(10, Number(newLevel) || before));
    return TRICKS.filter(item => item.level > before && item.level <= after);
  }

  function growthRemaining(growth) {
    const safeGrowth = Math.max(0, Math.min(LEVEL_THRESHOLDS.at(-1), Number(growth) || 0));
    const level = petLevelForGrowth(safeGrowth);
    const target = nextGrowthTarget(level);
    return target === null ? 0 : target - safeGrowth;
  }

  function feedingGoal(feeding = {}) {
    const oldLevel = Math.max(1, Number(feeding.oldLevel) || 1);
    const newLevel = Math.max(oldLevel, Math.min(10, Number(feeding.newLevel) || oldLevel));
    const unlocked = tricksUnlockedBetween(oldLevel, newLevel);
    if (unlocked.length) {
      const latest = unlocked.at(-1);
      return unlocked.length === 1
        ? `我升到 Lv.${newLevel} 啦，已经学会${latest.name}！`
        : `我升到 Lv.${newLevel} 啦，这次解锁了 ${unlocked.length} 个新特技！`;
    }
    const next = nextTrickForLevel(newLevel);
    return next ? `再获得 ${Math.max(0, Number(feeding.growthRemaining) || 0)} 成长值，我就能升到 Lv.${next.level}，学会${next.name}啦！` : '';
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
    const dog = petById(input.speciesId);
    const rawLegacyId = String(input.legacySpeciesId || (!dog ? input.speciesId : '') || '');
    const legacySpeciesId = LEGACY_PET_IDS.includes(rawLegacyId) ? rawLegacyId : '';
    const growth = Math.max(0, Math.min(LEVEL_THRESHOLDS.at(-1), Number(input.growth) || 0));
    const requestedName = String(input.name || '').trim();
    const hasOldPet = Boolean(dog || legacySpeciesId || input.needsBreedSelection || input.adoptedAt || validPetName(requestedName));
    const dateValue = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '';
    const onboardingStep = ['earn', 'buy', 'feed', 'complete'].includes(input.onboardingStep)
      ? input.onboardingStep
      : hasOldPet ? 'earn' : 'complete';
    return {
      speciesId: dog?.id || '',
      name: hasOldPet && validPetName(requestedName) ? requestedName : '',
      adoptedAt: hasOldPet ? String(input.adoptedAt || '').slice(0, 40) : '',
      growth,
      level: petLevelForGrowth(growth),
      foodInventory: Object.fromEntries(FOODS.map(food => [
        food.id,
        Math.max(0, Math.min(999, Number(input.foodInventory?.[food.id]) || 0))
      ])),
      catalogVersion: dog ? 2 : Math.max(0, Math.min(2, Number(input.catalogVersion) || 0)),
      needsBreedSelection: Boolean(!dog && (legacySpeciesId || input.needsBreedSelection)),
      onboardingStep,
      lastFedDate: dateValue(input.lastFedDate),
      lastHungerPromptDate: dateValue(input.lastHungerPromptDate),
      legacySpeciesId
    };
  }

  return Object.freeze({
    LEVEL_THRESHOLDS,
    QUOTE_SCENES,
    FOODS,
    PETS,
    PET_IDS,
    TRICKS,
    LEGACY_PET_IDS,
    petById,
    foodById,
    trickById,
    petLevelForGrowth,
    petStageForLevel,
    nextGrowthTarget,
    nextTrickForLevel,
    unlockedTricks,
    tricksUnlockedBetween,
    growthRemaining,
    feedingGoal,
    quoteFor,
    validPetName,
    normalizePetState
  });
});
