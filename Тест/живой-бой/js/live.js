(function () {
  const ASSET = '../assets/';
  const W = 1280;
  const H = 720;

  const ABILITIES = [
    { id: 'jab', key: '1', name: 'Джаб', cost: 0, cd: 0.45, dmg: 15, range: 120, kind: 'melee', anim: 'jab', hitAt: 2 },
    { id: 'keg', key: '2', name: 'Удар бочонком', cost: 40, cd: 3, dmg: 20, range: 460, kind: 'keg', anim: 'kegpose', hitAt: 2 },
    { id: 'breath', key: '3', name: 'Дыхание огня', cost: 30, cd: 4, dmg: 12, range: 300, kind: 'breath', anim: 'breath', hitAt: 2 },
    { id: 'kick', key: '4', name: 'Удар чёрного лотоса', cost: 0, cd: 2, dmg: 28, range: 128, kind: 'melee', anim: 'kick', hitAt: 3 }
  ];

  const HERO_MAX_HP = 200;
  const HERO_MAX_EN = 100;
  const EN_REGEN = 22;
  const HERO_SPEED = 210;
  const PALA_MAX_HP = 260;
  const PALA_HIT = 16;
  const PALA_SPEED = 88;
  const PALA_RANGE = 118;
  const PALA_CD = 1.65;

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
    bootError('Phaser не загрузился. Нужен ../phaser-арена/vendor/phaser.min.js и сервер, не file://.');
    return;
  }

  class LiveScene extends Phaser.Scene {
    constructor() {
      super('live');
    }

    preload() {
      const monk = ASSET + 'sprites/characters/monk_brew_nes/';
      const pala = ASSET + 'sprites/characters/paladin_protection/';
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
      this.load.image('pala_idle', pala + 'idle_00.png');
      for (let i = 0; i < 6; i++) {
        this.load.image('pala_atk_' + String(i).padStart(2, '0'), pala + 'attack_' + String(i).padStart(2, '0') + '.png');
      }
      this.load.image('keg_fly', fx + 'keg_fly.png');
      this.load.image('fire_jet', fx + 'fire_jet.png');
      this.load.image('fire_burst', fx + 'fire_burst.png');
    }

    create() {
      const near = (Phaser.Textures.FilterMode && Phaser.Textures.FilterMode.NEAREST) || 1;
      this.textures.getTextureKeys().forEach((k) => {
        if (k !== '__DEFAULT' && k !== '__MISSING') this.textures.get(k).setFilter(near);
      });

      this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H).setDepth(0);
      this.add.rectangle(W / 2, H / 2, W, H, 0x05070c, 0.42).setDepth(1);
      this.add.ellipse(W * 0.5, H * 0.78, W * 0.92, 90, 0x000000, 0.38).setDepth(2);

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
      this.anims.create({
        key: 'pala_attack',
        frames: [0, 1, 2, 3, 4, 5].map((i) => ({ key: 'pala_atk_' + String(i).padStart(2, '0') })),
        frameRate: 11,
        repeat: 0
      });

      this.hero = this.add.sprite(W * 0.28, H * 0.64, 'idle').setDepth(20);
      this.hero.setScale(380 / 1024);
      this.heroShadow = this.add.ellipse(this.hero.x, this.hero.y + 108, 130, 24, 0x000000, 0.45).setDepth(19);

      this.pala = this.add.sprite(W * 0.74, H * 0.60, 'pala_idle').setDepth(20);
      this.pala.setDisplaySize(236, 236);
      this.pala.setFlipX(true);
      this.palaShadow = this.add.ellipse(this.pala.x, this.pala.y + 96, 120, 22, 0x000000, 0.45).setDepth(19);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');

      this.input.keyboard.on('keydown', (ev) => {
        const ab = ABILITIES.find((a) => a.key === ev.key);
        if (ab) this.tryCast(ab.id);
      });

      window.LiveProto = this;
      this.resetFight();
      this.scale.refresh();
    }

    resetFight() {
      this.tweens.killAll();
      this.time.removeAllEvents();
      if (this.hero.anims) this.hero.anims.stop();
      if (this.pala.anims) this.pala.anims.stop();
      this.hero.setTexture('idle').setScale(380 / 1024).clearTint().setFlipX(false);
      this.pala.setTexture('pala_idle').setDisplaySize(236, 236).clearTint().setFlipX(true);
      this.hero.setPosition(W * 0.28, H * 0.64);
      this.pala.setPosition(W * 0.74, H * 0.60);
      this.over = false;
      this.heroBusy = false;
      this.palaBusy = false;
      this.heroHp = HERO_MAX_HP;
      this.energy = HERO_MAX_EN;
      this.palaHp = PALA_MAX_HP;
      this.palaCd = 0.4;
      this.cds = { jab: 0, keg: 0, breath: 0, kick: 0 };
      this.hudDirty = true;
      this.syncFollowers();
      this.refreshHud();
      setHint('WASD или стрелки — ходить. 1–4 — ударить сразу, без второго клика.');
    }

    clampPos(spr, padX, padY) {
      spr.x = Phaser.Math.Clamp(spr.x, padX, W - padX);
      spr.y = Phaser.Math.Clamp(spr.y, padY, H - padY);
    }

    dist() {
      return Phaser.Math.Distance.Between(this.hero.x, this.hero.y, this.pala.x, this.pala.y);
    }

    faceEachOther() {
      this.hero.setFlipX(this.pala.x < this.hero.x);
      this.pala.setFlipX(this.hero.x < this.pala.x);
    }

    syncFollowers() {
      this.heroShadow.setPosition(this.hero.x, this.hero.y + 108);
      this.palaShadow.setPosition(this.pala.x, this.pala.y + 96);
      this.hero.setDepth(10 + this.hero.y);
      this.pala.setDepth(10 + this.pala.y);
      this.heroShadow.setDepth(this.hero.depth - 1);
      this.palaShadow.setDepth(this.pala.depth - 1);
    }

    canPay(ab) {
      return this.energy >= ab.cost && (this.cds[ab.id] || 0) <= 0;
    }

    tryCast(id) {
      if (this.over || this.heroBusy) return;
      const ab = ABILITIES.find((a) => a.id === id);
      if (!ab) return;
      if ((this.cds[ab.id] || 0) > 0) {
        setHint(ab.name + ': ещё ' + this.cds[ab.id].toFixed(1) + ' с.', 'wait');
        return;
      }
      if (this.energy < ab.cost) {
        setHint(ab.name + ': нужно ' + ab.cost + ' энергии, сейчас ' + Math.floor(this.energy) + '.', 'bad');
        return;
      }
      if (this.palaHp <= 0) return;
      if (this.dist() > ab.range) {
        setHint(ab.name + ': далеко. Подойди.', 'wait');
        return;
      }
      this.energy -= ab.cost;
      this.cds[ab.id] = ab.cd;
      this.heroBusy = true;
      this.faceEachOther();
      this.hudDirty = true;
      setHint(ab.name);

      const done = () => {
        this.heroBusy = false;
        if (!this.over) this.hero.setTexture('idle').setScale(380 / 1024);
        this.checkEnd();
      };

      if (ab.kind === 'melee') {
        this.playHero(ab.anim, ab.hitAt, () => this.hurtPala(ab.dmg), done);
        return;
      }
      if (ab.kind === 'keg') {
        this.playHero(ab.anim, ab.hitAt, () => this.flyKeg(ab, done), null);
        return;
      }
      if (ab.kind === 'breath') {
        this.playHero(ab.anim, ab.hitAt, () => this.sprayFire(ab, done), null);
        return;
      }
      done();
    }

    playHero(animKey, hitAt, onHit, onDone) {
      const anim = this.anims.get(animKey);
      const rate = (anim && anim.frameRate) || 8;
      const totalMs = Math.round((((anim && anim.frames.length) || 4) / rate) * 1000) + 60;
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
        if (onDone) onDone();
      };
      this.time.delayedCall(Math.round((hitAt / rate) * 1000), fireHit);
      this.hero.once('animationcomplete', finish);
      this.time.delayedCall(totalMs, finish);
    }

    playPalaAttack() {
      if (this.palaBusy || this.over || this.palaHp <= 0) return;
      this.palaBusy = true;
      this.palaCd = PALA_CD;
      this.faceEachOther();
      const anim = this.anims.get('pala_attack');
      const rate = (anim && anim.frameRate) || 11;
      const totalMs = Math.round((((anim && anim.frames.length) || 6) / rate) * 1000) + 40;
      this.pala.play('pala_attack');
      this.pala.setDisplaySize(236, 236);
      let hit = false;
      const fireHit = () => {
        if (hit || this.over) return;
        hit = true;
        if (this.dist() <= PALA_RANGE + 18) this.hurtHero(PALA_HIT);
      };
      const finish = () => {
        this.palaBusy = false;
        if (!this.over && this.palaHp > 0) {
          this.pala.setTexture('pala_idle');
          this.pala.setDisplaySize(236, 236);
        }
      };
      this.time.delayedCall(Math.round((3 / rate) * 1000), fireHit);
      this.pala.once('animationcomplete', finish);
      this.time.delayedCall(totalMs, finish);
    }

    flyKeg(ab, done) {
      const dir = this.pala.x >= this.hero.x ? 1 : -1;
      const sx = this.hero.x + 54 * dir;
      const sy = this.hero.y - 18;
      const keg = this.add.image(sx, sy, 'keg_fly').setDepth(800);
      keg.setDisplaySize(54, 72);
      this.tweens.add({
        targets: keg,
        x: this.pala.x,
        y: this.pala.y - 10,
        angle: 220,
        duration: 420,
        ease: 'Quad.easeIn',
        onComplete: () => {
          keg.destroy();
          this.hurtPala(ab.dmg);
          this.time.delayedCall(40, done);
        }
      });
    }

    sprayFire(ab, done) {
      const dir = this.pala.x >= this.hero.x ? 1 : -1;
      const ox = this.hero.x + 48 * dir;
      const oy = this.hero.y - 22;
      const tx = this.pala.x;
      const ty = this.pala.y - 8;
      const dx = tx - ox;
      const dy = ty - oy;
      const dist = Math.max(16, Math.hypot(dx, dy));
      const jet = this.add.image(ox, oy, 'fire_jet').setOrigin(0, 0.5).setDepth(790);
      jet.rotation = Math.atan2(dy, dx);
      jet.displayHeight = 22;
      jet.displayWidth = 8;
      this.tweens.add({
        targets: jet,
        displayWidth: dist,
        duration: 380,
        onComplete: () => {
          const burst = this.add.image(tx, ty, 'fire_burst').setDepth(792);
          burst.setDisplaySize(70, 70);
          this.hurtPala(ab.dmg);
          this.tweens.add({
            targets: [jet, burst],
            alpha: 0,
            duration: 220,
            delay: 80,
            onComplete: () => { jet.destroy(); burst.destroy(); }
          });
        }
      });
      this.time.delayedCall(720, done);
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

    hurtPala(amount) {
      if (this.palaHp <= 0) return;
      this.palaHp = Math.max(0, this.palaHp - amount);
      this.floatText(this.pala.x, this.pala.y - 88, '−' + amount + ' т', '#ffd0a8');
      this.pala.setTint(0xffc8b0);
      this.time.delayedCall(120, () => { if (this.pala) this.pala.clearTint(); });
      this.hudDirty = true;
      this.refreshHud();
      if (this.palaHp <= 0) this.killPala();
    }

    hurtHero(amount) {
      if (this.heroHp <= 0) return;
      this.heroHp = Math.max(0, this.heroHp - amount);
      this.floatText(this.hero.x, this.hero.y - 110, '−' + amount + ' т', '#ff8a8a');
      this.hero.setTint(0xff8888);
      this.time.delayedCall(140, () => { if (this.hero) this.hero.clearTint(); });
      this.hudDirty = true;
      this.refreshHud();
      this.checkEnd();
    }

    killPala() {
      this.palaBusy = true;
      this.tweens.add({
        targets: [this.pala, this.palaShadow],
        alpha: 0.2,
        y: '+=16',
        duration: 420
      });
      this.checkEnd();
    }

    checkEnd() {
      if (this.over) return true;
      if (this.heroHp <= 0) {
        this.over = true;
        this.heroBusy = false;
        this.refreshHud();
        setHint('Поражение. «Сначала» — новый заход.', 'bad');
        return true;
      }
      if (this.palaHp <= 0) {
        this.over = true;
        this.heroBusy = false;
        this.refreshHud();
        setHint('Паладин снят. Цифры учебные, не кит Теста.', 'ok');
        return true;
      }
      return false;
    }

    refreshHud() {
      const hpFill = $('hp-fill');
      const enFill = $('en-fill');
      const hpVal = $('hp-val');
      const enVal = $('en-val');
      const palaFill = $('pala-hp-fill');
      const palaVal = $('pala-hp-val');
      if (hpFill) hpFill.style.width = (100 * this.heroHp / HERO_MAX_HP) + '%';
      if (enFill) enFill.style.width = (100 * this.energy / HERO_MAX_EN) + '%';
      if (hpVal) hpVal.textContent = Math.round(this.heroHp) + ' / ' + HERO_MAX_HP + ' HP';
      if (enVal) enVal.textContent = Math.round(this.energy) + ' / ' + HERO_MAX_EN + ' энергии';
      if (palaFill) palaFill.style.width = (100 * this.palaHp / PALA_MAX_HP) + '%';
      if (palaVal) palaVal.textContent = Math.round(this.palaHp) + ' / ' + PALA_MAX_HP + ' HP';

      const box = $('abs');
      if (!box) return;
      const sig = ABILITIES.map((ab) => {
        const cd = this.cds[ab.id] || 0;
        return ab.id + ':' + (this.canPay(ab) ? 1 : 0) + ':' + (cd > 0 ? cd.toFixed(1) : '0');
      }).join('|') + (this.heroBusy ? ':b' : '') + (this.over ? ':o' : '');
      if (box.dataset.sig === sig) return;
      box.dataset.sig = sig;
      box.innerHTML = ABILITIES.map((ab) => {
        const cd = this.cds[ab.id] || 0;
        const need = this.over || !this.canPay(ab);
        let meta = ab.dmg + ' т';
        if (ab.cost) meta += ' · ' + ab.cost + ' энергии';
        else meta += ' · бесплатно';
        if (cd > 0) meta = 'ещё ' + cd.toFixed(1) + ' с';
        return (
          '<button type="button" class="ab' +
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
        btn.addEventListener('click', () => this.tryCast(btn.getAttribute('data-ab')));
      });
    }

    update(_time, delta) {
      const dt = Math.min(0.05, (delta || 16) / 1000);
      if (!this.over) {
        this.energy = Math.min(HERO_MAX_EN, this.energy + EN_REGEN * dt);
        ABILITIES.forEach((ab) => {
          if (this.cds[ab.id] > 0) this.cds[ab.id] = Math.max(0, this.cds[ab.id] - dt);
        });
        if (this.palaCd > 0) this.palaCd = Math.max(0, this.palaCd - dt);

        if (!this.heroBusy) {
          let vx = 0;
          let vy = 0;
          if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
          if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
          if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
          if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
          if (vx || vy) {
            const len = Math.hypot(vx, vy) || 1;
            this.hero.x += (vx / len) * HERO_SPEED * dt;
            this.hero.y += (vy / len) * HERO_SPEED * dt;
            this.clampPos(this.hero, 90, 220);
            this.hero.y = Phaser.Math.Clamp(this.hero.y, H * 0.42, H * 0.78);
          }
        }

        if (!this.palaBusy && this.palaHp > 0) {
          const d = this.dist();
          if (d > PALA_RANGE) {
            const ang = Math.atan2(this.hero.y - this.pala.y, this.hero.x - this.pala.x);
            this.pala.x += Math.cos(ang) * PALA_SPEED * dt;
            this.pala.y += Math.sin(ang) * PALA_SPEED * dt;
            this.clampPos(this.pala, 90, 220);
            this.pala.y = Phaser.Math.Clamp(this.pala.y, H * 0.42, H * 0.78);
          } else if (this.palaCd <= 0) {
            this.playPalaAttack();
          }
        }

        this.faceEachOther();
        this.syncFollowers();
      }
      this.refreshHud();
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
    scene: LiveScene
  });

  $('btn-reset')?.addEventListener('click', () => {
    if (window.LiveProto) window.LiveProto.resetFight();
  });

  window.addEventListener('error', (ev) => {
    if (!window.LiveProto) bootError('Ошибка загрузки: ' + (ev.message || 'неизвестно'));
  });

  return game;
})();
