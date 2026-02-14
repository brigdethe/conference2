
                    document.addEventListener('DOMContentLoaded', function() {
                        const fadeElements = document.querySelectorAll('[data-fade-in]');
                        const isTabletOrSmaller = window.innerWidth <= 991;

                        fadeElements.forEach((el) => {
                            // If flagged and on tablet/smaller, show immediately and skip observing
                            if (isTabletOrSmaller && el.hasAttribute('data-no-fade-tablet')) {
                                el.style.opacity = 1;
                                el.style.transform = 'none';
                                return; // do not observe
                            }

                            // Read per-element offsets
                            const fadeOffset = el.getAttribute('data-fade-offset') || -15; // default = -15%
                            const yOffset = parseFloat(el.getAttribute('data-fade-y')) || 0; // default = 0px

                            // Apply initial Y offset through a CSS variable
                            el.style.setProperty('--fade-y', `${yOffset}px`);

                            // Intersection observer setup
                            const observer = new IntersectionObserver(
                                (entries, observer) => {
                                    entries.forEach((entry, index) => {
                                        if (entry.isIntersecting) {
                                            const target = entry.target;

                                            gsap.to(target, {
                                                duration: 1,
                                                opacity: 1,
                                                y: 0, // Final Y position
                                                scale: 1,
                                                ease: "power2.out",
                                                delay: index * 0.1,
                                            });

                                            observer.unobserve(target);
                                        }
                                    });
                                }, {
                                    root: null,
                                    rootMargin: `0px 0px ${fadeOffset}% 0px`,
                                    threshold: 0,
                                }
                            );

                            observer.observe(el);
                        });
                    });
                