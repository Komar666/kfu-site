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
  const narrow = matchMedia('(max-width: 760px)');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav?.classList.toggle('scrolled', y > 40);
    // on phones the button only appears while scrolling back up, so it
    // never sits on top of the text you're reading on the way down
    const goingUp = y < lastY - 2;
    const goingDown = y > lastY + 2;
    if (totop) {
      if (y <= 700) totop.classList.remove('show');
      else if (!narrow.matches || goingUp) totop.classList.add('show');
      else if (goingDown) totop.classList.remove('show');
    }
    lastY = y;
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
  const burger = $('#burger');
  const openDrawer  = () => { drawer?.classList.add('open'); burger?.setAttribute('aria-expanded', 'true'); };
  const closeDrawer = () => { drawer?.classList.remove('open'); burger?.setAttribute('aria-expanded', 'false'); };
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

    // ~2 MB of frames — only fetched once the section is about a screen
    // away, not on page load (the mascot sits at the very bottom)
    const loadFrames = () => SAFE.forEach((frameNo, i) => {
      const img = new Image();
      img.decoding = 'async';
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
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es, obs) => {
        if (es.some(e => e.isIntersecting)) { obs.disconnect(); loadFrames(); }
      }, { rootMargin: '100% 0px' }).observe(stage);
    } else loadFrames();

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

  /* ---------- COUNT-UP numbers ----------
     The real value is written in the HTML (crawlers, no-JS, screen
     readers all get it). The animation is only a layer on top: the
     number is split into a visually-hidden real copy plus an
     aria-hidden visible copy, and only the visible one counts up. */
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const animateCount = el => {
    const target = +el.dataset.count;
    const shown = el.querySelector('.cnt');
    const dur = 1500;
    const t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      shown.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
      else { shown.textContent = fmt(target); el.classList.add('counted'); }
    };
    requestAnimationFrame(step);
  };
  const counters = $$('[data-count]');
  if (reduce || !('IntersectionObserver' in window)) {
    counters.forEach(el => el.classList.add('counted'));
  } else {
    counters.forEach(el => {
      const real = el.textContent;
      el.innerHTML = '';
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = real;
      const shown = document.createElement('span');
      shown.className = 'cnt';
      shown.setAttribute('aria-hidden', 'true');
      shown.textContent = '0';
      el.append(sr, shown);
    });
    // same trigger as the reveal fade, so the count starts as the card fades in
    const cio = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    counters.forEach(el => cio.observe(el));
  }

  /* ---------- ADMISSION countdown — days until document intake opens ---------- */
  (() => {
    const el = $('#admCountdown');
    const unit = $('#admCountdownUnit');
    if (!el) return;
    const [y, m, d] = el.dataset.deadline.split('-').map(Number);
    const today = new Date();
    const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.max(0, Math.round((Date.UTC(y, m - 1, d) - start) / 864e5));
    const plural = n => {
      const a = n % 100, b = n % 10;
      if (a > 10 && a < 20) return 'дней';
      if (b === 1) return 'день';
      if (b > 1 && b < 5) return 'дня';
      return 'дней';
    };
    el.textContent = String(days);
    if (unit) unit.textContent = plural(days);
  })();

  /* ---------- HERO: one transformation over ~1.5 screens ----------
     Pinned with position:sticky (no scroll-jacking); one progress value
     p 0→1 drives everything:
       0.00–0.55  the painted strips at the edges widen toward the centre
                  with hard edges, closing over the cover
       0.55–0.85  instead of colliding, the seam dissolves — the past
                  harbour's sea runs straight into the future city's
       0.05–0.72  crest + КФУ monogram shrink and fly into the menu logo;
                  the menu brand fades in as they land
       0.12–0.75  the university name glides to the centre and turns
                  cream over a soft veil, so it reads on the paintings
       0.72–0.95  the tagline appears under it
     Reduced motion: no pin, the finished composition is shown at once. */
  (() => {
    const scrollEl = $('#heroScroll');
    const pin = $('#heroPin');
    if (!scrollEl || !pin) return;

    const past = $('#heroPast'), future = $('#heroFuture'), veil = $('#heroVeil');
    const pastImg = $('img', past), futureImg = $('img', future);
    const crest = $('#heroCrest'), mono = $('#heroMono'), name = $('#heroName');
    const tag = $('#heroTag'), cue = $('#heroCue');
    const brandLogo = $('.nav .brand__logo'), brandWord = $('.nav .brand__text b');

    const clamp01 = n => Math.min(1, Math.max(0, n));
    const seg = (p, a, b) => clamp01((p - a) / (b - a));
    const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    let W = 0, H = 0, S = 0, B = 0, fly = null, lastP = -1;

    // Everything is measured in the pin's own coordinates. While pinned the
    // pin sits at viewport top 0, which is also the fixed nav's frame, so a
    // pin-relative start point and a viewport-relative end point line up.
    const measure = () => {
      W = pin.clientWidth;
      H = pin.clientHeight;
      const narrowHero = W <= 860;
      S = Math.round(W * (narrowHero ? 0.13 : 0.15));
      B = Math.round(W * (narrowHero ? 0.10 : 0.07));
      pin.style.setProperty('--strip', S + 'px');
      pin.style.setProperty('--blend', B + 'px');

      [crest, mono, name].forEach(el => { el.style.transform = ''; });
      const pr = pin.getBoundingClientRect();
      const rel = el => {
        const r = el.getBoundingClientRect();
        return { x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height };
      };
      const c = rel(crest), m = rel(mono), n = rel(name);
      fly = { name: { dy: H * 0.46 - (n.y + n.h / 2) } };

      if (brandLogo && brandWord) {
        // crest → logo (the logo box is square, the crest image is wide —
        // land on the image's contain-fit rectangle inside that box)
        const lr = brandLogo.getBoundingClientRect();
        const aspect = c.w / c.h;
        const lw = Math.min(lr.width, lr.height * aspect), lh = lw / aspect;
        fly.crest = {
          dx: lr.left + (lr.width - lw) / 2 - c.x,
          dy: lr.top + (lr.height - lh) / 2 - c.y,
          s: lw / c.w
        };
        // monogram → "КФУ" word, scaled by font size, centred on its line
        const br = brandWord.getBoundingClientRect();
        const s = parseFloat(getComputedStyle(brandWord).fontSize) / parseFloat(getComputedStyle(mono).fontSize);
        fly.mono = {
          dx: br.left - m.x,
          dy: br.top + br.height / 2 - (m.y + (m.h * s) / 2),
          s
        };
      }
    };

    const apply = p => {
      // shutters, then the dissolve
      const a = easeInOut(seg(p, 0, 0.55));
      const d = easeInOut(seg(p, 0.55, 0.85));
      const half = W / 2;
      const edge = S + (half - S) * a;      // hard edge, measured from each side
      const delta = B * d;                  // how far past the centre each side reaches
      const pastRight = edge + delta;
      past.style.clipPath = `inset(0 ${(half + B - pastRight).toFixed(1)}px 0 0)`;
      const futLeft = W - edge - delta;
      const futLayerLeft = half - B;
      future.style.clipPath = `inset(0 0 0 ${(futLeft - futLayerLeft).toFixed(1)}px)`;
      // the future side fades in across exactly the overlap, so wherever it
      // is see-through the past painting is underneath it (never the cover)
      const mask = delta > 0.5
        ? `linear-gradient(90deg,transparent ${(B - delta).toFixed(1)}px,#000 ${(B + delta).toFixed(1)}px)`
        : 'none';
      future.style.webkitMaskImage = mask;
      future.style.maskImage = mask;

      // paintings settle in, and drift a touch toward the seam as it opens
      const z = 1.1 - 0.07 * easeOut(seg(p, 0, 0.85));
      const drift = 1.2 * d;
      pastImg.style.transform = `translateX(${drift.toFixed(2)}%) scale(${z.toFixed(4)})`;
      futureImg.style.transform = `translateX(${(-drift).toFixed(2)}%) scale(${z.toFixed(4)})`;

      veil.style.opacity = easeOut(seg(p, 0.45, 0.85)).toFixed(3);

      if (fly && fly.crest) {
        const t = easeInOut(seg(p, 0.05, 0.72));
        const fade = 1 - seg(p, 0.62, 0.74);
        const k = fly.crest, q = fly.mono;
        crest.style.transform = `translate(${(k.dx * t).toFixed(1)}px,${(k.dy * t).toFixed(1)}px) scale(${(1 + (k.s - 1) * t).toFixed(4)})`;
        crest.style.opacity = fade.toFixed(3);
        mono.style.transform = `translate(${(q.dx * t).toFixed(1)}px,${(q.dy * t).toFixed(1)}px) scale(${(1 + (q.s - 1) * t).toFixed(4)})`;
        mono.style.opacity = fade.toFixed(3);
        nav?.style.setProperty('--brand-o', seg(p, 0.6, 0.74).toFixed(3));
      }
      nav?.classList.toggle('nav--hero', p < 1);

      const tn = easeInOut(seg(p, 0.12, 0.72));
      if (fly) name.style.transform = `translateY(${(fly.name.dy * tn).toFixed(1)}px) scale(${(1 + 0.1 * tn).toFixed(4)})`;
      name.style.setProperty('--hv', easeOut(seg(p, 0.3, 0.75)).toFixed(3));

      const tt = easeOut(seg(p, 0.72, 0.95));
      tag.style.opacity = tt.toFixed(3);
      tag.style.transform = `translate(-50%, ${(16 * (1 - tt)).toFixed(1)}px)`;

      if (cue) cue.style.opacity = (0.95 * (1 - seg(p, 0, 0.1))).toFixed(3);
    };

    const progress = () => {
      if (reduce) return 1;
      const total = scrollEl.offsetHeight - pin.offsetHeight;
      if (total <= 0) return 1;
      return clamp01(-scrollEl.getBoundingClientRect().top / total);
    };

    const refresh = () => { measure(); lastP = progress(); apply(lastP); };
    refresh();
    // web fonts change the monogram's size and position once they arrive
    document.fonts?.ready.then(refresh);
    addEventListener('load', refresh, { once: true });

    let hTicking = false;
    const onHeroScroll = () => {
      if (hTicking) return;
      hTicking = true;
      requestAnimationFrame(() => {
        hTicking = false;
        // past the hero the final frame just stays; a fast jump (anchor
        // link) still lands on it exactly, so the menu brand is never left
        // half-faded
        const gone = scrollEl.getBoundingClientRect().bottom < -100;
        const p = gone ? 1 : progress();
        if (p !== lastP) { lastP = p; apply(p); }
      });
    };
    addEventListener('scroll', onHeroScroll, { passive: true });
    let rT = null;
    addEventListener('resize', () => {
      clearTimeout(rT);
      rT = setTimeout(refresh, 120);
    }, { passive: true });
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
