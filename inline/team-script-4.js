
                // Entry-only viewport animation (no leaveBack / no replay)
                // Per card: image + open button → heading → text
                function animateDataCards({
                    section = '[data-wipe-section]',
                    card = '[data-wipe-card]',
                    image = '[data-wipe-image]',
                    heading = '[data-wipe-heading]',
                    text = '[data-wipe-text]',
                    openBtn = '[data-card-open-button]',
                    start = 'top 75%',
                    once = true, // <-- only on first entry
                    wipeDuration = 0.8, // keep “old” feel
                    fadeDuration = 0.5,
                    cardViewportStagger = 0.18 // stagger between cards entering together
                } = {}) {

                    const sections = gsap.utils.toArray(section);

                    sections.forEach(sec => {
                        const cards = gsap.utils.toArray(sec.querySelectorAll(card));
                        if (!cards.length) return;

                        // Prep
                        cards.forEach(c => {
                            const img = c.querySelector(image);
                            const h = c.querySelector(heading);
                            const p = c.querySelector(text);
                            const btn = c.querySelector(openBtn);

                            if (img) gsap.set(img, {
                                scale: 1.025,
                                autoAlpha: 0,
                                transformOrigin: 'center center'
                            });
                            if (btn) gsap.set(btn, {
                                autoAlpha: 0,
                                y: 8
                            });
                            if (h) gsap.set(h, {
                                autoAlpha: 0,
                                y: 8
                            });
                            if (p) gsap.set(p, {
                                autoAlpha: 0,
                                y: 8
                            });
                        });

                        // Build per-card timelines (paused)
                        const tlByCard = new Map();
                        cards.forEach(c => {
                            const img = c.querySelector(image);
                            const h = c.querySelector(heading);
                            const p = c.querySelector(text);
                            const btn = c.querySelector(openBtn);

                            const tl = gsap.timeline({
                                paused: true
                            });

                            // image + open button together first
                            if (img) tl.to(img, {
                                scale: 1,
                                autoAlpha: 1,
                                duration: wipeDuration,
                                ease: 'power4.out'
                            }, 0);
                            if (btn) tl.to(btn, {
                                autoAlpha: 1,
                                y: 0,
                                duration: fadeDuration,
                                ease: 'power2.out'
                            }, 0);

                            // then heading, then text
                            if (h) tl.to(h, {
                                autoAlpha: 1,
                                y: 0,
                                duration: fadeDuration,
                                ease: 'power2.out'
                            }, '>-0.05');
                            if (p) tl.to(p, {
                                autoAlpha: 1,
                                y: 0,
                                duration: fadeDuration,
                                ease: 'power2.out'
                            }, '>-0.10');

                            tlByCard.set(c, tl);
                        });

                        // Entry-only trigger (no onEnterBack, no onLeaveBack)
                        if (window.ScrollTrigger) {
                            ScrollTrigger.batch(cards, {
                                start,
                                once, // ensures it runs only the first time
                                onEnter: batch => {
                                    batch.forEach((c, i) => {
                                        gsap.delayedCall(i * cardViewportStagger, () => tlByCard.get(c)?.play());
                                    });
                                }
                            });
                        } else {
                            // Fallback: play immediately in DOM order
                            cards.forEach((c, i) => {
                                gsap.delayedCall(i * cardViewportStagger, () => tlByCard.get(c)?.play());
                            });
                        }
                    });
                }

                document.addEventListener('DOMContentLoaded', () => {
                    animateDataCards({
                        // tweakable knobs to match your previous feel:
                        wipeDuration: 0.8,
                        fadeDuration: 0.5,
                        cardViewportStagger: 0.18,
                        start: 'top 75%',
                        once: true
                    });
                });
            
