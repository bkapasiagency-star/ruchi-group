(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('reveal-ready');

  /* ------------------------------------------------------------------ */
  /* Smooth scroll (Lenis) — graceful no-op if the CDN script fails     */
  /* ------------------------------------------------------------------ */
  var lenis = null;
  if (!prefersReduced && window.Lenis) {
    try {
      lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      if (window.gsap) {
        lenis.on('scroll', window.ScrollTrigger && window.ScrollTrigger.update);
        window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        window.gsap.ticker.lagSmoothing(0);
      }
    } catch (e) { lenis = null; }
  }

  var hasGSAP = !!window.gsap;
  if (hasGSAP && window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);

  /* ------------------------------------------------------------------ */
  /* Header: scroll state + active link + mobile menu                   */
  /* ------------------------------------------------------------------ */
  var header = document.getElementById('site-header');
  var navToggle = document.getElementById('nav-toggle');
  var mobileNav = document.getElementById('mobile-nav');

  var scrollProgress = document.getElementById('scroll-progress');
  function onScroll() {
    if (window.scrollY > 24) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');

    if (scrollProgress) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? window.scrollY / max : 0;
      scrollProgress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, pct)) + ')';
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function closeMobileNav() {
    mobileNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  navToggle.addEventListener('click', function () {
    var open = mobileNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.querySelectorAll('[data-nav]').forEach(function (link) {
    link.addEventListener('click', closeMobileNav);
  });

  var navLinks = document.querySelectorAll('.main-nav a[data-nav]');
  var sections = Array.prototype.map.call(navLinks, function (a) {
    return document.querySelector(a.getAttribute('href'));
  }).filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { sectionObserver.observe(s); });
  }

  /* ------------------------------------------------------------------ */
  /* Magnetic buttons                                                    */
  /* ------------------------------------------------------------------ */
  if (!prefersReduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.btn-magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.32 + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'translate(0,0)';
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Custom cursor — fine-pointer desktops only                          */
  /* ------------------------------------------------------------------ */
  var fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fineHover && !prefersReduced) {
    document.documentElement.classList.add('has-cursor');
    var cursorDot = document.getElementById('cursor-dot');
    var cursorRing = document.getElementById('cursor-ring');
    var ringLabel = cursorRing ? cursorRing.querySelector('.cursor-ring-label') : null;
    var mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;

    window.addEventListener('mousemove', function (e) {
      mouseX = e.clientX; mouseY = e.clientY;
      if (cursorDot) cursorDot.style.transform = 'translate3d(' + mouseX + 'px,' + mouseY + 'px,0)';
    });

    function cursorLoop() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (cursorRing) cursorRing.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0)';
      requestAnimationFrame(cursorLoop);
    }
    requestAnimationFrame(cursorLoop);

    function setCursorMode(mode, label) {
      if (!cursorRing) return;
      cursorRing.classList.remove('is-link', 'is-view', 'is-drag', 'is-hidden');
      if (mode) cursorRing.classList.add(mode);
      if (ringLabel) ringLabel.textContent = label || '';
    }

    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('.gallery-item, .lightbox-nav, .lightbox-close')) {
        setCursorMode('is-view', 'View');
      } else if (e.target.closest('.product-item')) {
        setCursorMode('is-link', '');
      } else if (e.target.closest('[data-lens]')) {
        setCursorMode('is-hidden', '');
      } else if (e.target.closest('input, textarea, select')) {
        setCursorMode('is-hidden', '');
      } else if (e.target.closest('a, button, .filter-btn, .tilt-el')) {
        setCursorMode('is-link', '');
      }
    });
    document.addEventListener('mouseout', function (e) {
      var to = e.relatedTarget;
      if (!to || !to.closest || !to.closest('a, button, .filter-btn, .tilt-el, .gallery-item, .product-item, input, textarea, select, [data-lens]')) {
        setCursorMode('', '');
      }
    });
    document.addEventListener('mouseleave', function () { setCursorMode('is-hidden', ''); });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal                                                       */
  /* ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ------------------------------------------------------------------ */
  /* Section heading mask-reveal                                         */
  /* Observe the outer .reveal-mask wrapper, not the inner span — the    */
  /* inner span starts translateY(100%) inside an overflow:hidden        */
  /* parent, so it is permanently clipped to zero and an observer        */
  /* watching it directly would never report an intersection.            */
  /* ------------------------------------------------------------------ */
  var maskWraps = document.querySelectorAll('.reveal-mask');
  if ('IntersectionObserver' in window && maskWraps.length) {
    var maskObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var inner = entry.target.querySelector('.reveal-mask-inner');
          if (inner) inner.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
    maskWraps.forEach(function (el) { maskObserver.observe(el); });
  } else {
    document.querySelectorAll('.reveal-mask-inner').forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ------------------------------------------------------------------ */
  /* Tilt-on-hover (product visual, capability cards)                    */
  /* ------------------------------------------------------------------ */
  if (!prefersReduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.tilt-el').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--tiltX', (px * 8).toFixed(2) + 'deg');
        el.style.setProperty('--tiltY', (py * -8).toFixed(2) + 'deg');
      });
      el.addEventListener('mouseleave', function () {
        el.style.setProperty('--tiltX', '0deg');
        el.style.setProperty('--tiltY', '0deg');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero mouse parallax                                                 */
  /* ------------------------------------------------------------------ */
  var heroMedia = document.querySelector('.hero-media');
  if (heroMedia && !prefersReduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelector('.hero').addEventListener('mousemove', function (e) {
      var r = this.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      heroMedia.style.transform = 'translate(' + (px * -14).toFixed(1) + 'px,' + (py * -10).toFixed(1) + 'px)';
    });
    document.querySelector('.hero').addEventListener('mouseleave', function () {
      heroMedia.style.transform = 'translate(0,0)';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero line reveal + stagger                                          */
  /* ------------------------------------------------------------------ */
  if (hasGSAP && !prefersReduced) {
    var tl = window.gsap.timeline({ delay: 0.15 });
    tl.fromTo('[data-reveal-line]', { yPercent: 110 }, {
      yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.12
    })
    .fromTo('.hero-content [data-reveal]', { opacity: 0, y: 20 }, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12
    }, '-=0.6');
  } else {
    document.querySelectorAll('.hero [data-reveal-line], .hero [data-reveal]').forEach(function (el) {
      el.style.opacity = 1; el.style.transform = 'none';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Stat counters                                                       */
  /* ------------------------------------------------------------------ */
  var counters = document.querySelectorAll('[data-count]');
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (prefersReduced || !hasGSAP) { el.textContent = target; return; }
    var obj = { val: 0 };
    window.gsap.to(obj, {
      val: target, duration: 1.6, ease: 'power2.out',
      onUpdate: function () { el.textContent = Math.round(obj.val); }
    });
  }
  if ('IntersectionObserver' in window && counters.length) {
    var counterObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { counterObserver.observe(c); });
  } else {
    counters.forEach(function (c) { c.textContent = c.getAttribute('data-count'); });
  }

  /* ------------------------------------------------------------------ */
  /* Look Closer — subtle scroll scale                                   */
  /* ------------------------------------------------------------------ */
  if (hasGSAP && window.ScrollTrigger && !prefersReduced) {
    document.querySelectorAll('.texture-frame img').forEach(function (img) {
      window.gsap.to(img, {
        scale: 1.0,
        ease: 'none',
        scrollTrigger: {
          trigger: img.closest('.texture-frame'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Look Closer — magnifier lens                                        */
  /* ------------------------------------------------------------------ */
  if (fineHover && !prefersReduced) {
    var LENS_ZOOM = 2.6;
    document.querySelectorAll('[data-lens]').forEach(function (frame) {
      var lens = frame.querySelector('.lens');
      if (!lens) return;
      var lensSize = 190;
      frame.addEventListener('mousemove', function (e) {
        var r = frame.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;
        lens.style.transform = 'translate(' + (x - lensSize / 2) + 'px,' + (y - lensSize / 2) + 'px)';
        // Magnify relative to the frame's actual rendered size, not the lens's
        // own box — a fixed background-size % (of the lens) barely differs
        // from how the image already looks at full display scale.
        lens.style.backgroundSize = (r.width * LENS_ZOOM) + 'px ' + (r.height * LENS_ZOOM) + 'px';
        var bgX = -(x * LENS_ZOOM - lensSize / 2);
        var bgY = -(y * LENS_ZOOM - lensSize / 2);
        lens.style.backgroundPosition = bgX + 'px ' + bgY + 'px';
        frame.classList.add('is-lens-active');
      });
      frame.addEventListener('mouseleave', function () {
        frame.classList.remove('is-lens-active');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* About — timeline scroll-linked progress line                        */
  /* ------------------------------------------------------------------ */
  var timelineFill = document.getElementById('timeline-fill');
  var timelineItems = document.querySelectorAll('.timeline li');
  if (timelineFill && hasGSAP && window.ScrollTrigger && !prefersReduced) {
    window.gsap.to(timelineFill, {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.timeline-wrap',
        start: 'top 65%',
        end: 'bottom 75%',
        scrub: 0.4
      }
    });
  } else if (timelineFill) {
    timelineFill.style.height = '100%';
  }
  if ('IntersectionObserver' in window && timelineItems.length) {
    var timelineObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-active', entry.isIntersecting);
      });
    }, { threshold: 0.6, rootMargin: '-20% 0px -20% 0px' });
    timelineItems.forEach(function (li) { timelineObserver.observe(li); });
  }

  /* ------------------------------------------------------------------ */
  /* Product showcase — click + scroll driven                            */
  /* ------------------------------------------------------------------ */
  var productItems = document.querySelectorAll('.product-item');
  var productImages = document.querySelectorAll('.product-image');
  var productCounter = document.querySelector('[data-product-counter]');
  var productProgressFill = document.getElementById('product-progress-fill');
  var productTotal = productItems.length || 5;

  function setActiveProduct(index) {
    var indexStr = String(index);
    var indexNum = parseInt(index, 10);
    productItems.forEach(function (item) {
      item.classList.toggle('is-active', item.getAttribute('data-product-tab') === indexStr);
    });
    productImages.forEach(function (img) {
      img.classList.toggle('is-active', img.getAttribute('data-product-image') === indexStr);
    });
    if (productCounter) productCounter.textContent = String(indexNum + 1).padStart(2, '0');
    if (productProgressFill) {
      var step = 100 / productTotal;
      productProgressFill.style.top = (indexNum * step) + '%';
      productProgressFill.style.height = step + '%';
    }
  }

  productItems.forEach(function (item) {
    item.addEventListener('click', function () {
      setActiveProduct(item.getAttribute('data-product-tab'));
    });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveProduct(item.getAttribute('data-product-tab'));
      }
    });
  });

  if ('IntersectionObserver' in window && productItems.length) {
    var productObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          setActiveProduct(entry.target.getAttribute('data-product-tab'));
        }
      });
    }, { threshold: [0.5] });
    productItems.forEach(function (item) { productObserver.observe(item); });
  }

  /* ------------------------------------------------------------------ */
  /* Gallery — staggered reveal + filter                                 */
  /* ------------------------------------------------------------------ */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var galleryItems = document.querySelectorAll('.gallery-item');

  if ('IntersectionObserver' in window && galleryItems.length) {
    var galleryObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var i = Array.prototype.indexOf.call(galleryItems, entry.target);
          entry.target.style.transitionDelay = (Math.min(i % 6, 6) * 0.07) + 's';
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    galleryItems.forEach(function (item) { galleryObserver.observe(item); });
  } else {
    galleryItems.forEach(function (item) { item.classList.add('is-visible'); });
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) {
        b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active'); btn.setAttribute('aria-selected', 'true');
      var filter = btn.getAttribute('data-filter');

      galleryItems.forEach(function (item, i) {
        var show = filter === 'all' || item.getAttribute('data-cat') === filter;
        if (show) {
          item.removeAttribute('data-hidden');
          item.style.transitionDelay = (Math.min(i % 6, 6) * 0.05) + 's';
          requestAnimationFrame(function () { item.classList.add('is-visible'); });
        } else {
          item.style.transitionDelay = '0s';
          item.classList.remove('is-visible');
          setTimeout(function () {
            if (!item.classList.contains('is-visible')) item.setAttribute('data-hidden', '');
          }, prefersReduced ? 0 : 400);
        }
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /* Lightbox                                                            */
  /* ------------------------------------------------------------------ */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxCaption = document.getElementById('lightbox-caption');
  var lightboxCounter = document.getElementById('lightbox-counter');
  var lightboxClose = document.getElementById('lightbox-close');
  var lightboxPrev = document.getElementById('lightbox-prev');
  var lightboxNext = document.getElementById('lightbox-next');
  var galleryList = Array.prototype.slice.call(galleryItems);
  var currentIndex = 0;

  function visibleItems() {
    return galleryList.filter(function (item) { return !item.hasAttribute('data-hidden'); });
  }

  function openLightbox(item) {
    var items = visibleItems();
    currentIndex = items.indexOf(item);
    renderLightbox(items);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  }

  function renderLightbox(items) {
    var item = items[currentIndex];
    if (!item) return;
    lightboxImg.src = item.getAttribute('data-full');
    lightboxImg.alt = item.getAttribute('data-caption') || '';
    lightboxImg.style.animation = 'none';
    void lightboxImg.offsetWidth;
    lightboxImg.style.animation = '';
    lightboxCaption.textContent = item.getAttribute('data-caption') || '';
    if (lightboxCounter) lightboxCounter.textContent = (currentIndex + 1) + ' / ' + items.length;
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function stepLightbox(dir) {
    var items = visibleItems();
    currentIndex = (currentIndex + dir + items.length) % items.length;
    renderLightbox(items);
  }

  galleryItems.forEach(function (item) {
    item.addEventListener('click', function () { openLightbox(item); });
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', function () { stepLightbox(-1); });
  lightboxNext.addEventListener('click', function () { stepLightbox(1); });
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') stepLightbox(1);
    if (e.key === 'ArrowLeft') stepLightbox(-1);
  });

  /* ------------------------------------------------------------------ */
  /* Contact form — client-side validation + mailto handoff              */
  /* No backend is wired up; this composes a pre-filled email so the      */
  /* enquiry reaches info@ruchi-group.com without fabricating a "sent"    */
  /* confirmation. Swap for a real form endpoint before go-live.          */
  /* ------------------------------------------------------------------ */
  var form = document.getElementById('enquiry-form');
  var formNote = document.getElementById('form-note');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    var data = new FormData(form);
    var name = data.get('name') || '';
    var company = data.get('company') || '';
    var email = data.get('email') || '';
    var phone = data.get('phone') || '';
    var requirement = data.get('requirement') || '';
    var message = data.get('message') || '';

    var subject = 'Fabric Enquiry: ' + name + (requirement ? ' (' + requirement + ')' : '');
    var body = [
      'Name: ' + name,
      'Company: ' + company,
      'Email: ' + email,
      'Phone: ' + phone,
      'Requirement: ' + requirement,
      '',
      message
    ].join('\n');

    var mailto = 'mailto:info@ruchi-group.com'
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(body);

    window.location.href = mailto;
    formNote.textContent = 'Opening your email app to send this enquiry to info@ruchi-group.com…';
    formNote.classList.add('is-shown');
  });

  /* ------------------------------------------------------------------ */
  /* Footer year                                                         */
  /* ------------------------------------------------------------------ */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
