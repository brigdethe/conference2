document.addEventListener("DOMContentLoaded", () => {
    const logo = document.querySelector(".wave-base-persistent");
    const firstStep = document.querySelector(".scroll-wrapper-single._1");

    if (!logo || !firstStep || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        return;
    }

    gsap.set(logo, {
        autoAlpha: 0
    });

    ScrollTrigger.create({
        trigger: firstStep,
        start: "top center",
        once: true,
        onEnter: () => {
            gsap.to(logo, {
                autoAlpha: 1,
                duration: 0.75,
                ease: "power3.out",
                overwrite: "auto"
            });
        }
    });
});
