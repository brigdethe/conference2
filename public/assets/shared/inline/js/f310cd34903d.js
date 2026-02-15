
                            document.addEventListener("DOMContentLoaded", () => {
                                const body = document.body;
                                const SCROLL_OFFSET_PX = 10 * 16; // 10rem
                                const NAV_HIDE_START_PX = 5 * 16; // hide/show behavior starts after 5rem
                                const DIRECTION_THRESHOLD_PX = 8; // ignore tiny scroll jitter
                                const footerTrigger = document.querySelector("#footer");
                                let ticking = false;
                                let lastY = Math.max(0, window.scrollY || window.pageYOffset || 0);

                                // Set initial states
                                if (!body.hasAttribute("data-scrolled")) {
                                    body.setAttribute("data-scrolled", "false");
                                }
                                if (!body.hasAttribute("data-footer-visible")) {
                                    body.setAttribute("data-footer-visible", "false");
                                }
                                if (!body.hasAttribute("data-navbar-visible")) {
                                    body.setAttribute("data-navbar-visible", "true");
                                }

                                function setAttrIfChanged(name, value) {
                                    if (body.getAttribute(name) !== value) {
                                        body.setAttribute(name, value);
                                    }
                                }

                                function updateDataScrolled(currentY) {
                                    const scrolled = currentY > SCROLL_OFFSET_PX ? "true" : "false";
                                    setAttrIfChanged("data-scrolled", scrolled);
                                }

                                function updateNavbarVisibility(currentY) {
                                    const menuVisible = body.getAttribute("data-menu-visible") === "true";

                                    // Always show when menu is open or near top
                                    if (menuVisible || currentY <= DIRECTION_THRESHOLD_PX) {
                                        setAttrIfChanged("data-navbar-visible", "true");
                                        return;
                                    }

                                    const delta = currentY - lastY;
                                    if (Math.abs(delta) < DIRECTION_THRESHOLD_PX) {
                                        return;
                                    }

                                    if (delta > 0 && currentY > NAV_HIDE_START_PX) {
                                        // Scrolling down
                                        setAttrIfChanged("data-navbar-visible", "false");
                                    } else if (delta < 0) {
                                        // Scrolling up
                                        setAttrIfChanged("data-navbar-visible", "true");
                                    }
                                }

                                function onScroll() {
                                    const currentY = Math.max(0, window.scrollY || window.pageYOffset || 0);
                                    if (!ticking) {
                                        window.requestAnimationFrame(() => {
                                            updateDataScrolled(currentY);
                                            updateNavbarVisibility(currentY);
                                            lastY = currentY;
                                            ticking = false;
                                        });
                                        ticking = true;
                                    }
                                }

                                // Footer trigger observer
                                if (footerTrigger) {
                                    const observer = new IntersectionObserver(
                                        (entries) => {
                                            entries.forEach((entry) => {
                                                const isVisible = entry.intersectionRatio >= 0.5 ? "true" : "false";
                                                setAttrIfChanged("data-footer-visible", isVisible);
                                            });
                                        }, {
                                            threshold: [0, 0.5, 1],
                                        }
                                    );

                                    observer.observe(footerTrigger);
                                }

                                // Keep navbar visible immediately when menu opens
                                const attrObserver = new MutationObserver(() => {
                                    if (body.getAttribute("data-menu-visible") === "true") {
                                        setAttrIfChanged("data-navbar-visible", "true");
                                    }
                                });
                                attrObserver.observe(body, {
                                    attributes: true,
                                    attributeFilter: ["data-menu-visible"],
                                });

                                // Initial check and scroll listener
                                onScroll();
                                window.addEventListener("scroll", onScroll, {
                                    passive: true
                                });
                            });
                        
