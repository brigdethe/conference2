
                    document.addEventListener('DOMContentLoaded', function() {
                        document.querySelectorAll('[data-slide-up]').forEach((heading) => {
                            gsap.from(heading, {
                                y: 40, // start 40px below
                                opacity: 0, // start invisible
                                duration: 0.8, // animation duration (seconds)
                                ease: "power3.out", // smooth easing
                                scrollTrigger: {
                                    trigger: heading,
                                    start: "top 80%", // when element enters viewport
                                    toggleActions: "play none none reverse"
                                }
                            });
                        });

                    });
                