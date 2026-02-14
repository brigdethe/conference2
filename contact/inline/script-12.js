
                            document.addEventListener('DOMContentLoaded', () => {
                                const navMenu = document.querySelector('.navbar_menu');
                                const navbarMenuButton = document.querySelector('#navbarMenuButton');
                                const body = document.body;
                                let scrollPosition = 0;
                                let lockScrollTimeout = null;

                                if (!navMenu) return;

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
                                    const isVisible = window.getComputedStyle(navMenu).display === 'block';

                                    if (isVisible && body.getAttribute('data-menu-visible') !== 'true') {
                                        lockScroll();
                                    } else if (!isVisible && body.getAttribute('data-menu-visible') === 'true') {
                                        unlockScroll();
                                    }
                                }

                                const observer = new MutationObserver(updateMenuState);
                                observer.observe(navMenu, {
                                    attributes: true,
                                    attributeFilter: ['style', 'class']
                                });

                                if (window.getComputedStyle(navMenu).display === 'block') lockScroll();

                                navbarMenuButton ? .addEventListener('click', () => {
                                    const currentlyVisible = body.getAttribute('data-menu-visible') === 'true';
                                    if (!currentlyVisible) lockScroll();
                                    else unlockScroll();
                                });
                            });
                        