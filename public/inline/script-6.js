
        gsap.registerPlugin(MotionPathPlugin);

        // Animate the text along the path
        gsap.to("#svg-text", {
            duration: 5,
            repeat: -1, // Repeat indefinitely
            ease: "power1.inOut",
            motionPath: {
                path: "#path1", // Reference the SVG path
                align: "#path1", // Align the text with the path
                alignOrigin: [0.5, 0.5], // Center alignment
                autoRotate: true, // Rotate text along the path direction
            }
        });
    