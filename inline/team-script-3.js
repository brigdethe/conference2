
document.addEventListener('DOMContentLoaded', function () {

    // --- Scroll Lock Helpers ---
    let scrollY = 0;
    let lockCount = 0;

    function lockScroll() {
        if (lockCount === 0) {
            scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
            document.body.setAttribute('data-scroll-locked', 'true');
            document.body.style.setProperty('top', `-${scrollY}px`, 'important');
            document.body.style.setProperty('position', 'fixed', 'important');
            document.body.style.setProperty('width', '100%', 'important');
            document.body.style.setProperty('overflow', 'hidden', 'important');
        }
        lockCount++;
    }

    function unlockScroll() {
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
            document.body.removeAttribute('data-scroll-locked');
            document.body.style.removeProperty('top');
            document.body.style.removeProperty('position');
            document.body.style.removeProperty('width');
            document.body.style.removeProperty('overflow');
            window.scrollTo(0, scrollY);
        }
    }

    // --- Modal Logic ---

    function openModal(targetItem) {
        // 1. Show the global component wrapper
        $(".team_modal_component").css("display", "block");

        // 2. Show the specific content item
        $("[cms-modal-target]").css("display", "none");
        $(targetItem).css("display", "block");

        // 3. Animate in
        if (typeof gsap !== 'undefined') {
            gsap.to(".team_modal-background_overlay", { opacity: 1, duration: 0.3 });
            gsap.to(".team_modal-content_wrapper", { x: "0%", duration: 0.4, ease: "power3.out" });
        } else {
            $(".team_modal-background_overlay").css("opacity", 1);
            $(".team_modal-content_wrapper").css("transform", "translate3d(0%, 0, 0)");
        }

        // 4. Lock scroll
        lockScroll();
    }

    function closeModal() {
        if (typeof gsap !== 'undefined') {
            gsap.to(".team_modal-background_overlay", { opacity: 0, duration: 0.3 });
            gsap.to(".team_modal-content_wrapper", {
                x: "100%",
                duration: 0.3,
                ease: "power3.in",
                onComplete: function () {
                    finishClose();
                }
            });
        } else {
            $(".team_modal-background_overlay").css("opacity", 0);
            $(".team_modal-content_wrapper").css("transform", "translate3d(100%, 0, 0)");
            finishClose();
        }
    }

    function finishClose() {
        $(".team_modal_component").css("display", "none");
        $("[cms-modal-target]").css("display", "none");
        unlockScroll();
    }

    $("[cms-modal-trigger]").each(function () {
        let itemID = $(this).attr("cms-modal-trigger");
        let target = $("[cms-modal-target='" + itemID + "']");

        $(this).off("click").on("click", function () {
            openModal(target);
        });
    });

    // Close modal on click of any close button
    $(document).on("click", "[data-close-modal]", function () {
        closeModal();
    });

    // Close on overlay click
    $(document).on("click", ".team_modal-background_overlay", function () {
        closeModal();
    });

    // ESC key to close
    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            if ($(".team_modal_component").css("display") !== "none") {
                closeModal();
            }
        }
    });

});
