/* =========================================================
   КФУ — Цифровой Ренессанс · interactions
   Vanilla JS, no dependencies.
   ========================================================= */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- PRELOADER ---------- */
  const preloader = $('#preloader');
  const preBar = $('#preBar');
  const preCount = $('#preCount');
  (() => {
    if (!preloader) return;
    let pct = 0;
    // the bar used to just be a fake timer, fully detached from whether the
    // page's actual images were ready — it would hide and then real photos
    // kept popping in behind it. Now it also waits on the real `load` event
    // (fires once every image on the page has actually finished), only
    // letting the fake tick run up to 100 once that's genuinely true.
    let pageLoaded = document.readyState === 'complete';
    if (!pageLoaded) addEventListener('load', () => { pageLoaded = true; }, { once: true });
    const t0 = performance.now();
    const minShow = reduce ? 200 : 1800;
    const tick = () => {
      const cap = pageLoaded ? 100 : 92;
      pct = Math.min(cap, pct + Math.random() * 14 + 4);
      if (preBar) preBar.style.right = (100 - pct) + '%';
      if (preCount) preCount.textContent = Math.round(pct) + '%';
      if (pct < 100) setTimeout(tick, 90 + Math.random() * 90);
      else finish();
    };
    const finish = () => {
      const elapsed = performance.now() - t0;
      const wait = Math.max(0, minShow - elapsed);
      setTimeout(() => {
        preloader.classList.add('preloader--out');
        root.classList.remove('loading');
        setTimeout(() => preloader.remove(), 750);
      }, wait);
    };
    if (reduce) { pct = 100; if (preCount) preCount.textContent = '100%'; finish(); }
    else tick();
    // safety net: never block the page for more than 7s, even if `load`
    // never fires (a slow or failed request shouldn't strand the visitor)
    setTimeout(() => { if (root.classList.contains('loading')) finish(); }, 7000);
  })();

  /* ---------- CUSTOM CURSOR ---------- */
  if (fine && !reduce) {
    root.classList.add('has-cursor');
    const ring = $('#cursorRing');
    const dot = $('#cursorDot');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    }, { passive: true });
    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const active = 'a, button, .pill, [data-cursor]';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(active)) $('#cursor').classList.add('cursor--active');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(active)) $('#cursor').classList.remove('cursor--active');
    });
  } else {
    $('#cursor')?.remove();
  }

  /* ---------- THEME ---------- */
  const themeBtn = $('#theme');
  const themeIc  = $('#theme-ic');
  const SUN  = 'M12 4V2M12 22v-2M4 12H2m20 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M5.6 18.4 4.2 19.8M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z';
  const MOON = 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z';
  const applyTheme = t => {
    root.setAttribute('data-theme', t);
    if (themeIc) themeIc.querySelector('path').setAttribute('d', t === 'light' ? SUN : MOON);
  };
  applyTheme(localStorage.getItem('kfu-theme') || 'dark');
  themeBtn?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    localStorage.setItem('kfu-theme', next);
    applyTheme(next);
  });

  /* ---------- NAV / SCROLL PROGRESS ---------- */
  const nav = $('#nav');
  const progress = $('#progress');
  const totop = $('#totop');
  const onScroll = () => {
    const y = window.scrollY;
    nav?.classList.toggle('scrolled', y > 40);
    totop?.classList.toggle('show', y > 700);
    if (progress) {
      const h = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  totop?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- MOBILE drawer ---------- */
  const drawer = $('#drawer');
  const openDrawer  = () => drawer?.classList.add('open');
  const closeDrawer = () => drawer?.classList.remove('open');
  $('#burger')?.addEventListener('click', openDrawer);
  $('#drawerClose')?.addEventListener('click', closeDrawer);
  $$('#drawer a').forEach(a => a.addEventListener('click', closeDrawer));

  /* ---------- REVEAL on scroll ---------- */
  const revs = $$('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    revs.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    revs.forEach(el => io.observe(el));
  }

  /* ---------- COVERFLOW carousel (vanilla port) ---------- */
  function initCoverflow(root) {
    const viewport = root.querySelector('.coverflow__viewport');
    const stage = root.querySelector('.coverflow__stage');
    const cards = [...root.querySelectorAll('.coverflow__card')];
    const dotsWrap = root.querySelector('.coverflow__dots') || document.getElementById(root.id + 'Dots');
    const prevBtn = root.querySelector('.coverflow__nav--prev');
    const nextBtn = root.querySelector('.coverflow__nav--next');
    const count = cards.length;
    if (!viewport || !stage || !count) return;

    // perspective itself lives in CSS (perspective:calc(var(--cf-card) * 4.6)) so it
    // stays in sync with the responsive card width automatically
    const ROTATE = 29, DEPTH = 0.5, FALLOFF = 0.6, FADE = 0.12, GAP = 0.08;

    let pos = 0, target = 0, width = 0, raf = null;
    let drag = null;

    const indexAt = p => ((Math.round(p) % count) + count) % count;

    // dots
    let dotEls = [];
    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      dotEls = cards.map((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `Карточка ${i + 1}`);
        b.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(b);
        return b;
      });
    }

    const paint = () => {
      if (!width) return;
      const pitch = width * (1 + GAP);
      cards.forEach((card, i) => {
        let offset = i - pos;
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
        const distance = Math.abs(offset);
        const ramp = Math.pow(distance, FALLOFF);
        const tilt = Math.min(ROTATE * ramp, 82) * Math.sign(offset);
        card.style.transform =
          `translateX(calc(-50% + ${(offset * pitch).toFixed(1)}px)) ` +
          `translateZ(${(-DEPTH * width * ramp).toFixed(1)}px) rotateY(${(-tilt).toFixed(2)}deg)`;
        const edge = Math.min(1, Math.max(0, count / 2 - distance));
        card.style.opacity = String(Math.max(0, 1 - FADE * distance) * edge);
        card.style.zIndex = String(100 - Math.round(distance));
      });
    };

    const setSelected = p => {
      const idx = indexAt(p);
      dotEls.forEach((d, i) => d.setAttribute('aria-current', i === idx ? 'true' : 'false'));
    };

    const settle = to => {
      if (raf !== null) cancelAnimationFrame(raf);
      target = to;
      setSelected(to);
      const step = () => {
        const remaining = target - pos;
        if (Math.abs(remaining) < 0.0006) { pos = target; paint(); raf = null; return; }
        pos += remaining * 0.16;
        paint();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const goTo = i => settle(i + Math.round((target - i) / count) * count);
    const nudge = by => settle(Math.round(target) + by);

    prevBtn?.addEventListener('click', () => nudge(-1));
    nextBtn?.addEventListener('click', () => nudge(1));
    viewport.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
    });

    viewport.addEventListener('pointerdown', e => {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      viewport.setPointerCapture(e.pointerId);
      target = pos;
      drag = { id: e.pointerId, x: e.clientX, pos, v: 0, t: performance.now() };
    });
    viewport.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId || !width) return;
      const pitch = width * (1 + GAP);
      const now = performance.now();
      const prev = pos;
      pos = drag.pos - (e.clientX - drag.x) / pitch;
      drag.v = ((pos - prev) / Math.max(now - drag.t, 1)) * 1000;
      drag.t = now;
      setSelected(pos);
      paint();
    });
    const endDrag = e => {
      if (!drag || drag.id !== e.pointerId) return;
      drag = null;
      settle(Math.round(pos));
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    const measure = () => {
      width = cards[0].offsetWidth;
      paint();
    };
    measure();
    new ResizeObserver(measure).observe(viewport);
    setSelected(0);
  }
  $$('.coverflow').forEach(initCoverflow);

  /* ---------- NEWS: dual-row ticker — drifts on its own, slows (not
     stops) on hover, and drags with mouse/touch (Pointer Events, one
     shared drag across both rows so it reads as one wall of cards).
     Full-bleed means the row can be wider than one set of cards, so a
     fixed 2-copy loop isn't always enough — clone the set on demand
     until there's enough track to cover the widest point of the wrap,
     and treat "one set's width" (not "half the track") as the loop
     period, so the modulo math stays correct no matter how many
     clones end up in there. ---------- */
  (() => {
    const wrap = $('#newsMarquee');
    if (!wrap) return;

    const GAP = 18; // matches the card-to-card gap, kept between repeated sets too
    const rows = $$('.nmarquee__track', wrap).map(el => ({
      el, dir: +el.dataset.dir || 1, pos: 0, unit: 1,
      baseSet: el.querySelector('.nmarquee__set')
    }));

    const ensureCoverage = row => {
      const unitW = row.baseSet.getBoundingClientRect().width + GAP;
      if (!unitW) return;
      row.unit = unitW;
      const containerW = wrap.getBoundingClientRect().width;
      const needed = Math.ceil(containerW / unitW) + 1;
      while (row.el.children.length < needed) {
        const clone = row.baseSet.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        row.el.appendChild(clone);
      }
    };
    const measure = () => rows.forEach(ensureCoverage);
    measure();
    new ResizeObserver(measure).observe(wrap);

    const wrapMod = (x, w) => ((x % w) + w) % w;
    const paint = () => rows.forEach(r => {
      r.el.style.transform = `translateX(${-wrapMod(r.pos, r.unit).toFixed(1)}px)`;
    });

    const SPEED = 26; // px/s ambient drift
    const HOVER_MULT = 0.22; // slows way down on hover instead of stopping dead
    let hovered = false, dragging = false, dragId = null, lastX = 0, lastT = performance.now();

    const tick = now => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      if (!reduce && !dragging) {
        const mult = hovered ? HOVER_MULT : 1;
        rows.forEach(r => { r.pos += r.dir * SPEED * mult * dt; });
        paint();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    wrap.addEventListener('mouseenter', () => hovered = true);
    wrap.addEventListener('mouseleave', () => hovered = false);

    wrap.addEventListener('pointerdown', e => {
      dragging = true; dragId = e.pointerId; lastX = e.clientX;
      wrap.classList.add('is-dragging');
      wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== dragId) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      rows.forEach(r => { r.pos -= dx; });
      paint();
    });
    const endDrag = e => {
      if (dragId !== null && e.pointerId !== dragId) return;
      dragging = false; dragId = null;
      wrap.classList.remove('is-dragging');
    };
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);

    paint();
  })();

  /* ---------- MASCOT: Таврик's gaze follows the cursor ----------
     Real rendered frames sliced from a short video, scrubbed by pointer Y
     — but only while the pointer is actually over the block; outside it,
     he eases back to the calm resting frame. The source clip isn't a
     straight up→down sweep, though — it dips down and then rises back to
     the start, so frames 43–60 are just the return trip to the same
     "looking up" pose as f00. Left in, they'd make the block look up
     again near the bottom edge — the opposite of what the cursor is
     doing — so the rotation stops at the deepest frame (36) instead of
     running the whole clip. Frames 13–17 also have a mid-motion blink
     that read as unsettling up close, so that gap is cut too — SAFE
     below jumps over it, small enough in gaze angle to pass as a normal
     step. None of those frames ever get downloaded. Drawn to a canvas so
     swaps never flicker. Skipped only for reduced motion — the poster
     frame (f00) just sits there instead. Touch devices get the same
     scrub via touchstart/touchmove (tap or drag near him), not just
     fine-pointer mousemove. */
  (() => {
    const stage = $('#mascotStage');
    const media = $('#mascotMedia');
    const canvas = $('#mascotCanvas');
    if (!stage || !media || !canvas || reduce) return;

    const SAFE = [...Array(13).keys(), ...Array.from({ length: 19 }, (_, i) => i + 18)]; // 0..12, 18..36
    const ctx = canvas.getContext('2d');
    const frames = new Array(SAFE.length);
    let loaded = 0;

    SAFE.forEach((frameNo, i) => {
      const img = new Image();
      img.src = `assets/mascot/f${String(frameNo).padStart(2, '0')}.webp`;
      img.onload = () => {
        if (++loaded === SAFE.length) {
          ctx.drawImage(frames[0], 0, 0, canvas.width, canvas.height);
          stage.classList.add('is-ready');
          resyncFromScroll();
          requestAnimationFrame(tick);
        }
      };
      frames[i] = img;
    });

    let visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => (visible = e.isIntersecting)),
        { threshold: 0 }).observe(stage);
    } else visible = true;

    let target = 0, current = 0, drawn = -1; // all in SAFE-array index space (0..SAFE.length-1)
    const aimAt = clientY => {
      const r = media.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
      target = t * (SAFE.length - 1);
    };
    media.addEventListener('mousemove', e => aimAt(e.clientY), { passive: true });
    media.addEventListener('mouseleave', () => { target = 0; }); // back to calm/up when the cursor leaves

    // touch: tap or drag a finger near him — same scrub, no mousemove needed
    media.addEventListener('touchstart', e => { if (e.touches[0]) aimAt(e.touches[0].clientY); }, { passive: true });
    media.addEventListener('touchmove', e => { if (e.touches[0]) aimAt(e.touches[0].clientY); }, { passive: true });
    media.addEventListener('touchend', () => { target = 0; }, { passive: true });

    // scrolling the page brings the block under an already-stationary cursor
    // without firing a real mousemove, which would otherwise leave him stuck
    // staring at the resting frame until the mouse actually twitches — so
    // resync from the last known pointer position on every scroll too.
    let lastClientX = null, lastClientY = null;
    window.addEventListener('pointermove', e => { lastClientX = e.clientX; lastClientY = e.clientY; }, { passive: true });
    const resyncFromScroll = () => {
      if (lastClientY == null) return;
      const r = media.getBoundingClientRect();
      if (lastClientX < r.left || lastClientX > r.right || lastClientY < r.top || lastClientY > r.bottom) return;
      aimAt(lastClientY);
    };
    window.addEventListener('scroll', resyncFromScroll, { passive: true });

    const tick = () => {
      requestAnimationFrame(tick);
      if (!visible) return;
      current += (target - current) * 0.12;
      const idx = Math.round(current);
      if (idx !== drawn) {
        drawn = idx;
        ctx.drawImage(frames[idx], 0, 0, canvas.width, canvas.height);
      }
    };
  })();

  /* ---------- ADMISSION: lighthouse follows the cursor ---------- */
  (() => {
    const section = $('#admission');
    const media = section?.querySelector('.imgslot');
    if (!section || !media || reduce || !fine) return;
    section.addEventListener('mousemove', e => {
      const r = section.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      media.style.transform = `translate3d(${(-x * 24).toFixed(1)}px, ${(-y * 18).toFixed(1)}px, 0) scale(1.06)`;
    });
    section.addEventListener('mouseleave', () => { media.style.transform = ''; });
  })();

  /* ---------- ADMISSION: book-cover reveal ---------- */
  const admis = $('#admission');
  if (admis) {
    if (reduce || !('IntersectionObserver' in window)) {
      admis.classList.add('is-open');
    } else {
      // rootMargin -50%/-50% shrinks the trigger zone to a single line across the
      // viewport's vertical center — fires exactly when the section lines up with it
      const bookIo = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
          if (e.isIntersecting) { admis.classList.add('is-open'); obs.unobserve(e.target); }
        });
      }, { threshold: 0, rootMargin: '-50% 0px -50% 0px' });
      bookIo.observe(admis);
    }
  }

  /* ---------- COUNT-UP numbers ---------- */
  const fmt = n => n.toLocaleString('ru-RU');
  const animateCount = el => {
    const target = +el.dataset.count;
    const dur = 1500;
    const t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
      else { el.textContent = fmt(target); el.classList.add('counted'); }
    };
    requestAnimationFrame(step);
  };
  const counters = $$('[data-count]');
  if (reduce || !('IntersectionObserver' in window)) {
    counters.forEach(el => (el.textContent = fmt(+el.dataset.count)));
  } else {
    const cio = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => cio.observe(el));
  }

  /* ---------- HERO: cover choreography ----------
     КФУ + crest + the scroll cue sit in resting CSS from the first frame —
     the cover should never read as an empty screen before you've scrolled.
     Everything else unfolds across one continuous scroll value (0→1),
     driven by position:sticky (no scroll-jacking):
       B  0.18–0.50  the past photo descends into view while
                      П·Р·О·Ш·Л·О·Е cascades in top-to-bottom
       C  0.46–0.78  the future photo rises into view while
                      Б·У·Д·У·Щ·Е·Е cascades in bottom-to-top,
                      with a sharper, overshooting snap
       D  0.76–0.88  the subtitle writes itself in, left to right */
  (() => {
    const scrollEl = $('#heroScroll');
    if (!scrollEl || reduce) return; // resting CSS already shows the assembled cover

    const pastImg = $('#pastImg');
    const futureImg = $('#futureImg');
    const pastLetters = $$('#wordPast span');
    const futureLetters = $$('#wordFuture span');
    const subtitle = $('#heroSubtitle');
    const cue = $('.hero__pin .scrollcue');

    const clamp01 = n => Math.min(1, Math.max(0, n));
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

    const cascade = (els, p, start, end, opts) => {
      const n = els.length;
      const step = (end - start) / (n + 1.5);
      const dur = step * 3;
      els.forEach((el, i) => {
        const order = opts.reverse ? (n - 1 - i) : i;
        const lp = clamp01((p - (start + order * step)) / dur);
        const e = opts.back ? easeBack(lp) : easeOut(lp);
        const fromY = opts.fromBelow ? 32 : -32;
        el.style.transform = `translateY(${(fromY * (1 - e)).toFixed(1)}px)`;
        el.style.opacity = clamp01(e).toFixed(2);
      });
    };

    // Organic "painted" reveal edge — a soft linear fade plus a handful of
    // soft round "droplets" scattered along the boundary (radial-gradients,
    // simple default layering — no experimental composite modes). The
    // droplets spread out mid-reveal and settle flush by the time it's
    // fully painted, like a brushstroke that's just finished drying.
    const wave = (i, phase) => Math.sin(i * 1.7 + phase) * 0.6 + Math.sin(i * 3.1 + phase * 1.6 + 1.3) * 0.4;
    const paintMask = (progress, fromTop, phase) => {
      const bell = Math.sin(Math.PI * clamp01(progress)); // 0 at start, 1 mid-reveal, 0 when fully painted
      const reveal = progress * 100;
      // soft is 0 exactly at progress=0 (nothing peeks before the reveal begins),
      // widens through the middle, settles to a small antialiased edge at the end
      const soft = 5 * progress + 13 * bell;
      const dir = fromTop ? 'to bottom' : 'to top';
      const stop1 = Math.max(0, reveal - soft).toFixed(1);
      const stop2 = Math.min(100, reveal + soft).toFixed(1);
      const layers = [`linear-gradient(${dir},#000 0%,#000 ${stop1}%,transparent ${stop2}%,transparent 100%)`];
      const DROPS = 6;
      for (let i = 0; i < DROPS; i++) {
        const x = ((i + 0.5) / DROPS) * 100;
        const jitter = wave(i, phase) * 11 * bell;
        const y = fromTop ? reveal + jitter : (100 - reveal) - jitter;
        // droplet size also rides the bell curve — zero-sized (invisible) at
        // rest, full splatter mid-reveal, gone again once fully painted
        const rw = Math.max(2, (70 + Math.abs(wave(i + 3, phase)) * 55) * bell);
        const rh = Math.max(2, (45 + Math.abs(wave(i + 7, phase)) * 50) * bell);
        layers.push(`radial-gradient(${rw.toFixed(0)}px ${rh.toFixed(0)}px at ${x.toFixed(1)}% ${y.toFixed(1)}%,#000 0%,#000 35%,transparent 72%)`);
      }
      return layers.join(',');
    };

    /* Golden burn: the side paintings are revealed by a ragged, glowing
       edge — like paper catching fire — instead of the CSS gradient mask.
       A tiny WebGL canvas per column, redrawn only when the scroll moves
       the reveal. The field is mostly the reveal direction plus fbm noise,
       so the edge travels top-to-bottom (past) or bottom-to-top (future)
       while staying torn and organic; just behind the edge the paint is
       scorched darker, the edge itself glows gold. No WebGL → the old
       mask path below still runs. */
    const BURN_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes, uImg;
uniform float uP, uDir, uSeed;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = vUv;
  float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  vec2 iuv = (uv - 0.5) * s + 0.5;
  vec3 col = texture2D(uTex, vec2(iuv.x, 1.0 - iuv.y)).rgb;

  float along = uDir > 0.0 ? 1.0 - uv.y : uv.y;
  float n = fbm(vec2(uv.x * rs, uv.y) * 3.4 + uSeed);
  // a fine high-frequency octave tears the edge into small ragged bites
  float fine = noise(vec2(uv.x * rs, uv.y) * 46.0 + uSeed) - 0.5;
  float field = along * 0.78 + n * 0.42 + fine * 0.035;
  float edge = mix(-0.06, 1.26, uP);

  float shown = 1.0 - smoothstep(edge - 0.006, edge, field);
  float ember = smoothstep(edge - 0.02, edge, field) * (1.0 - smoothstep(edge, edge + 0.01, field));
  float scorch = smoothstep(edge - 0.07, edge - 0.006, field) * shown;
  col *= 1.0 - scorch * 0.6;
  col = mix(col, col * vec3(1.05, 0.88, 0.7), scorch * 0.5);

  float flick = 0.85 + 0.15 * noise(vec2(uv.x * rs * 40.0, uv.y * 40.0) + uP * 30.0);
  vec3 emberCol = mix(vec3(0.78, 0.36, 0.08), vec3(1.0, 0.86, 0.52), ember) * flick;
  float a = clamp(shown + ember, 0.0, 1.0);
  vec3 rgb = col * shown + emberCol * ember * (1.0 - shown * 0.4);
  gl_FragColor = vec4(min(rgb, vec3(a)), a);
}`;
    const makeBurn = (host, dir, seed) => {
      const img = host && $('.imgslot img', host);
      if (!img) return null;
      const canvas = document.createElement('canvas');
      canvas.className = 'hero__burn';
      canvas.setAttribute('aria-hidden', 'true');
      let gl;
      try { gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false }); } catch (e) { gl = null; }
      if (!gl) return null;
      const sh = (type, src) => {
        const o = gl.createShader(type);
        gl.shaderSource(o, src); gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
        return o;
      };
      let prog;
      try {
        prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}'));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, BURN_FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      } catch (e) { console.warn('[hero burn]', e); return null; }
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = {};
      ['uTex', 'uRes', 'uImg', 'uP', 'uDir', 'uSeed'].forEach(k => (U[k] = gl.getUniformLocation(prog, k)));
      gl.uniform1f(U.uDir, dir);
      gl.uniform1f(U.uSeed, seed);

      let ready = false, p = 0;
      const draw = () => {
        if (!ready) return;
        gl.uniform1f(U.uP, p);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      const resize = () => {
        const dpr = Math.min(devicePixelRatio || 1, 1.5);
        canvas.width = Math.max(1, Math.round(host.clientWidth * dpr));
        canvas.height = Math.max(1, Math.round(host.clientHeight * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        draw();
      };
      const upload = () => {
        if (!img.naturalWidth) return;
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform2f(U.uImg, img.naturalWidth, img.naturalHeight);
        // hand over from the CSS mask to the canvas only once it can draw
        host.style.maskImage = host.style.webkitMaskImage = 'none';
        host.style.filter = 'none';
        host.classList.add('is-burn');
        host.appendChild(canvas);
        ready = true;
        resize();
      };
      if (img.complete) upload(); else img.addEventListener('load', upload, { once: true });
      addEventListener('resize', resize, { passive: true });
      return { set(v) { p = v; draw(); }, get ready() { return ready; } };
    };
    const pastBurn = makeBurn(pastImg, 1, 3.0);
    const futureBurn = makeBurn(futureImg, -1, 11.0);

    const apply = p => {
      // КФУ wordmark + crest are static now — visible from the very first frame
      // (see below), so the cover never reads as an empty screen before you
      // start scrolling. Only the side panels + subtitle still unfold on scroll.

      // B — past photo paints in top-to-bottom, soft brushed edge + ПРОШЛОЕ cascades down
      const bp = clamp01((p - 0.18) / 0.32);
      if (pastBurn && pastBurn.ready) pastBurn.set(easeOut(bp));
      else if (pastImg) {
        const be = easeOut(bp);
        if (pastBurn) pastBurn.set(be); // texture still loading — remember where we are
        const m = paintMask(be, true, be * 5.2);
        pastImg.style.maskImage = m;
        pastImg.style.webkitMaskImage = m;
        pastImg.style.filter = `blur(${((1 - be) * 5).toFixed(1)}px)`;
      }
      cascade(pastLetters, p, 0.18, 0.50, { reverse: false, fromBelow: false, back: false });

      // C — future photo paints in bottom-to-top, soft brushed edge + БУДУЩЕЕ cascades up, punchier
      const cp = clamp01((p - 0.46) / 0.32);
      if (futureBurn && futureBurn.ready) futureBurn.set(easeOut(cp));
      else if (futureImg) {
        const ce = easeOut(cp);
        if (futureBurn) futureBurn.set(ce);
        const m = paintMask(ce, false, ce * -5.2);
        futureImg.style.maskImage = m;
        futureImg.style.webkitMaskImage = m;
        futureImg.style.filter = `blur(${((1 - ce) * 5).toFixed(1)}px)`;
      }
      cascade(futureLetters, p, 0.46, 0.78, { reverse: true, fromBelow: true, back: true });

      // D — subtitle writes in, left to right
      const dp = clamp01((p - 0.76) / 0.12);
      if (subtitle) {
        const de = easeOut(dp);
        subtitle.style.clipPath = `inset(0 ${(100 * (1 - de)).toFixed(1)}% 0 0)`;
        subtitle.style.opacity = de > 0.02 ? 1 : 0;
      }

      if (cue) cue.style.opacity = Math.max(0, 0.92 * (1 - p / 0.18)).toFixed(2);
    };

    const progress = () => {
      const rect = scrollEl.getBoundingClientRect();
      const total = scrollEl.offsetHeight - innerHeight;
      if (total <= 0) return 1;
      return clamp01(-rect.top / total);
    };

    apply(0); // opening state, set immediately (no flash of the final look)

    let hTicking = false;
    let lastP = 0; // apply() rebuilds two multi-layer gradient masks + walks
    // every letter on each call — real cost. Once progress settles at 1 (the
    // sequence is done), scrolling on into Образование kept re-running that
    // full computation every single scroll frame for no visual change at
    // all, which is exactly the stutter right at that section boundary.
    const onHeroScroll = () => {
      const rect = scrollEl.getBoundingClientRect();
      if (rect.bottom < -100) return; // hero long gone — final state stays frozen, skip work
      if (!hTicking) {
        requestAnimationFrame(() => {
          const p = progress();
          if (p !== lastP) { apply(p); lastP = p; }
          hTicking = false;
        });
        hTicking = true;
      }
    };
    addEventListener('scroll', onHeroScroll, { passive: true });
    addEventListener('resize', onHeroScroll, { passive: true });
  })();

  /* ---------- EDUCATION: «Зал КФУ» ----------
     Wide screens: the section is made exactly as tall as the hall is wide
     (minus one screen), so scrolling through it maps 1:1 onto walking the
     track sideways. Each exhibit's --lit comes from how close its centre is
     to the middle of the screen; the painting inside drifts against the
     wall for depth. Phones / reduced motion: a plain stacked column where
     each exhibit's light comes on once as it scrolls into view. */
  (() => {
    const sect = $('#education');
    const scroller = $('#eduScroll');
    const track = $('#eduTrack');
    if (!sect || !scroller || !track) return;
    const exhibits = $$('.exhibit', track);
    const imgs = exhibits.map(ex => $('img', ex));
    const rail = $('#eduRail'), count = $('#eduCount');
    const flatMQ = matchMedia('(max-width: 860px)');
    const clamp01 = n => Math.min(1, Math.max(0, n));
    const smooth = t => t * t * (3 - 2 * t);

    let flat = null, dist = 0, centres = [], lastX = null, io = null;

    const setFlat = on => {
      if (on === flat) return;
      flat = on;
      sect.classList.toggle('edu--flat', on);
      track.style.transform = '';
      imgs.forEach(img => img && (img.style.transform = ''));
      if (on) {
        exhibits.forEach(ex => ex.style.setProperty('--lit', reduce ? 1 : 0));
        if (!reduce && 'IntersectionObserver' in window) {
          io = new IntersectionObserver(es => es.forEach(e => {
            if (e.isIntersecting) { e.target.style.setProperty('--lit', 1); io.unobserve(e.target); }
          }), { rootMargin: '0px 0px -25% 0px' });
          exhibits.forEach(ex => io.observe(ex));
        } else exhibits.forEach(ex => ex.style.setProperty('--lit', 1));
      } else if (io) { io.disconnect(); io = null; }
    };

    const measure = () => {
      setFlat(reduce || flatMQ.matches);
      if (flat) { scroller.style.height = ''; return; }
      dist = Math.max(0, track.scrollWidth - innerWidth);
      scroller.style.height = (dist + innerHeight) + 'px';
      centres = exhibits.map(ex => ex.offsetLeft + ex.offsetWidth / 2);
      lastX = null;
      update();
    };

    const update = () => {
      if (flat) return;
      const top = scroller.getBoundingClientRect().top;
      const p = dist ? clamp01(-top / dist) : 0;
      const x = -dist * p;
      if (x === lastX) return;
      lastX = x;
      track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      const mid = innerWidth / 2, reach = innerWidth * 0.42;
      let best = 0, bestD = Infinity;
      exhibits.forEach((ex, i) => {
        const d = (centres[i] + x - mid) / reach;       // −1 … 1 across the screen
        const ad = Math.abs(d);
        if (ad < bestD) { bestD = ad; best = i; }
        ex.style.setProperty('--lit', smooth(clamp01(1 - (ad - 0.12) / 0.78)).toFixed(3));
        if (imgs[i] && ad < 2.2) imgs[i].style.transform = `translate3d(${(-d * 3.2).toFixed(2)}%,0,0)`;
      });
      if (rail) rail.style.transform = `scaleX(${p.toFixed(4)})`;
      if (count) count.textContent = `0${best + 1} / 0${exhibits.length}`;
    };

    let ticking = false;
    addEventListener('scroll', () => {
      if (flat || ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }, { passive: true });
    let rT = null;
    addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(measure, 120); }, { passive: true });
    flatMQ.addEventListener?.('change', measure);
    measure();
    // frame widths come from aspect-ratio, but the fonts in the intro panel
    // change the track width once they arrive
    document.fonts?.ready.then(measure);
    addEventListener('load', measure, { once: true });
  })();

  /* ---------- PARALLAX (scroll, throttled via rAF) ---------- */
  const layers = $$('[data-parallax], [data-parallax-bg]');
  let ticking = false;
  const parallax = () => {
    const vh = innerHeight;
    layers.forEach(el => {
      const speed = parseFloat(el.dataset.parallax || el.dataset.parallaxBg) || 0.15;
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const centerDelta = (r.top + r.height / 2) - vh / 2;
      const shift = -centerDelta * speed;
      el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    });
    ticking = false;
  };
  if (!reduce && layers.length) {
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(parallax); ticking = true; }
    }, { passive: true });
    addEventListener('resize', parallax, { passive: true });
    parallax();
  }

  /* ---------- BAND: ship drifts gently with the cursor ----------
     A third transform layer on the same photo, separate from both the
     scroll-parallax on .scene__media and the sail keyframe zoom on the
     img itself — three different elements, so none of them fight over
     the same transform property. Just a few px of drift, eased, like
     the ship is answering the wave under it rather than being dragged. */
  (() => {
    const section = $('.band');
    const layer = section && $('.scene__media .imgslot', section);
    if (!section || !layer || reduce || !fine) return;

    let visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => (visible = e.isIntersecting)),
        { threshold: 0 }).observe(section);
    } else visible = true;

    const AMP_X = 16, AMP_Y = 9;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    section.addEventListener('mousemove', e => {
      const r = section.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    }, { passive: true });
    section.addEventListener('mouseleave', () => { tx = 0; ty = 0; });

    const tick = () => {
      requestAnimationFrame(tick);
      if (!visible) return;
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      layer.style.transform = `translate3d(${(cx * AMP_X).toFixed(2)}px, ${(cy * AMP_Y).toFixed(2)}px, 0)`;
    };
    requestAnimationFrame(tick);
  })();

  /* ---------- SPRING SCENES: depth parallax with the cursor ----------
     Same idea as the ship, but in layers: the painting shifts least, the
     petals behind the cards a bit more, the big near petals the most —
     so the air in front of the mountain reads as real depth. The painting
     is scaled up a touch so its edges never slide into view. */
  (() => {
    if (reduce || !fine) return;
    $$('.scene--spring').forEach(section => {
      const layers = [
        // the admission lighthouse already follows the cursor on its own
        // (see ADMISSION above) — only its petals join in here
        [section.id === 'admission' ? null : $('.scene__media .imgslot', section), 14, 8, 1.035],
        [$('.petals--back', section), 24, 12, 1],
        [$('.petals--front', section), 44, 22, 1]
      ].filter(l => l[0]);
      let visible = false;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => es.forEach(e => (visible = e.isIntersecting)),
          { threshold: 0 }).observe(section);
      } else visible = true;

      let tx = 0, ty = 0, cx = 0, cy = 0;
      section.addEventListener('mousemove', e => {
        const r = section.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        // vertical position relative to the viewport, not the (tall) section
        ty = e.clientY / innerHeight - 0.5;
      }, { passive: true });
      section.addEventListener('mouseleave', () => { tx = 0; ty = 0; });

      const tick = () => {
        requestAnimationFrame(tick);
        if (!visible) return;
        const nx = cx + (tx - cx) * 0.05, ny = cy + (ty - cy) * 0.05;
        if (Math.abs(nx - cx) < 1e-4 && Math.abs(ny - cy) < 1e-4) return;
        cx = nx; cy = ny;
        layers.forEach(([el, ax, ay, s]) => {
          el.style.transform = `translate3d(${(-cx * ax).toFixed(2)}px, ${(-cy * ay).toFixed(2)}px, 0)` +
            (s !== 1 ? ` scale(${s})` : '');
        });
      };
      layers.forEach(([el, , , s]) => { if (s !== 1) el.style.transform = `scale(${s})`; });
      requestAnimationFrame(tick);
    });
  })();

  /* ---------- BAND: two clouds drift sideways as the section scrolls
     through ---------- the back one slower, the front one faster, so
     they slip off toward the edge at slightly different rates — a cheap
     depth cue, same "outer wrapper carries the scroll motion" idea as
     the rest of the parallax layers, just horizontal instead of
     vertical. */
  (() => {
    const bandSection = $('.band');
    const clouds = bandSection ? $$('.band__cloud', bandSection) : [];
    if (!bandSection || !clouds.length || reduce) return;

    const SPEEDS = [-90, -160]; // px of horizontal drift across the section's full scroll pass
    let cloudTicking = false;
    const moveClouds = () => {
      const r = bandSection.getBoundingClientRect();
      const total = r.height + innerHeight;
      const p = Math.max(0, Math.min(1, (innerHeight - r.top) / total));
      clouds.forEach((el, i) => {
        el.style.transform = `translate3d(${(p * SPEEDS[i % SPEEDS.length]).toFixed(1)}px, 0, 0)`;
      });
      cloudTicking = false;
    };
    addEventListener('scroll', () => {
      if (!cloudTicking) { requestAnimationFrame(moveClouds); cloudTicking = true; }
    }, { passive: true });
    addEventListener('resize', moveClouds, { passive: true });
    moveClouds();
  })();

  /* ---------- SPRING: light theme turns the landscape scenes to spring ----------
     The spring twins load only once somebody actually picks the light
     theme (lazy, so a dark-theme visitor never pays for them), and only
     fade in after decoding — no half-painted frame. */
  const isLight = () => root.getAttribute('data-theme') === 'light';
  const springImgs = $$('img[data-spring]');
  const loadSpring = () => {
    springImgs.forEach(img => {
      if (img.getAttribute('src')) return;
      img.loading = 'lazy';
      img.addEventListener('load', () => {
        (img.decode ? img.decode() : Promise.resolve()).catch(() => {})
          .then(() => img.classList.add('is-ready'));
      }, { once: true });
      img.src = img.dataset.spring;
    });
  };

  /* ---------- SPRING: petals on the wind ----------
     Blossom petals blow in from the left edge on a gusty breeze. Each one
     sways, spins, and tumbles (a cosine squash fakes the 3-D flip). Most
     drift behind the cards; a few big soft-focus ones pass in front, like
     they're right next to the camera. Runs only in the light theme, only
     while the scene is on screen, never with reduced motion. */
  const petalScenes = $$('.scene').filter(s => $('.petals', s));
  let springStart = null, springStop = null;
  if (!reduce && petalScenes.length) {
    const DPR = Math.min(devicePixelRatio || 1, 1.5);
    const rand = (a, b) => a + Math.random() * (b - a);
    const TINTS = [
      ['#f2a9bd', '#fff2f5'], ['#f6c4d1', '#ffffff'], ['#ec9db3', '#fde5ec'],
      ['#f9dfe6', '#ffffff'], ['#f4b8c8', '#fff8fa']
    ];
    // one sprite per tint, drawn once: a cherry petal with its little notch
    const makeSprite = ([base, tip], size, blur) => {
      const pad = blur * 3;
      const c = document.createElement('canvas');
      c.width = c.height = Math.ceil(size + pad * 2);
      const g = c.getContext('2d');
      g.translate(c.width / 2, c.height / 2);
      if (blur) g.filter = `blur(${blur}px)`;
      const w = size * 0.62, h = size;
      g.beginPath();
      g.moveTo(0, h * 0.5);
      g.bezierCurveTo(-w * 0.75, h * 0.2, -w * 0.62, -h * 0.42, -w * 0.16, -h * 0.5);
      g.lineTo(0, -h * 0.4);
      g.lineTo(w * 0.16, -h * 0.5);
      g.bezierCurveTo(w * 0.62, -h * 0.42, w * 0.75, h * 0.2, 0, h * 0.5);
      const grad = g.createLinearGradient(0, h * 0.5, 0, -h * 0.5);
      grad.addColorStop(0, base);
      grad.addColorStop(0.7, tip);
      grad.addColorStop(1, tip);
      g.fillStyle = grad;
      g.fill();
      g.globalAlpha = 0.35;
      g.strokeStyle = base;
      g.lineWidth = Math.max(0.6, size * 0.03);
      g.beginPath();
      g.moveTo(0, h * 0.45);
      g.quadraticCurveTo(w * 0.05, 0, 0, -h * 0.3);
      g.stroke();
      return c;
    };
    const backSprites = TINTS.map(t => makeSprite(t, 22 * DPR, 0));
    const frontSprites = TINTS.map(t => makeSprite(t, 46 * DPR, 2.2 * DPR));

    // one shared, gusty wind for all scenes
    let gust = 0, gustT = 0, nextGust = rand(4, 8);
    const windAt = (t, dt) => {
      nextGust -= dt;
      if (nextGust <= 0 && gustT <= 0) { gustT = 2.8; nextGust = rand(7, 13); }
      if (gustT > 0) { gustT -= dt; gust = Math.sin(Math.PI * (1 - gustT / 2.8)) * 150; }
      else gust = 0;
      return 55 + 30 * Math.sin(t * 0.33) + 18 * Math.sin(t * 0.91 + 1.3) + gust;
    };

    const fields = petalScenes.map(scene => {
      const back = $('.petals--back', scene), front = $('.petals--front', scene);
      const f = { scene, layers: [
        { cv: back, ctx: back.getContext('2d'), sprites: backSprites, list: [], front: false },
        { cv: front, ctx: front.getContext('2d'), sprites: frontSprites, list: [], front: true }
      ], W: 0, H: 0, visible: false };

      const spawn = (L, p, anywhere) => {
        const { W, H } = f;
        const fromTop = Math.random() < 0.3;
        p.x = anywhere ? rand(-40, W) : fromTop ? rand(-40, W * 0.6) : rand(-120, -30);
        p.y = anywhere ? rand(-40, H) : fromTop ? rand(-60, -20) : rand(-H * 0.1, H * 0.85);
        p.depth = L.front ? rand(1.35, 1.8) : rand(0.55, 1.15);
        p.scale = L.front ? rand(0.7, 1.15) : rand(0.45, 1) * (0.6 + p.depth * 0.4);
        p.fall = rand(14, 38) * p.depth;
        p.swayA = rand(10, 34);
        p.swayF = rand(0.8, 1.9);
        p.ph = rand(0, Math.PI * 2);
        p.rot = rand(0, Math.PI * 2);
        p.spin = rand(-1.6, 1.6);
        p.flip = rand(0, Math.PI * 2);
        p.flipV = rand(1.4, 3.6);
        p.alpha = L.front ? rand(0.55, 0.8) : rand(0.65, 0.95);
        p.sp = L.sprites[(Math.random() * L.sprites.length) | 0];
        return p;
      };

      f.resize = () => {
        const r = scene.getBoundingClientRect();
        f.W = r.width; f.H = r.height;
        const backN = Math.min(60, Math.round((f.W * f.H) / 36000));
        const counts = [backN, Math.max(2, Math.round(backN / 9))];
        f.layers.forEach((L, i) => {
          L.cv.width = Math.round(f.W * DPR);
          L.cv.height = Math.round(f.H * DPR);
          while (L.list.length < counts[i]) L.list.push(spawn(L, {}, true));
          L.list.length = counts[i];
        });
      };

      f.step = (t, dt, wind) => {
        const { W, H } = f;
        f.layers.forEach(L => {
          const g = L.ctx;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, L.cv.width, L.cv.height);
          for (const p of L.list) {
            p.x += wind * p.depth * dt;
            p.y += (p.fall + Math.cos(t * p.swayF + p.ph) * p.swayA) * dt;
            p.rot += (p.spin + wind * 0.004) * dt;
            p.flip += p.flipV * (1 + gust / 200) * dt;
            if (p.x > W + 60 || p.y > H + 60) { spawn(L, p, false); continue; }
            const sy = Math.cos(p.flip);
            const s = p.scale;
            g.setTransform(DPR, 0, 0, DPR, 0, 0);
            g.translate(p.x, p.y);
            g.rotate(p.rot);
            g.scale(s, s * (0.18 + 0.82 * Math.abs(sy)));
            // the underside of a petal reads a touch darker as it turns over
            g.globalAlpha = p.alpha * (sy < 0 ? 0.82 : 1);
            const k = p.sp.width / DPR;
            g.drawImage(p.sp, -k / 2, -k / 2, k, k);
          }
        });
      };

      f.clear = () => f.layers.forEach(L => L.ctx.clearRect(0, 0, L.cv.width, L.cv.height));
      return f;
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        const f = fields.find(x => x.scene === e.target);
        if (f) f.visible = e.isIntersecting;
      }), { rootMargin: '120px 0px' });
      fields.forEach(f => io.observe(f.scene));
    } else fields.forEach(f => (f.visible = true));

    let running = false, last = 0, stopAt = 0;
    const frame = now => {
      const t = now / 1000;
      const dt = Math.min(0.05, last ? t - last : 0.016);
      last = t;
      // keep drawing a moment after switching to dark so the petals fade
      // out with the canvas instead of freezing mid-air
      const live = isLight() || now < stopAt;
      const wind = windAt(t, dt);
      fields.forEach(f => { if (f.visible && live) f.step(t, dt, wind); });
      if (live && !document.hidden) requestAnimationFrame(frame);
      else { running = false; last = 0; fields.forEach(f => f.clear()); }
    };
    const start = () => {
      if (running || !isLight() || document.hidden) return;
      running = true;
      requestAnimationFrame(frame);
    };

    const sizeAll = () => fields.forEach(f => f.resize());
    sizeAll();
    let rsT = null;
    addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(sizeAll, 150); }, { passive: true });
    // the sections grow once fonts and lazy images settle
    addEventListener('load', sizeAll, { once: true });
    document.addEventListener('visibilitychange', start);
    springStart = start;
    springStop = () => { stopAt = performance.now() + 1500; };
  }

  const onSeason = () => {
    if (isLight()) { loadSpring(); springStart?.(); }
    else springStop?.();
  };
  new MutationObserver(onSeason).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  onSeason();

  /* ---------- Smooth anchor scroll with nav offset ---------- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#' || id === '#top') return;
      const tgt = document.querySelector(id);
      if (!tgt) return;
      e.preventDefault();
      const y = tgt.getBoundingClientRect().top + scrollY - 74;
      scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    });
  });
})();
