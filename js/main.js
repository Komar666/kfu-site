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
    const t0 = performance.now();
    const minShow = reduce ? 200 : 1300;
    const tick = () => {
      pct = Math.min(100, pct + Math.random() * 14 + 4);
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
    // safety net: never block the page for more than 4s
    setTimeout(() => { if (root.classList.contains('loading')) finish(); }, 4000);
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
     swaps never flicker. Skipped on coarse pointers / reduced motion —
     the poster frame (f00) just sits there instead. */
  (() => {
    const stage = $('#mascotStage');
    const media = $('#mascotMedia');
    const canvas = $('#mascotCanvas');
    if (!stage || !media || !canvas || reduce || !fine) return;

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

    const apply = p => {
      // КФУ wordmark + crest are static now — visible from the very first frame
      // (see below), so the cover never reads as an empty screen before you
      // start scrolling. Only the side panels + subtitle still unfold on scroll.

      // B — past photo paints in top-to-bottom, soft brushed edge + ПРОШЛОЕ cascades down
      const bp = clamp01((p - 0.18) / 0.32);
      if (pastImg) {
        const be = easeOut(bp);
        const m = paintMask(be, true, be * 5.2);
        pastImg.style.maskImage = m;
        pastImg.style.webkitMaskImage = m;
        pastImg.style.filter = `blur(${((1 - be) * 5).toFixed(1)}px)`;
      }
      cascade(pastLetters, p, 0.18, 0.50, { reverse: false, fromBelow: false, back: false });

      // C — future photo paints in bottom-to-top, soft brushed edge + БУДУЩЕЕ cascades up, punchier
      const cp = clamp01((p - 0.46) / 0.32);
      if (futureImg) {
        const ce = easeOut(cp);
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
    const onHeroScroll = () => {
      const rect = scrollEl.getBoundingClientRect();
      if (rect.bottom < -100) return; // hero long gone — final state stays frozen, skip work
      if (!hTicking) {
        requestAnimationFrame(() => { apply(progress()); hTicking = false; });
        hTicking = true;
      }
    };
    addEventListener('scroll', onHeroScroll, { passive: true });
    addEventListener('resize', onHeroScroll, { passive: true });
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
