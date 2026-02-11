
  document.addEventListener('DOMContentLoaded', function () {
    try { gsap.registerPlugin(SplitText, ScrollTrigger); } catch (e) {}

    // ---- Reusable helper: builds a "typing" timeline on an element (no wrapper) ----
    function buildTypingRevealTimeline(el, opts = {}) {
      const {
        // per-char animation time and stagger give the "typing" feel
        charDuration = 0.01,
        stagger = 0.012,
        ease = 'none',
        // optional caret
        caret = false,
        caretBlink = 0.6
      } = opts;

      // Split into characters (keep spacing)
      const split = new SplitText(el, { type: 'chars,words' });
      gsap.set(split.chars, {
        autoAlpha: 0,
        display: 'inline-block',
        whiteSpace: 'pre',    // keep spaces/newlines
        willChange: 'opacity, transform'
      });

      const tl = gsap.timeline();

      // ✅ If element has .text-indent, move that style to only the first char
      if (el.classList.contains('text-indent')) {
        el.classList.remove('text-indent');
        if (split.chars[0]) {
          split.chars[0].classList.add('text-indent');
        }
      }

      // Optional: simple blinking caret (positioned at the end of the text)
      let caretEl = null;
      if (caret) {
        caretEl = document.createElement('span');
        caretEl.className = 'typing-caret';
        // Basic inline caret styling; tweak in CSS as needed
        Object.assign(caretEl.style, {
          display: 'inline-block',
          width: '1ch',
          translate: '0 0',
          borderRight: '1px solid currentColor',
          marginLeft: '0.1ch',
          opacity: '0'
        });
        el.appendChild(caretEl);
        tl.to(caretEl, { opacity: 1, duration: 0.001 });
        tl.to(caretEl, {
          opacity: 0,
          repeat: -1,
          yoyo: true,
          duration: caretBlink,
          ease: 'none'
        }, '<');
      }

      // Characters reveal (typing effect)
      tl.to(split.chars, {
        autoAlpha: 1,
        duration: charDuration,
        ease,
        stagger: { each: stagger }
      }, caret ? '>-0.001' : 0);

      // Remove caret when typing ends (optional)
      if (caret) {
        tl.to(caretEl, { opacity: 0, duration: 0.15, onComplete: () => caretEl.remove() }, '>');
      }

      return { tl, split };
    }

    // expose if you want to use it elsewhere (hero master timeline, etc.)
    window.buildTypingRevealTimeline = buildTypingRevealTimeline;

    // ---- Apply automatically on scroll to any element with data-typing-animation ----
    document.querySelectorAll('[data-typing-animation]').forEach((el) => {
      const opts = {
        charDuration: el.dataset.charDuration ? parseFloat(el.dataset.charDuration) : undefined,
        stagger: el.dataset.stagger ? parseFloat(el.dataset.stagger) : undefined,
        ease: el.dataset.ease || undefined,
        caret: el.dataset.caret === 'true',
        caretBlink: el.dataset.caretBlink ? parseFloat(el.dataset.caretBlink) : undefined
      };

      const { tl } = buildTypingRevealTimeline(el, opts);

      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        animation: tl,
        toggleActions: 'play none none none'
      });
    });
  });
