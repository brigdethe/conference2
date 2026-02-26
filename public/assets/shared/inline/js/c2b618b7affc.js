function initNavbarMenu() {
    const body = document.body;
    const menuButton = document.querySelector("#navbarMenuButton");
    const mobileMenu = document.querySelector(".navbar_menu.tablet-down");
    const footerLinks = document.querySelectorAll('a[href="#footer"]');
    const mobileQuery = window.matchMedia("(max-width: 991px)");

    if (!menuButton || !mobileMenu) return;

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
        body.style.removeProperty("top");
        body.setAttribute("data-menu-visible", "false");
        setExpandedState(false);
    }

    function openMenu() {
        if (isMenuOpen()) return;
        body.setAttribute("data-menu-visible", "true");
        setExpandedState(true);
    }

    function closeMenu() {
        resetMenuState();
    }

    function toggleMenu() {
        const open = isMenuOpen();
        if (open) closeMenu();
        else openMenu();
    }

    function isInsideMenuOrToggle(target) {
        if (!target) return false;
        return menuButton.contains(target) || mobileMenu.contains(target);
    }

    if (!mobileMenu.id) {
        mobileMenu.id = "mobile-navbar-menu";
    }
    menuButton.setAttribute("aria-controls", mobileMenu.id);
    menuButton.setAttribute("aria-haspopup", "true");

    let touchFired = false;

    function handleClickToggle(event) {
        event.preventDefault();
        event.stopPropagation();
        if (touchFired) return;          // block the ghost click after touchend
        if (!isMobileViewport()) return;
        toggleMenu();
    }

    function handleTouchToggle(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!isMobileViewport()) return;
        touchFired = true;
        toggleMenu();
        setTimeout(function () { touchFired = false; }, 500);
    }

    menuButton.addEventListener("click", handleClickToggle);
    menuButton.addEventListener("touchend", handleTouchToggle, { passive: false });

    footerLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            const footer = document.getElementById("footer");
            if (!footer) return;
            event.preventDefault();
            const scrollToFooter = () => {
                footer.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            };
            if (isMobileViewport() && isMenuOpen()) {
                closeMenu();
                requestAnimationFrame(scrollToFooter);
            } else {
                scrollToFooter();
            }
        });
    });

    mobileMenu.addEventListener("click", (event) => {
        if (!isMobileViewport() || !isMenuOpen()) return;
        const target = event.target;
        const link = target instanceof Element ? target.closest("a[href]") : null;
        if (link) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (isMenuOpen()) closeMenu();
    });

    document.addEventListener("pointerdown", (event) => {
        if (!isMobileViewport() || !isMenuOpen()) return;
        const target = event.target;
        if (isInsideMenuOrToggle(target)) return;
        closeMenu();
    }, true);

    document.addEventListener("mousedown", (event) => {
        if (!isMobileViewport() || !isMenuOpen()) return;
        const target = event.target;
        if (isInsideMenuOrToggle(target)) return;
        closeMenu();
    }, true);

    document.addEventListener("touchstart", (event) => {
        if (!isMobileViewport() || !isMenuOpen()) return;
        const target = event.target;
        if (isInsideMenuOrToggle(target)) return;
        closeMenu();
    }, true);

    document.addEventListener("wheel", () => {
        if (!isMobileViewport() || !isMenuOpen()) return;
        closeMenu();
    }, {
        passive: true
    });

    window.addEventListener("scroll", () => {
        if (!isMobileViewport() || !isMenuOpen()) return;
        closeMenu();
    }, {
        passive: true
    });

    mobileQuery.addEventListener("change", () => {
        resetMenuState();
    });

    window.addEventListener("pageshow", () => {
        resetMenuState();
    });

    resetMenuState();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavbarMenu);
} else {
    initNavbarMenu();
}
