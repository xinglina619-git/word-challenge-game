const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let focusedSelector = '';
const appElement = { innerHTML: '' };
const context = {
  console,
  window: {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: {
    querySelector: selector => selector === '#app'
      ? appElement
      : { focus: () => { focusedSelector = selector; } },
    querySelectorAll: () => [],
    addEventListener: () => {}
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
  fetch: () => Promise.reject(new Error('fetch should not run in smoke test'))
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'textbook-words.generated.js'), 'utf8'), context, { filename: 'textbook-words.generated.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'curriculum.js'), 'utf8'), context, { filename: 'curriculum.js' });
const source = `${fs.readFileSync(path.join(root, 'app.js'), 'utf8')}
globalThis.__gameTest = {
  newGame, starsForGame, findMatchLines, possibleMoves, expandedRemoval, gradeFor, wordsForLevel, adjacent, swap,
  tileType, makeTile, isMixedMeaningLine,
  modeForLevel, missionForLevel, praiseForEffect, visualForWord,
  visualForPairWord: typeof visualForPairWord === 'function' ? visualForPairWord : null,
  backgroundMusicSrc: typeof BACKGROUND_MUSIC_SRC === 'undefined' ? null : BACKGROUND_MUSIC_SRC,
  backgroundMusic: typeof backgroundMusic === 'undefined' ? null : backgroundMusic,
  startMusic: typeof startMusic === 'function' ? startMusic : null,
  stopMusic: typeof stopMusic === 'function' ? stopMusic : null,
  praiseVoiceProfiles: typeof PRAISE_VOICE_PROFILES === 'undefined' ? null : PRAISE_VOICE_PROFILES,
  selectVoiceForRole: typeof selectVoiceForRole === 'function' ? selectVoiceForRole : null,
  selectVoiceForLanguage: typeof selectVoiceForLanguage === 'function' ? selectVoiceForLanguage : null,
  cacheSystemVoices: typeof cacheSystemVoices === 'function' ? cacheSystemVoices : null,
  createLearningUtterance: typeof createLearningUtterance === 'function' ? createLearningUtterance : null,
  createMeaningUtterance: typeof createMeaningUtterance === 'function' ? createMeaningUtterance : null,
  createLearningUtterances: typeof createLearningUtterances === 'function' ? createLearningUtterances : null,
  createPraiseUtterance: typeof createPraiseUtterance === 'function' ? createPraiseUtterance : null,
  gameState: state,
  gameView: typeof gameView === 'function' ? gameView : null,
  tileFaceHtml: typeof tileFaceHtml === 'function' ? tileFaceHtml : null,
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
  homeView: typeof homeView === 'function' ? homeView : null
};`;
vm.runInContext(source, context, { filename: 'app.js' });

const test = context.__gameTest;
if (!test.authView || !test.resetPasswordView) throw new Error('登录与密码恢复视图不完整');
if (test.gameState.view !== 'login') throw new Error('无有效令牌时应默认显示登录页');
test.gameState.view = 'login';
let authHtml = test.authView();
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
    equipped: 'lingling', inventory: { hint: 3, shuffle: 2, addMoves: 1 }, tutorials: { match3: false, pair: false }
  }
};
const home = test.homeView();
if (!home.includes('继续学习') || !home.includes('成长奖励')) throw new Error('首页没有区分学习和奖励入口');
if (home.indexOf('继续学习') > home.indexOf('成长奖励')) throw new Error('首页没有优先展示学习入口');
if (!home.includes('开始消除')) throw new Error('首页主学习按钮缺失');
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
  if (game.mode === 'match3' && game.board.some(tile => !Number.isInteger(tile.type) || !['en', 'zh', 'image'].includes(tile.face))) {
    throw new Error(`Level ${level} contains an invalid mixed-meaning tile`);
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
const image0 = { type: 0, face: 'image' };

if (!test.findMatchLines(boardWith([en0, en0, zh0])).length) throw new Error('英文与中文混合三连应可消除');
if (!test.findMatchLines(boardWith([en0, en0, image0])).length) throw new Error('英文与图片混合三连应可消除');
if (test.findMatchLines(boardWith([en0, en0, en0])).length) throw new Error('纯英文三连不应消除');
if (test.findMatchLines(boardWith([zh0, image0, zh0])).length) throw new Error('只有释义侧的三连不应消除');

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
if (!gameHtml.includes('tile-text') && !gameHtml.includes('tile-picture')) throw new Error('三消展示面没有渲染');
const minimumPictureCoverage = { 1: .78, 2: .75, 3: .30, 5: .45 };
for (const [grade, minimum] of Object.entries(minimumPictureCoverage)) {
  const words = context.window.TEXTBOOK_WORDS.grades[grade];
  const mapped = words.filter(word => test.visualForWord(word.word)).length;
  if (mapped / words.length < minimum) {
    throw new Error(`Grade ${grade} picture coverage too low: ${mapped}/${words.length}`);
  }
}

const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const tutorialCardRule = styles.match(/\.tutorial-card\{[^}]*\}/)?.[0] || '';
const tutorialPulseRule = styles.match(/@keyframes tutorial-pulse\{[\s\S]*?\}\}/)?.[0] || '';
if (!tutorialCardRule.includes('top:16px') || tutorialCardRule.includes('bottom:')) {
  throw new Error('教学说明卡必须固定在顶部，不能遮住棋盘目标');
}
if (tutorialPulseRule.includes('transform:')) {
  throw new Error('教学高亮动画不能移动可点击目标');
}

console.log('GAME_SMOKE=PASS levels=7 board=6x6 match3=PASS pair=PASS missions=PASS praise=PASS pictures=PASS rainbow=PASS audio=PASS tutorial=PASS coverage=PASS auth=PASS register-status=PASS');
