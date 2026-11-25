/* ==========================================================================
   RUCHI GROUP - motion & interaction
   GSAP + ScrollTrigger + Flip + Lenis
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // If GSAP failed to load, just show the page.
  if (!hasGSAP) {
    var l = $('#loader'); if (l) l.remove();
    document.body.classList.remove('is-loading');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(Flip);

  /* ------------------------------------------------------------------ */
  /* Smooth scroll                                                       */
  /* ------------------------------------------------------------------ */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else {
      var el = typeof target === 'string' ? $(target) : target;
      if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
      else if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = $(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(id === '#top' ? 0 : el);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Text splitting helpers                                              */
  /* ------------------------------------------------------------------ */
  function splitChars(el) {
    var text = el.textContent;
    el.textContent = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement('span');
      s.className = 'char';
      s.textContent = text[i] === ' ' ? ' ' : text[i];
      frag.appendChild(s);
    }
    el.appendChild(frag);
    return $$('.char', el);
  }

  function splitWords(el) {
    var words = [];
    (function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (k) {
        if (k.nodeType === 3) {
          var parts = k.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'word';
            w.textContent = p;
            frag.appendChild(w);
            words.push(w);
          });
          node.replaceChild(frag, k);
        } else if (k.nodeType === 1 && k.tagName !== 'BR') {
          walk(k);
        }
      });
    })(el);
    return words;
  }

  /* ------------------------------------------------------------------ */
  /* Loom canvas (hero)                                                  */
  /* ------------------------------------------------------------------ */
  var loom = (function () {
    var canvas = $('#loom');
    if (!canvas) return { start: function () {} };
    var ctx = canvas.getContext('2d');
    var hero = $('.hero');
    var w, h, dpr, threads = [], wefts = [], mouse = { x: -9999, y: -9999, f: 0, tf: 0 };
    var running = false, visible = true, t0 = performance.now(), lastShot = 0;
    var palette = [[54, 56, 176], [9, 144, 218], [27, 198, 247]];

    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function colorAt(t) { return t < .5 ? mix(palette[0], palette[1], t * 2) : mix(palette[1], palette[2], (t - .5) * 2); }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var gap = w < 700 ? 20 : 15;
      var n = Math.ceil(w / gap) + 2;
      threads = [];
      for (var i = 0; i < n; i++) {
        var c = colorAt(i / n);
        threads.push({ x: i * gap - gap / 2, dx: 0, v: 0, ph: Math.random() * Math.PI * 2, c: c, a: .12 + Math.random() * .16 });
      }
      if (reduce) draw(performance.now());
    }

    function shoot(now) {
      wefts.push({ y: h * (.12 + Math.random() * .76), born: now, speed: .9 + Math.random() * .7, dir: Math.random() > .5 ? 1 : -1, c: colorAt(Math.random()) });
      if (wefts.length > 6) wefts.shift();
    }

    function draw(now) {
      var t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      mouse.f += (mouse.tf - mouse.f) * .06;
      var R = Math.min(220, w * .18);

      // warp threads
      for (var i = 0; i < threads.length; i++) {
        var th = threads[i];
        var d = th.x - mouse.x;
        var push = 0;
        if (Math.abs(d) < R * 2.5) push = Math.sign(d || 1) * Math.exp(-(d * d) / (2 * R * R)) * 70 * mouse.f;
        var idle = Math.sin(t * .8 + th.ph + i * .05) * 3;
        var target = push + idle;
        th.v += (target - th.dx) * .06;
        th.v *= .82;
        th.dx += th.v;

        var cy = mouse.f > .02 ? mouse.y : h * .5;
        var glow = Math.min(1, Math.abs(th.dx) / 40);
        var a = th.a + glow * .5;
        ctx.strokeStyle = 'rgba(' + (th.c[0] | 0) + ',' + (th.c[1] | 0) + ',' + (th.c[2] | 0) + ',' + a.toFixed(3) + ')';
        ctx.lineWidth = 1 + glow * .6;
        ctx.beginPath();
        ctx.moveTo(th.x, -10);
        ctx.quadraticCurveTo(th.x + th.dx * 2, cy, th.x, h + 10);
        ctx.stroke();
      }

      // weft shots (shuttle)
      if (!reduce && now - lastShot > 1400) { shoot(now); lastShot = now; }
      for (var j = 0; j < wefts.length; j++) {
        var wf = wefts[j];
        var age = (now - wf.born) / 1000;
        var prog = Math.min(1, age * wf.speed * .55);
        var fade = Math.max(0, 1 - Math.max(0, age - 1.6) / 1.4);
        if (fade <= 0) continue;
        var head = wf.dir > 0 ? prog * w : w - prog * w;
        var x0 = wf.dir > 0 ? 0 : w;
        var grad = ctx.createLinearGradient(x0, 0, head, 0);
        grad.addColorStop(0, 'rgba(' + (wf.c[0] | 0) + ',' + (wf.c[1] | 0) + ',' + (wf.c[2] | 0) + ',0)');
        grad.addColorStop(1, 'rgba(' + (wf.c[0] | 0) + ',' + (wf.c[1] | 0) + ',' + (wf.c[2] | 0) + ',' + (.55 * fade).toFixed(3) + ')');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // weave: small over/under undulation
        for (var x = Math.min(x0, head); x <= Math.max(x0, head); x += 15) {
          var yy = wf.y + Math.sin(x / 15 * Math.PI) * 1.6;
          if (x === Math.min(x0, head)) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
        if (prog < 1) {
          var g = ctx.createRadialGradient(head, wf.y, 0, head, wf.y, 26);
          g.addColorStop(0, 'rgba(27,198,247,' + (.9 * fade) + ')');
          g.addColorStop(1, 'rgba(27,198,247,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(head, wf.y, 26, 0, Math.PI * 2); ctx.fill();
        }
      }

      // cursor halo
      if (mouse.f > .02) {
        var hg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R);
        hg.addColorStop(0, 'rgba(9,144,218,' + (.12 * mouse.f) + ')');
        hg.addColorStop(1, 'rgba(9,144,218,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(mouse.x - R, mouse.y - R, R * 2, R * 2);
      }
    }

    function loop(now) {
      if (!running) return;
      if (visible) draw(now);
      requestAnimationFrame(loop);
    }

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.tf = 1;
    });
    hero.addEventListener('pointerleave', function () { mouse.tf = 0; });
    window.addEventListener('resize', debounce(resize, 150));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
    }
    resize();

    return {
      start: function () {
        if (reduce) { draw(performance.now()); return; }
        if (running) return;
        running = true; requestAnimationFrame(loop);
      }
    };
  })();

  /* ------------------------------------------------------------------ */
  /* Preloader → hero intro                                              */
  /* ------------------------------------------------------------------ */
  var heroChars = [];
  $$('.hero [data-split]').forEach(function (el) { heroChars = heroChars.concat(splitChars(el)); });
  gsap.set(heroChars, { yPercent: 115 });
  gsap.set('.ht-pill', { scaleX: 0 });
  gsap.set('.hero [data-fade], .hero-top, .scroll-hint', { autoAlpha: 0, y: 24 });

  function heroIntro() {
    loom.start();
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(heroChars, { yPercent: 0, duration: 1.4, stagger: .025 })
      .to('.ht-pill', { scaleX: 1, duration: 1.4, stagger: .15 }, .35)
      .to('.hero-top, .hero [data-fade], .scroll-hint', { autoAlpha: 1, y: 0, duration: 1.2, stagger: .08 }, .55)
      .from('.header', { yPercent: -100, autoAlpha: 0, duration: 1.2, clearProps: 'transform,opacity,visibility' }, .5);
    return tl;
  }

  (function preloader() {
    var loader = $('#loader');
    var finish = function () {
      document.body.classList.remove('is-loading');
      if (lenis) lenis.start();
      heroIntro();
      ScrollTrigger.refresh();
    };
    if (!loader || reduce) { if (loader) loader.remove(); finish(); return; }

    loader.style.animation = 'none';
    var counter = { v: 0 };
    var countEl = $('#loader-count');
    var bar = $('#loader-bar');
    var loaded = false;
    window.addEventListener('load', function () { loaded = true; });
    if (document.readyState === 'complete') loaded = true;

    var tl = gsap.timeline();
    tl.from('.loader-mark', { scale: 0, rotation: -120, opacity: 0, duration: 1.1, ease: 'back.out(1.6)' })
      .to('.loader-glow', { opacity: 1, duration: 1, ease: 'power2.out' }, .3)
      .fromTo('.loader-wordmark', { clipPath: 'inset(0 100% 0 0)', x: -20 }, { clipPath: 'inset(0 0% 0 0)', x: 0, duration: 1.1, ease: 'expo.inOut' }, .35)
      .from('.loader-meta, .loader-bar', { opacity: 0, duration: .6 }, .3)
      .to(counter, {
        v: 100, duration: 1.5, ease: 'power2.inOut',
        onUpdate: function () { countEl.textContent = Math.round(counter.v); bar.style.transform = 'scaleX(' + counter.v / 100 + ')'; }
      }, .2)
      .add(function () {
        // wait for window load (max 3.5s extra)
        if (loaded) return;
        tl.pause();
        var resume = function () { tl.resume(); };
        window.addEventListener('load', resume, { once: true });
        setTimeout(resume, 2500);
      })
      .to('.loader-logo', { y: -30, opacity: 0, duration: .6, ease: 'expo.in' })
      .to('.loader-meta, .loader-bar', { y: -20, opacity: 0, duration: .5, ease: 'expo.in' }, '<')
      .to('.loader-panel-a', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=.2')
      .to('.loader-panel-b', { yPercent: 100, duration: 1, ease: 'expo.inOut' }, '<')
      .add(finish, '-=.8')
      .add(function () { loader.remove(); });
  })();

  /* ------------------------------------------------------------------ */
  /* Header, progress & theme                                            */
  /* ------------------------------------------------------------------ */
  var header = $('#header');
  var progress = $('#progress');
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    header.classList.toggle('is-scrolled', y > 40);
    if (!document.body.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > lastY && y > 400);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  $$('[data-theme]').forEach(function (sec) {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: function (self) { if (self.isActive) document.body.classList.toggle('theme-light', sec.dataset.theme === 'light'); }
    });
  });

  // nav active state
  $$('.nav-link').forEach(function (link) {
    var target = $(link.getAttribute('href'));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target, start: 'top 50%', end: 'bottom 50%',
      onToggle: function (self) { link.classList.toggle('is-active', self.isActive); }
    });
  });

  /* ------------------------------------------------------------------ */
  /* Menu                                                                */
  /* ------------------------------------------------------------------ */
  var menuBtn = $('#menu-btn');
  var menu = $('#menu');
  var menuTl = gsap.timeline({ paused: true })
    .to('.menu-bg', { clipPath: 'circle(150% at calc(100% - 44px) 40px)', duration: 1, ease: 'expo.inOut' })
    .to('.menu-nav .menu-num, .menu-nav .menu-text', { y: 0, yPercent: 0, duration: .9, ease: 'expo.out', stagger: .04 }, '-=.45')
    .to('.menu-foot', { opacity: 1, duration: .6 }, '-=.6');
  gsap.set('.menu-nav .menu-num, .menu-nav .menu-text', { yPercent: 110 });

  function openMenu() {
    document.body.classList.add('menu-open');
    header.classList.remove('is-hidden');
    menuBtn.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
    menuTl.timeScale(1).play();
  }
  function closeMenu() {
    if (!document.body.classList.contains('menu-open')) return;
    menuBtn.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
    menuTl.timeScale(1.6).reverse();
    menuTl.eventCallback('onReverseComplete', function () { document.body.classList.remove('menu-open'); });
  }
  if (menuBtn) menuBtn.addEventListener('click', function () {
    document.body.classList.contains('menu-open') && menuTl.reversed() === false ? closeMenu() : openMenu();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ------------------------------------------------------------------ */
  /* Image expand reveal                                                 */
  /* ------------------------------------------------------------------ */
  (function () {
    var sec = $('.reveal'); if (!sec) return;
    var tl = gsap.timeline({
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: reduce ? false : 1 }
    });
    tl.to('#reveal-frame', { width: '100vw', height: '100vh', borderRadius: 0, ease: 'none' }, 0)
      .to('#reveal-frame img', { scale: 1, ease: 'none' }, 0)
      .to('.reveal-word-l', { xPercent: -60, ease: 'none' }, 0)
      .to('.reveal-word-r', { xPercent: 60, ease: 'none' }, 0)
      .to('.reveal-copy', { autoAlpha: 0, ease: 'none', duration: .35 }, .55)
      .to('.reveal-shade', { opacity: 1, ease: 'none', duration: .4 }, .6);
  })();

  /* ------------------------------------------------------------------ */
  /* Marquee - velocity-reactive                                         */
  /* ------------------------------------------------------------------ */
  $$('.marquee-row').forEach(function (row) {
    var track = $('.marquee-track', row);
    var clone = track.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); row.appendChild(clone);
    var clone2 = track.cloneNode(true); clone2.setAttribute('aria-hidden', 'true'); row.appendChild(clone2);
    var tracks = $$('.marquee-track', row);
    var dir = parseFloat(row.dataset.speed) || 1;
    var x = 0, boost = 0;
    if (reduce) return;
    gsap.ticker.add(function (t, dt) {
      var vel = lenis ? lenis.velocity : 0;
      boost += ((Math.abs(vel) * .35) - boost) * .1;
      var width = track.offsetWidth;
      x -= dir * (0.6 + boost) * (dt / 16);
      if (x <= -width) x += width;
      if (x > 0) x -= width;
      var skew = 0;
      for (var i = 0; i < tracks.length; i++) tracks[i].style.transform = 'translate3d(' + x + 'px,0,0) skewX(' + skew + 'deg)';
    });
  });

  /* ------------------------------------------------------------------ */
  /* Counters                                                            */
  /* ------------------------------------------------------------------ */
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count);
    var from = parseFloat(el.dataset.from || 0);
    var o = { v: from };
    el.textContent = reduce ? end : from;
    if (reduce) return;
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: function () {
        gsap.to(o, { v: end, duration: 2.2, ease: 'expo.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
      }
    });
  });
  if (!reduce) {
    var gl = gsap.timeline({ scrollTrigger: { trigger: '.glance', start: 'top 85%' } });
    gl.from('.glance-panel', { y: 60, autoAlpha: 0, duration: 1.3, ease: 'expo.out' })
      .from('.glance-head > *', { y: 16, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .08 }, .2)
      .from('.glance-cell', { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .08 }, .3)
      .from('.glance-ico', { scale: .4, rotate: -20, duration: 1, ease: 'back.out(2)', stagger: .08 }, .4);
  }
  gsap.from('.stat', { scrollTrigger: { trigger: '.stats', start: 'top 80%' }, y: 50, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: .1 });

  /* ------------------------------------------------------------------ */
  /* Generic reveals                                                     */
  /* ------------------------------------------------------------------ */
  if (!reduce) {
    // heading word reveal
    $$('.display').forEach(function (el) {
      var words = splitWords(el);
      gsap.from(words, {
        scrollTrigger: { trigger: el, start: 'top 85%' },
        yPercent: 60, autoAlpha: 0, rotate: 4, duration: 1.2, ease: 'expo.out', stagger: .05
      });
    });
    $$('.label').forEach(function (el) {
      gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 90%' }, x: -20, autoAlpha: 0, duration: 1, ease: 'expo.out' });
    });
    $$('[data-fade]').forEach(function (el) {
      if (el.closest('.hero')) return;
      gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 88%' }, y: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out' });
    });
    $$('.lead, .process-head .lead').forEach(function (el) {
      if (el.hasAttribute('data-fade')) return;
      gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 88%' }, y: 30, autoAlpha: 0, duration: 1.2, ease: 'expo.out' });
    });

    // parallax blocks
    $$('[data-parallax]').forEach(function (el) {
      var amt = parseFloat(el.dataset.parallax) || 10;
      gsap.to(el, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      var img = $('img', el);
      if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1.05, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.from('.about-img', { scrollTrigger: { trigger: '.about-media', start: 'top 80%' }, clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.inOut', stagger: .2 });
    gsap.from('.about-badge', { scrollTrigger: { trigger: '.about-media', start: 'top 70%' }, scale: 0, rotate: -120, duration: 1.4, ease: 'back.out(1.6)', delay: .6 });

    // leaders: clip reveal
    $$('[data-clip]').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 82%' } });
      gsap.fromTo($('img', el), { scale: 1.3 }, { scale: 1, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 82%' } });
    });
    gsap.from('.leader > p', { scrollTrigger: { trigger: '.leaders-grid', start: 'top 70%' }, y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .06 });

    // contact cards
    gsap.from('.c-card', { scrollTrigger: { trigger: '.c-cards', start: 'top 85%' }, y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .08 });
    gsap.from('.form', { scrollTrigger: { trigger: '.form', start: 'top 85%' }, y: 80, autoAlpha: 0, rotate: 2, duration: 1.4, ease: 'expo.out' });

    // footer wordmark
    gsap.from('.footer-word span', { scrollTrigger: { trigger: '.footer-word', start: 'top 95%' }, yPercent: 100, duration: 1.4, ease: 'expo.out', stagger: .07 });
  }

  /* ------------------------------------------------------------------ */
  /* Horizontal sections (timeline + products)                          */
  /* ------------------------------------------------------------------ */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function () {
    var setups = [];

    function horizontal(sectionSel, trackSel, onProgress, extraTween) {
      var sec = $(sectionSel), track = $(trackSel);
      if (!sec || !track) return;
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var setH = function () { sec.style.height = (dist() + window.innerHeight * 1.15) + 'px'; };
      setH();
      ScrollTrigger.addEventListener('refreshInit', setH);
      setups.push(function () { ScrollTrigger.removeEventListener('refreshInit', setH); sec.style.height = ''; });
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1, invalidateOnRefresh: true, onUpdate: onProgress }
      });
      if (extraTween) extraTween(tween);
    }

    horizontal('.timeline', '#timeline-track', function (self) {
      $('#timeline-bar').style.transform = 'scaleX(' + self.progress + ')';
    });

    var cur = $('#prod-current');
    horizontal('.products', '#products-track', function (self) {
      var n = Math.min(5, Math.floor(self.progress * 5.2) + 1);
      cur.textContent = '0' + n;
    }, function (tween) {
      $$('.prod-img img').forEach(function (img) {
        gsap.fromTo(img, { xPercent: -8 }, {
          xPercent: 8, ease: 'none',
          scrollTrigger: { trigger: img.closest('.prod'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
        });
      });
    });

    if (!reduce) {
      gsap.from('.tl-card', { scrollTrigger: { trigger: '.timeline', start: 'top 70%' }, y: 80, autoAlpha: 0, rotate: 3, duration: 1.2, ease: 'expo.out', stagger: .1 });
      gsap.from('.prod', { scrollTrigger: { trigger: '.products', start: 'top 70%' }, x: 120, autoAlpha: 0, duration: 1.4, ease: 'expo.out', stagger: .08 });
    }

    return function () { setups.forEach(function (f) { f(); }); };
  });

  /* ------------------------------------------------------------------ */
  /* Lens (Look closer)                                                  */
  /* ------------------------------------------------------------------ */
  (function () {
    var stage = $('#lens-stage'), lens = $('#lens'), img = $('#lens-img'), cap = $('#lens-cap');
    if (!stage) return;
    var Z = 3;
    function setBg(src) { lens.style.backgroundImage = 'url("' + src + '")'; }
    setBg(img.getAttribute('src'));
    function move(e) {
      var r = stage.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      lens.style.left = x + 'px'; lens.style.top = y + 'px';
      lens.style.backgroundSize = (r.width * Z) + 'px ' + (r.height * Z) + 'px';
      lens.style.backgroundPosition = (-(x * Z - 110)) + 'px ' + (-(y * Z - 110)) + 'px';
    }
    stage.addEventListener('pointerenter', function (e) { stage.classList.add('is-active'); move(e); });
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerleave', function () { stage.classList.remove('is-active'); });

    $$('.sw').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.classList.contains('is-active')) return;
        $$('.sw').forEach(function (o) { o.classList.remove('is-active'); o.setAttribute('aria-selected', 'false'); });
        b.classList.add('is-active'); b.setAttribute('aria-selected', 'true');
        var src = b.dataset.src;
        gsap.to(img, { autoAlpha: 0, scale: 1.08, duration: .35, ease: 'power2.in', onComplete: function () {
          img.src = src; setBg(src); cap.textContent = b.dataset.cap;
          var show = function () { gsap.fromTo(img, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: .9, ease: 'expo.out' }); };
          if (img.complete) show(); else img.onload = show;
        } });
      });
    });
    if (!reduce) gsap.from(stage, { scrollTrigger: { trigger: stage, start: 'top 85%' }, clipPath: 'inset(15% 15% 15% 15% round 28px)', duration: 1.6, ease: 'expo.inOut' });
  })();

  /* ------------------------------------------------------------------ */
  /* Process steps                                                       */
  /* ------------------------------------------------------------------ */
  (function () {
    var steps = $$('.step'), pvs = $$('.pv'), label = $('#process-label'), path = $('#process-path');
    var names = ['Design', 'Weaving', 'Finishing', 'Dispatch'];
    var current = 0;
    function activate(i) {
      if (i === current && steps[i].classList.contains('is-active')) return;
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      pvs.forEach(function (p, k) { p.classList.remove('was-active'); if (k === current && k !== i) p.classList.add('was-active'); p.classList.toggle('is-active', k === i); });
      current = i;
      if (label) label.textContent = 'Step 0' + (i + 1) + ' · ' + names[i];
    }
    steps[0] && steps[0].classList.add('is-active');
    steps.forEach(function (s, i) {
      ScrollTrigger.create({ trigger: s, start: 'top 60%', end: 'bottom 60%', onToggle: function (self) { if (self.isActive) activate(i); } });
    });
    if (path) {
      var len = path.getTotalLength();
      path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
      gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.process-steps', start: 'top 60%', end: 'bottom 60%', scrub: true } });
    }
  })();

  /* ------------------------------------------------------------------ */
  /* Values - spotlight + tilt                                           */
  /* ------------------------------------------------------------------ */
  $$('.vcard').forEach(function (card) {
    if (finePointer && !reduce) {
      var rx = gsap.quickTo(card, 'rotationX', { duration: .6, ease: 'power3' });
      var ry = gsap.quickTo(card, 'rotationY', { duration: .6, ease: 'power3' });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%'); card.style.setProperty('--my', (py * 100) + '%');
        rx((.5 - py) * 4); ry((px - .5) * 5);
      });
      card.addEventListener('pointerleave', function () { rx(0); ry(0); });
    }
  });
  if (!reduce) gsap.from('.vcard', { scrollTrigger: { trigger: '#values-grid', start: 'top 80%' }, y: 80, autoAlpha: 0, rotationX: -25, transformOrigin: '50% 100%', duration: 1.3, ease: 'expo.out', stagger: { each: .08, grid: 'auto', from: 'start' } });

  /* ------------------------------------------------------------------ */
  /* BHAG - scrubbed word highlight                                      */
  /* ------------------------------------------------------------------ */
  (function () {
    var el = $('#bhag-text'); if (!el) return;
    var words = splitWords(el);
    var hl = ['confidence', 'happiness', 'fashionable,', 'growth.'];
    words.forEach(function (w) { if (hl.indexOf(w.textContent) > -1) w.classList.add('hl'); });
    if (reduce) { gsap.set(words, { opacity: 1 }); return; }
    gsap.to(words, { opacity: 1, ease: 'none', stagger: .1, scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  })();

  /* ------------------------------------------------------------------ */
  /* Gallery - Flip filter + lightbox                                    */
  /* ------------------------------------------------------------------ */
  (function () {
    var grid = $('#g-grid'); if (!grid) return;
    var items = $$('.g-item', grid);
    var filtersWrap = $('.filters');
    var pill = document.createElement('span'); pill.className = 'filter-pill'; filtersWrap.appendChild(pill);
    function placePill(btn) { pill.style.left = btn.offsetLeft + 'px'; pill.style.width = btn.offsetWidth + 'px'; }
    var active = $('.filter.is-active'); placePill(active);
    window.addEventListener('resize', debounce(function () { placePill($('.filter.is-active')); }, 100));

    $$('.filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.filter').forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('is-active'); btn.setAttribute('aria-selected', 'true');
        placePill(btn);
        var f = btn.dataset.filter;
        var state = window.Flip ? Flip.getState(items) : null;
        items.forEach(function (it) { it.classList.toggle('is-hidden', f !== 'all' && it.dataset.cat !== f); });
        if (state && !reduce) {
          Flip.from(state, {
            duration: .8, ease: 'expo.inOut', scale: true, absolute: true, stagger: .02,
            onEnter: function (els) { return gsap.fromTo(els, { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .7, ease: 'expo.out' }); },
            onLeave: function (els) { return gsap.to(els, { opacity: 0, scale: .8, duration: .4 }); },
            onComplete: function () { ScrollTrigger.refresh(); }
          });
        } else { ScrollTrigger.refresh(); }
      });
    });

    if (!reduce) gsap.from(items, { scrollTrigger: { trigger: grid, start: 'top 85%' }, y: 60, autoAlpha: 0, scale: .94, duration: 1.2, ease: 'expo.out', stagger: .05 });

    // lightbox
    var lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap'), lbCount = $('#lb-count');
    var list = [], idx = 0, lastFocus = null;
    function visibleItems() { return items.filter(function (i) { return !i.classList.contains('is-hidden'); }); }
    function show(i, dir) {
      idx = (i + list.length) % list.length;
      var it = list[idx];
      var apply = function () {
        lbImg.src = it.dataset.full; lbImg.alt = $('img', it).alt;
        lbCap.textContent = it.dataset.caption.replace('&amp;', '&');
        lbCount.textContent = (idx + 1) + ' / ' + list.length;
        gsap.fromTo(lbImg, { x: (dir || 0) * 60, autoAlpha: 0, scale: dir ? 1 : .92 }, { x: 0, autoAlpha: 1, scale: 1, duration: .7, ease: 'expo.out' });
      };
      if (dir) gsap.to(lbImg, { x: -dir * 60, autoAlpha: 0, duration: .25, ease: 'power2.in', onComplete: apply }); else apply();
    }
    function open(it) {
      lastFocus = document.activeElement;
      list = visibleItems(); show(list.indexOf(it), 0);
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop();
      $('#lb-close').focus();
    }
    function close() {
      lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
      if (lenis) lenis.start();
      if (lastFocus) lastFocus.focus();
    }
    items.forEach(function (it) { it.addEventListener('click', function () { open(it); }); });
    $('#lb-close').addEventListener('click', close);
    $('#lb-prev').addEventListener('click', function () { show(idx - 1, -1); });
    $('#lb-next').addEventListener('click', function () { show(idx + 1, 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1, 1);
      if (e.key === 'ArrowLeft') show(idx - 1, -1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      sx = null;
    });
  })();

  /* ------------------------------------------------------------------ */
  /* Cursor + magnetic                                                   */
  /* ------------------------------------------------------------------ */
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3.out' });
      var my = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .15);
        my((e.clientY - r.top - r.height / 2) * .15);
      });
      el.addEventListener('pointerleave', function () { mx(0); my(0); });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Company film                                                        */
  /* ------------------------------------------------------------------ */
  (function () {
    var sec = $('#film'), video = $('#film-video'), cover = $('#film-play');
    if (!sec || !video) return;
    var btns = $$('#film-chapters button');
    var times = btns.map(function (b) { return parseFloat(b.dataset.t); });

    function seek(t) {
      if (typeof t !== 'number') return;
      var go = function () { try { video.currentTime = t; } catch (e) {} };
      if (video.readyState >= 1) go(); else video.addEventListener('loadedmetadata', go, { once: true });
    }
    function play(t) {
      if (video.readyState < 1) video.load();
      seek(t);
      video.controls = true;
      sec.classList.add('is-playing');
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    cover.addEventListener('click', function () { play(); });
    btns.forEach(function (b) { b.addEventListener('click', function () { play(parseFloat(b.dataset.t)); }); });

    video.addEventListener('timeupdate', function () {
      var t = video.currentTime, dur = video.duration || 94;
      btns.forEach(function (b, i) {
        var start = times[i], end = i < times.length - 1 ? times[i + 1] : dur;
        var active = t >= start && t < end;
        b.classList.toggle('is-active', active);
        b.style.setProperty('--p', (active ? Math.min(100, (t - start) / (end - start) * 100) : (t >= end ? 100 : 0)) + '%');
      });
    });
    video.addEventListener('ended', function () {
      sec.classList.remove('is-playing'); video.controls = false;
      btns.forEach(function (b) { b.classList.remove('is-active'); b.style.setProperty('--p', '0%'); });
    });

    // pause when the film scrolls out of view
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting && !video.paused) video.pause();
      }, { threshold: 0.15 }).observe(video);
    }

    if (!reduce) {
      gsap.fromTo('#film-frame', { clipPath: 'inset(8% 10% 8% 10% round 26px)', scale: .94 },
        { clipPath: 'inset(0% 0% 0% 0% round 26px)', scale: 1, ease: 'none',
          scrollTrigger: { trigger: '#film-frame', start: 'top 95%', end: 'top 35%', scrub: true } });
      gsap.from('#film-chapters li', { scrollTrigger: { trigger: '#film-chapters', start: 'top 85%' }, x: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .07 });
    }
  })();

  /* ------------------------------------------------------------------ */
  /* Back to top                                                         */
  /* ------------------------------------------------------------------ */
  var toTop = $('#to-top');
  if (toTop) toTop.addEventListener('click', function () { scrollToTarget(0); });

  /* ------------------------------------------------------------------ */
  /* Enquiry form - validation + mailto handoff                         */
  /* ------------------------------------------------------------------ */
  (function () {
    var form = $('#enquiry-form'), note = $('#form-note');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('[required]', form).forEach(function (f) {
        var bad = !f.value.trim() || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
        f.closest('.field').classList.toggle('is-error', bad);
        if (bad) ok = false;
      });
      if (!ok) {
        note.textContent = 'Please fill in the highlighted fields.';
        note.classList.add('is-error');
        gsap.fromTo(form, { x: -10 }, { x: 0, duration: .6, ease: 'elastic.out(1, .3)' });
        return;
      }
      note.classList.remove('is-error');
      var d = new FormData(form);
      var body = 'Name: ' + d.get('name') + '\nCompany: ' + (d.get('company') || '-') + '\nEmail: ' + d.get('email') +
        '\nPhone: ' + (d.get('phone') || '-') + '\nRequirement: ' + (d.get('requirement') || '-') + '\n\n' + d.get('message');
      var subject = 'Website enquiry' + (d.get('requirement') ? ': ' + d.get('requirement') : '');
      note.textContent = 'Opening your email app…';
      window.location.href = 'mailto:info@ruchi-group.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
    $$('input, textarea', form).forEach(function (f) {
      f.addEventListener('input', function () { var fl = f.closest('.field'); if (fl) fl.classList.remove('is-error'); });
    });
  })();

  /* ------------------------------------------------------------------ */
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
