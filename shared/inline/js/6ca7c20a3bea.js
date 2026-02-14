
                    document.addEventListener('DOMContentLoaded', function() {
                        // Respect reduced motion
                        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                        document.querySelectorAll('[data-heading-animation]').forEach((heading) => {
                            // Per-element tunables (all optional)
                            const start = heading.getAttribute('data-heading-start') || 'top 85%';
                            const yOffset = parseFloat(heading.getAttribute('data-heading-y')) || 16; // px
                            const duration = parseFloat(heading.getAttribute('data-heading-duration')) || 0.32; // sec
                            const delay = parseFloat(heading.getAttribute('data-heading-delay')) || 0.00; // sec
                            const ease = heading.getAttribute('data-heading-ease') || 'power2.out';

                            if (reducedMotion) {
                                gsap.set(heading, {
                                    autoAlpha: 1,
                                    y: 0
                                });
                                return;
                            }

                            // Initial state (simple fade + rise)
                            gsap.set(heading, {
                                autoAlpha: 0,
                                y: yOffset,
                                willChange: 'transform, opacity'
                            });

                            // Timeline for a single element (no Split/lines)
                            const tl = gsap.timeline({
                                defaults: {
                                    ease
                                }
                            });
                            tl.to(heading, {
                                autoAlpha: 1,
                                y: 0,
                                duration,
                                delay
                            });

                            // Scroll-triggered reveal
                            ScrollTrigger.create({
                                trigger: heading,
                                start,
                                animation: tl,
                                toggleActions: 'play none none none',
                                once: true
                            });
                        });
                    });
                