
  document.addEventListener('DOMContentLoaded', () => {
    const navMenus = Array.from(document.querySelectorAll('.navbar_menu'));
    const navbarMenuButton = document.querySelector('#navbarMenuButton');
    const navLinks = document.querySelectorAll('.navbar_menu .navbar_link');
    const body = document.body;
    let scrollPosition = 0;

    if (!navMenus.length) return;

    function anyMenuVisible() {
      return navMenus.some((menu) => window.getComputedStyle(menu).display === 'block');
    }

    function closeMenus() {
      navMenus.forEach((menu) => {
        menu.classList.remove('w--open');
        menu.style.display = 'none';
      });
      if (navbarMenuButton) {
        navbarMenuButton.classList.remove('w--open');
      }
    }

    function lockScroll() {
      // CAPTURE SCROLL POSITION IMMEDIATELY
      scrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;

      // Apply the correct top position BEFORE setting the attribute
      body.style.top = `-${scrollPosition}px`;

      // Now set attribute (CSS will apply position: fixed, etc.)
      body.setAttribute('data-menu-visible', 'true');
    }

    function unlockScroll() {
      // Store the captured position
      const savedPosition = scrollPosition;

      // Remove the inline top style
      body.style.removeProperty('top');

      // Remove the attribute (CSS will revert)
      body.setAttribute('data-menu-visible', 'false');

      // Return to the saved scroll position
      window.scrollTo(0, savedPosition);
    }

    function updateMenuState() {
      const isVisible = anyMenuVisible();

      if (isVisible && body.getAttribute('data-menu-visible') !== 'true') {
        lockScroll();
      } else if (!isVisible && body.getAttribute('data-menu-visible') === 'true') {
        unlockScroll();
      }
    }

    const observer = new MutationObserver(updateMenuState);
    navMenus.forEach((menu) => {
      observer.observe(menu, { attributes: true, attributeFilter: ['style', 'class'] });
    });

    if (anyMenuVisible()) lockScroll();

    navbarMenuButton?.addEventListener('click', () => {
      const currentlyVisible = body.getAttribute('data-menu-visible') === 'true';
      if (!currentlyVisible) lockScroll();
      else unlockScroll();
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href') || '';
        if (!href) return;

        const targetUrl = new URL(href, window.location.origin);
        const isSamePageHash =
          !!targetUrl.hash && targetUrl.pathname === window.location.pathname;

        if (body.getAttribute('data-menu-visible') === 'true') {
          unlockScroll();
        }
        closeMenus();

        if (isSamePageHash) {
          event.preventDefault();
          const targetId = decodeURIComponent(targetUrl.hash.slice(1));
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', targetUrl.hash);
          }
        }
      });
    });
  });
