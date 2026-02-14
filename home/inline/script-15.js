
                document.addEventListener("DOMContentLoaded", () => {
                    const lines = document.querySelectorAll('.left-line');
                    const cards = document.querySelectorAll('.value_card');

                    // Create custom ease
                    CustomEase.create("folderEase", "0, 0.47, 0.02, 1");

                    // Pair by index (left-line[i] <-> value-card[i])
                    const count = Math.min(lines.length, cards.length);

                    for (let i = 0; i < count; i++) {
                        const line = lines[i];
                        const card = cards[i];

                        // Initial states
                        gsap.set(line, {
                            scaleY: 0,
                            transformOrigin: 'top'
                        });
                        gsap.set(card, {
                            autoAlpha: 0,
                            y: 48
                        }); // moved up more for stronger lift

                        // ---- Card reveal with custom ease ----
                        gsap.to(card, {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.6,
                            ease: 'folderEase',
                            scrollTrigger: {
                                trigger: card,
                                start: 'top 85%',
                                end: 'top 60%',
                                toggleActions: 'play none none none',
                                once: true
                            }
                        });

                        // ---- Line draw animation (unchanged except for clarity) ----
                        gsap.fromTo(
                            line, {
                                scaleY: 0,
                                transformOrigin: 'top'
                            }, {
                                scaleY: 1,
                                ease: 'none',
                                immediateRender: false,
                                scrollTrigger: {
                                    trigger: card,
                                    start: 'top 75%',
                                    end: 'top 50%',
                                    scrub: true,
                                    fastScrollEnd: true,
                                    invalidateOnRefresh: true
                                }
                            }
                        );
                    }

                    // Optional: quick mismatch warning in dev
                    if (lines.length !== cards.length) {
                        console.warn(
                            `[value-anim] Mismatch: ${lines.length} .left-line vs ${cards.length} .value_card`
                        );
                    }
                });
            