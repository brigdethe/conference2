
        document.addEventListener('DOMContentLoaded', () => {
            const wrapper = document.querySelector('.circle-wrapper');
            const items = document.querySelectorAll('.circle-image');

            if (!wrapper || !items.length) return console.error('Missing wrapper or images');

            const r = (Math.min(wrapper.offsetWidth, wrapper.offsetHeight) / 2) - 50;
            const stepDeg = 360 / items.length;

            items.forEach((item, i) => {
                const angle = stepDeg * i; // where it sits on the circle
                const rad = angle * Math.PI / 180;

                gsap.set(item, {
                    x: Math.cos(rad) * r,
                    y: Math.sin(rad) * r,
                    rotation: angle + 90, // <- tangent, not radial
                    transformOrigin: '50% 50%',
                    position: 'absolute' // makes the translation take effect
                });
            });
        });

        document.addEventListener('DOMContentLoaded', () => {
            const selectors = '.scroll-image-small, .scroll-image-large, .scroll-image-vertical, .scroll-image-horizontall';
            const imageCards = Array.from(document.querySelectorAll(`.master-scroll-images ${selectors}`));
            if (!imageCards.length) return;

            const modal = document.createElement('div');
            modal.className = 'scroll-image-modal';
            modal.setAttribute('aria-hidden', 'true');
            modal.innerHTML = `
                <div class="scroll-image-modal-stage">
                    <button type="button" class="scroll-image-modal-close" aria-label="Close image viewer">
                        <svg class="scroll-image-modal-close-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M6 6L18 18M18 6L6 18"></path>
                        </svg>
                    </button>
                    <img class="scroll-image-modal-image" src="" alt="" />
                </div>
                <p class="scroll-image-modal-caption"></p>
            `;

            document.body.appendChild(modal);

            const modalImage = modal.querySelector('.scroll-image-modal-image');
            const modalCaption = modal.querySelector('.scroll-image-modal-caption');
            const closeButton = modal.querySelector('.scroll-image-modal-close');

            const openModal = (imageCard) => {
                const image = imageCard.querySelector('.image-cover');
                if (!image) return;
                const caption = imageCard.querySelector('.scroll-image-caption');
                modalImage.src = image.currentSrc || image.src;
                modalImage.alt = image.alt || 'Expanded section image';
                modalCaption.textContent = caption ? caption.textContent : '';
                modal.classList.add('is-open');
                modal.setAttribute('aria-hidden', 'false');
                document.body.classList.add('scroll-image-modal-open');
            };

            const closeModal = () => {
                modal.classList.remove('is-open');
                modal.setAttribute('aria-hidden', 'true');
                modalImage.src = '';
                modalCaption.textContent = '';
                document.body.classList.remove('scroll-image-modal-open');
            };

            imageCards.forEach((card) => {
                const imageMedia = card.querySelector('.scroll-image-media');
                if (!imageMedia) return;
                const caption = card.querySelector('.scroll-image-caption');
                imageMedia.setAttribute('tabindex', '0');
                imageMedia.setAttribute('role', 'button');
                imageMedia.setAttribute('aria-label', caption ? `Open image: ${caption.textContent}` : 'Open image');
                imageMedia.addEventListener('click', () => openModal(card));
                imageMedia.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openModal(card);
                    }
                });
            });

            closeButton.addEventListener('click', closeModal);
            modal.addEventListener('click', (event) => {
                if (event.target === modal) closeModal();
            });

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && modal.classList.contains('is-open')) {
                    closeModal();
                }
            });
        });
    