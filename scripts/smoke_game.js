const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = {
  console,
  window: {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: {
    querySelector: () => ({ innerHTML: '' }),
    addEventListener: () => {}
  },
  SpeechSynthesisUtterance: class SpeechSynthesisUtterance {
    constructor(text) { this.text = text; }
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
  newGame, findMatchLines, possibleMoves, expandedRemoval, gradeFor, wordsForLevel,
  modeForLevel, missionForLevel, praiseForEffect, visualForWord, memoryInline,
  visualForPairWord: typeof visualForPairWord === 'function' ? visualForPairWord : null,
  spiritMusicThemes: typeof SPIRIT_MUSIC_THEMES === 'undefined' ? null : SPIRIT_MUSIC_THEMES,
  praiseVoiceProfiles: typeof PRAISE_VOICE_PROFILES === 'undefined' ? null : PRAISE_VOICE_PROFILES,
  musicThemeForSpirit: typeof musicThemeForSpirit === 'function' ? musicThemeForSpirit : null,
  selectVoiceForRole: typeof selectVoiceForRole === 'function' ? selectVoiceForRole : null,
  cacheSystemVoices: typeof cacheSystemVoices === 'function' ? cacheSystemVoices : null,
  createLearningUtterance: typeof createLearningUtterance === 'function' ? createLearningUtterance : null,
  createPraiseUtterance: typeof createPraiseUtterance === 'function' ? createPraiseUtterance : null
};`;
vm.runInContext(source, context, { filename: 'app.js' });

const test = context.__gameTest;
const spiritIds = ['lingling', 'sprout', 'bubble', 'candy', 'spark', 'cloud', 'moon', 'rainbow'];
if (!test.spiritMusicThemes || !test.musicThemeForSpirit) throw new Error('Spirit music themes are not configured');
const themeSignatures = spiritIds.map(id => {
  const theme = test.musicThemeForSpirit(id);
  if (!theme?.melody?.length || !theme?.bass?.length || !theme?.beat || !theme?.loopMs) throw new Error(`Spirit "${id}" has an incomplete music theme`);
  return `${theme.beat}|${theme.wave}|${theme.melody.join(',')}|${theme.bass.join(',')}`;
});
if (new Set(themeSignatures).size !== spiritIds.length) throw new Error('Each spirit must have a distinct music theme');
const praiseWords = ['GOOD', 'GREAT', 'EXCELLENT', 'AMAZING', 'UNBELIEVABLE', 'BONUS TIME'];
if (!test.praiseVoiceProfiles || praiseWords.some(word => !test.praiseVoiceProfiles[word])) throw new Error('Praise voice profiles are incomplete');
for (const word of praiseWords) {
  if (test.praiseVoiceProfiles[word].cheerBursts < 2) throw new Error(`Praise cheer layer is incomplete for "${word}"`);
}
if (!test.selectVoiceForRole) throw new Error('Independent learning/praise voice selection is missing');
const fakeVoices = [
  { name: 'Microsoft Ana Online', lang: 'en-US', voiceURI: 'voice-learning' },
  { name: 'Microsoft Zira Desktop', lang: 'en-US', voiceURI: 'voice-praise' }
];
const learningVoice = test.selectVoiceForRole(fakeVoices, 'learning');
const praiseVoice = test.selectVoiceForRole(fakeVoices, 'praise', learningVoice?.voiceURI);
if (!learningVoice || !praiseVoice || learningVoice.voiceURI === praiseVoice.voiceURI) throw new Error('Learning and praise must select separate system voices');
if (!test.createLearningUtterance || !test.createPraiseUtterance) throw new Error('Independent learning/praise utterance builders are missing');
const learningLine = test.createLearningUtterance('dance', fakeVoices);
const praiseLine = test.createPraiseUtterance('AMAZING', learningLine.voice?.voiceURI, fakeVoices);
if (learningLine.voiceRole !== 'learning' || praiseLine.voiceRole !== 'praise') throw new Error('Speech roles are not separated');
if (!learningLine.voice || !praiseLine.voice || learningLine.voice.voiceURI === praiseLine.voice.voiceURI) throw new Error('Learning and praise utterances use the same system voice');
if (learningLine.pitch === praiseLine.pitch && learningLine.rate === praiseLine.rate) throw new Error('Cartoon praise profile must differ from learning pronunciation');
if (!praiseLine.text.endsWith('!')) throw new Error('Praise utterance must use an enthusiastic exclamation');
if (!test.cacheSystemVoices) throw new Error('System voice cache is missing');
test.cacheSystemVoices(fakeVoices);
const cachedLearningLine = test.createLearningUtterance('dance', []);
const cachedPraiseLine = test.createPraiseUtterance('AMAZING', cachedLearningLine.voice?.voiceURI, []);
if (!cachedLearningLine.voice || !cachedPraiseLine.voice || cachedLearningLine.voice.voiceURI === cachedPraiseLine.voice.voiceURI) {
  throw new Error('Voice cache does not keep learning and praise voices separate when getVoices() is initially empty');
}
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
  if (game.mode === 'pair' && (!game.target?.word || !game.target?.zh)) throw new Error(`Level ${level} pair target is invalid`);
  if (game.mode === 'match3' && (!game.scoreGoal || game.target !== null)) throw new Error(`Level ${level} score-mode setup is invalid`);
}

const board = Array.from({ length: 36 }, (_, index) => index % 6);
board[0] = 2;
board[1] = 2;
board[2] = 2;
const lines = test.findMatchLines(board);
if (!lines.some(line => line.includes(0) && line.length >= 3)) throw new Error('Three-match detection failed');

const five = test.expandedRemoval([[0, 1, 2, 3, 4]], board);
if (five.special !== 'rainbow') throw new Error('Five-match rainbow effect failed');

const matchGame = test.newGame(2);
const pairGame = test.newGame(3);
if (matchGame.mode !== 'match3' || pairGame.mode !== 'pair') throw new Error('Alternating game modes failed');
if (pairGame.pairs.length !== pairGame.words.length * 2) throw new Error('Pair-card generation failed');
if (test.missionForLevel(5).type !== 'treasure' || test.missionForLevel(10).type !== 'boss') throw new Error('Mission cadence failed');
if (test.praiseForEffect('pop', 3, 1) !== 'GOOD' || test.praiseForEffect('rocket', 8, 2) !== 'AMAZING' || test.praiseForEffect('rainbow', 12, 4) !== 'UNBELIEVABLE' || test.praiseForEffect('coin-burst', 9, 5) !== 'BONUS TIME') throw new Error('Praise intensity ladder failed');
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
const memorySlot = test.memoryInline({ mode: 'match3', memoryWords: [{ word: 'dance', zh: '跳舞' }] });
const pairMemorySlot = test.memoryInline({ mode: 'pair', memoryWords: [{ word: 'dance', zh: '跳舞' }] });
if (!memorySlot.includes('target-memory-slot') || !memorySlot.includes('本次学习词') || !memorySlot.includes('dance') || !memorySlot.includes('跳舞')) {
  throw new Error('Latest eliminated word is not rendered in the target-card memory slot');
}
if (!pairMemorySlot.includes('target-memory-slot') || !pairMemorySlot.includes('本次学习词') || !pairMemorySlot.includes('dance') || !pairMemorySlot.includes('跳舞')) {
  throw new Error('Latest paired word is not rendered in the target-card memory slot');
}
const minimumPictureCoverage = { 1: .78, 2: .75, 3: .30, 5: .45 };
for (const [grade, minimum] of Object.entries(minimumPictureCoverage)) {
  const words = context.window.TEXTBOOK_WORDS.grades[grade];
  const mapped = words.filter(word => test.visualForWord(word.word)).length;
  if (mapped / words.length < minimum) {
    throw new Error(`Grade ${grade} picture coverage too low: ${mapped}/${words.length}`);
  }
}

console.log('GAME_SMOKE=PASS levels=7 board=6x6 match3=PASS pair=PASS missions=PASS praise=PASS pictures=PASS rainbow=PASS');
