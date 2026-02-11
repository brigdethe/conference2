
                document.addEventListener('DOMContentLoaded', function() {

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
                    $("[cms-modal-trigger]").each(function() {
                        let itemID = $(this).attr("cms-modal-trigger");
                        let target = $("[cms-modal-target='" + itemID + "']");
                        configurateClick(this, target);
                    });

                    function configurateClick(trigger, target) {
                        $(trigger).on("click", function() {
                            // Hide all modals
                            $("[cms-modal-target]").css("display", "none");

                            // Show the selected modal
                            $(target).css("display", "block");

                            // Lock scroll
                            lockScroll();
                        });
                    }

                    // Close modal on click of any close button
                    $(document).on("click", "[data-close-modal]", function() {
                        $(this).closest("[cms-modal-target]").css("display", "none");
                        unlockScroll();
                    });

                    // Optional: click outside modal to close
                    $(document).on("click", "[cms-modal-target]", function(e) {
                        if (e.target === this) {
                            $(this).css("display", "none");
                            unlockScroll();
                        }
                    });

                    // Optional: ESC key to close top modal
                    $(document).on("keydown", function(e) {
                        if (e.key === "Escape") {
                            const $open = $("[cms-modal-target]").filter(function() {
                                return $(this).css("display") !== "none";
                            }).last();
                            if ($open.length) {
                                $open.css("display", "none");
                                unlockScroll();
                            }
                        }
                    });

                });
            