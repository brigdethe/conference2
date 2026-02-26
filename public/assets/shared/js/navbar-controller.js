(() => {
    window.__NAVBAR_CONTROLLER_LOADED__ = true;

    function runWhenReady(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
            return;
        }
        fn();
    }

    function addMediaQueryChangeListener(query, handler) {
        if (typeof query.addEventListener === "function") {
            query.addEventListener("change", handler);
            return;
        }
        if (typeof query.addListener === "function") {
            query.addListener(handler);
        }
    }

    function initScrollState(body) {
        const SCROLL_OFFSET_PX = 10 * 16;
        const NAV_HIDE_START_PX = 5 * 16;
        const DIRECTION_THRESHOLD_PX = 8;
        const footerTrigger = document.querySelector("#footer");
        let ticking = false;
        let lastY = Math.max(0, window.scrollY || window.pageYOffset || 0);

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

            if (menuVisible || currentY <= DIRECTION_THRESHOLD_PX) {
                setAttrIfChanged("data-navbar-visible", "true");
                return;
            }

            const delta = currentY - lastY;
            if (Math.abs(delta) < DIRECTION_THRESHOLD_PX) {
                return;
            }

            if (delta > 0 && currentY > NAV_HIDE_START_PX) {
                setAttrIfChanged("data-navbar-visible", "false");
            } else if (delta < 0) {
                setAttrIfChanged("data-navbar-visible", "true");
            }
        }

        function onScroll() {
            const currentY = Math.max(0, window.scrollY || window.pageYOffset || 0);
            if (ticking) {
                return;
            }
            window.requestAnimationFrame(() => {
                updateDataScrolled(currentY);
                updateNavbarVisibility(currentY);
                lastY = currentY;
                ticking = false;
            });
            ticking = true;
        }

        if (footerTrigger) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const isVisible = entry.intersectionRatio >= 0.5 ? "true" : "false";
                        setAttrIfChanged("data-footer-visible", isVisible);
                    });
                },
                { threshold: [0, 0.5, 1] }
            );

            observer.observe(footerTrigger);
        }

        const attrObserver = new MutationObserver(() => {
            if (body.getAttribute("data-menu-visible") === "true") {
                setAttrIfChanged("data-navbar-visible", "true");
            }
        });

        attrObserver.observe(body, {
            attributes: true,
            attributeFilter: ["data-menu-visible"],
        });

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
    }

    function initMobileMenu(body) {
        const menuButton = document.getElementById("navbarMenuButton");
        const mobileMenu = document.querySelector(".navbar_menu.tablet-down");
        const brandLink = document.getElementById("navbarLogoLink");
        const mobileQuery = window.matchMedia("(max-width: 991px)");
        const TOUCH_GHOST_CLICK_BLOCK_MS = 550;
        let touchFired = false;

        if (!menuButton || !mobileMenu) {
            return null;
        }

        function isMobileViewport() {
            return mobileQuery.matches;
        }

        function isMenuOpen() {
            return body.getAttribute("data-menu-visible") === "true";
        }

        function setExpandedState(expanded) {
            menuButton.setAttribute("aria-expanded", expanded ? "true" : "false");
        }

        function resetMenuState() {
            body.setAttribute("data-menu-visible", "false");
            setExpandedState(false);
        }

        function openMenu() {
            if (isMenuOpen()) {
                return;
            }
            body.setAttribute("data-menu-visible", "true");
            setExpandedState(true);
        }

        function closeMenu() {
            resetMenuState();
        }

        function toggleMenu() {
            if (isMenuOpen()) {
                closeMenu();
                return;
            }
            openMenu();
        }

        if (!mobileMenu.id) {
            mobileMenu.id = "mobile-navbar-menu";
        }
        menuButton.setAttribute("aria-controls", mobileMenu.id);
        menuButton.setAttribute("aria-haspopup", "true");

        menuButton.addEventListener("click", (event) => {
            if (!isMobileViewport()) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (touchFired) {
                return;
            }

            toggleMenu();
        });

        menuButton.addEventListener(
            "touchend",
            (event) => {
                if (!isMobileViewport()) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                touchFired = true;
                toggleMenu();
                setTimeout(() => {
                    touchFired = false;
                }, TOUCH_GHOST_CLICK_BLOCK_MS);
            },
            { passive: false }
        );

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") {
                return;
            }
            if (isMenuOpen()) {
                closeMenu();
            }
        });

        document.addEventListener(
            "pointerdown",
            (event) => {
                if (!isMobileViewport() || !isMenuOpen()) {
                    return;
                }

                const target = event.target;
                if (menuButton.contains(target)) {
                    return;
                }
                if (mobileMenu.contains(target)) {
                    return;
                }
                if (brandLink && brandLink.contains(target)) {
                    return;
                }

                closeMenu();
            },
            true
        );

        document.addEventListener("click", (event) => {
            if (!isMobileViewport() || !isMenuOpen()) {
                return;
            }

            const target = event.target;
            const link = target && target.closest ? target.closest("a[href]") : null;
            if (!link) {
                return;
            }
            if (!mobileMenu.contains(link)) {
                return;
            }

            closeMenu();
        });

        document.addEventListener(
            "wheel",
            () => {
                if (!isMobileViewport() || !isMenuOpen()) {
                    return;
                }
                closeMenu();
            },
            { passive: true }
        );

        window.addEventListener(
            "scroll",
            () => {
                if (!isMobileViewport() || !isMenuOpen()) {
                    return;
                }
                closeMenu();
            },
            { passive: true }
        );

        addMediaQueryChangeListener(mobileQuery, resetMenuState);
        window.addEventListener("pageshow", resetMenuState);
        resetMenuState();

        return {
            isMenuOpen,
            isMobileViewport,
            closeMenu,
        };
    }

    function initFooterQuestionLinks(mobileMenuController) {
        const questionLinks = document.querySelectorAll("[data-nav-questions], a[href=\"#footer\"]");
        const isContactPath = window.location.pathname === "/contact" || window.location.pathname === "/contact/";

        if (!questionLinks.length) {
            return;
        }

        function jumpToFooter(behavior) {
            const footer = document.getElementById("footer");
            if (!footer) {
                return false;
            }

            footer.scrollIntoView({ behavior, block: "start" });
            return true;
        }

        questionLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();

                if (
                    mobileMenuController &&
                    mobileMenuController.isMobileViewport() &&
                    mobileMenuController.isMenuOpen()
                ) {
                    mobileMenuController.closeMenu();
                }

                const behavior = isContactPath ? "auto" : "smooth";
                const moved = jumpToFooter(behavior);

                if (isContactPath && moved) {
                    history.pushState(null, null, "#footer");
                }
            });
        });
    }

    runWhenReady(() => {
        const body = document.body;
        if (!body) {
            return;
        }

        initScrollState(body);
        const mobileMenuController = initMobileMenu(body);
        initFooterQuestionLinks(mobileMenuController);
    });
})();
