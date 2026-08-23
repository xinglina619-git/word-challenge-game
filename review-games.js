(function exposeReviewGames(root, factory) {
  const api = factory();
  root.ReviewGames = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : window, function createReviewGames() {
  'use strict';

  const SPECIAL_RATE = .08;
  const MIN_LEARNED_WORDS = 12;
  const REVIEW_MODES = Object.freeze(['spelling', 'falling']);
  const ALL_MODES = Object.freeze(['match3', 'pair', ...REVIEW_MODES]);

  function safeNumber(value, min = 0, max = 999999) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
  }

  function normalizeWord(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 50);
  }

  function normalizeLearnedWords(input = []) {
    const merged = new Map();
    (Array.isArray(input) ? input : []).slice(0, 2000).forEach(raw => {
      const item = typeof raw === 'string' ? { word: raw } : (raw || {});
      const word = normalizeWord(item.word);
      if (!word) return;
      const previous = merged.get(word);
      const normalized = {
        word,
        zh: String(item.zh || previous?.zh || '').trim().slice(0, 80),
        encounters: safeNumber(item.encounters ?? 1, 1, 9999),
        wrongCount: safeNumber(item.wrongCount, 0, 9999),
        reviewCount: safeNumber(item.reviewCount, 0, 9999),
        lastSeenAt: String(item.lastSeenAt || '').slice(0, 40),
        lastReviewedAt: String(item.lastReviewedAt || '').slice(0, 40)
      };
      if (previous) {
        normalized.encounters += previous.encounters;
        normalized.wrongCount += previous.wrongCount;
        normalized.reviewCount += previous.reviewCount;
        normalized.lastSeenAt = [previous.lastSeenAt, normalized.lastSeenAt].sort().at(-1) || '';
        normalized.lastReviewedAt = [previous.lastReviewedAt, normalized.lastReviewedAt].sort().at(-1) || '';
      }
      merged.set(word, normalized);
    });
    return [...merged.values()].slice(0, 1000);
  }

  function recordLearnedWord(input, rawWord, rawZh, result = 'correct', now = new Date().toISOString()) {
    const list = normalizeLearnedWords(input);
    const word = normalizeWord(rawWord);
    const zh = String(rawZh || '').trim().slice(0, 80);
    if (!word || !zh) return list;
    const existing = list.find(item => item.word === word);
    if (existing) {
      existing.zh = zh;
      existing.encounters += 1;
      if (result === 'wrong') existing.wrongCount += 1;
      if (result === 'review') existing.reviewCount += 1;
      existing.lastSeenAt = String(now || '').slice(0, 40);
      if (result === 'review') existing.lastReviewedAt = String(now || '').slice(0, 40);
    } else {
      list.push({
        word, zh, encounters: 1, wrongCount: result === 'wrong' ? 1 : 0,
        reviewCount: result === 'review' ? 1 : 0,
        lastSeenAt: String(now || '').slice(0, 40),
        lastReviewedAt: result === 'review' ? String(now || '').slice(0, 40) : ''
      });
    }
    return normalizeLearnedWords(list);
  }

  function normalizeReview(input = {}) {
    const assignments = {};
    Object.entries(input.assignments && typeof input.assignments === 'object' ? input.assignments : {}).slice(-100).forEach(([level, mode]) => {
      const safeLevel = Math.max(1, Math.min(100, Number(level) || 0));
      if (safeLevel && ALL_MODES.includes(mode)) assignments[String(safeLevel)] = mode;
    });
    return {
      assignments,
      lastSpecialLevel: safeNumber(input.lastSpecialLevel, 0, 100),
      counts: {
        spelling: safeNumber(input.counts?.spelling, 0, 10000),
        falling: safeNumber(input.counts?.falling, 0, 10000)
      },
      fallingTutorialDone: Boolean(input.fallingTutorialDone)
    };
  }

  function eligibleForSpecial(progress = {}, level) {
    const learned = normalizeLearnedWords(progress.learnedWords).filter(item => item.zh);
    const review = normalizeReview(progress.review);
    const safeLevel = Math.max(1, Math.min(100, Number(level) || 1));
    return learned.length >= MIN_LEARNED_WORDS && review.lastSpecialLevel !== safeLevel - 1;
  }

  function assignReviewMode(progress = {}, level, baseMode = 'match3', random = Math.random) {
    const safeLevel = Math.max(1, Math.min(100, Number(level) || 1));
    const fallback = ['match3', 'pair'].includes(baseMode) ? baseMode : 'match3';
    const review = normalizeReview(progress.review);
    const existing = review.assignments[String(safeLevel)];
    if (ALL_MODES.includes(existing)) return { mode: existing, review };
    let mode = fallback;
    if (eligibleForSpecial({ ...progress, review }, safeLevel) && Number(random()) < SPECIAL_RATE) {
      if (review.counts.spelling < review.counts.falling) mode = 'spelling';
      else if (review.counts.falling < review.counts.spelling) mode = 'falling';
      else mode = Number(random()) < .5 ? 'spelling' : 'falling';
      review.counts[mode] += 1;
      review.lastSpecialLevel = safeLevel;
    }
    review.assignments[String(safeLevel)] = mode;
    return { mode, review };
  }

  function selectReviewWords(input, count, random = Math.random) {
    return normalizeLearnedWords(input)
      .filter(item => item.word && item.zh)
      .map(item => ({ item, tie: Number(random()) || 0 }))
      .sort((a, b) => b.item.wrongCount - a.item.wrongCount
        || String(a.item.lastReviewedAt || '').localeCompare(String(b.item.lastReviewedAt || ''))
        || a.item.reviewCount - b.item.reviewCount
        || a.tie - b.tie)
      .slice(0, Math.max(0, Number(count) || 0))
      .map(entry => ({ ...entry.item }));
  }

  function buildMeaningChoices(target, entries, random = Math.random) {
    const correct = String(target?.zh || '').trim();
    const distractors = normalizeLearnedWords(entries)
      .filter(item => item.zh && item.zh !== correct)
      .map(item => item.zh)
      .filter((value, index, list) => list.indexOf(value) === index)
      .map(value => ({ value, tie: Number(random()) || 0 }))
      .sort((a, b) => a.tie - b.tie)
      .slice(0, 2)
      .map(item => item.value);
    const choices = [correct, ...distractors];
    while (choices.length < 3) choices.push(`其他释义${choices.length}`);
    return choices
      .map(value => ({ value, tie: Number(random()) || 0 }))
      .sort((a, b) => a.tie - b.tie)
      .map(item => item.value);
  }

  function shuffledLetters(word, random = Math.random) {
    return [...normalizeWord(word).replace(/[^a-z]/g, '')]
      .map((letter, index) => ({ letter, index, tie: Number(random()) || 0 }))
      .sort((a, b) => a.tie - b.tie || a.index - b.index)
      .map(({ letter, index }) => ({ letter, index }));
  }

  function fallDurationForGrade(grade) { return Number(grade) <= 2 ? 7000 : Number(grade) <= 4 ? 6000 : 5000; }
  function starsForSpelling(retryCount) { return Number(retryCount) <= 0 ? 3 : Number(retryCount) === 1 ? 2 : 1; }
  function starsForFalling(ratios = []) {
    const values = (Array.isArray(ratios) ? ratios : []).map(value => Math.max(0, Math.min(1, Number(value) || 0)));
    const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    return average >= .5 ? 3 : average >= .25 ? 2 : 1;
  }

  return Object.freeze({
    SPECIAL_RATE, MIN_LEARNED_WORDS, REVIEW_MODES, ALL_MODES,
    normalizeLearnedWords, recordLearnedWord, normalizeReview,
    eligibleForSpecial, assignReviewMode, selectReviewWords,
    buildMeaningChoices, shuffledLetters,
    fallDurationForGrade, starsForSpelling, starsForFalling
  });
});
