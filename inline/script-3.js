
  document.addEventListener('DOMContentLoaded', function () {
    try { gsap.registerPlugin(CustomEase); } catch (e) {}

    CustomEase.create("folderEase", "0, 0.47, 0.02, 1");

    // Initial states
    gsap.set("#heroBackgroundImage", { autoAlpha: 0, scale: 1.08 });
    gsap.set("#folderComponent", { y: "25vh", autoAlpha: 0 });
    gsap.set("#heroHeading", { autoAlpha: 0, y: 16 });
    gsap.set("#heroButton", { autoAlpha: 0 });

    // Boxes initial state
    const boxesInOrder = ["#greyBox", "#seafoamBox", "#popBox", "#clayBox"];
    gsap.set(boxesInOrder, {
      autoAlpha: 0,
      y: 0,
      scale: 1,
      transformOrigin: "50% 50%"
    });

    // Contact hero items (if on contact page)
    const contactItems = document.querySelectorAll("[contact-hero-item]");
    if (contactItems.length) {
      gsap.set(contactItems, { autoAlpha: 0, y: 12 });
    } else {
      // Paragraph (if not contact page)
      gsap.set("#heroParagraph", { autoAlpha: 0, y: 12 });
    }

    // Lottie
    let heroLottieAnimation = null;
    const lottieContainer = document.querySelector("#heroLottie");
    if (lottieContainer && window.lottie) {
      heroLottieAnimation = lottie.loadAnimation({
        container: lottieContainer,
        renderer: "svg",
        loop: false,
        autoplay: false,
        path: "https://cdn.prod.website-files.com/68eee3b7aa1d9628fd1f8ee0/68fb3798ee1efa10727d6465_quinn-line-test.json"
      });
    }

    // Timeline
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // 1) BG
    tl.to("#heroBackgroundImage", { autoAlpha: 1, scale: 1, duration: 0.45 }, 0);

    // 2) Folder
    tl.to("#folderComponent", { y: "0vh", duration: 0.6, autoAlpha: 1, ease: "folderEase" }, ">-0.06");

    // 3) Lottie
    tl.add(() => {
      if (heroLottieAnimation) heroLottieAnimation.goToAndPlay(0, true);
      const lp = document.querySelector("#heroLottie");
      if (lp && typeof lp.play === "function") lp.play();
    }, ">");

    // 4) Heading
    tl.to("#heroHeading", {
      autoAlpha: 1,
      y: 0,
      duration: 0.32,
      ease: "power2.out"
    }, ">-0.4");

    // 5) Paragraph OR Contact items
    if (contactItems.length) {
      tl.to(contactItems, {
        autoAlpha: 1,
        y: 0,
        duration: 0.28,
        ease: "power2.out",
        stagger: { each: 0.08 }
      }, ">-0.06");
    } else {
      tl.to("#heroParagraph", {
        autoAlpha: 1,
        y: 0,
        duration: 0.28,
        ease: "power2.out"
      }, ">-0.06");
    }

    // 6) Button
    tl.to("#heroButton", {
      autoAlpha: 1,
      duration: 0.18,
      ease: "power2.out"
    }, ">+0.04");

    // 7) Boxes
    tl.to(boxesInOrder, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
      stagger: { each: 0.1 }
    }, ">-0.02");
  });
