const fs = require('fs');
const assert = require('assert');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngMetadata(assetPath) {
  const png = fs.readFileSync(assetPath);
  if (png.length < 29 || !png.subarray(0, 8).equals(PNG_SIGNATURE) || png.subarray(12, 16).toString('ascii') !== 'IHDR') {
    return null;
  }
  return {
    png,
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    bitDepth: png[24],
    colorType: png[25],
    compression: png[26],
    filter: png[27],
    interlace: png[28]
  };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function pngAlphaPixels(metadata) {
  const idat = [];
  for (let offset = 8; offset + 12 <= metadata.png.length;) {
    const length = metadata.png.readUInt32BE(offset);
    const dataStart = offset + 8;
    const next = dataStart + length + 4;
    if (next > metadata.png.length) throw new Error('PNG 数据块长度异常');
    const type = metadata.png.subarray(offset + 4, dataStart).toString('ascii');
    if (type === 'IDAT') idat.push(metadata.png.subarray(dataStart, dataStart + length));
    if (type === 'IEND') break;
    offset = next;
  }
  const bytesPerPixel = metadata.colorType === 6 ? 4 : 2;
  const rowLength = metadata.width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  if (inflated.length !== metadata.height * (rowLength + 1)) throw new Error('PNG 扫描线长度异常');

  let transparent = false;
  let visible = false;
  let previous = Buffer.alloc(rowLength);
  let offset = 0;
  const alphaOffset = bytesPerPixel - 1;
  for (let rowIndex = 0; rowIndex < metadata.height; rowIndex += 1) {
    const filterType = inflated[offset++];
    const row = Buffer.from(inflated.subarray(offset, offset + rowLength));
    offset += rowLength;
    for (let column = 0; column < rowLength; column += 1) {
      const left = column >= bytesPerPixel ? row[column - bytesPerPixel] : 0;
      const up = previous[column];
      const upLeft = column >= bytesPerPixel ? previous[column - bytesPerPixel] : 0;
      if (filterType === 1) row[column] = (row[column] + left) & 255;
      else if (filterType === 2) row[column] = (row[column] + up) & 255;
      else if (filterType === 3) row[column] = (row[column] + Math.floor((left + up) / 2)) & 255;
      else if (filterType === 4) row[column] = (row[column] + paeth(left, up, upLeft)) & 255;
      else if (filterType !== 0) throw new Error('PNG 过滤器异常');
    }
    for (let pixel = alphaOffset; pixel < rowLength; pixel += bytesPerPixel) {
      if (row[pixel] < 255) transparent = true;
      if (row[pixel] > 0) visible = true;
    }
    previous = row;
  }
  return { transparent, visible };
}

let focusedSelector = '';
let scrolledSelector = '';
let systemVoicesForTest = [];
let speechCancelCount = 0;
const spokenLines = [];
const documentListeners = new Map();
let fetchHandler = () => Promise.reject(new Error('fetch should not run in smoke test'));
async function dispatchDocumentEvent(type, event) {
  const listeners = [...(documentListeners.get(type) || [])];
  for (const listener of listeners) {
    if (listener.once) documentListeners.set(type, (documentListeners.get(type) || []).filter(item => item !== listener));
    await listener.callback(event);
  }
}
const appElement = { innerHTML: '' };
const context = {
  console,
  window: {
    speechSynthesis: {
      getVoices: () => systemVoicesForTest,
      addEventListener: () => {},
      speak: line => { spokenLines.push(line); },
      cancel: () => { speechCancelCount += 1; }
    }
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: {
    querySelector: selector => selector === '#app'
      ? appElement
      : {
          focus: () => { focusedSelector = selector; },
          scrollIntoView: () => { scrolledSelector = selector; }
        },
    querySelectorAll: () => [],
    addEventListener: (type, callback, options = {}) => {
      const listeners = documentListeners.get(type) || [];
      listeners.push({ callback, once: Boolean(options?.once) });
      documentListeners.set(type, listeners);
    }
  },
  SpeechSynthesisUtterance: class SpeechSynthesisUtterance {
    constructor(text) { this.text = text; }
  },
  Audio: class Audio {
    constructor(src) { this.src = src; this.loop = false; this.currentTime = 0; this.paused = true; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  },
  setTimeout,
  clearTimeout,
  setInterval: () => 1,
  clearInterval: () => {},
  confirm: () => true,
  fetch: (...args) => fetchHandler(...args)
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'textbook-words.generated.js'), 'utf8'), context, { filename: 'textbook-words.generated.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'curriculum.js'), 'utf8'), context, { filename: 'curriculum.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'pet-system.js'), 'utf8'), context, { filename: 'pet-system.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'review-games.js'), 'utf8'), context, { filename: 'review-games.js' });
const petSystem = context.PetSystem;
const review = context.ReviewGames;
if (Array.from(petSystem.PET_IDS).join(',') !== 'poodle,husky,tibetanMastiff,goldenRetriever,corgi,shibaInu') {
  throw new Error('六犬种目录不完整');
}
for (const id of petSystem.PET_IDS) {
  const dog = petSystem.petById(id);
  if (!dog?.species || !dog?.personality || !dog?.asset) throw new Error(`${id} 犬种资料不完整`);
  if (Object.hasOwn(dog, 'name')) throw new Error(`${id} 不应提供系统默认宠物名`);
  for (const scene of petSystem.QUOTE_SCENES) {
    if (!Array.isArray(dog.quotes?.[scene]) || dog.quotes[scene].length < 4) throw new Error(`${id}/${scene} 语录不足`);
  }
}
if (petSystem.petLevelForGrowth(0) !== 1 || petSystem.petLevelForGrowth(60) !== 2 || petSystem.petLevelForGrowth(2399) !== 9 || petSystem.petLevelForGrowth(2400) !== 10) {
  throw new Error('宠物成长等级门槛不正确');
}
if (petSystem.TRICKS.length !== 9 || petSystem.TRICKS.map(item => item.level).join(',') !== '2,3,4,5,6,7,8,9,10') {
  throw new Error('Lv.2 至 Lv.10 特技映射不完整');
}
if (petSystem.nextTrickForLevel(4)?.name !== '握手' || petSystem.unlockedTricks(5).at(-1)?.name !== '握手') {
  throw new Error('下一特技或已解锁特技计算错误');
}
if (petSystem.growthRemaining(250) !== 30 || petSystem.growthRemaining(2400) !== 0) {
  throw new Error('距离升级成长值计算错误');
}
const unlocked = petSystem.tricksUnlockedBetween(3, 6).map(item => item.name).join(',');
if (unlocked !== '转圈圈,握手,打滚') throw new Error('跨级特技解锁计算错误');
const pendingLegacy = petSystem.normalizePetState({
  speciesId: 'cloud', name: '小云', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
  foodInventory: { starBiscuit: 2 }
});
if (!pendingLegacy.needsBreedSelection || pendingLegacy.speciesId || pendingLegacy.name !== '小云' || pendingLegacy.growth !== 70 || pendingLegacy.foodInventory.starBiscuit !== 2) {
  throw new Error('旧宠物规范化丢失养成数据');
}
if (JSON.stringify(Array.from(petSystem.FOODS, item => [item.price, item.growth])) !== JSON.stringify([[20, 10], [50, 30], [100, 70], [180, 140]])) {
  throw new Error('食物价格或成长值不正确');
}
const firstHunger = petSystem.quoteFor('corgi', 'hunger', '', () => 0);
const secondHunger = petSystem.quoteFor('corgi', 'hunger', firstHunger, () => 0);
if (!firstHunger || firstHunger === secondHunger) throw new Error('每日提醒语录没有避免连续重复');
if (review.SPECIAL_RATE !== .08 || review.MIN_LEARNED_WORDS !== 12) throw new Error('特殊复习关频率或最低词数不正确');
if ([1, 2, 3, 4, 5].map(review.fallDurationForGrade).join(',') !== '7000,7000,6000,6000,5000') throw new Error('落体关年级时限不正确');
if ([0, 1, 2].map(review.starsForSpelling).join(',') !== '3,2,1') throw new Error('拼写关星级规则不正确');
if (review.starsForFalling([.7, .6, .5, .8, .6]) !== 3 || review.starsForFalling([.3, .3, .3, .3, .3]) !== 2 || review.starsForFalling([.1, .1, .1, .1, .1]) !== 1) throw new Error('落体关星级规则不正确');
const learnedForReview = Array.from({ length: 12 }, (_, index) => ({ word: `word${index}`, zh: `释义${index}`, encounters: 1, wrongCount: index % 2, reviewCount: 0, lastReviewedAt: '' }));
const baseReviewProgress = { learnedWords: learnedForReview, review: { assignments: {}, lastSpecialLevel: 0, counts: { spelling: 0, falling: 2 }, fallingTutorialDone: false } };
const assigned = review.assignReviewMode(baseReviewProgress, 8, 'match3', () => .01);
if (assigned.mode !== 'spelling' || assigned.review.assignments['8'] !== 'spelling') throw new Error('特殊关没有优先选择历史次数较少的类型');
const persisted = review.assignReviewMode({ ...baseReviewProgress, review: assigned.review }, 8, 'pair', () => .99);
if (persisted.mode !== 'spelling') throw new Error('同一关的特殊模式没有持久复用');
const ordinary = review.assignReviewMode(baseReviewProgress, 9, 'pair', () => .08);
if (ordinary.mode !== 'pair') throw new Error('随机值达到8%边界时仍触发特殊关');
const noConsecutive = review.assignReviewMode({ ...baseReviewProgress, review: { ...baseReviewProgress.review, lastSpecialLevel: 9 } }, 10, 'match3', () => 0);
if (noConsecutive.mode !== 'match3') throw new Error('特殊关发生了连续插入');
const recorded = review.recordLearnedWord([], 'Apple', '苹果', 'correct', '2026-08-24T00:00:00.000Z');
if (recorded.length !== 1 || recorded[0].word !== 'apple' || recorded[0].encounters !== 1) throw new Error('已学词记录没有正确规范化');
if (review.selectReviewWords(learnedForReview, 5, () => .5).length !== 5) throw new Error('特殊关选题数量不正确');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!indexSource.includes('/styles.css?v=24')) throw new Error('首页没有加载最新宠物屋样式版本');
if (!indexSource.includes('/review-games.js?v=2')) throw new Error('首页没有在 app.js 前加载复习关规则');
if (!indexSource.includes('/pet-system.js?v=3')) throw new Error('首页没有在 app.js 前加载最新宠物规则');
if (!indexSource.includes('/app.js?v=23')) throw new Error('首页没有加载最新宠物屋交互版本');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
if (!serverSource.includes("url.pathname === '/pet-system.js'")) throw new Error('本地服务没有提供宠物规则脚本');
if (!serverSource.includes("url.pathname === '/review-games.js'")) throw new Error('本地服务没有提供复习关规则脚本');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!packageJson.scripts.check.includes('node --check pet-system.js')) throw new Error('语法检查没有覆盖宠物规则脚本');
if (!packageJson.scripts.check.includes('node --check review-games.js')) throw new Error('语法检查没有覆盖复习关规则脚本');
if (!indexSource.includes('<title>单词消消养宠记</title>')) throw new Error('浏览器标题尚未改名');
if (packageJson.description !== '《单词消消养宠记》试玩版') throw new Error('项目说明尚未改名');
for (const asset of [
  'poodle-poses.png', 'husky-poses.png', 'tibetan-mastiff-poses.png',
  'golden-retriever-poses.png', 'corgi-poses.png', 'shiba-inu-poses.png'
]) {
  const assetPath = path.join(root, 'assets', 'dogs', asset);
  if (!fs.existsSync(assetPath)) throw new Error(`小狗素材缺失：${asset}`);
  if (fs.statSync(assetPath).size < 20_000) throw new Error(`小狗素材文件异常：${asset}`);
  const metadata = pngMetadata(assetPath);
  if (!metadata) throw new Error(`小狗素材 PNG 格式异常：${asset}`);
  if (metadata.width !== 1024 || metadata.height !== 1024) throw new Error(`小狗素材尺寸异常：${asset}`);
  if (![4, 6].includes(metadata.colorType)) throw new Error(`小狗素材缺少 Alpha 通道：${asset}`);
  if (metadata.bitDepth !== 8 || metadata.compression !== 0 || metadata.filter !== 0 || metadata.interlace !== 0) throw new Error(`小狗素材 PNG 参数异常：${asset}`);
  const alpha = pngAlphaPixels(metadata);
  if (!alpha.transparent) throw new Error(`小狗素材没有透明像素：${asset}`);
  if (!alpha.visible) throw new Error(`小狗素材没有可见像素：${asset}`);
}
const stylesSource = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const source = `${fs.readFileSync(path.join(root, 'app.js'), 'utf8')}
globalThis.__gameTest = {
  newGame, starsForGame, findMatchLines, possibleMoves, expandedRemoval, gradeFor, wordsForLevel, adjacent, swap,
  chooseTarget,
  tileType, makeTile, isMixedMeaningLine,
  modeForLevel, missionForLevel, praiseForEffect, visualForWord,
  visualForPairWord: typeof visualForPairWord === 'function' ? visualForPairWord : null,
  backgroundMusicSrc: typeof BACKGROUND_MUSIC_SRC === 'undefined' ? null : BACKGROUND_MUSIC_SRC,
  backgroundMusic: typeof backgroundMusic === 'undefined' ? null : backgroundMusic,
  startMusic: typeof startMusic === 'function' ? startMusic : null,
  stopMusic: typeof stopMusic === 'function' ? stopMusic : null,
  toggleAudioChannel: typeof toggleAudioChannel === 'function' ? toggleAudioChannel : null,
  praiseVoiceProfiles: typeof PRAISE_VOICE_PROFILES === 'undefined' ? null : PRAISE_VOICE_PROFILES,
  selectVoiceForRole: typeof selectVoiceForRole === 'function' ? selectVoiceForRole : null,
  selectVoiceForLanguage: typeof selectVoiceForLanguage === 'function' ? selectVoiceForLanguage : null,
  cacheSystemVoices: typeof cacheSystemVoices === 'function' ? cacheSystemVoices : null,
  createLearningUtterance: typeof createLearningUtterance === 'function' ? createLearningUtterance : null,
  createMeaningUtterance: typeof createMeaningUtterance === 'function' ? createMeaningUtterance : null,
  createLearningUtterances: typeof createLearningUtterances === 'function' ? createLearningUtterances : null,
  createPraiseUtterance: typeof createPraiseUtterance === 'function' ? createPraiseUtterance : null,
  speakWords: typeof speakWords === 'function' ? speakWords : null,
  speakWord: typeof speakWord === 'function' ? speakWord : null,
  cancelSpeech: typeof cancelSpeech === 'function' ? cancelSpeech : null,
  selectPair: typeof selectPair === 'function' ? selectPair : null,
  useHint: typeof useHint === 'function' ? useHint : null,
  settleBoard: typeof settleBoard === 'function' ? settleBoard : null,
  gameState: state,
  gameView: typeof gameView === 'function' ? gameView : null,
  levelIntroView: typeof levelIntroView === 'function' ? levelIntroView : null,
  levelsView: typeof levelsView === 'function' ? levelsView : null,
  resultView: typeof resultView === 'function' ? resultView : null,
  petNeedsAttention: typeof petNeedsAttention === 'function' ? petNeedsAttention : null,
  faceChoicesForWord: typeof faceChoicesForWord === 'function' ? faceChoicesForWord : null,
  tileFaceHtml: typeof tileFaceHtml === 'function' ? tileFaceHtml : null,
  pairFace: typeof pairFace === 'function' ? pairFace : null,
  authView: typeof authView === 'function' ? authView : null,
  authSubmitLabel: typeof authSubmitLabel === 'function' ? authSubmitLabel : null,
  applyRegistrationSuccess: typeof applyRegistrationSuccess === 'function' ? applyRegistrationSuccess : null,
  resetPasswordView: typeof resetPasswordView === 'function' ? resetPasswordView : null,
  readAudioSettings: typeof readAudioSettings === 'function' ? readAudioSettings : null,
  audioIcon: typeof audioIcon === 'function' ? audioIcon : null,
  audioSettingsPanel: typeof audioSettingsPanel === 'function' ? audioSettingsPanel : null,
  tutorialForGame: typeof tutorialForGame === 'function' ? tutorialForGame : null,
  coverageComplete: typeof coverageComplete === 'function' ? coverageComplete : null,
  levelComplete: typeof levelComplete === 'function' ? levelComplete : null,
  unlearnedMove: typeof unlearnedMove === 'function' ? unlearnedMove : null,
  homeView: typeof homeView === 'function' ? homeView : null,
  petStoreView: typeof petStoreView === 'function' ? petStoreView : null,
  petHomeView: typeof petHomeView === 'function' ? petHomeView : null,
  dogFigure: typeof dogFigure === 'function' ? dogFigure : null,
  petOnboardingCard: typeof petOnboardingCard === 'function' ? petOnboardingCard : null,
  trickBookView: typeof trickBookView === 'function' ? trickBookView : null,
  openPetHome: typeof openPetHome === 'function' ? openPetHome : null,
  adoptPet: typeof adoptPet === 'function' ? adoptPet : null,
  renamePet: typeof renamePet === 'function' ? renamePet : null,
  feedPet: typeof feedPet === 'function' ? feedPet : null,
  shopView: typeof shopView === 'function' ? shopView : null,
  petSpeech: typeof petSpeech === 'function' ? petSpeech : null,
  petTargetMessage: typeof petTargetMessage === 'function' ? petTargetMessage : null,
  newSpellingGame: typeof newSpellingGame === 'function' ? newSpellingGame : null,
  spellingView: typeof spellingView === 'function' ? spellingView : null,
  spellingAnswer: typeof spellingAnswer === 'function' ? spellingAnswer : null,
  chooseSpellingLetter: typeof chooseSpellingLetter === 'function' ? chooseSpellingLetter : null,
  undoSpellingLetter: typeof undoSpellingLetter === 'function' ? undoSpellingLetter : null,
  applySpellingAnswer: typeof applySpellingAnswer === 'function' ? applySpellingAnswer : null,
  newFallingGame: typeof newFallingGame === 'function' ? newFallingGame : null,
  fallingView: typeof fallingView === 'function' ? fallingView : null,
  applyFallingChoice: typeof applyFallingChoice === 'function' ? applyFallingChoice : null,
  pauseFallingTimer: typeof pauseFallingTimer === 'function' ? pauseFallingTimer : null,
  resumeFallingTimer: typeof resumeFallingTimer === 'function' ? resumeFallingTimer : null,
  clearFallingTimer: typeof clearFallingTimer === 'function' ? clearFallingTimer : null,
  scheduleFallingQuestion: typeof scheduleFallingQuestion === 'function' ? scheduleFallingQuestion : null
};`;
vm.runInContext(source, context, { filename: 'app.js' });

