
                    document.addEventListener('DOMContentLoaded', function() {
                        const growElements = document.querySelectorAll('[data-grow-in]');
                        const observerOptions = {
                            root: null, // Viewport is the root
                            rootMargin: '0px 0px -50% 0px', // Element triggers when it's halfway into the viewport
                            threshold: 0, // Trigger as soon as the rootMargin is met
                        };

                        // Custom easing function (optional, or use linear/ease)
                        const customEase = "cubic-bezier(0.2, 0.8, 0.8, 1)"; // Matches your desired "custom" easing

                        // Intersection Observer logic
                        const observer = new IntersectionObserver((entries, observer) => {
                            entries.forEach((entry, index) => {
                                if (entry.isIntersecting) {
                                    const target = entry.target;

                                    // Apply staggered animation using setTimeout
                                    setTimeout(() => {
                                        target.style.transition = `transform 0.75s ${customEase}, opacity 0.75s ${customEase}`;
                                        target.style.opacity = 1;
                                        target.style.transform = 'scale(1)'; // Scale to full size
                                    }, index * 100); // Stagger of 100ms per element

                                    observer.unobserve(target); // Stop observing after animation
                                }
                            });
                        }, observerOptions);

                        // Observe each element
                        growElements.forEach(el => {
                            observer.observe(el);
                        });
                    });
                