
                    document.addEventListener('DOMContentLoaded', function() {
                        // Function to check if the viewport width is 767px or less
                        function isMobile() {
                            return window.innerWidth <= 767;
                        }

                        // Split text into individual words
                        const layoutText = new SplitType("[text-fade]", {
                            types: "words"
                        });
                        const layoutTL = gsap.timeline();

                        // Define different start and end values for mobile devices
                        let startValue = isMobile() ? "10% 75%" : "top 75%";
                        let endValue = isMobile() ? "top 20%" : "top 20%";

                        layoutTL.from(layoutText.words, {
                            // Initial opacity for each word
                            opacity: 0,
                            // Stagger animation of each word
                            stagger: 0.1,
                            scrollTrigger: {
                                trigger: "#statement",
                                // Trigger animation when .section_layout484 reaches certain part of the viewport
                                start: startValue,
                                // End animation when .section_layout484 reaches certain part of the viewport
                                end: endValue,
                                // Smooth transition based on scroll position
                                scrub: 2
                            }
                        });
                    });
                