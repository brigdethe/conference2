
        document.addEventListener("DOMContentLoaded", () => {
            const tabs = gsap.utils.toArray(".tab-btn");
            const track = document.querySelector(".panels-track");
            const panels = gsap.utils.toArray(".panel");
            const hl = document.querySelector(".tab-highlight");
            const sliderDur = 0.6;

            tabs.forEach((btn, i) => {
                btn.addEventListener("click", () => {
                    if (btn.classList.contains("is-active")) return;

                    // 1. Update active classes
                    tabs.forEach(b => b.classList.remove("is-active"));
                    btn.classList.add("is-active");

                    // 2. MOVE / RESIZE highlight with Flip - but fix the stacking
                    const state = Flip.getState(hl);

                    // Ensure highlight stays behind content during animation
                    gsap.set(hl, {
                        zIndex: -1,
                        force3D: true
                    });

                    btn.appendChild(hl);

                    Flip.from(state, {
                        duration: 0.4,
                        ease: "power1.inOut",
                        // Force the highlight to stay behind during animation
                        onStart: () => {
                            gsap.set(hl, {
                                zIndex: -1
                            });
                        },
                        onUpdate: () => {
                            gsap.set(hl, {
                                zIndex: -1
                            });
                        },
                        onComplete: () => {
                            gsap.set(hl, {
                                zIndex: -1
                            });
                        }
                    });

                    // 3. SLIDE the panels
                    const xPercent = -100 * i;
                    gsap.to(track, {
                        xPercent,
                        duration: sliderDur,
                        ease: "power2.inOut"
                    });
                });
            });
        });
    