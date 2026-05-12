document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // HIGHLIGHTS SECTION - Tab switching & horizontal scroll
    // ============================================
    const tabBtns = document.querySelectorAll('.section.skills .tab-btn');
    const panelsTrack = document.querySelector('.section.skills .panels-track');
    const panels = document.querySelectorAll('.section.skills .panel');
    
    if (tabBtns.length && panelsTrack && panels.length) {
        tabBtns.forEach((btn, index) => {
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', function() {
                // Remove active state from all tabs
                tabBtns.forEach(t => t.querySelector('.tab-highlight')?.remove());
                
                // Add highlight to clicked tab
                if (!btn.querySelector('.tab-highlight')) {
                    const highlight = document.createElement('div');
                    highlight.className = 'tab-highlight';
                    btn.appendChild(highlight);
                }
                
                // Scroll to corresponding panel
                const panelWidth = panels[0].offsetWidth;
                panelsTrack.style.transform = `translateX(-${index * panelWidth}px)`;
                panelsTrack.style.transition = 'transform 0.5s ease';
            });
        });
        
        // Enable scroll-based panel switching
        const panelsOuter = document.querySelector('.section.skills .panels-outer');
        if (panelsOuter) {
            let isScrolling = false;
            panelsOuter.addEventListener('wheel', function(e) {
                if (isScrolling) return;
                
                const currentTransform = panelsTrack.style.transform;
                const match = currentTransform.match(/translateX\(-?(\d+)px\)/);
                const currentOffset = match ? parseInt(match[1]) : 0;
                const panelWidth = panels[0].offsetWidth;
                const currentIndex = Math.round(currentOffset / panelWidth);
                
                let newIndex = currentIndex;
                if (e.deltaY > 0 && currentIndex < panels.length - 1) {
                    newIndex = currentIndex + 1;
                } else if (e.deltaY < 0 && currentIndex > 0) {
                    newIndex = currentIndex - 1;
                }
                
                if (newIndex !== currentIndex) {
                    e.preventDefault();
                    isScrolling = true;
                    panelsTrack.style.transform = `translateX(-${newIndex * panelWidth}px)`;
                    panelsTrack.style.transition = 'transform 0.5s ease';
                    
                    // Update tab highlight
                    tabBtns.forEach(t => t.querySelector('.tab-highlight')?.remove());
                    if (!tabBtns[newIndex].querySelector('.tab-highlight')) {
                        const highlight = document.createElement('div');
                        highlight.className = 'tab-highlight';
                        tabBtns[newIndex].appendChild(highlight);
                    }
                    
                    setTimeout(() => { isScrolling = false; }, 600);
                }
            }, { passive: false });
        }
    }

    // ============================================
    // MOMENTS SECTION - Image Lightbox
    // ============================================
    const circleImages = document.querySelectorAll('.section.signal .circle-image');
    
    if (circleImages.length) {
        // Create lightbox container
        const lightbox = document.createElement('div');
        lightbox.id = 'moments-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-overlay"></div>
            <div class="lightbox-content">
                <button class="lightbox-close">&times;</button>
                <img class="lightbox-image" src="" alt="Seminar moment" />
            </div>
        `;
        document.body.appendChild(lightbox);
        
        // Add lightbox styles
        const style = document.createElement('style');
        style.textContent = `
            #moments-lightbox {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
            }
            #moments-lightbox.active {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #moments-lightbox .lightbox-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                cursor: pointer;
            }
            #moments-lightbox .lightbox-content {
                position: relative;
                max-width: 90vw;
                max-height: 90vh;
                z-index: 1;
            }
            #moments-lightbox .lightbox-image {
                max-width: 90vw;
                max-height: 90vh;
                object-fit: contain;
                border-radius: 8px;
            }
            #moments-lightbox .lightbox-close {
                position: absolute;
                top: -40px;
                right: 0;
                background: none;
                border: none;
                color: white;
                font-size: 32px;
                cursor: pointer;
                padding: 8px;
            }
            .section.signal .circle-image {
                cursor: pointer;
                transition: transform 0.3s ease;
            }
            .section.signal .circle-image:hover {
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(style);
        
        // Add click handlers to images
        circleImages.forEach(img => {
            img.addEventListener('click', function() {
                const fullSrc = this.src.replace(/&tr=[^&]+/, ''); // Remove transformation params for full size
                lightbox.querySelector('.lightbox-image').src = fullSrc;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });
        
        // Close lightbox handlers
        lightbox.querySelector('.lightbox-overlay').addEventListener('click', closeLightbox);
        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeLightbox();
        });
        
        function closeLightbox() {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ============================================
    // SPEAKERS SECTION - View Profile Modal
    // ============================================
    const speakerData = {
        'peter-alexiadis': {
            name: 'Peter Alexiadis',
            role: 'Visiting Professor, King\'s College London | Research Fellow, CERRE | Retired Partner, Gibson, Dunn & Crutcher LLP',
            image: 'https://ik.imagekit.io/dr5fryhth/speak?updatedAt=1775965054049&tr=q-70,w-800',
            bio: `Peter is a visiting Professor at King's College London; Research Fellow at Centre for European Regulation (CERRE), Retired Partner at Gibson, Dunn & Crutcher LLP.

Peter has practised Community law in Brussels since 1989, specialising in competition law, communications policy, and intellectual property law. He holds postgraduate legal qualifications from the Universities of London, Sydney and Thessaloniki. He retired from the US law firm Gibson, Dunn & Crutcher LLP on 1 January 2022, having been the Partner-in-Charge of the Brussels office.

He has been an academic at Kings College since 2006, where he is a Visiting Professor, having taught the respective LLM modules on Competition Law & Regulated Network Sectors and the Digital Regulation. He has previously taught Competition Law at the Strathclyde Management School and currently a Research Fellow at the Centre for European Regulation (CERRE) and teaches regularly on OECD programmes and at the College of Europe's Summer School for Competition Authorities.

Much of his time is spent advising competition and sector-specific regulators, and government Ministries responsible for implementing policy, legislative and policy change.

He is the Chief Editor of the Utilities Law Review (ULR) and the International Bar Association's International Business Law (IBL) Journal. Peter is also an Advisor to the International Institute of Communications (IIC). He writes for a range of academic and professional publications and speaks regularly on policy issues at various international fora. Every two years, he organises an international competition law conference on the island of Ithaca in Greece.`
        },
        'david-bailey': {
            name: 'Prof. David Bailey',
            role: 'Professor of Practice Law, King\'s College London | Barrister, Brick Court Chambers',
            image: 'https://ik.imagekit.io/dr5fryhth/sirspeaker?tr=q-70,w-800',
            bio: `David Bailey is a Professor of Practice Law at King's College London, a barrister and author.

Professor Bailey has taught postgraduate courses on competition law and policy at King's College London since 2003, having taught at King's since 2001.

Professor Bailey is a practising barrister, qualified in England and Wales and in Ireland; he is also an attorney in New York. Since 2015, he has been Standing Counsel to the UK Competition and Markets Authority and the Hong Kong Competition Commission.

In 2017 he was a Non-Governmental Adviser to the International Competition Network. In 2019 he was ranked as one of the 'Most Highly Regarded' junior barristers in Who's Who Legal UK Bar: Competition. In 2019 Professor Bailey was awarded the King's Education Award 2019 for Sustained Excellence.

Professor Bailey is also a member of Brick Court Chambers.`
        },
        'juliette-twumasi': {
            name: 'Dr. Juliette Twumasi-Anokye',
            role: 'Guest Speaker',
            image: '/images/juliet.jpg',
            bio: `Dr. Juliette Twumasi-Anokye is a distinguished guest speaker who contributed valuable insights at the CMC Ghana Competition Law & Policy Seminar.

Her expertise and perspectives enriched the discussions on Ghana's competition law framework and its implementation challenges.`
        },
        'paul-datsa': {
            name: 'Paul Kofi Datsa',
            role: 'Managing Director, Competition & Markets Center',
            image: '/images/mrdatsa.png',
            bio: `Paul Kofi Datsa is the Managing Director of the Competition & Markets Center, host of the CMC Ghana Competition Law & Policy Seminar.

He leads the Center's work on competition policy, market regulation, and capacity building in Ghana, convening leading academics, practitioners, regulators, and policymakers to shape the country's competition law framework.

At the seminar, Mr. Datsa delivered the vote of thanks, expressing gratitude to all speakers, organizers, and attendees for making the gathering a success.`
        }
    };

    // Create speaker modal
    const speakerModal = document.createElement('div');
    speakerModal.id = 'speaker-modal';
    speakerModal.innerHTML = `
        <div class="speaker-modal-overlay"></div>
        <div class="speaker-modal-content">
            <button class="speaker-modal-close">&times;</button>
            <div class="speaker-modal-inner">
                <div class="speaker-modal-image-wrap">
                    <img class="speaker-modal-image" src="" alt="" />
                </div>
                <div class="speaker-modal-text">
                    <h2 class="speaker-modal-name"></h2>
                    <p class="speaker-modal-role"></p>
                    <div class="speaker-modal-bio"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(speakerModal);

    // Add speaker modal styles
    const speakerStyle = document.createElement('style');
    speakerStyle.textContent = `
        #speaker-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
        }
        #speaker-modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #speaker-modal .speaker-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            cursor: pointer;
        }
        #speaker-modal .speaker-modal-content {
            position: relative;
            background: #f5f0eb;
            max-width: 900px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 12px;
            z-index: 1;
        }
        #speaker-modal .speaker-modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(0,0,0,0.1);
            border: none;
            color: #333;
            font-size: 28px;
            cursor: pointer;
            padding: 4px 12px;
            border-radius: 50%;
            z-index: 2;
        }
        #speaker-modal .speaker-modal-inner {
            display: grid;
            grid-template-columns: 1fr 1.5fr;
            gap: 2rem;
            padding: 2rem;
        }
        @media (max-width: 768px) {
            #speaker-modal .speaker-modal-inner {
                grid-template-columns: 1fr;
            }
        }
        #speaker-modal .speaker-modal-image-wrap {
            aspect-ratio: 3/4;
            overflow: hidden;
            border-radius: 8px;
        }
        #speaker-modal .speaker-modal-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        #speaker-modal .speaker-modal-name {
            font-size: 1.75rem;
            color: #2a2119;
            margin-bottom: 0.5rem;
        }
        #speaker-modal .speaker-modal-role {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 1.5rem;
        }
        #speaker-modal .speaker-modal-bio {
            font-size: 0.95rem;
            line-height: 1.7;
            color: #333;
            white-space: pre-line;
        }
    
        /* Make speaker buttons clickable */
        #speakers .button-snap {
            cursor: pointer !important;
            pointer-events: auto !important;
            position: relative !important;
            z-index: 10 !important;
        }
        #speakers .button-wrap-snap {
            pointer-events: auto !important;
            position: relative !important;
            z-index: 10 !important;
        }
        #speakers .snap-bottom-gradient {
            pointer-events: auto !important;
        }
    `;
    document.head.appendChild(speakerStyle);

    // Add click handlers to speaker buttons
    const speakerButtons = document.querySelectorAll('#speakers .button-snap');
    console.log('Found speaker buttons:', speakerButtons.length);
    
    speakerButtons.forEach((btn, index) => {
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';
        btn.style.position = 'relative';
        btn.style.zIndex = '10';
        
        const speakerKeys = ['peter-alexiadis', 'david-bailey', 'juliette-twumasi', 'paul-datsa'];
        const speakerKey = speakerKeys[index];
        
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Speaker button clicked:', speakerKey);
            const speaker = speakerData[speakerKey];
            if (speaker) {
                speakerModal.querySelector('.speaker-modal-image').src = speaker.image;
                speakerModal.querySelector('.speaker-modal-name').textContent = speaker.name;
                speakerModal.querySelector('.speaker-modal-role').textContent = speaker.role;
                speakerModal.querySelector('.speaker-modal-bio').textContent = speaker.bio;
                speakerModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    // Also add click to the visible text labels
    const viewProfileLabels = document.querySelectorAll('#speakers .button-visible-text');
    viewProfileLabels.forEach((label, index) => {
        label.style.cursor = 'pointer';
        label.style.pointerEvents = 'auto';
        
        const speakerKeys = ['peter-alexiadis', 'david-bailey', 'juliette-twumasi', 'paul-datsa'];
        const speakerKey = speakerKeys[index];
        
        label.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('View Profile label clicked:', speakerKey);
            const speaker = speakerData[speakerKey];
            if (speaker) {
                speakerModal.querySelector('.speaker-modal-image').src = speaker.image;
                speakerModal.querySelector('.speaker-modal-name').textContent = speaker.name;
                speakerModal.querySelector('.speaker-modal-role').textContent = speaker.role;
                speakerModal.querySelector('.speaker-modal-bio').textContent = speaker.bio;
                speakerModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // Close speaker modal handlers
    speakerModal.querySelector('.speaker-modal-overlay').addEventListener('click', closeSpeakerModal);
    speakerModal.querySelector('.speaker-modal-close').addEventListener('click', closeSpeakerModal);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && speakerModal.classList.contains('active')) {
            closeSpeakerModal();
        }
    });

    function closeSpeakerModal() {
        speakerModal.classList.remove('active');
        document.body.style.overflow = '';
    }
});
