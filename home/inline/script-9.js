
                    document.addEventListener('DOMContentLoaded', function() {
                        const staggerElements = document.querySelectorAll('[data-stagger-in]');
                        const observerOptions = {
                            root: null, // Viewport is the root
                            rootMargin: '0px', // Adjust margins if needed
                            threshold: 0.1, // Trigger when 10% of the element is visible
                        };

                        // Custom easing function using GSAP (Optional) or CSS `CustomEase`
                        const customEase = "cubic-bezier(0.2, 0.8, 0.8, 1)"; // Matches your "custom"

                        // Intersection Observer logic
                        const observer = new IntersectionObserver((entries, observer) => {
                            entries.forEach((entry, index) => {
                                if (entry.isIntersecting) {
                                    const target = entry.target;

                                    // Apply staggered animation using setTimeout
                                    setTimeout(() => {
                                        target.style.transition = `transform 0.75s ${customEase}, opacity 0.75s ${customEase}`;
                                        target.style.opacity = 1;
                                        target.style.transform = 'translateY(0)';
                                    }, index * 100); // Stagger of 100ms per element

                                    observer.unobserve(target); // Stop observing after animation
                                }
                            });
                        }, observerOptions);

                        // Observe each element
                        staggerElements.forEach(el => {
                            observer.observe(el);
                        });
                    });
                