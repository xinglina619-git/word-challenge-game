# Spirit Audio System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every spirit a unique offline background theme and separate childlike learning and praise voice channels.

**Architecture:** Keep the existing browser-only Web Audio and SpeechSynthesis stack. Add pure configuration/selectors that can be smoke-tested, then route music scheduling and speech playback through those selectors.

**Tech Stack:** Vanilla JavaScript, Web Audio API, SpeechSynthesis API, Node.js VM smoke tests.

## Global Constraints

- No external network or paid audio service.
- Preserve the existing music on/off preference.
- Praise speech must be selected independently from learning-word speech.
- All eight spirits and all six praise levels require explicit configurations.

---

### Task 1: Audio configuration contracts

**Files:**
- Modify: `app.js`
- Test: `scripts/smoke_game.js`

**Interfaces:**
- Produces: `SPIRIT_MUSIC_THEMES`, `PRAISE_VOICE_PROFILES`, `musicThemeForSpirit(id)`.

- [ ] Add failing smoke assertions for eight unique spirit themes and six praise profiles.
- [ ] Run `node scripts/smoke_game.js` and confirm failure because the configuration does not exist.
- [ ] Add all theme/profile objects and pure lookup helpers.
- [ ] Run `node scripts/smoke_game.js` and confirm the assertions pass.

### Task 2: Spirit-aware music scheduler

**Files:**
- Modify: `app.js`
- Test: `scripts/smoke_game.js`

**Interfaces:**
- Consumes: `musicThemeForSpirit(id)`.
- Produces: `scheduleMusic(themeId)`, `restartMusicForSpirit(id)`, `currentMusicThemeId`.

- [ ] Add a failing test that `lingling` and `bubble` resolve to different beats and melodies.
- [ ] Replace the single fixed melody with the selected spirit theme.
- [ ] Track scheduled BGM oscillator nodes separately from sound effects and stop them during a theme change.
- [ ] Call `restartMusicForSpirit(id)` after a successful partner change.
- [ ] Verify the music preference remains off when disabled.

### Task 3: Independent cartoon voice roles

**Files:**
- Modify: `app.js`
- Test: `scripts/smoke_game.js`

**Interfaces:**
- Produces: `selectVoiceForRole(voices, role, excludedURI)`, `createLearningUtterance(word)`, `createPraiseUtterance(praise)`.

- [ ] Add fake English voices to the smoke test and assert learning and praise select different voice URIs.
- [ ] Add a failing assertion for distinct praise parameters.
- [ ] Implement child/youth-name preference and a different fallback order for each role.
- [ ] Route `speakWord` and `speakWords` through the learning role.
- [ ] Route `playPraise` through the praise role without calling the learning playback helper.
- [ ] Add a distinct Web Audio chime for each praise level.

### Task 4: Browser and regression verification

**Files:**
- Modify: `index.html`
- Test: `scripts/smoke_game.js`

**Interfaces:**
- Consumes all prior audio functions.

- [ ] Bump the `app.js` cache version.
- [ ] Run `node --check app.js`.
- [ ] Run `node scripts/smoke_game.js`.
- [ ] In a browser, equip two owned spirits and verify `currentMusicThemeId` changes while one BGM timer remains active.
- [ ] Trigger a match and verify learning and praise utterances have different roles/voice URIs where multiple system voices exist.
- [ ] Confirm the browser console has no errors.

