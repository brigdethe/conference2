
                document.addEventListener("DOMContentLoaded", () => {
                    // Put this once in your bundle (outside matchMedia)
                    ScrollTrigger.config({
                        // iOS Safari fires tons of resizes as the URL bar collapses/expands.
                        ignoreMobileResize: true,
                        autoRefreshEvents: "visibilitychange,DOMContentLoaded,load"
                    });

                    const mm = gsap.matchMedia();

                    mm.add("(max-width: 767px)", (ctx) => {
                        const section = document.querySelector(".section.about");
                        const bgWrap = document.querySelector(".background-content-wrapper.is-about");
                        const sticky = document.querySelector(".about-sticky_wrapper");
                        if (!section || !bgWrap || !sticky) return;

                        // Establish stacking context for pinning
                        section.style.position || = "relative";

                        // Help Safari render the pinned layer on its own composite layer
                        gsap.set(bgWrap, {
                            force3D: true,
                            willChange: "transform",
                            // the next two properties mitigate iOS repaint glitches/flicker
                            backfaceVisibility: "hidden",
                            rotateZ: 0.01 // tiny rotation nudges GPU compositing without visible effect
                        });

                        // If you see text jitter with transform pinning on iOS, try pinType:"fixed".
                        // Start with transform (safest across devices), then toggle if needed.
                        const trig = ScrollTrigger.create({
                            trigger: section,
                            start: "top top",
                            endTrigger: sticky,
                            end: "top top",
                            pin: bgWrap,
                            pinSpacing: false,
                            anticipatePin: 0.2,
                            invalidateOnRefresh: true,
                            // Try "fixed" if you still see wobble:
                            // pinType: "fixed",
                        });

                        // A lightweight refresh that won't thrash on iOS
                        const onLoad = () => ScrollTrigger.refresh(true);
                        window.addEventListener("load", onLoad, {
                            once: true
                        });

                        // CLEANUP on unmatch (very important to avoid duplicate listeners/triggers)
                        return () => {
                            trig.kill();
                            window.removeEventListener("load", onLoad);
                        };
                    });

                });
            