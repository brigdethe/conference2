
document.addEventListener('DOMContentLoaded', () => {
    // Select all menu containers (desktop and mobile)
    const navbarMenus = document.querySelectorAll('.navbar_menu');
    const navbarMenuButton = document.getElementById('navbarMenuButton');
    const navbarLinks = document.querySelectorAll('.navbar_link');
    const navbarBrand = document.querySelector('.w-nav-brand'); // Select brand/logo link

    if (navbarMenus.length === 0 || !navbarMenuButton) {
        console.warn('Navbar fix: Menu or Button not found.');
        return;
    }

    // Fix "Jump to top" issue
    navbarMenuButton.addEventListener('click', (e) => {
        // Prevent default anchor behavior (jumping to top)
        e.preventDefault();
        // Note: Webflow's script should still run as we are not stopping propagation immediate
    });

    // Helper to determine if menu is open
    const isMenuOpen = () => {
        // Webflow typically toggles 'w--open' on the button and/or the menu
        return navbarMenuButton.classList.contains('w--open') ||
            Array.from(navbarMenus).some(menu => menu.classList.contains('w--open'));
    };

    // Helper to close menu if open
    const closeMenu = () => {
        if (isMenuOpen()) {
            console.log('Navbar fix: Closing menu...');
            // Simulating a click is the safest way to trigger Webflow's close animation
            navbarMenuButton.click();
        }
    };

    // 1. Click outside to collapse
    document.addEventListener('click', (event) => {
        // If menu is not open, don't do anything
        if (!isMenuOpen()) return;

        let isClickInsideAnyMenu = false;
        navbarMenus.forEach(menu => {
            if (menu.contains(event.target)) {
                isClickInsideAnyMenu = true;
            }
        });

        const isClickOnButton = navbarMenuButton.contains(event.target);
        const isClickOnBrand = navbarBrand && navbarBrand.contains(event.target);

        // Debugging logs
        console.log('Click detected:', {
            target: event.target,
            open: isMenuOpen(),
            insideMenu: isClickInsideAnyMenu,
            onButton: isClickOnButton
        });

        // Close if click is NOT inside any menu AND NOT on the button
        if (!isClickInsideAnyMenu && !isClickOnButton) {
            closeMenu();
        }
    });

    // 2. Scroll to collapse
    window.addEventListener('scroll', () => {
        if (isMenuOpen()) {
            closeMenu();
        }
    }, { passive: true });

    // 3. Collapse on link click
    navbarLinks.forEach(link => {
        link.addEventListener('click', () => {
            console.log('Navbar fix: Link clicked');
            closeMenu();
        });
    });
});
