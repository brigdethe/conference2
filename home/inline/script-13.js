
                            document.addEventListener("DOMContentLoaded", () => {
                                const body = document.body;
                                const SCROLL_OFFSET_PX = 10 * 16; // 10rem
                                const footerTrigger = document.querySelector("#footer");
                                let ticking = false;

                                // Set initial states
                                if (!body.hasAttribute("data-scrolled")) {
                                    body.setAttribute("data-scrolled", "false");
                                }
                                if (!body.hasAttribute("data-footer-visible")) {
                                    body.setAttribute("data-footer-visible", "false");
                                }

                                function updateDataScrolled(currentY) {
                                    const scrolled = currentY > SCROLL_OFFSET_PX;
                                    const newState = scrolled ? "true" : "false";
                                    if (body.getAttribute("data-scrolled") !== newState) {
                                        body.setAttribute("data-scrolled", newState);
                                    }
                                }

                                function onScroll() {
                                    const currentY = Math.max(0, window.scrollY || window.pageYOffset || 0);
                                    if (!ticking) {
                                        window.requestAnimationFrame(() => {
                                            updateDataScrolled(currentY);
                                            ticking = false;
                                        });
                                        ticking = true;
                                    }
                                }

                                // Footer trigger observer (70% visible)
                                if (footerTrigger) {
                                    const observer = new IntersectionObserver(
                                        (entries) => {
                                            entries.forEach((entry) => {
                                                const isVisible = entry.intersectionRatio >= 0.5 ? "true" : "false";
                                                if (body.getAttribute("data-footer-visible") !== isVisible) {
                                                    body.setAttribute("data-footer-visible", isVisible);
                                                }
                                            });
                                        }, {
                                            threshold: [0, 0.7, 1],
                                        }
                                    );

                                    observer.observe(footerTrigger);
                                }

                                // Initial check and scroll listener
                                onScroll();
                                window.addEventListener("scroll", onScroll, {
                                    passive: true
                                });
                            });
                        