import React, { useState } from 'react';
import QRCodeSection from './QRCodeSection'; // Reusing the QR code component

const onboardingSteps = [
    { id: 0, title: 'Your details', desc: 'Please provide your name and email', color: '#f8efe6', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/giammarco-boscaro-zeH-ljawHtg-unsplash.jpg?updatedAt=1770793618312' },
    { id: 1, title: 'Scan QR code', desc: 'Verify at least one device with 2FA', color: '#b7dcc2', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/maxresdefault.jpg?updatedAt=1770793618115' },
    { id: 2, title: 'Choose a password', desc: 'Must be at least 8 characters', color: '#ddd4cc', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/maxresdefault.jpg?updatedAt=1770793618115' },
    { id: 3, title: 'Invite your team', desc: 'Start collaborating with your team', color: '#8f6248', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/maxresdefault.jpg?updatedAt=1770793618115' },
    { id: 4, title: 'Add your socials', desc: 'Share posts to your social accounts', color: '#3d2b27', bg: 'https://ik.imagekit.io/dr5fryhth/conference/Accra_xxxxxxxxx_i116585_13by5.webp?updatedAt=1771048872912' }
];

const OnboardingCard: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [prevColor, setPrevColor] = useState(onboardingSteps[0].color);
    const [isAnimating, setIsAnimating] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [prevBg, setPrevBg] = useState(onboardingSteps[0].bg);
    const [bgFading, setBgFading] = useState(false);

    // Swipe gesture tracking
    const touchStartX = React.useRef<number>(0);
    const touchEndX = React.useRef<number>(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        touchEndX.current = e.changedTouches[0].screenX;
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50; // minimum swipe distance in px
        if (diff > threshold && activeStep < onboardingSteps.length - 1) {
            // Swiped left → next step
            setActiveStep(activeStep + 1);
        } else if (diff < -threshold && activeStep > 0) {
            // Swiped right → previous step
            setActiveStep(activeStep - 1);
        }
    };

    const handleStepClick = (stepId: number) => {
        setActiveStep(stepId);
        setSidebarOpen(false); // Auto-close sidebar on mobile
    };

    const activeColor = onboardingSteps[activeStep].color;
    const activeBg = onboardingSteps[activeStep].bg;

    // Trigger sidebar color animation when the step changes
    React.useEffect(() => {
        if (activeColor !== prevColor) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setPrevColor(activeColor);
                setIsAnimating(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [activeColor, prevColor]);

    // Trigger background crossfade when the step changes
    React.useEffect(() => {
        if (activeBg !== prevBg) {
            setBgFading(true);
            const timer = setTimeout(() => {
                setPrevBg(activeBg);
                setBgFading(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [activeBg, prevBg]);

    // Step 0 (Light Orange), 1 (Seafoam), and 2 (Cream) are lighter colors, need dark text.
    // Step 3 (Earth) and 4 (Dark Brown) are darker colors, need light text.
    const isLightBackground = [0, 1, 2].includes(activeStep);

    return (
        <div className={`onboarding-card ${sidebarOpen ? 'sidebar-open' : ''}`}>
            {/* Mobile Hamburger Toggle */}
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {sidebarOpen ? (
                        <>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </>
                    ) : (
                        <>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </>
                    )}
                </svg>
            </button>

            {/* Overlay Backdrop */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* Left Sidebar */}
            <div
                className={`onboarding-sidebar ${isLightBackground ? 'theme-light' : 'theme-dark'}`}
                style={{
                    '--active-bg-color': activeColor,
                    backgroundColor: prevColor
                } as React.CSSProperties}
            >
                {/* Expanding Circular Background */}
                <div
                    className={`sidebar-animated-bg ${isAnimating ? 'animate' : ''}`}
                    style={{ backgroundColor: activeColor }}
                ></div>

                <div className="sidebar-content-wrapper">
                    <div className="sidebar-header">

                        <span className="logo-text">Ghana Competition Law & Policy Seminar.</span>
                    </div>

                    <div className="stepper">
                        {onboardingSteps.map((step) => {
                            const isCompleted = activeStep > step.id;
                            const isActive = activeStep === step.id;
                            let stepClass = "step";
                            if (isCompleted) stepClass += " completed";
                            if (isActive) stepClass += " active";

                            return (
                                <div
                                    key={step.id}
                                    className={stepClass}
                                    onClick={() => handleStepClick(step.id)}
                                    style={{
                                        cursor: 'pointer',
                                        '--step-color': step.color
                                    } as React.CSSProperties}
                                >
                                    <div className="step-icon">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <div className="step-content">
                                        <div className="step-title">{step.title}</div>
                                        <div className="step-desc">{step.desc}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="sidebar-footer">
                        <button className="login-link">Laying a Sound Foundation for a New Era.</button>
                    </div>

                    {/* Section Break Graphic */}
                    <div className="sidebar-section-break">
                        <div className="section_break-tile_wrapper">
                            <div className="section_break-tile"></div>
                            <div className="section_break-tile one"></div>
                        </div>
                        <div className="section_break-tile_wrapper">
                            <div className="section_break-tile two"></div>
                            <div className="section_break-tile"></div>
                        </div>
                        <div className="section_break-tile_wrapper">
                            <div className="section_break-tile"></div>
                            <div className="section_break-tile three"></div>
                        </div>
                        <div className="section_break-tile_wrapper">
                            <div className="section_break-tile four"></div>
                            <div className="section_break-tile"></div>
                        </div>
                    </div>
                </div>{/* End sidebar-content-wrapper */}
            </div>

            {/* Right Content */}
            <div
                className="onboarding-content"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Background crossfade layers */}
                <div className="content-bg" style={{ backgroundImage: `url('${prevBg}')` }}></div>
                <div className={`content-bg content-bg-next ${bgFading ? 'fade-in' : ''}`} style={{ backgroundImage: `url('${activeBg}')` }}></div>
                {activeStep === 0 && (
                    <div className="content-wrapper hero-content">
                    </div>
                )}

                {activeStep === 1 && (
                    <div className="content-wrapper">
                        <h2 className="onboarding-title">Scan QR code</h2>
                        <p className="onboarding-subtitle">Placeholder for QR code verification step.</p>
                        <button className="continue-btn" onClick={() => setActiveStep(2)}>Continue</button>
                    </div>
                )}

                {activeStep === 2 && (
                    <div className="content-wrapper">
                        <div className="scan-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                                <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                                <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                                <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                            </svg>
                        </div>
                        <h2 className="onboarding-title">Choose a password</h2>
                        <p className="onboarding-subtitle">Please scan the QR code to verify your identity.</p>

                        <div className="onboarding-qr-wrapper">
                            <QRCodeSection />
                        </div>

                        <div className="divider">
                            <span>or enter the code manually</span>
                        </div>

                        <div className="manual-entry-group">
                            <input type="text" className="manual-input" value="HLA8G4L1B9ZX4" readOnly />
                            <button className="copy-btn" title="Copy code">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>

                        <button className="continue-btn" onClick={() => setActiveStep(3)}>Continue</button>
                    </div>
                )}

                {activeStep === 3 && (
                    <div className="content-wrapper">
                        <h2 className="onboarding-title">Invite your team</h2>
                        <p className="onboarding-subtitle">Placeholder for adding team members.</p>
                        <button className="continue-btn" onClick={() => setActiveStep(4)}>Continue</button>
                    </div>
                )}

                {activeStep === 4 && (
                    <div className="content-wrapper">
                        <h2 className="onboarding-title">Add your socials</h2>
                        <p className="onboarding-subtitle">Placeholder for linking external accounts.</p>
                        <button className="continue-btn" onClick={() => alert('Validation complete!')}>Finish Setup</button>
                    </div>
                )}

                <div className="onboarding-footer-controls" style={{ marginTop: 'auto', maxWidth: '400px', width: '100%' }}>
                    <div className="pagination-dots">
                        {onboardingSteps.map((step) => (
                            <span
                                key={step.id}
                                className={`dot ${activeStep === step.id ? 'active' : ''}`}
                                onClick={() => handleStepClick(step.id)}
                            ></span>
                        ))}
                    </div>
                    <p className="active-step-label">{onboardingSteps[activeStep].title}</p>
                    <button className="help-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingCard;
