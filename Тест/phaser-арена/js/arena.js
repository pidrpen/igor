(function () {
  const ASSET = '../assets/';
  const W = 1280;
  const H = 720;

  const ABILITIES = [
    { id: 'jab', key: '1', name: 'Джаб', cost: 0, cd: 0, dmg: 15, kind: 'st' },
    { id: 'keg', key: '2', name: 'Удар бочонком', cost: 40, cd: 2, dmg: 20, splash: 8, kind: 'keg' },
    { id: 'breath', key: '3', name: 'Дыхание огня', cost: 30, cd: 3, dmg: 10, kind: 'all' },
    { id: 'kick', key: '4', name: 'Удар чёрного лотоса', cost: 0, cd: 2, dmg: 28, kind: 'st' }
  ];

  const HERO_MAX_HP = 200;
  const HERO_MAX_EN = 100;
  const EN_REGEN = 25;
  const DUMMY_MAX_HP = 90;
  const DUMMY_HIT = 12;

  function $(id) { return document.getElementById(id); }

  function setHint(text, kind) {
    const el = $('hint');
    if (!el) return;
    el.textContent = text;
    el.className = 'hint' + (kind ? ' ' + kind : '');
  }

  function bootError(msg) {
    const el = $('boot-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  if (typeof Phaser === 'undefined') {
    bootError('Phaser не загрузился. Нужен файл vendor/phaser.min.js и сервер, не file://.');
    return;
  }

  class ArenaScene extends Phaser.Scene {
    constructor() {
      super('arena');
    }

    preload() {
      const monk = ASSET + 'sprites/characters/monk_brew_nes/';
      const fx = ASSET + 'sprites/fx/';
      this.load.image('bg', ASSET + 'backgrounds/forge/gallery.png');
      this.load.image('idle', monk + 'idle_00.png');
      for (let i = 0; i < 5; i++) {
        const n = String(i).padStart(2, '0');
        this.load.image('jab_' + n, monk + 'jab_' + n + '.png');
        this.load.image('keg_' + n, monk + 'keg_' + n + '.png');
      }
      for (let i = 0; i < 3; i++) {
        this.load.image('breath_' + String(i).padStart(2, '0'), monk + 'breath_' + String(i).padStart(2, '0') + '.png');
      }
      for (let i = 0; i < 4; i++) {
        this.load.image('kick_' + String(i).padStart(2, '0'), monk + 'kick_' + String(i).padStart(2, '0') + '.png');
      }
      this.load.image('dummy', fx + 'dummy_spirit.png');
      this.load.image('keg_fly', fx + 'keg_fly.png');
      for (let i = 0; i < 5; i++) this.load.image('shard_' + i, fx + 'keg_shard_' + i + '.png');
      this.load.image('fire_jet', fx + 'fire_jet.png');
      this.load.image('fire_burst', fx + 'fire_burst.png');
    }

    create() {
      this.dummyCount = 5;
      this.busy = false;
      this.picked = null;
      this.over = false;

      const near = (Phaser.Textures.FilterMode && Phaser.Textures.FilterMode.NEAREST) || 1;
      this.textures.getTextureKeys().forEach((k) => {
        if (k !== '__DEFAULT' && k !== '__MISSING') this.textures.get(k).setFilter(near);
      });

      this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H).setDepth(0);
      this.add.rectangle(W / 2, H / 2, W, H, 0x05070c, 0.38).setDepth(1);
      this.add.ellipse(W * 0.5, H * 0.78, W * 0.92, 90, 0x000000, 0.35).setDepth(2);

      this.hero = this.add.sprite(W * 0.22, H * 0.64, 'idle').setDepth(20);
      this.hero.setScale(380 / 1024);
      this.heroShadow = this.add.ellipse(this.hero.x, this.hero.y + 108, 130, 24, 0x000000, 0.45).setDepth(19);

      this.anims.create({
        key: 'jab',
        frames: [0, 1, 2, 3, 4].map((i) => ({ key: 'jab_' + String(i).padStart(2, '0') })),
        frameRate: 8,
        repeat: 0
      });
      this.anims.create({
        key: 'kegpose',
        frames: [0, 1, 2].map((i) => ({ key: 'keg_' + String(i).padStart(2, '0') })),
        frameRate: 10,
        repeat: 0
      });
      this.anims.create({
        key: 'breath',
        frames: [0, 1, 2].map((i) => ({ key: 'breath_' + String(i).padStart(2, '0') })),
        frameRate: 6,
        repeat: 0
      });
      this.anims.create({
        key: 'kick',
        frames: [0, 1, 2, 3].map((i) => ({ key: 'kick_' + String(i).padStart(2, '0') })),
        frameRate: 8,
        repeat: 0
      });

      this.dummies = [];
      this.resetFight(false);

      this.input.on('gameobjectdown', (_ptr, obj) => {
        const unit = obj.getData('unit');
        if (unit) this.onDummyClick(unit);
      });

      this.input.keyboard.on('keydown', (ev) => {
        if (ev.key === 'Escape') {
          this.picked = null;
          this.refreshHud();
          if (!this.over && !this.busy) setHint('Сначала способность (клавиши 1–4), потом клик по духу. Автоудара нет.');
          return;
        }
        const ab = ABILITIES.find((a) => a.key === ev.key);
        if (ab) this.pickAbility(ab.id);
      });

      window.ArenaProto = this;
      this.refreshHud();
      setHint('Сначала способность (клавиши 1–4), потом клик по духу. Автоудара нет.');
      this.scale.refresh();
    }

    dummySlots(n) {
      if (n === 1) return [{ x: W * 0.70, y: H * 0.60 }];
      return [
        { x: W * 0.58, y: H * 0.52 },
        { x: W * 0.70, y: H * 0.46 },
        { x: W * 0.82, y: H * 0.54 },
        { x: W * 0.64, y: H * 0.68 },
        { x: W * 0.78, y: H * 0.70 }
      ];
    }

    spawnDummies(n) {
      this.dummies.forEach((d) => {
        d.sprite.destroy();
        d.shadow.destroy();
        d.barBg.destroy();
        d.barFg.destroy();
        d.label.destroy();
        if (d.ring) d.ring.destroy();
      });
      this.dummies = [];
      const slots = this.dummySlots(n);
      slots.forEach((p, i) => {
        const shadow = this.add.ellipse(p.x, p.y + 48, 78, 16, 0x000000, 0.4).setDepth(p.y - 1);
        const sprite = this.add.image(p.x, p.y, 'dummy').setDepth(p.y);
        sprite.setDisplaySize(190, 190);
        sprite.setInteractive({ useHandCursor: true });
        const barBg = this.add.rectangle(p.x, p.y - 78, 72, 8, 0x1b202b).setDepth(900);
        const barFg = this.add.rectangle(p.x - 36, p.y - 78, 72, 8, 0xc45c6a).setOrigin(0, 0.5).setDepth(901);
        const label = this.add.text(p.x, p.y - 92, '', {
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          color: '#eceef2'
        }).setOrigin(0.5, 1).setDepth(902);
        const ring = this.add.circle(p.x, p.y + 8, 52, 0x00c78c, 0).setStrokeStyle(2, 0xf0b429, 0).setDepth(p.y + 1);
        const unit = {
          id: i,
          sprite,
          shadow,
          barBg,
          barFg,
          label,
          ring,
          maxHp: DUMMY_MAX_HP,
          hp: DUMMY_MAX_HP,
          alive: true
        };
        sprite.setData('unit', unit);
        this.dummies.push(unit);
      });
    }

    resetFight(keepCount) {
      this.tweens.killAll();
      this.time.removeAllEvents();
      if (this.hero.anims) this.hero.anims.stop();
      this.hero.setTexture('idle').setScale(380 / 1024).clearTint();
      this.busy = false;
      this.picked = null;
      this.over = false;
      this.heroHp = HERO_MAX_HP;
      this.energy = HERO_MAX_EN;
      this.cds = { jab: 0, keg: 0, breath: 0, kick: 0 };
      if (!keepCount) this.dummyCount = this.dummyCount || 5;
      this.spawnDummies(this.dummyCount);
      this.refreshBars();
      this.refreshHud();
    }

    living() {
      return this.dummies.filter((d) => d.alive && d.hp > 0);
    }

    pickAbility(id) {
      if (this.busy || this.over) return;
      const ab = ABILITIES.find((a) => a.id === id);
      if (!ab) return;
      if (this.cds[ab.id] > 0) {
        setHint(ab.name + ': перезарядка ещё ' + this.cds[ab.id] + ' хода.', 'bad');
        return;
      }
      if (this.energy < ab.cost) {
        setHint(ab.name + ': нужно ' + ab.cost + ' энергии, сейчас ' + this.energy + '.', 'bad');
        return;
      }
      this.picked = ab;
      this.refreshHud();
      setHint(ab.name + ' выбрана. Кликни по духу.', 'wait');
    }

    onDummyClick(unit) {
      if (this.busy || this.over) return;
      if (!this.picked) {
        setHint('Сначала нажми способность внизу или клавишу 1–4.', 'wait');
        return;
      }
      if (!unit.alive) {
        setHint('Этот дух уже мёртв.', 'bad');
        return;
      }
      this.cast(this.picked, unit);
    }

    canPay(ab) {
      return this.energy >= ab.cost && this.cds[ab.id] <= 0;
    }

    playHero(animKey, hitAt, onHit, onDone) {
      const anim = this.anims.get(animKey);
      const rate = (anim && anim.frameRate) || 8;
      const totalMs = Math.round((((anim && anim.frames.length) || 4) / rate) * 1000) + 80;
      this.hero.play(animKey);
      this.hero.setScale(380 / 1024);
      let hit = false;
      let finished = false;
      const fireHit = () => {
        if (hit) return;
        hit = true;
        if (onHit) onHit();
      };
      const finish = () => {
        if (finished) return;
        finished = true;
        fireHit();
        this.hero.setTexture('idle').setScale(380 / 1024);
        if (onDone) onDone();
      };
      this.time.delayedCall(Math.round((hitAt / rate) * 1000), fireHit);
      this.hero.once('animationcomplete', finish);
      this.time.delayedCall(totalMs, finish);
    }

    flash(unit, color) {
      if (!unit || !unit.sprite) return;
      unit.sprite.setTint(color || 0xffe8c8);
      this.time.delayedCall(120, () => { if (unit.sprite) unit.sprite.clearTint(); });
    }

    floatText(x, y, text, color) {
      const t = this.add.text(x, y, text, {
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '20px',
        fontStyle: '700',
        color: color || '#ffe0b0'
      }).setOrigin(0.5).setDepth(1200);
      this.tweens.add({
        targets: t,
        y: y - 46,
        alpha: 0,
        duration: 720,
        ease: 'Quad.easeOut',
        onComplete: () => t.destroy()
      });
    }

    hurtDummy(unit, amount) {
      if (!unit.alive) return;
      unit.hp = Math.max(0, unit.hp - amount);
      this.floatText(unit.sprite.x, unit.sprite.y - 70, '−' + amount + ' т', '#ffd0a8');
      this.flash(unit, 0xffc8b0);
      this.refreshBars();
      if (unit.hp <= 0) this.killDummy(unit);
    }

    killDummy(unit) {
      unit.alive = false;
      unit.sprite.disableInteractive();
      this.tweens.add({
        targets: [unit.sprite, unit.shadow, unit.barBg, unit.barFg, unit.label, unit.ring],
        alpha: 0,
        y: '+=18',
        duration: 380,
        onComplete: () => {
          unit.sprite.setVisible(false);
        }
      });
    }

    hurtHero(amount) {
      this.heroHp = Math.max(0, this.heroHp - amount);
      this.floatText(this.hero.x, this.hero.y - 110, '−' + amount + ' т', '#ff8a8a');
      this.hero.setTint(0xff8888);
      this.time.delayedCall(140, () => this.hero.clearTint());
      this.refreshHud();
    }

    cast(ab, focus) {
      this.busy = true;
      this.picked = null;
      this.energy -= ab.cost;
      if (ab.cd > 0) this.cds[ab.id] = ab.cd;
      this.refreshHud();
      setHint(ab.name);

      const done = () => {
        if (this.checkEnd()) return;
        this.time.delayedCall(280, () => this.enemyTurn());
      };

      if (ab.id === 'jab') {
        this.playHero('jab', 2, () => this.hurtDummy(focus, ab.dmg), done);
        return;
      }
      if (ab.id === 'kick') {
        this.playHero('kick', 3, () => this.hurtDummy(focus, ab.dmg), done);
        return;
      }
      if (ab.id === 'keg') {
        this.playHero('kegpose', 2, () => this.flyKeg(focus, ab, done), null);
        return;
      }
      if (ab.id === 'breath') {
        this.playHero('breath', 2, () => this.sprayFire(ab, done), null);
        return;
      }
      done();
    }

    flyKeg(focus, ab, done) {
      const sx = this.hero.x + 54;
      const sy = this.hero.y - 18;
      const tx = focus.sprite.x;
      const ty = focus.sprite.y - 10;
      const keg = this.add.image(sx, sy, 'keg_fly').setDepth(800);
      keg.setDisplaySize(54, 72);
      this.tweens.add({
        targets: keg,
        x: tx,
        y: ty,
        angle: 220,
        duration: 460,
        ease: 'Quad.easeIn',
        onComplete: () => {
          keg.destroy();
          this.hurtDummy(focus, ab.dmg);
          const rest = this.living().filter((d) => d !== focus);
          rest.forEach((d, i) => {
            const sh = this.add.image(tx, ty, 'shard_' + (i % 5)).setDepth(801);
            sh.setDisplaySize(28, 28);
            this.tweens.add({
              targets: sh,
              x: d.sprite.x,
              y: d.sprite.y - 8,
              angle: 160,
              duration: 300,
              ease: 'Quad.easeOut',
              onComplete: () => {
                sh.destroy();
                this.hurtDummy(d, ab.splash);
              }
            });
          });
          this.time.delayedCall(rest.length ? 340 : 40, done);
        }
      });
    }

    sprayFire(ab, done) {
      const ox = this.hero.x + 48;
      const oy = this.hero.y - 22;
      const foes = this.living();
      if (!foes.length) { done(); return; }
      foes.forEach((d) => {
        const dx = d.sprite.x - ox;
        const dy = d.sprite.y - 8 - oy;
        const dist = Math.max(16, Math.hypot(dx, dy));
        const jet = this.add.image(ox, oy, 'fire_jet').setOrigin(0, 0.5).setDepth(790);
        jet.rotation = Math.atan2(dy, dx);
        jet.displayHeight = 22;
        jet.displayWidth = 8;
        this.tweens.add({
          targets: jet,
          displayWidth: dist,
          duration: 420,
          onComplete: () => {
            const burst = this.add.image(d.sprite.x, d.sprite.y - 8, 'fire_burst').setDepth(792);
            burst.setDisplaySize(70, 70);
            this.hurtDummy(d, ab.dmg);
            this.tweens.add({
              targets: [jet, burst],
              alpha: 0,
              duration: 240,
              delay: 120,
              onComplete: () => { jet.destroy(); burst.destroy(); }
            });
          }
        });
      });
      this.time.delayedCall(820, done);
    }

    enemyTurn() {
      if (this.checkEnd()) return;
      const foes = this.living();
      if (!foes.length) { this.checkEnd(); return; }
      const atk = foes[Math.floor(Math.random() * foes.length)];
      setHint('Ход духов.');
      const ox = atk.sprite.x;
      this.tweens.add({
        targets: atk.sprite,
        x: ox - 36,
        duration: 120,
        yoyo: true,
        onYoyo: () => this.hurtHero(DUMMY_HIT),
        onComplete: () => {
          if (this.checkEnd()) return;
          this.beginPlayerTurn();
        }
      });
    }

    beginPlayerTurn() {
      ABILITIES.forEach((ab) => {
        if (this.cds[ab.id] > 0) this.cds[ab.id] -= 1;
      });
      this.energy = Math.min(HERO_MAX_EN, this.energy + EN_REGEN);
      this.busy = false;
      this.refreshHud();
      setHint('Твой ход. Способность, потом клик по духу.');
    }

    checkEnd() {
      if (this.heroHp <= 0) {
        this.over = true;
        this.busy = false;
        this.refreshHud();
        setHint('Поражение. «Сначала» — новый заход.', 'bad');
        return true;
      }
      if (!this.living().length) {
        this.over = true;
        this.busy = false;
        this.refreshHud();
        setHint('Духи сняты. Цифры учебные, не кит Теста.', 'ok');
        return true;
      }
      return false;
    }

    refreshBars() {
      this.dummies.forEach((d) => {
        const w = 72 * (d.hp / d.maxHp);
        d.barFg.width = Math.max(0, w);
        d.label.setText(d.alive ? (d.hp + ' / ' + d.maxHp + ' HP') : '');
        const show = this.picked && d.alive;
        d.ring.setStrokeStyle(2, 0xf0b429, show ? 0.9 : 0);
      });
    }

    refreshHud() {
      this.refreshBars();
      const hpFill = $('hp-fill');
      const enFill = $('en-fill');
      const hpVal = $('hp-val');
      const enVal = $('en-val');
      if (hpFill) hpFill.style.width = (100 * this.heroHp / HERO_MAX_HP) + '%';
      if (enFill) enFill.style.width = (100 * this.energy / HERO_MAX_EN) + '%';
      if (hpVal) hpVal.textContent = this.heroHp + ' / ' + HERO_MAX_HP + ' HP';
      if (enVal) enVal.textContent = this.energy + ' / ' + HERO_MAX_EN + ' энергии';

      const box = $('abs');
      if (!box) return;
      box.innerHTML = ABILITIES.map((ab) => {
        const cd = this.cds[ab.id] || 0;
        const need = !this.canPay(ab);
        const on = this.picked && this.picked.id === ab.id;
        let meta = ab.dmg + ' т';
        if (ab.splash) meta += ' + ' + ab.splash + ' т область';
        if (ab.cost) meta += ' · ' + ab.cost + ' энергии';
        else meta += ' · бесплатно';
        if (cd > 0) meta = 'ещё ' + cd + ' хода';
        return (
          '<button type="button" class="ab' +
          (on ? ' on' : '') +
          (need ? ' is-disabled' : '') +
          (cd > 0 ? ' cd' : '') +
          '" data-ab="' + ab.id + '">' +
          '<span class="hk">' + ab.key + '</span>' +
          '<span class="nm">' + ab.name + '</span>' +
          '<span class="meta">' + meta + '</span>' +
          '</button>'
        );
      }).join('');
      box.querySelectorAll('.ab').forEach((btn) => {
        btn.addEventListener('click', () => this.pickAbility(btn.getAttribute('data-ab')));
      });
    }

    setDummyCount(n) {
      this.dummyCount = n === 1 ? 1 : 5;
      this.resetFight(true);
      setHint(this.dummyCount === 1 ? 'Один дух. Способность, потом клик.' : 'Пять духов. Бочонок бьёт фокус, осколки — остальных.');
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#050608',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: ArenaScene
  });

  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('on', b === btn));
      const n = +btn.getAttribute('data-n');
      if (window.ArenaProto) window.ArenaProto.setDummyCount(n);
    });
  });
  $('btn-reset')?.addEventListener('click', () => {
    if (window.ArenaProto) {
      window.ArenaProto.resetFight(true);
      setHint('Сначала способность (клавиши 1–4), потом клик по духу. Автоудара нет.');
    }
  });

  window.addEventListener('error', (ev) => {
    if (!window.ArenaProto) bootError('Ошибка загрузки: ' + (ev.message || 'неизвестно'));
  });

  return game;
})();
