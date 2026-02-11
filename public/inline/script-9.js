
document.addEventListener("DOMContentLoaded", () => {
  // Select all elements with the respective classes
  const popUps = document.querySelectorAll('.pop-up');
  const popUps2 = document.querySelectorAll('.pop-up-2');
  const popUpsRight = document.querySelectorAll('.pop-up-right');
  const popUpsLeft = document.querySelectorAll('.pop-up-left');

  // Function to animate each element individually
  const animateElements = (elements, animationProps, triggerProps) => {
    elements.forEach((element) => {
      gsap.fromTo(
        element,
        animationProps.from,
        {
          ...animationProps.to,
          scrollTrigger: {
            ...triggerProps,
            trigger: element, // Use the individual element as the trigger
          },
        }
      );
    });
  };

  // Animate .pop-up
  animateElements(
    popUps,
    { from: { scale: 0 }, to: { scale: 1, stagger: 0.15, duration: 0.5, ease: "power2.out" } },
    { start: 'top 70%' }
  );

  // Animate .pop-up-2
  animateElements(
    popUps2,
    { from: { scale: 0 }, to: { scale: 1, duration: 0.5, delay: 0.15, stagger: 0.15, ease: "power2.out" } },
    { start: 'top 70%' }
  );

  // Animate .pop-up-right
  animateElements(
    popUpsRight,
    { from:  { scale: 0, transformOrigin: 'right center' } , to: { scale: 1, stagger: 0.15, duration: 0.5, delay:0.15,  ease: "power2.out" } },
    { start: 'top 70%' }
  );
    // Animate .pop-up-right
  animateElements(
    popUpsLeft,
    { from:  { scale: 0, transformOrigin: 'left center' } , to: { scale: 1, stagger: 0.15, duration: 0.5, delay:0.15,  ease: "power2.out" } },
    { start: 'top 70%' }
  );
});