const test = context.__gameTest;
if (!test.petStoreView || !test.petHomeView || !test.petSpeech) throw new Error('单宠物领取与宠物之家视图尚未实现');
if (!test.newSpellingGame || !test.spellingView || !test.applySpellingAnswer) throw new Error('两题拼写复习关尚未实现');
const spelling = test.newSpellingGame(20, [{ word: 'apple', zh: '苹果' }, { word: 'cloud', zh: '云' }], () => .5);
if (spelling.mode !== 'spelling' || spelling.questions.length !== 2 || spelling.questionIndex !== 0 || spelling.retryCount !== 0 || spelling.done !== 0) throw new Error('拼写关初始状态不正确');
if (Array.from(spelling.questions[0].letters, item => item.letter).sort().join('') !== [...'apple'].sort().join('')) throw new Error('拼写关字母没有完整打乱');
if (!test.spellingView(spelling).includes('苹果')) throw new Error('拼写关没有突出中文释义');
const repeatedLetterGame = test.newSpellingGame(20, [{ word: 'apple', zh: '苹果' }, { word: 'book', zh: '书' }], () => .5);
const appleQuestion = repeatedLetterGame.questions[0];
const available = appleQuestion.letters.map((item, index) => ({ ...item, uiIndex: index }));
appleQuestion.selectedIndices = [];
for (const letter of appleQuestion.word) {
  const match = available.find(item => item.letter === letter && !appleQuestion.selectedIndices.includes(item.uiIndex));
  appleQuestion.selectedIndices.push(match.uiIndex);
}
if (test.spellingAnswer(repeatedLetterGame) !== 'apple') throw new Error('拼写关没有正确处理重复字母索引');
if (test.applySpellingAnswer(repeatedLetterGame).status !== 'correct') throw new Error('正确拼写没有进入下一题');
const retryGame = test.newSpellingGame(20, [{ word: 'apple', zh: '苹果' }, { word: 'cloud', zh: '云' }], () => .5);
retryGame.questions[0].selectedIndices = [0];
if (test.applySpellingAnswer(retryGame).status !== 'retry' || retryGame.retryCount !== 1 || retryGame.questionIndex !== 0) throw new Error('首次拼错没有纠正并重试同一词');
retryGame.questions[0].selectedIndices = [0];
if (test.applySpellingAnswer(retryGame).status !== 'failed') throw new Error('同一词第二次拼错没有判定失败');
if (!test.newFallingGame || !test.fallingView || !test.applyFallingChoice || !test.clearFallingTimer) throw new Error('五题单词落体关尚未实现');
const fallingWords = learnedForReview.slice(0, 5);
const falling = test.newFallingGame(60, fallingWords, false, () => .5);
if (falling.mode !== 'falling' || falling.questions.length !== 5 || falling.durationMs !== 6000) throw new Error('落体关题量或三四年级时限不正确');
if (falling.questions.some(question => question.choices.length !== 3 || new Set(question.choices).size !== 3)) throw new Error('落体关没有提供三个唯一中文释义');
if (!test.fallingView(falling).includes('第 1/5 题')) throw new Error('落体关没有显示固定进度');
const firstFalling = falling.questions[0];
const correctChoice = firstFalling.choices.indexOf(firstFalling.zh);
if (test.applyFallingChoice(falling, correctChoice, 2000).status !== 'correct' || falling.remainingRatios[0] !== 2 / 3) throw new Error('落体关正确选择没有记录剩余时间');
const wrongFalling = test.newFallingGame(60, fallingWords, false, () => .5);
const wrongIndex = wrongFalling.questions[0].choices.findIndex(choice => choice !== wrongFalling.questions[0].zh);
if (test.applyFallingChoice(wrongFalling, wrongIndex, 1000).status !== 'failed') throw new Error('落体关选错没有立即失败');
const tutorialFalling = test.newFallingGame(20, fallingWords, true, () => .5);
const tutorialWrong = tutorialFalling.tutorialQuestion.choices.findIndex(choice => choice !== tutorialFalling.tutorialQuestion.zh);
if (test.applyFallingChoice(tutorialFalling, tutorialWrong, 1000).status !== 'tutorial-retry' || tutorialFalling.done !== 0) throw new Error('首次落体引导题答错后不应失败或计数');
const tutorialCorrect = tutorialFalling.tutorialQuestion.choices.indexOf(tutorialFalling.tutorialQuestion.zh);
if (test.applyFallingChoice(tutorialFalling, tutorialCorrect, 1000).status !== 'tutorial-complete' || tutorialFalling.done !== 0) throw new Error('首次落体引导题完成后不应占用正式5题');
const transitionPauseGame = test.newFallingGame(20, fallingWords, false, () => .5);
test.gameState.game = transitionPauseGame;
test.scheduleFallingQuestion(10_000);
test.pauseFallingTimer();
if (!transitionPauseGame.pendingQuestionStart) throw new Error('落体题切换等待期间进入后台没有暂停待启动计时');
test.clearFallingTimer();
test.gameState.game = null;
if (source.includes('function drawView(') || source.includes('function collectionView(') || source.includes('免费成长抽卡') || source.includes('词灵图鉴')) {
  throw new Error('旧抽卡或多词灵图鉴仍在界面代码中');
}
for (const selector of [
  '.dog-figure', '.pose-paw', '.pose-walk', '.pose-sleep', '.dog-speech-bubble',
  '.pet-attention-dot', '.pet-onboarding-card', '.trick-book', '.trick-card',
  '.trick-wag', '.trick-bounce', '.trick-spin', '.trick-paw', '.trick-roll',
  '.trick-chase', '.trick-dance', '.trick-walk', '.trick-sleep',
  '@media (prefers-reduced-motion: reduce)'
]) {
  if (!stylesSource.includes(selector)) throw new Error(`宠物界面样式缺失：${selector}`);
}
const mobileDogStyles = stylesSource.match(/@media\(max-width:680px\)\{([^}]*(?:\}[^@]*)?)@media \(prefers-reduced-motion: reduce\)/)?.[1];
if (!mobileDogStyles) throw new Error('缺少小狗窄屏样式范围');
const mobileDogSizes = Object.fromEntries(
  [...mobileDogStyles.matchAll(/(\.dog-figure(?:\.[\w-]+)?)\{--dog-size:(\d+)px\}/g)].map(([, selector, size]) => [selector, size])
);
assert.deepStrictEqual(mobileDogSizes, {
  '.dog-figure': '190',
  '.dog-figure.catalog-dog': '118',
  '.dog-figure.adopt-preview-dog': '180'
}, '窄屏小狗尺寸必须由通用尺寸和明确组件变体共同定义');
assert(
  mobileDogStyles.indexOf('.dog-figure.catalog-dog{--dog-size:118px}') > mobileDogStyles.indexOf('.dog-figure{--dog-size:190px}')
  && mobileDogStyles.indexOf('.dog-figure.adopt-preview-dog{--dog-size:180px}') > mobileDogStyles.indexOf('.dog-figure{--dog-size:190px}'),
  '窄屏组件变体必须在通用小狗尺寸之后层叠，避免被 190px 覆盖'
);
if (!test.faceChoicesForWord || Array.from(test.faceChoicesForWord({ word: 'apple', zh: '苹果' })).join(',') !== 'en,zh') {
  throw new Error('三消展示面选择仍包含图片');
}
if (!test.authView || !test.resetPasswordView) throw new Error('登录与密码恢复视图不完整');
if (test.gameState.view !== 'login') throw new Error('无有效令牌时应默认显示登录页');
test.gameState.view = 'login';
let authHtml = test.authView();
if (authHtml.includes('/assets/word-spirit.png') || authHtml.includes('mascot-figure')) {
  throw new Error('登录页不应渲染词灵图片');
}
if (!authHtml.includes('autocomplete="current-password"')) throw new Error('登录密码缺少自动填充语义');
if (!authHtml.includes('data-action="toggle-password"')) throw new Error('登录页缺少密码显示开关');
if (!authHtml.includes('data-action="forgot-password"')) throw new Error('登录页缺少密码恢复入口');
if (!authHtml.includes('role="tablist"')) throw new Error('认证页签缺少 tablist 语义');
if (!/data-action="switch-login"[^>]*type="button"[^>]*role="tab"[^>]*aria-selected="true"/.test(authHtml)) throw new Error('登录页签选中语义不正确');
if (!/data-action="switch-register"[^>]*type="button"[^>]*role="tab"[^>]*aria-selected="false"/.test(authHtml)) throw new Error('注册页签选中语义不正确');
if (!test.authSubmitLabel || !test.applyRegistrationSuccess) throw new Error('注册回登录状态接口不完整');
if (test.authSubmitLabel('login', true) !== '正在登录…') throw new Error('登录忙碌文案不准确');
if (test.authSubmitLabel('register', true) !== '正在注册…') throw new Error('注册忙碌文案不准确');

