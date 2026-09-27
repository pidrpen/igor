/* systems/card-deck: режим «Колода» (только Тест, 5.4.9.42В)
 *
 * Способности героя, за которого ходишь, приходят картами из колоды его кита.
 * Рука 5, в начале каждого твоего хода добор до 5. Сыгранная карта — в сброс,
 * колода кончилась — сброс тасуется обратно. Раз за бой можно сбросить руку.
 * Прерывание и Провокация всегда под рукой (не в колоде).
 * Авто-союзники (partyAiAct) играют полным китом — колода их не касается.
 * Колода живёт один бой (объект combat), цифры способностей не меняются.
 */
  const DECK_MODE_KEY = 'igorDeckMode_v1';
  const DECK_HAND = 5;
  const DECK_MULLIGANS = 1;

  function deckModeOn() {
    try { return localStorage.getItem(DECK_MODE_KEY) === '1'; } catch (_) { return false; }
  }
  function setDeckMode(on) {
    try { localStorage.setItem(DECK_MODE_KEY, on ? '1' : '0'); } catch (_) {}
  }

  /** Всегда под рукой: прерывание и Провокация. */
  function deckAlwaysInHand(ab) {
    if (!ab) return false;
    if (ab.type === 'interrupt' || ab.type === 'taunt' || ab.id === 'taunt') return true;
    if (typeof INTERRUPT_IDS !== 'undefined' && INTERRUPT_IDS.has(ab.id)) return true;
    if (typeof isKickAbility === 'function') {
      try { if (isKickAbility(ab)) return true; } catch (_) {}
    }
    return false;
  }

  /** Сколько копий карты в колоде: частые кнопки чаще, большие откаты по одной. */
  function deckCopies(ab) {
    const cd = Number(ab.baseCd != null ? ab.baseCd : ab.cd) || 0;
    if (cd <= 1) return 3;
    if (cd <= 3) return 2;
    return 1;
  }

  function deckShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function deckOf(actor) {
    if (!combat || !actor || !actor.uid) return null;
    if (!combat._decks) combat._decks = {};
    return combat._decks[actor.uid] || null;
  }

  function buildDeck(actor) {
    const ids = [];
    (actor.abilities || []).forEach((ab) => {
      if (!ab || !ab.id || deckAlwaysInHand(ab)) return;
      for (let i = 0; i < deckCopies(ab); i++) ids.push(ab.id);
    });
    const d = { draw: deckShuffle(ids), hand: [], discard: [], mulligans: DECK_MULLIGANS, turn: -1 };
    combat._decks[actor.uid] = d;
    return d;
  }

  function deckDrawOne(d) {
    if (!d.draw.length) {
      if (!d.discard.length) return false;
      d.draw = deckShuffle(d.discard);
      d.discard = [];
    }
    d.hand.push(d.draw.pop());
    return true;
  }

  function deckFill(d) {
    let guard = 40;
    while (d.hand.length < DECK_HAND && guard-- > 0) {
      if (!deckDrawOne(d)) break;
    }
  }

  /** Колода включена для этого героя: режим в лобби, наш герой, ходим им сами. */
  function deckActiveFor(actor) {
    if (!deckModeOn() || !combat || !actor) return false;
    if (actor.side !== 'ally' || actor.isPet) return false;
    return !!(combat.waitingPlayer || deckOf(actor));
  }

  /** Начало твоего хода: добор до 5 (первый раз — сборка колоды). */
  function deckStartTurn(actor) {
    if (!deckModeOn() || !combat || !actor || actor.side !== 'ally' || actor.isPet) return;
    if (!combat._decks) combat._decks = {};
    const d = deckOf(actor) || buildDeck(actor);
    const turnKey = (combat.round || 0) + ':' + (combat.turnIndex != null ? combat.turnIndex : '');
    if (d.turn === turnKey) return;
    d.turn = turnKey;
    deckFill(d);
  }

  /** Что показывать на панели: рука (без повторов, с числом копий) + всегда-под-рукой. */
  function deckHandAbilities(actor) {
    const d = deckOf(actor);
    const all = actor.abilities || [];
    if (!d) return null;
    const byId = {};
    all.forEach((a) => { if (a && a.id && !byId[a.id]) byId[a.id] = a; });
    const seen = new Set();
    const out = [];
    d.hand.forEach((id) => {
      if (seen.has(id) || !byId[id]) return;
      seen.add(id);
      out.push(byId[id]);
    });
    all.forEach((a) => { if (a && deckAlwaysInHand(a) && !seen.has(a.id)) { seen.add(a.id); out.push(a); } });
    return out;
  }

  function deckCopiesInHand(actor, abId) {
    const d = deckOf(actor);
    if (!d) return 0;
    return d.hand.filter((id) => id === abId).length;
  }

  /** Сыграл карту — одна копия уходит в сброс. Всегда-под-рукой не тратятся. */
  function deckOnCast(actor, ability) {
    if (!combat || !ability) return;
    const d = deckOf(actor);
    if (!d || deckAlwaysInHand(ability)) return;
    const i = d.hand.indexOf(ability.id);
    if (i < 0) return;
    d.hand.splice(i, 1);
    d.discard.push(ability.id);
  }

  /** Раз за бой: вся рука в сброс, новые 5. Хода не тратит. */
  function deckMulligan(actor) {
    const d = deckOf(actor);
    if (!d || d.mulligans <= 0) return false;
    d.mulligans -= 1;
    d.discard.push(...d.hand);
    d.hand = [];
    deckFill(d);
    return true;
  }

  function deckInfo(actor) {
    const d = deckOf(actor);
    if (!d) return null;
    return { draw: d.draw.length, discard: d.discard.length, mulligans: d.mulligans };
  }
