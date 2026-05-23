/* ═══════════════════════════════════════════════════════════════════
   Douglas Torres Portfolio — main.js
   Progressive enhancement: all features check for DOM existence.
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ── Helpers ────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ── Scroll progress bar ────────────────────────────────────────── */
function initScrollProgress() {
  const bar = $('#scroll-progress');
  if (!bar) return;

  const update = () => {
    const max  = document.documentElement.scrollHeight - window.innerHeight;
    const pct  = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct.toFixed(2) + '%';
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ── Custom cursor (desktop only) ───────────────────────────────── */
function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const dot  = $('#cursor-dot');
  const ring = $('#cursor-ring');
  if (!dot || !ring) return;

  let cx = 0, cy = 0;   // cursor position (raw)
  let rx = 0, ry = 0;   // ring position (lagging)
  let rafId;

  document.addEventListener('mousemove', e => {
    cx = e.clientX;
    cy = e.clientY;
    dot.style.transform = `translate(${cx}px, ${cy}px)`;
  });

  const lerp = (a, b, t) => a + (b - a) * t;

  function tick() {
    rx = lerp(rx, cx, 0.12);
    ry = lerp(ry, cy, 0.12);
    ring.style.transform = `translate(${rx.toFixed(2)}px, ${ry.toFixed(2)}px)`;
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  // Expand ring on interactive elements
  $$('a, button, [data-magnetic], input, textarea, .project-card').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('expanded'));
    el.addEventListener('mouseleave', () => ring.classList.remove('expanded'));
  });

  // Cleanup on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      rafId = requestAnimationFrame(tick);
    }
  });
}

/* ── Nav: blur on scroll + active link highlight ────────────────── */
function initNav() {
  const nav = $('#nav');
  if (!nav) return;

  const updateNav = () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  };

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // Smooth active section highlighting
  const sections = $$('section[id], section.section[id]');
  const navLinks  = $$('.nav-links a[href^="#"]');

  const sectionObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(a => {
            a.style.color = a.getAttribute('href') === `#${id}` && !a.classList.contains('nav-cta')
              ? 'var(--text)'
              : '';
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach(s => sectionObserver.observe(s));
}

/* ── Mobile menu ────────────────────────────────────────────────── */
function initMobileMenu() {
  const burger  = $('#nav-burger');
  const menu    = $('#mobile-menu');
  const overlay = $('#mobile-overlay');
  if (!burger || !menu || !overlay) return;

  let isOpen = false;

  function open() {
    isOpen = true;
    burger.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    menu.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    isOpen = false;
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => { isOpen ? close() : open(); });
  overlay.addEventListener('click', close);

  // Close on nav link click
  $$('.mobile-link').forEach(link => {
    link.addEventListener('click', close);
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) close();
  });
}

/* ── Scroll reveal (IntersectionObserver) ────────────────────────── */
function initScrollReveal() {
  const elements = $$('[data-reveal]');
  if (!elements.length) return;

  // Stagger siblings inside reveal containers
  $$('.work-grid, .services-grid').forEach(grid => {
    const cards = $$('[data-reveal]', grid);
    cards.forEach((card, i) => {
      card.style.transitionDelay = `${i * 0.08}s`;
    });
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '-40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

/* ── Counter animation ──────────────────────────────────────────── */
function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length) return;

  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function animateCounter(el, target, duration = 1600) {
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      el.textContent = Math.round(easeOut(progress) * target);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.dataset.count, 10);
          animateCounter(entry.target, target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
}

/* ── 3D card tilt effect ────────────────────────────────────────── */
function initCardTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip touch

  const cards = $$('[data-tilt]');
  const INTENSITY = 8; // max degrees

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
      card.style.transform = [
        `perspective(900px)`,
        `rotateY(${(x * INTENSITY).toFixed(2)}deg)`,
        `rotateX(${(-y * INTENSITY * 0.7).toFixed(2)}deg)`,
        `scale(1.015)`
      ].join(' ');
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ── Contact form ────────────────────────────────────────────────── */
function initContactForm() {
  const form    = $('#contact-form');
  const submit  = $('#form-submit');
  const success = $('#form-success');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    // Simple client-side validation
    const name    = $('#name', form).value.trim();
    const email   = $('#email', form).value.trim();
    const message = $('#message', form).value.trim();

    if (!name || !email || !message) {
      if (success) { success.style.color = 'var(--accent)'; success.textContent = 'Por favor completa los campos requeridos.'; }
      return;
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      if (success) { success.style.color = 'var(--accent)'; success.textContent = 'Por favor ingresa un email válido.'; }
      return;
    }

    // Simulate send (replace with actual fetch/EmailJS/FormSpree)
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Enviando…';
    }

    setTimeout(() => {
      if (success) {
        success.style.color = '#4ade80';
        success.textContent = '✓ Mensaje enviado. Te respondo en menos de 24 horas.';
      }
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = 'Mensaje enviado ✓';
        submit.style.background = 'rgba(34,197,94,0.15)';
        submit.style.borderColor = 'rgba(34,197,94,0.4)';
        submit.style.color = '#4ade80';
      }
      form.reset();
    }, 900);
  });
}

/* ── Smooth link scroll (fallback for older browsers) ───────────── */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = $(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ── Parallax hero orbs on scroll ───────────────────────────────── */
function initParallaxOrbs() {
  const orb1 = $('.orb-1');
  const orb2 = $('.orb-2');
  if (!orb1 || !orb2) return;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight * 1.5) {
      orb1.style.transform = `translateY(${y * 0.15}px)`;
      orb2.style.transform = `translateY(${y * -0.1}px)`;
    }
  }, { passive: true });
}

/* ── Work filter tabs ────────────────────────────────────────────── */
function initWorkFilters() {
  const filters = $$('.work-filter');
  const cards   = $$('.project-card');
  if (!filters.length) return;

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      filters.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');

      const cat = btn.dataset.filter;

      cards.forEach((card, i) => {
        const cardCat = card.dataset.category || 'backend';
        const show = cat === 'all' || cat === cardCat;

        if (show) {
          card.style.display = '';
          // Re-trigger reveal with stagger
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'none';
          }, i * 40);
        } else {
          card.style.display = 'none';
        }
      });

      // Fix featured card layout when filtering
      const featured = $('.project-card--featured');
      if (featured && featured.style.display !== 'none' && cat !== 'all') {
        featured.style.gridColumn = 'auto';
        featured.style.gridTemplateColumns = '1fr';
      } else if (featured && cat === 'all') {
        featured.style.gridColumn = '';
        featured.style.gridTemplateColumns = '';
      }
    });
  });
}

/* ── Template card clicks ────────────────────────────────────────── */
function initTemplateLinks() {
  $$('[data-href]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      // Don't navigate if clicking a tag
      if (e.target.classList.contains('tag')) return;
      window.open(card.dataset.href, '_blank');
    });
  });
}

/* ── Init all on DOMContentLoaded ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initCursor();
  initNav();
  initMobileMenu();
  initScrollReveal();
  initCounters();
  initCardTilt();
  initContactForm();
  initSmoothScroll();
  initParallaxOrbs();
  initWorkFilters();
  initTemplateLinks();
});