test.gameState.token = null;
test.gameState.user = null;
test.gameState.view = 'register';
test.gameState.auth = { busy: true, error: '', success: '', phone: '', passwordVisible: false };
authHtml = test.authView();
if (!authHtml.includes('正在注册…') || !/type="submit"[^>]*disabled/.test(authHtml)) throw new Error('注册忙碌状态未禁用提交');

test.applyRegistrationSuccess({
  ok: true,
  message: '注册成功，请使用刚才的手机号和密码登录',
  phone: '13800000000'
});
if (test.gameState.view !== 'login' || test.gameState.user || test.gameState.token) throw new Error('注册成功不应直接进入游戏或建立前端会话');
if (test.gameState.auth.phone !== '13800000000') throw new Error('注册成功后没有保留手机号');
if (test.gameState.auth.success !== '注册成功，请使用刚才的手机号和密码登录') throw new Error('注册成功提示不准确');
authHtml = test.authView();
if (!authHtml.includes('role="status"')) throw new Error('注册成功提示缺少 status 语义');
if (!authHtml.includes('value="13800000000"')) throw new Error('登录页没有回填刚注册的手机号');
if (/<input[^>]+name="password"[^>]+value=/.test(authHtml)) throw new Error('注册成功后密码不应回填');
if (focusedSelector !== '#auth-form input[name="password"]') throw new Error('注册成功后没有聚焦登录密码框');

