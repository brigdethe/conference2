document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const menuButton = document.querySelector("#navbarMenuButton");
    const mobileMenu = document.querySelector(".navbar_menu.tablet-down");
    const mobileMenuLinks = document.querySelectorAll(".navbar_menu.tablet-down a");
    const mobileQuery = window.matchMedia("(max-width: 991px)");
    let scrollPosition = 0;

    if (!menuButton || !mobileMenu) return;

    function isMobileViewport() {
        return mobileQuery.matches;
    }

    function setExpandedState(expanded) {
        menuButton.setAttribute("aria-expanded", expanded ? "true" : "false");
    }

    function openMenu() {
        scrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;
        body.style.top = `-${scrollPosition}px`;
        body.setAttribute("data-menu-visible", "true");
        setExpandedState(true);
    }

    function closeMenu() {
        const savedPosition = scrollPosition;
        body.style.removeProperty("top");
        body.setAttribute("data-menu-visible", "false");
        setExpandedState(false);
        window.scrollTo(0, savedPosition);
    }

    function toggleMenu() {
        const open = body.getAttribute("data-menu-visible") === "true";
        if (open) closeMenu();
        else openMenu();
    }

    menuButton.addEventListener("click", (event) => {
        event.preventDefault();
        if (!isMobileViewport()) return;
        toggleMenu();
    });

    mobileMenuLinks.forEach((link) => {
        link.addEventListener("click", () => {
            if (isMobileViewport()) closeMenu();
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (body.getAttribute("data-menu-visible") === "true") closeMenu();
    });

    mobileQuery.addEventListener("change", (event) => {
        if (!event.matches && body.getAttribute("data-menu-visible") === "true") {
            closeMenu();
        }
    });

    body.setAttribute("data-menu-visible", "false");
    setExpandedState(false);
});
