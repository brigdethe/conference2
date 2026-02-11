
document.addEventListener('DOMContentLoaded', function () {
  // Function to check if the viewport width is 767px or less
  function isMobile() {
    return window.innerWidth <= 767;
  }

  // Define different start and end values for mobile devices
  const startValue = isMobile() ? "top 35%" : "top center";
  const endValue = isMobile() ? "bottom 90%" : "bottom center";

  // Select all triggers (.yir24_text-interaction)
  const triggers = document.querySelectorAll(".yir24_text-interaction");

  // Loop through each trigger and set up animations
  triggers.forEach((trigger) => {
    // Find the .text-size-xxlarge inside the current trigger
    const textElement = trigger.querySelector(".text-size-xxlarge");

    if (textElement) {
      // Split the text into individual words
      const splitText = new SplitType(textElement, { types: "words" });

      // Create a unique timeline for each trigger
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: trigger, // Use the current trigger
          start: startValue, // Dynamic start position
          end: endValue, // Dynamic end position
          scrub: 2, // Enable smooth scrubbing
        },
      });

      // Animate the words
      timeline.from(splitText.words, {
        opacity: 0.25, // Initial opacity
        stagger: 0.1, // Stagger animation between words
      });
    }
  });
});