test.gameState.auth.success = '';
test.gameState.auth.error = '手机号或密码不正确';
authHtml = test.authView();
if (!authHtml.includes('role="alert" tabindex="-1"')) throw new Error('认证错误缺少可聚焦 alert 语义');
if (!test.resetPasswordView().includes('autocomplete="new-password"')) throw new Error('新密码缺少自动填充语义');
if (!test.resetPasswordView().includes('id="reset-password-form"')) throw new Error('密码恢复表单缺失');
if (test.resetPasswordView().includes('/assets/word-spirit.png') || test.resetPasswordView().includes('mascot-figure')) {
  throw new Error('找回密码页不应渲染词灵图片');
}
if (!test.readAudioSettings || !test.audioIcon || !test.audioSettingsPanel) throw new Error('声音设置接口不完整');
const audioSettings = test.readAudioSettings({
  getItem: key => ({ word_spirit_music: 'off', word_spirit_effects: 'on', word_spirit_speech: 'off' })[key]
});
if (JSON.stringify(audioSettings) !== JSON.stringify({ music: false, effects: true, speech: false })) throw new Error('声音通道读取不正确');
if (test.audioIcon({ music: false, effects: false, speech: false }) !== '静音') throw new Error('全静音状态不明确');
const audioPanel = test.audioSettingsPanel();
if (!audioPanel.includes('背景音乐') || !audioPanel.includes('游戏音效') || !audioPanel.includes('单词朗读')) throw new Error('声音设置面板缺少通道');
if (!test.tutorialForGame) throw new Error('首次玩法教学缺失');
const tutorialGame = test.newGame(1);
const tutorial = test.tutorialForGame(tutorialGame, { tutorials: { match3: false, pair: false } });
if (!tutorial.active || tutorial.mode !== 'match3' || tutorial.cells.length !== 2) throw new Error('三消教学内容无效');
if (!test.adjacent(tutorial.cells[0], tutorial.cells[1])) throw new Error('三消教学没有使用相邻词块');
if (!test.findMatchLines(test.swap(tutorialGame.board, tutorial.cells[0], tutorial.cells[1])).length) throw new Error('三消教学没有使用真实可行移动');
const pairTutorial = test.tutorialForGame(test.newGame(3), { tutorials: { match3: true, pair: false } });
if (!pairTutorial.active || pairTutorial.mode !== 'pair' || pairTutorial.cells.length !== 2) throw new Error('配对教学内容无效');
if (!test.coverageComplete || !test.levelComplete || !test.unlearnedMove) throw new Error('词汇覆盖通关接口不完整');
const coverageGame = test.newGame(1);
coverageGame.score = coverageGame.scoreGoal;
if (coverageGame.coverageGoal !== 4) throw new Error('词汇覆盖目标不正确');
if (test.levelComplete(coverageGame)) throw new Error('只达到积分不应通关');
coverageGame.learnedTypes = [0, 1, 2, 3];
if (!test.coverageComplete(coverageGame) || !test.levelComplete(coverageGame)) throw new Error('积分和覆盖达标后应通关');
coverageGame.score = coverageGame.scoreGoal - 1;
if (test.levelComplete(coverageGame)) throw new Error('只达到覆盖不应通关');
if (!test.homeView) throw new Error('首页视图缺失');
test.gameState.user = {
  profile: { nickname: '小测试员' },
  progress: {
    stage: 1, coins: 30, xp: 0, tickets: 1, dust: 0, streak: 0, bestCombo: 0,
    draws: 0, pity: 0, collected: [], mistakes: {}, spirits: { lingling: 1 },
    equipped: 'lingling', inventory: { hint: 3, shuffle: 2, addMoves: 1 }, tutorials: { match3: false, pair: false },
    pet: { speciesId: '', name: '', growth: 0, foodInventory: {} }
  }
};
const unclaimedHome = test.homeView();
if (!unclaimedHome.includes('领取我的小狗') || unclaimedHome.includes('/assets/dogs/')) throw new Error('未领取宠物的首页引导不正确');
const petStore = test.petStoreView();
if ((petStore.match(/class="pet-catalog-card/g) || []).length !== 6) throw new Error('宠物商店没有展示6种可选宠物');
if (!petStore.includes('领取后可以随时免费改名') || !petStore.includes('宠物品类不能更换')) throw new Error('宠物永久选择提示不明确');
test.gameState.user.progress.pet = {
  speciesId: 'corgi', name: '小云', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
  foodInventory: { starBiscuit: 2, fruitCup: 0, nutritionMeal: 0, celebrationCake: 0 },
  catalogVersion: 2, needsBreedSelection: false, onboardingStep: 'complete', lastFedDate: '2026-08-31'
};
const home = test.homeView();
if (!home.includes('继续学习') || !home.includes('成长奖励')) throw new Error('首页没有区分学习和奖励入口');
if (home.indexOf('继续学习') > home.indexOf('成长奖励')) throw new Error('首页没有优先展示学习入口');
if (!home.includes('开始学习')) throw new Error('首页主学习按钮缺失');
if (!home.includes('自动依次朗读英文和中文') || !home.includes('词块随后直接消失')) throw new Error('首次首页没有准确说明消除后的双语自动朗读与直接消失');
if (home.includes('再听') || home.includes('弹出')) throw new Error('首次首页仍承诺已移除的重听卡或弹出反馈');
if (!test.levelIntroView || !test.resultView || !test.petNeedsAttention) throw new Error('页面边界测试接口不完整');
if (test.petNeedsAttention({ pet: { speciesId: 'corgi', onboardingStep: 'complete', lastFedDate: '2026-08-31' } }, '2026-08-31')) {
  throw new Error('已完成当天照顾的小狗不应显示红点');
}
test.gameState.user.progress.pet = petSystem.normalizePetState({});
const unclaimedStore = test.petStoreView();
if ((unclaimedStore.match(/class="pet-catalog-card/g) || []).length !== 6) throw new Error('领取页没有展示六种小狗');
if (!unclaimedStore.includes('value=""') || !unclaimedStore.includes('必须由你亲自命名')) throw new Error('新用户名字输入框不是空白');
if (!unclaimedStore.includes('贵宾犬') || !unclaimedStore.includes('聪明、亲人') || !unclaimedStore.includes('dog-figure')) {
  throw new Error('领取卡没有使用犬种资料和小狗姿态');
}

test.gameState.user.progress.pet = petSystem.normalizePetState({
  speciesId: 'cloud', name: '小云', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
  foodInventory: { starBiscuit: 2 }, needsBreedSelection: true
});
test.gameState.petNameDraft = null;
const migrationStore = test.petStoreView();
if (!migrationStore.includes('保留原有等级、成长值、金币和食物') || !migrationStore.includes('value="小云"')) {
  throw new Error('旧用户重选提示或旧名字预填缺失');
}
const migrationHome = test.homeView();
if (!migrationHome.includes('重新选择并保留养成进度') || migrationHome.includes('领取我的小狗')) {
  throw new Error('旧用户首页没有明确引导无损重选小狗');
}

test.gameState.user.progress.pet = petSystem.normalizePetState({
  speciesId: 'corgi', name: '豆豆', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
  foodInventory: { starBiscuit: 2 }, catalogVersion: 2, onboardingStep: 'feed'
});
test.gameState.lastPetQuote = '主人，我的肚子咕咕叫啦。';
const guidedPetHome = test.petHomeView();
if (!guidedPetHome.includes('dog-speech-bubble') || !guidedPetHome.includes('主人，我的肚子咕咕叫啦')) throw new Error('头顶气泡缺失');
if (!guidedPetHome.includes('回宠物屋喂食') || !guidedPetHome.includes('新手小任务')) throw new Error('三步养宠任务缺失');
if (!guidedPetHome.includes('查看下一级特技') || !guidedPetHome.includes('还差 80 成长值')) throw new Error('升级差值或特技入口缺失');
if (!test.dogFigure || !test.petOnboardingCard || !test.trickBookView || !test.openPetHome || !test.adoptPet || !test.feedPet) {
  throw new Error('宠物屋交互测试接口不完整');
}
const trickBook = test.trickBookView(test.gameState.user.progress);
if (!trickBook.includes('摇尾欢迎') || !trickBook.includes('开心蹦跳') || !trickBook.includes('data-action="perform-trick"')) {
  throw new Error('特技成长册缺少解锁和预告');
}
const buyOnboarding = test.petOnboardingCard({ pet: { onboardingStep: 'buy' } });
if (!buyOnboarding.includes('class="done"') || !buyOnboarding.includes('class="current" aria-current="step"') || !buyOnboarding.includes('data-action="shop"')) {
  throw new Error('新手任务没有区分已完成与当前步骤');
}
test.gameState.view = 'login';
if (!test.authView().includes('单词消消养宠记') || test.authView().includes('词灵星球')) throw new Error('登录页名称尚未统一');
if (test.authView().includes('/assets/dogs/')) throw new Error('登录页错误展示了已领养小狗素材');
test.gameState.user = {
  profile: { nickname: '小测试员' },
  progress: {
    stage: 1, coins: 30, collected: [], mistakes: {}, inventory: { hint: 3, shuffle: 2, addMoves: 1 },
    tutorials: { match3: false, pair: false }, review: {}, learnedWords: [],
    pet: { speciesId: 'corgi', name: '豆豆', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70, level: 2,
      foodInventory: {}, catalogVersion: 2, needsBreedSelection: false, onboardingStep: 'earn', lastFedDate: '' }
  }
};
const homeWithoutDog = test.homeView();
if (homeWithoutDog.includes('豆豆') || homeWithoutDog.includes('/assets/dogs/') || homeWithoutDog.includes('dog-figure')) {
  throw new Error('主页仍然展示已领取小狗');
}
if (!homeWithoutDog.includes('pet-attention-dot') || !homeWithoutDog.includes('快去帮你的小狗赚金币')) {
  throw new Error('主页缺少宠物屋红点或任务摘要');
}
test.gameState.game = test.newGame(1);
const introWithoutDog = test.levelIntroView();
const gameWithoutDog = test.gameView();
test.gameState.result = { win: true, level: 1, mode: 'match3', score: 100, combo: 2, learned: 4, stars: 3, xp: 20, coins: 24, mission: { type: 'normal' } };
const resultWithoutDog = test.resultView();
for (const [viewName, html] of [['关卡介绍', introWithoutDog], ['闯关', gameWithoutDog], ['结算', resultWithoutDog]]) {
  if (html.includes('豆豆') || html.includes('/assets/dogs/') || html.includes('pet-speech-bubble') || html.includes('dog-figure')) {
    throw new Error(`${viewName}仍然展示宠物`);
  }
}
if (!test.levelsView) throw new Error('关卡列表展示边界测试接口不完整');
const assertLearningViewWithoutDog = (viewName, html) => {
  for (const forbidden of ['豆豆', '/assets/dogs/', 'pet-speech-bubble', 'dog-figure', 'spirit-figure', 'pet-room-figure']) {
    if (html.includes(forbidden)) throw new Error(`${viewName}仍然展示宠物：${forbidden}`);
  }
};
assertLearningViewWithoutDog('关卡列表', test.levelsView());
const reviewWordsForVisibility = [
  { word: 'apple', zh: '苹果' }, { word: 'book', zh: '书' }, { word: 'cloud', zh: '云' },
  { word: 'dance', zh: '跳舞' }, { word: 'fish', zh: '鱼' }
];
const learningViews = [
  ['三消闯关', test.newGame(1), 'match3'],
  ['配对闯关', test.newGame(3), 'pair'],
  ['拼写闯关', test.newSpellingGame(20, reviewWordsForVisibility, () => .5), 'spelling'],
  ['落体闯关', test.newFallingGame(25, reviewWordsForVisibility, false, () => .5), 'falling']
];
for (const [viewName, game, mode] of learningViews) {
  if (game.mode !== mode) throw new Error(`${viewName}没有构造为${mode}分支`);
  test.gameState.game = game;
  assertLearningViewWithoutDog(viewName, test.gameView());
}
test.gameState.user.progress.pet = {
  speciesId: 'corgi', name: '小云', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
  foodInventory: { starBiscuit: 2, fruitCup: 0, nutritionMeal: 0, celebrationCake: 0 },
  catalogVersion: 2, needsBreedSelection: false, onboardingStep: 'complete', lastFedDate: '2026-08-31'
};
const petHome = test.petHomeView();
if (!petHome.includes('小云 · Lv.2') || !petHome.includes('库存 2') || !petHome.includes('宠物不会饥饿、生病或退级')) throw new Error('宠物之家缺少等级、食物背包或无压力说明');
const petShop = test.shopView();
if (!petShop.includes('星星饼干') || !petShop.includes('庆典蛋糕') || !petShop.includes('智慧镜')) throw new Error('金币商店没有同时展示食物和学习道具');
if (!petShop.includes('不含充值、付费或随机抽取')) throw new Error('金币商店没有说明纯学习兑换规则');
if (!test.petTargetMessage({ ...test.gameState.user.progress, coins: 30 }).includes('金币已经够买星星饼干')) throw new Error('金币足够时仍提示只能继续赚钱，没有给出可执行的喂养目标');
test.gameState.user.progress.collected = ['apple'];
test.gameState.tip = 1;
const rotatingTipHome = test.homeView();
if (!rotatingTipHome.includes('自动依次朗读英文和中文') || !rotatingTipHome.includes('词块随后直接消失')) throw new Error('轮播帮助没有准确说明消除后的双语自动朗读与直接消失');
if (rotatingTipHome.includes('再听') || rotatingTipHome.includes('弹出')) throw new Error('轮播帮助仍承诺已移除的重听卡或弹出反馈');
if (test.backgroundMusicSrc !== '/assets/snake-countdown-bgm.mp3') throw new Error('背景音乐资源路径不正确');
if (!test.backgroundMusic?.loop) throw new Error('背景音乐没有循环播放');
if (!fs.existsSync(path.join(root, 'assets', 'snake-countdown-bgm.mp3'))) throw new Error('背景音乐文件缺失');
const praiseWords = ['GOOD JOB', 'NICE', 'GREAT', 'EXCELLENT', 'UNBELIEVABLE'];
if (!test.praiseVoiceProfiles || praiseWords.some(word => !test.praiseVoiceProfiles[word])) throw new Error('五级鼓励词配置不完整');
for (const removed of ['GOOD', 'AMAZING', 'BONUS TIME']) {
  if (test.praiseVoiceProfiles[removed]) throw new Error(`旧鼓励词 ${removed} 未删除`);
}
if (!test.selectVoiceForRole) throw new Error('Independent learning/praise voice selection is missing');
const fakeVoices = [
  { name: 'Microsoft Ana Online', lang: 'en-US', voiceURI: 'voice-learning' },
  { name: 'Microsoft Zira Desktop', lang: 'en-US', voiceURI: 'voice-praise' },
  { name: 'Microsoft Xiaoxiao', lang: 'zh-CN', voiceURI: 'voice-chinese' }
];
const learningVoice = test.selectVoiceForRole(fakeVoices, 'learning');
const praiseVoice = test.selectVoiceForRole(fakeVoices, 'praise', learningVoice?.voiceURI);
if (!learningVoice || !praiseVoice || learningVoice.voiceURI === praiseVoice.voiceURI) throw new Error('Learning and praise must select separate system voices');
if (!test.createLearningUtterance || !test.createPraiseUtterance) throw new Error('Independent learning/praise utterance builders are missing');
const learningLine = test.createLearningUtterance('dance', fakeVoices);
const praiseLine = test.createPraiseUtterance('EXCELLENT', learningLine.voice?.voiceURI, fakeVoices);
if (learningLine.voiceRole !== 'learning' || praiseLine.voiceRole !== 'praise') throw new Error('Speech roles are not separated');
if (!learningLine.voice || !praiseLine.voice || learningLine.voice.voiceURI === praiseLine.voice.voiceURI) throw new Error('Learning and praise utterances use the same system voice');
if (learningLine.pitch === praiseLine.pitch && learningLine.rate === praiseLine.rate) throw new Error('Cartoon praise profile must differ from learning pronunciation');
if (!praiseLine.text.endsWith('!')) throw new Error('Praise utterance must use an enthusiastic exclamation');
const fallbackPraiseLine = test.createPraiseUtterance('UNKNOWN', learningLine.voice?.voiceURI, fakeVoices);
if (fallbackPraiseLine.rate !== test.praiseVoiceProfiles['GOOD JOB'].rate) throw new Error('鼓励词回退配置不正确');
if (!test.cacheSystemVoices) throw new Error('System voice cache is missing');
test.cacheSystemVoices(fakeVoices);
const cachedLearningLine = test.createLearningUtterance('dance', []);
const cachedPraiseLine = test.createPraiseUtterance('EXCELLENT', cachedLearningLine.voice?.voiceURI, []);
if (!cachedLearningLine.voice || !cachedPraiseLine.voice || cachedLearningLine.voice.voiceURI === cachedPraiseLine.voice.voiceURI) {
  throw new Error('Voice cache does not keep learning and praise voices separate when getVoices() is initially empty');
}
if (!test.createMeaningUtterance || !test.createLearningUtterances) throw new Error('中英文朗读构建器缺失');
const bilingual = test.createLearningUtterances({ word: 'apple', zh: '苹果' }, fakeVoices);
if (bilingual.length !== 2 || bilingual[0].text !== 'apple' || bilingual[0].lang !== 'en-US') throw new Error('英文朗读项不正确');
if (bilingual[1].text !== '苹果' || bilingual[1].lang !== 'zh-CN') throw new Error('中文朗读项不正确');
if (bilingual[1].voice?.voiceURI !== 'voice-chinese') throw new Error('中文朗读项没有选择中文语音');
const expectedTextbookCounts = { 1: 110, 2: 120, 3: 308, 5: 316 };
for (const [grade, count] of Object.entries(expectedTextbookCounts)) {
  if (context.window.TEXTBOOK_WORDS.grades[grade].length !== count) throw new Error(`Grade ${grade} textbook count changed unexpectedly`);
}
const levels = [[1, 1], [20, 1], [21, 2], [41, 3], [61, 4], [81, 5], [100, 5]];
for (const [level, grade] of levels) {
  const game = test.newGame(level);
  if (game.grade !== grade) throw new Error(`Level ${level} expected grade ${grade}, got ${game.grade}`);
  if (game.board.length !== 36) throw new Error(`Level ${level} board size is invalid`);
  if (test.findMatchLines(game.board).length) throw new Error(`Level ${level} starts with an automatic match`);
  if (!test.possibleMoves(game.board).length) throw new Error(`Level ${level} has no possible move`);
  if (game.mode === 'match3' && game.board.some(tile => !Number.isInteger(tile.type) || !['en', 'zh'].includes(tile.face))) {
    throw new Error(`Level ${level} contains an invalid text-only tile`);
  }
  for (const move of test.possibleMoves(game.board).slice(0, 5)) {
    if (!test.findMatchLines(test.swap(game.board, move.a, move.b)).length) throw new Error(`Level ${level} exposes an invalid hint move`);
  }
  if (game.mode === 'pair' && (!game.target?.word || !game.target?.zh)) throw new Error(`Level ${level} pair target is invalid`);
  if (game.mode === 'match3' && (!game.scoreGoal || game.target !== null)) throw new Error(`Level ${level} score-mode setup is invalid`);
}

const boardWith = cells => {
  const board = Array.from({ length: 36 }, (_, index) => ({ type: index + 10, face: 'en' }));
  cells.forEach((tile, index) => { board[index] = tile; });
  return board;
};
const en0 = { type: 0, face: 'en' };
const zh0 = { type: 0, face: 'zh' };

if (!test.findMatchLines(boardWith([en0, en0, zh0])).length) throw new Error('英文与中文混合三连应可消除');
if (test.findMatchLines(boardWith([en0, en0, en0])).length) throw new Error('纯英文三连不应消除');
if (test.findMatchLines(boardWith([zh0, zh0, zh0])).length) throw new Error('纯中文三连不应消除');

const sameTypeDifferentFaceBoard = boardWith([
  { type: 0, face: 'en' },
  { type: 0, face: 'en' },
  { type: 0, face: 'en' },
  ...Array.from({ length: 5 }, (_, index) => ({ type: index + 20, face: 'en' })),
  { type: 0, face: 'zh' }
]);
if (test.findMatchLines(sameTypeDifferentFaceBoard).length) throw new Error('确定性交换夹具在交换前不应已有有效消除');
const faceChangingMove = test.possibleMoves(sameTypeDifferentFaceBoard).find(move => move.a === 2 && move.b === 8);
if (!faceChangingMove) throw new Error('提示逻辑漏掉同词不同展示面的有效交换');
const faceChangedBoard = test.swap(sameTypeDifferentFaceBoard, faceChangingMove.a, faceChangingMove.b);
if (!test.findMatchLines(faceChangedBoard).some(line => line.includes(0) && line.includes(1) && line.includes(2))) {
  throw new Error('同词不同展示面的候选交换没有产生真实混合三连');
}
const faceChangingGame = test.newGame(2);
faceChangingGame.board = sameTypeDifferentFaceBoard;
test.chooseTarget(faceChangingGame);
if (faceChangingGame.board !== sameTypeDifferentFaceBoard) throw new Error('含同词不同展示面有效交换的棋盘被误判为死盘并重建');
test.gameState.game = faceChangingGame;
test.gameState.view = 'login';
test.useHint();
if (faceChangingGame.hintCells.join(',') !== '2,8') throw new Error('提示道具没有选中同词不同展示面的有效交换');
const identicalFaceBoard = [...sameTypeDifferentFaceBoard];
identicalFaceBoard[8] = { type: 0, face: 'en' };
if (test.possibleMoves(identicalFaceBoard).some(move => move.a === 2 && move.b === 8)) throw new Error('完全相同 type+face 的交换不应成为候选移动');

const board = boardWith([{ type: 2, face: 'en' }, { type: 2, face: 'zh' }, { type: 2, face: 'en' }]);
const lines = test.findMatchLines(board);
if (!lines.some(line => line.includes(0) && line.length >= 3)) throw new Error('Three-match detection failed');

const five = test.expandedRemoval([[0, 1, 2, 3, 4]], board);
if (five.special !== 'rainbow') throw new Error('Five-match rainbow effect failed');

const matchGame = test.newGame(2);
const pairGame = test.newGame(3);
if (matchGame.mode !== 'match3' || pairGame.mode !== 'pair') throw new Error('Alternating game modes failed');
if (pairGame.pairs.length !== pairGame.words.length * 2) throw new Error('Pair-card generation failed');
const pairStars = test.newGame(3);
pairStars.moves = 5;
pairStars.pairMistakes = 0;
if (test.starsForGame(pairStars) !== 3) throw new Error('配对零失误应获得三星');
pairStars.pairMistakes = 1;
if (test.starsForGame(pairStars) !== 2) throw new Error('配对一次失误应获得二星');
pairStars.pairMistakes = 2;
if (test.starsForGame(pairStars) !== 2) throw new Error('配对两次失误应获得二星');
pairStars.pairMistakes = 3;
if (test.starsForGame(pairStars) !== 1) throw new Error('配对三次失误应获得一星');

const matchStars = test.newGame(2);
matchStars.moves = 10;
if (test.starsForGame(matchStars) !== 3) throw new Error('三消三星阈值不应改变');
matchStars.moves = 5;
if (test.starsForGame(matchStars) !== 2) throw new Error('三消二星阈值不应改变');
if (test.missionForLevel(5).type !== 'treasure' || test.missionForLevel(10).type !== 'boss') throw new Error('Mission cadence failed');
if (test.praiseForEffect('pop', 3, 1) !== 'GOOD JOB') throw new Error('基础鼓励等级错误');
if (test.praiseForEffect('pop', 4, 2) !== 'NICE') throw new Error('二级鼓励等级错误');
if (test.praiseForEffect('cascade', 6, 3) !== 'GREAT') throw new Error('三级鼓励等级错误');
if (test.praiseForEffect('rocket', 8, 3) !== 'EXCELLENT') throw new Error('四级鼓励等级错误');
if (test.praiseForEffect('rainbow', 12, 4) !== 'UNBELIEVABLE') throw new Error('五级鼓励等级错误');
const expectedPictures = {
  apple: '\u{1F34E}',
  tooth: '\u{1F9B7}',
  'Teddy bear': '\u{1F9F8}',
  'pencil-case': '\u{1F58D}\u{FE0F}',
  house: '\u{1F3E0}',
  grandmother: '\u{1F475}',
  policeman: '\u{1F46E}',
  'ride a bike': '\u{1F6B2}',
  'orange juice': '\u{1F9C3}',
  breakfast: '\u{1F37D}\u{FE0F}',
  hospital: '\u{1F3E5}',
  'traffic light': '\u{1F6A6}',
  'The Great Wall': '\u{1F9F1}'
};
for (const [word, picture] of Object.entries(expectedPictures)) {
  if (test.visualForWord(word) !== picture) throw new Error(`Concrete-word picture mapping failed for "${word}"`);
}
if (test.visualForWord('because') !== '' || test.visualForWord('still') !== '') throw new Error('Abstract words should stay as Chinese text');
if (!test.visualForPairWord) throw new Error('High-confidence pair-picture selector is missing');
const clearPairPictures = ['apple', 'carrot', 'dog', 'pencil', 'hamburger'];
if (clearPairPictures.some(word => !test.visualForPairWord(word))) throw new Error('Clear concrete pair words should use pictures');
const ambiguousPairWords = ['breakfast', 'lunch', 'dinner', 'dance', 'teacher', 'weather'];
if (ambiguousPairWords.some(word => test.visualForPairWord(word))) throw new Error('Ambiguous pair words should stay as Chinese text');
if ('memoryInline' in test) throw new Error('学习卡渲染函数仍然被导出');
if (!test.gameView || !test.tileFaceHtml) throw new Error('游戏渲染接口不完整');
test.gameState.game = test.newGame(2);
const gameHtml = test.gameView();
if (gameHtml.includes('target-card') || gameHtml.includes('target-memory-slot') || gameHtml.includes('meaning-pop')) {
  throw new Error('游戏顶部学习区或消除后学习卡仍在渲染');
}
if (!gameHtml.includes('剩余步数') || !gameHtml.includes('最高连击')) throw new Error('删除学习区后必要状态信息缺失');
if (!gameHtml.includes('tile-text')) throw new Error('三消文字展示面没有渲染');
if (gameHtml.includes('tile-picture')) throw new Error('三消仍在渲染图片方块');
const legacyImageHtml = test.tileFaceHtml({ type: 0, face: 'image' }, { word: 'apple', zh: '苹果' });
if (!legacyImageHtml.includes('tile-text zh') || !legacyImageHtml.includes('苹果') || legacyImageHtml.includes('tile-picture')) {
  throw new Error('旧图片方块没有降级为中文文字');
}
if (!test.pairFace || !test.pairFace({ lang: 'zh', text: '苹果' }, { word: 'apple', zh: '苹果' }).includes('pair-picture')) {
  throw new Error('移除三消图片时误删了配对图片');
}
const minimumPictureCoverage = { 1: .78, 2: .75, 3: .30, 5: .45 };
for (const [grade, minimum] of Object.entries(minimumPictureCoverage)) {
  const words = context.window.TEXTBOOK_WORDS.grades[grade];
  const mapped = words.filter(word => test.visualForWord(word.word)).length;
  if (mapped / words.length < minimum) {
    throw new Error(`Grade ${grade} picture coverage too low: ${mapped}/${words.length}`);
  }
}

const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
if (styles.includes('.tile-picture')) throw new Error('三消图片死样式仍然存在');
if (!styles.includes('.pair-picture')) throw new Error('配对图片样式被误删');
if (styles.includes('.memory-strip')) throw new Error('已无渲染入口的 memory-strip 死样式仍然存在');
const tutorialCardRule = styles.match(/\.tutorial-card\{[^}]*\}/)?.[0] || '';
const tutorialPulseRule = styles.match(/@keyframes tutorial-pulse\{[\s\S]*?\}\}/)?.[0] || '';
if (!tutorialCardRule.includes('top:16px') || tutorialCardRule.includes('bottom:')) {
  throw new Error('教学说明卡必须固定在顶部，不能遮住棋盘目标');
}
if (tutorialPulseRule.includes('transform:')) {
  throw new Error('教学高亮动画不能移动可点击目标');
}

async function runAsyncRegressionTests() {
  if (!test.settleBoard) throw new Error('棋盘结算接口缺失');
  faceChangingGame.board = sameTypeDifferentFaceBoard;
  const playableBoardSnapshot = JSON.stringify(faceChangingGame.board);
  test.gameState.game = faceChangingGame;
  test.gameState.view = 'login';
  await test.settleBoard(faceChangingGame, new Set());
  if (JSON.stringify(faceChangingGame.board) !== playableBoardSnapshot) throw new Error('结算阶段把仍有同词不同展示面有效交换的棋盘误重排');

  if (!test.speakWords || !test.speakWord) throw new Error('语音队列接口缺失');
  systemVoicesForTest = [{ name: 'Microsoft Ana Online', lang: 'en-US', voiceURI: 'voice-learning' }];
  test.cacheSystemVoices(systemVoicesForTest);
  spokenLines.length = 0;
  const cancelBeforeAutomaticBatches = speechCancelCount;
  await test.speakWords([{ word: 'apple', zh: '苹果' }]);
  await test.speakWords([{ word: 'banana', zh: '香蕉' }]);
  if (speechCancelCount !== cancelBeforeAutomaticBatches) throw new Error('后续自动消除批次取消了前一批双语朗读');
  if (spokenLines.map(line => `${line.text}:${line.lang}`).join('|') !== 'apple:en-US|苹果:zh-CN|banana:en-US|香蕉:zh-CN') {
    throw new Error('连续自动消除批次没有按英文、中文顺序串行入队');
  }
  if (spokenLines[1].voice !== null || spokenLines[3].voice !== null) throw new Error('缺少中文音色时未使用无指定音色的中文朗读降级');

  const cancelBeforeReplay = speechCancelCount;
  await test.speakWord('pear');
  if (speechCancelCount !== cancelBeforeReplay + 1 || spokenLines.at(-1)?.text !== 'pear') {
    throw new Error('用户主动重播没有明确取消旧队列并播放新单词');
  }

  if (!test.selectPair) throw new Error('配对交互接口缺失');
  const pairFlowGame = test.newGame(3);
  pairFlowGame.tutorial = { active: false, mode: 'pair', cells: [], step: 0 };
  pairFlowGame.goal = 1;
  pairFlowGame.pairs = [
    { type: 0, lang: 'en', text: pairFlowGame.words[0].word, matched: false },
    { type: 1, lang: 'zh', text: pairFlowGame.words[1].zh, matched: false },
    { type: 0, lang: 'zh', text: pairFlowGame.words[0].zh, matched: false }
  ];
  test.gameState.game = pairFlowGame;
  test.gameState.view = 'game';
  await test.selectPair(0);
  await test.selectPair(1);
  if (pairFlowGame.pairMistakes !== 1 || pairFlowGame.done !== 0) throw new Error('错误配对没有计入一次失误并保持未完成');
  await test.selectPair(0);
  await test.selectPair(2);
  if (pairFlowGame.done !== 1 || !test.gameState.result?.win || test.gameState.result.stars !== 2) {
    throw new Error('一次失误后的正确配对没有完成关卡并结算为二星');
  }

  const jsonResponse = data => ({ ok: true, json: async () => data });
  const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
    return { promise, resolve, reject };
  };
  const actionEvent = (action, dataset = {}) => {
    const actionNode = { dataset: { action, ...dataset } };
    return {
      target: {
        closest: selector => {
          if (selector === '[data-action]') return actionNode;
          if (selector === '[data-trick-id]' && dataset.trickId) return actionNode;
          if (selector === '[data-pet-id]' && dataset.petId) return actionNode;
          return null;
        }
      }
    };
  };

  let petApiCalls = [];
  test.gameState.user = {
    profile: { nickname: '小测试员' },
    progress: { stage: 1, coins: 30, pet: petSystem.normalizePetState({}) }
  };
  test.gameState.selectedPetId = '';
  test.gameState.petNameDraft = null;
  test.gameState.view = 'pet-store';
  test.petStoreView();
  await dispatchDocumentEvent('input', {
    target: {
      value: '自选名',
      matches: selector => selector === '#pet-adopt-form input[name="name"]'
    }
  });
  await dispatchDocumentEvent('click', actionEvent('select-pet', { petId: 'husky' }));
  if (test.gameState.petNameDraft !== '自选名' || test.gameState.selectedPetId !== 'husky' || !appElement.innerHTML.includes('value="自选名"')) {
    throw new Error(`切换犬种后没有保留名字草稿 draft=${test.gameState.petNameDraft} selected=${test.gameState.selectedPetId} rendered=${appElement.innerHTML.includes('value="自选名"')}`);
  }
  const failedAdopt = deferred();
  fetchHandler = async url => {
    if (url === '/api/pet/adopt') return failedAdopt.promise;
    throw new Error(`非预期请求：${url}`);
  };
  const pendingFailedAdopt = test.adoptPet('husky', '自选名');
  await Promise.resolve();
  if (!test.gameState.petBusy || !appElement.innerHTML.includes('value="自选名"')) throw new Error('领取忙碌重渲染丢失名字草稿');
  failedAdopt.reject(new Error('领取失败'));
  await pendingFailedAdopt;
  if (test.gameState.petBusy || !test.petStoreView().includes('value="自选名"')) throw new Error('领取失败后忙碌态或名字草稿没有恢复');

  test.gameState.user.progress.pet = petSystem.normalizePetState({
    speciesId: 'cloud', name: '旧名字', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
    catalogVersion: 1, needsBreedSelection: true
  });
  test.gameState.petNameDraft = null;
  test.petStoreView();
  await dispatchDocumentEvent('input', {
    target: {
      value: '迁移新名',
      matches: selector => selector === '#pet-adopt-form input[name="name"]'
    }
  });
  await dispatchDocumentEvent('click', actionEvent('select-pet', { petId: 'poodle' }));
  if (!test.petStoreView().includes('value="迁移新名"') || test.petStoreView().includes('value="旧名字"')) {
    throw new Error('旧用户修改后的名字草稿回退成旧名');
  }

  test.gameState.user.progress.pet = petSystem.normalizePetState({});
  test.gameState.selectedPetId = '';
  test.gameState.petNameDraft = null;
  fetchHandler = async (url, options) => {
    petApiCalls.push({ url, options });
    throw new Error('空名字不应发送领取请求');
  };
  await test.adoptPet('corgi', '');
  if (petApiCalls.length !== 0) throw new Error('空名字仍然发送了领取请求');

  let confirmMessage = '';
  context.confirm = message => { confirmMessage = message; return true; };
  const adoptedUser = {
    profile: { nickname: '小测试员' },
    progress: {
      stage: 1, coins: 30,
      pet: petSystem.normalizePetState({
        speciesId: 'corgi', name: '豆豆', adoptedAt: '2026-08-31T00:00:00.000Z',
        catalogVersion: 2, onboardingStep: 'earn'
      })
    }
  };
  fetchHandler = async (url, options) => {
    petApiCalls.push({ url, options });
    if (url === '/api/pet/adopt') return jsonResponse({ user: adoptedUser });
    throw new Error(`非预期请求：${url}`);
  };
  await test.adoptPet('corgi', '豆豆');
  if (petApiCalls.at(-1)?.url !== '/api/pet/adopt' || test.gameState.view !== 'pet-home') throw new Error('领取成功后没有直接进入宠物屋');
  if (!confirmMessage.includes('名字仍可免费修改') || !petSystem.petById('corgi').quotes.welcome.includes(test.gameState.lastPetQuote)) {
    throw new Error('领取确认或欢迎气泡不正确');
  }

  const delayedAdopt = deferred();
  test.gameState.user = {
    profile: { nickname: '旧账号' },
    progress: { stage: 1, coins: 30, pet: petSystem.normalizePetState({}) }
  };
  test.gameState.token = 'old-account-token';
  test.gameState.view = 'pet-store';
  test.gameState.selectedPetId = 'husky';
  test.gameState.petNameDraft = '旧账号草稿';
  fetchHandler = async url => {
    if (url === '/api/pet/adopt') return delayedAdopt.promise;
    if (url === '/api/logout') return jsonResponse({ ok: true });
    throw new Error(`非预期请求：${url}`);
  };
  const pendingStaleAdopt = test.adoptPet('corgi', '旧号小狗');
  await Promise.resolve();
  if (!test.gameState.petBusy) throw new Error('延迟领取夹具没有进入领取忙碌态');
  await dispatchDocumentEvent('click', actionEvent('logout'));
  if (test.gameState.user || test.gameState.view !== 'login') throw new Error('退出账号夹具没有先清空当前会话');
  if (test.gameState.selectedPetId || test.gameState.petNameDraft !== null) throw new Error('退出账号没有清理犬种选择或名字草稿');
  delayedAdopt.resolve(jsonResponse({ user: adoptedUser }));
  await pendingStaleAdopt;
  if (test.gameState.user || test.gameState.view !== 'login' || test.gameState.lastPetQuote) {
    throw new Error('退出后晚到的领取响应恢复了旧账号或宠物屋');
  }
  const delayedAdoptFailure = deferred();
  test.gameState.user = {
    profile: { nickname: '另一个旧账号' },
    progress: { stage: 1, coins: 0, pet: petSystem.normalizePetState({}) }
  };
  test.gameState.token = 'another-old-token';
  test.gameState.view = 'pet-store';
  test.gameState.notice = '';
  fetchHandler = async url => {
    if (url === '/api/pet/adopt') return delayedAdoptFailure.promise;
    if (url === '/api/logout') return jsonResponse({ ok: true });
    throw new Error(`非预期请求：${url}`);
  };
  const pendingStaleFailure = test.adoptPet('poodle', '旧请求');
  await Promise.resolve();
  await dispatchDocumentEvent('click', actionEvent('logout'));
  delayedAdoptFailure.reject(new Error('旧领取请求失败'));
  await pendingStaleFailure;
  if (test.gameState.notice || test.gameState.user || test.gameState.view !== 'login') throw new Error('退出后晚到的领取失败仍污染当前界面');

  test.gameState.user = {
    profile: { nickname: '新账号' },
    progress: { stage: 1, coins: 0, pet: petSystem.normalizePetState({}) }
  };
  test.gameState.token = 'new-account-token';
  test.gameState.view = 'pet-store';
  const newAccountStore = test.petStoreView();
  if (test.gameState.selectedPetId !== 'poodle' || !newAccountStore.includes('value=""') || !newAccountStore.includes('data-pet-id="poodle" aria-pressed="true"')) {
    throw new Error('新账号领取页没有恢复默认犬种和空名字');
  }

  let visitCount = 0;
  test.gameState.user = adoptedUser;
  test.gameState.token = 'test-token';
  fetchHandler = async url => {
    if (url !== '/api/pet/visit') throw new Error(`非预期请求：${url}`);
    visitCount += 1;
    return jsonResponse({ user: adoptedUser, petVisit: { showHungerPrompt: visitCount === 1 } });
  };
  await test.openPetHome();
  if (visitCount !== 1 || !petSystem.petById('corgi').quotes.hunger.includes(test.gameState.lastPetQuote)) {
    throw new Error('首次进入宠物屋没有显示每日饥饿气泡');
  }
  await test.openPetHome();
  if (visitCount !== 2 || test.gameState.lastPetQuote) throw new Error('同日再次进入宠物屋仍重复显示饥饿气泡');

  const delayedVisit = deferred();
  let writesDuringVisit = 0;
  test.gameState.user = adoptedUser;
  fetchHandler = async url => {
    if (url === '/api/pet/visit') return delayedVisit.promise;
    if (url === '/api/pet/feed' || url === '/api/pet/name') {
      writesDuringVisit += 1;
      return jsonResponse({ user: adoptedUser, feeding: { oldLevel: 1, newLevel: 1, growthRemaining: 50, unlockedTrickIds: [] } });
    }
    throw new Error(`非预期请求：${url}`);
  };
  const pendingVisit = test.openPetHome();
  await Promise.resolve();
  if (!test.gameState.petVisitBusy) throw new Error('延迟访问夹具没有进入访问忙碌态');
  await test.feedPet('starBiscuit');
  await test.renamePet('豆豆新名');
  if (writesDuringVisit !== 0) throw new Error('访问加载期间仍发起了喂食或改名写请求');
  delayedVisit.resolve(jsonResponse({ user: adoptedUser, petVisit: { showHungerPrompt: false } }));
  await pendingVisit;
  if (test.gameState.petVisitBusy || test.gameState.petBusy) throw new Error('访问完成后忙碌态没有恢复');

  const fedUser = {
    ...adoptedUser,
    progress: {
      ...adoptedUser.progress,
      pet: petSystem.normalizePetState({
        speciesId: 'corgi', name: '豆豆', adoptedAt: '2026-08-31T00:00:00.000Z', growth: 160,
        foodInventory: { starBiscuit: 0 }, catalogVersion: 2, onboardingStep: 'complete', lastFedDate: '2026-08-31'
      })
    }
  };
  fetchHandler = async url => {
    if (url !== '/api/pet/feed') throw new Error(`非预期请求：${url}`);
    return jsonResponse({
      user: fedUser,
      feeding: { oldLevel: 2, newLevel: 3, growthRemaining: 120, unlockedTrickIds: ['happyBounce'] }
    });
  };
  await test.feedPet('starBiscuit');
  if (!test.gameState.lastPetQuote.includes('我升到 Lv.3 啦，已经学会开心蹦跳')) {
    throw new Error('喂食反馈没有包含升级差值或当次解锁特技');
  }
  if (test.petHomeView().includes('新手小任务')) throw new Error('首次成功喂食后新手任务没有收起');

  test.gameState.user.progress.pet = petSystem.normalizePetState({
    speciesId: 'corgi', name: '豆豆', adoptedAt: '2026-08-31T00:00:00.000Z', growth: 2400,
    foodInventory: { starBiscuit: 2 }, catalogVersion: 2, onboardingStep: 'complete'
  });
  const maxLevelHome = test.petHomeView();
  if (!maxLevelHome.includes('data-action="pet-tap"') || !maxLevelHome.includes('已经满级，摸摸它吧') || maxLevelHome.includes('data-food-id=')) {
    throw new Error('满级食物按钮仍可触发喂食请求');
  }
  let maxLevelFeedRequests = 0;
  fetchHandler = async () => { maxLevelFeedRequests += 1; throw new Error('满级不应请求喂食'); };
  await test.feedPet('starBiscuit');
  if (maxLevelFeedRequests !== 0 || !petSystem.petById('corgi').quotes.maxLevel.includes(test.gameState.lastPetQuote)) {
    throw new Error('满级喂食入口仍扣食物或没有改为摸摸感谢');
  }
  test.gameState.lastPetQuote = '';
  await dispatchDocumentEvent('click', actionEvent('pet-tap'));
  if (maxLevelFeedRequests !== 0 || !petSystem.petById('corgi').quotes.maxLevel.includes(test.gameState.lastPetQuote)) {
    throw new Error('点击满级小狗或满级按钮没有显示摸摸感谢');
  }

  test.gameState.user = fedUser;
  await dispatchDocumentEvent('click', actionEvent('show-tricks'));
  if (!test.gameState.showTrickBook || !appElement.innerHTML.includes('小狗特技成长册')) throw new Error('成长册没有通过交互展开');
  await dispatchDocumentEvent('click', actionEvent('perform-trick', { trickId: 'tailWelcome' }));
  if (test.gameState.activeTrickId !== 'tailWelcome' || !test.gameState.lastPetQuote.includes('摇尾欢迎')) throw new Error('已解锁特技没有开始表演');
  scrolledSelector = '';
  await dispatchDocumentEvent('click', actionEvent('focus-food'));
  if (scrolledSelector !== '.food-shop-grid') throw new Error('喂食引导没有滚动到食物区域');
  await dispatchDocumentEvent('click', actionEvent('home'));
  if (test.gameState.activeTrickId || test.gameState.trickTimer || test.gameState.showTrickBook) throw new Error('离开宠物屋没有清理特技临时状态');

  if (!test.startMusic || !test.stopMusic || !test.toggleAudioChannel) throw new Error('背景音乐控制接口缺失');
  let musicPlayAttempts = 0;
  let rejectNextMusicPlay = true;
  test.backgroundMusic.play = () => {
    musicPlayAttempts += 1;
    if (rejectNextMusicPlay) {
      rejectNextMusicPlay = false;
      test.backgroundMusic.paused = true;
      return Promise.reject(new Error('autoplay blocked'));
    }
    test.backgroundMusic.paused = false;
    return Promise.resolve();
  };
  test.gameState.audio.music = true;
  test.stopMusic(true);
  await dispatchDocumentEvent('pointerdown', { target: {} });
  await Promise.resolve();
  if (musicPlayAttempts !== 1 || !test.backgroundMusic.paused) throw new Error('首次音乐播放拒绝夹具无效');
  await dispatchDocumentEvent('pointerdown', { target: {} });
  if (musicPlayAttempts !== 2 || test.backgroundMusic.paused) throw new Error('首次播放被拒后，后续用户手势没有重试音乐');

  test.backgroundMusic.currentTime = 37;
  test.toggleAudioChannel('music');
  if (!test.backgroundMusic.paused || test.backgroundMusic.currentTime !== 37) throw new Error('关闭音乐没有暂停并保留播放位置');
  test.toggleAudioChannel('music');
  if (test.backgroundMusic.paused || test.backgroundMusic.currentTime !== 37) throw new Error('重新开启音乐没有从保留位置恢复');

  test.gameState.game = test.newGame(2);
  test.gameState.view = 'game';
  const cancelBeforeLeave = speechCancelCount;
  await dispatchDocumentEvent('click', actionEvent('leave-game'));
  if (speechCancelCount !== cancelBeforeLeave + 1) throw new Error('离开关卡没有明确取消双语朗读队列');

  test.gameState.token = 'test-token';
  test.gameState.user = test.gameState.user || { profile: { nickname: '小测试员' }, progress: {} };
  test.backgroundMusic.currentTime = 29;
  const cancelBeforeLogout = speechCancelCount;
  await dispatchDocumentEvent('click', actionEvent('logout'));
  if (speechCancelCount !== cancelBeforeLogout + 1) throw new Error('注销没有明确取消双语朗读队列');
  if (!test.backgroundMusic.paused || test.backgroundMusic.currentTime !== 0) throw new Error('注销没有暂停音乐并归零播放位置');

  test.gameState.audio.music = true;
  rejectNextMusicPlay = true;
  const attemptsBeforeLoginPlay = musicPlayAttempts;
  test.startMusic();
  await Promise.resolve();
  if (musicPlayAttempts !== attemptsBeforeLoginPlay + 1 || !test.backgroundMusic.paused) throw new Error('登录后播放拒绝夹具无效');
  await dispatchDocumentEvent('pointerdown', { target: {} });
  if (musicPlayAttempts !== attemptsBeforeLoginPlay + 2 || test.backgroundMusic.paused) throw new Error('注销后登录播放被拒时，后续用户手势没有重试音乐');
}

runAsyncRegressionTests().then(() => {
  console.log('GAME_SMOKE=PASS levels=7 board=6x6 match3=PASS pair=PASS missions=PASS praise=PASS pictures=PASS rainbow=PASS audio=PASS tutorial=PASS coverage=PASS pet=PASS economy=PASS review=PASS spelling=PASS falling=PASS timer=PASS auth=PASS register-status=PASS');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
