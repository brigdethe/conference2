import React, { useState, useEffect } from 'react';
import QRCodeSection from './QRCodeSection';

type PendingStatus = 'idle' | 'loading' | 'pending_approval' | 'pending_payment' | 'rejected' | 'confirmed' | 'awaiting_verification' | 'error';

function getRegIdFromSearch(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

const onboardingSteps = [
    { id: 0, title: 'Verify your ticket', desc: 'Enter your ticket code or scan your QR code', color: '#f8efe6', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/giammarco-boscaro-zeH-ljawHtg-unsplash.jpg?updatedAt=1770793618312' },
    { id: 1, title: 'Registration status', desc: 'Check approval and payment status', color: '#b7dcc2', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/maxresdefault.jpg?updatedAt=1770793618115' },
    { id: 2, title: 'Choose a password', desc: 'Must be at least 8 characters', color: '#ddd4cc', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/maxresdefault.jpg?updatedAt=1770793618115' },
    { id: 3, title: 'Invite your team', desc: 'Start collaborating with your team', color: '#8f6248', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/maxresdefault.jpg?updatedAt=1770793618115' },
    { id: 4, title: 'Add your socials', desc: 'Share posts to your social accounts', color: '#3d2b27', bg: 'https://ik.imagekit.io/dr5fryhth/conference/Accra_xxxxxxxxx_i116585_13by5.webp?updatedAt=1771048872912' }
];

const POLL_INTERVAL_MS = 5000;

const OnboardingCard: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [ticketCode, setTicketCode] = useState('');
    const ticketCodeRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [pendingRegId] = useState<string | null>(() => getRegIdFromSearch());
    const [pendingStatus, setPendingStatus] = useState<PendingStatus>('idle');
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

    const isLightBackground = [0, 1, 2].includes(activeStep);

    useEffect(() => {
        if (activeStep !== 1 || !pendingRegId) {
            if (activeStep !== 1) setPendingStatus('idle');
            return;
        }
        let cancelled = false;
        setPendingStatus('loading');
        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/registration/${encodeURIComponent(pendingRegId)}/status`, { credentials: 'include' });
                if (cancelled) return;
                if (!res.ok) {
                    setPendingStatus('error');
                    return;
                }
                const data = await res.json();
                const s = (data.status || '').toLowerCase();
                if (s === 'pending_approval') setPendingStatus('pending_approval');
                else if (s === 'pending_payment') setPendingStatus('pending_payment');
                else if (s === 'rejected') setPendingStatus('rejected');
                else if (s === 'confirmed') setPendingStatus('confirmed');
                else if (s === 'awaiting_verification' || s === 'payment_submitted') setPendingStatus('awaiting_verification');
                else setPendingStatus('pending_approval');
            } catch {
                if (!cancelled) setPendingStatus('error');
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [activeStep, pendingRegId]);

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
                <div className="content-bg-overlay" aria-hidden="true" />
                {activeStep === 0 && (
                    <div className="content-wrapper step-verify">
                        <div className="scan-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                                <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                                <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                                <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                            </svg>
                        </div>
                        <h2 className="onboarding-title">Verify your ticket</h2>
                        <p className="onboarding-subtitle">Enter your 4-character ticket code below or scan your QR code to continue.</p>
                        <div className="onboarding-qr-wrapper">
                            <QRCodeSection />
                        </div>
                        <div className="divider">
                            <span>or enter ticket code</span>
                        </div>
                        <div className="ticket-code-boxes">
                            {[0, 1, 2, 3].map((i) => (
                                <input
                                    key={i}
                                    ref={(el) => { ticketCodeRefs.current[i] = el; }}
                                    type="text"
                                    className="ticket-code-box"
                                    maxLength={1}
                                    value={ticketCode[i] ?? ''}
                                    onChange={(e) => {
                                        const char = (e.target.value.slice(-1) || '').toUpperCase().replace(/[^A-Z0-9]/, '');
                                        const next = (ticketCode.slice(0, i) + char + ticketCode.slice(i + 1)).slice(0, 4);
                                        setTicketCode(next);
                                        if (char && i < 3) ticketCodeRefs.current[i + 1]?.focus();
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Backspace' && !ticketCode[i] && i > 0) {
                                            setTicketCode(ticketCode.slice(0, i - 1) + ticketCode.slice(i));
                                            ticketCodeRefs.current[i - 1]?.focus();
                                        }
                                    }}
                                    inputMode="text"
                                    autoComplete="one-time-code"
                                    aria-label={`Ticket code character ${i + 1}`}
                                />
                            ))}
                        </div>
                        {verifyError && (
                            <p className="verify-error" role="alert">{verifyError}</p>
                        )}
                        <button
                            className="continue-btn"
                            onClick={async () => {
                                if (ticketCode.length !== 4) return;
                                setVerifyError(null);
                                setVerifyLoading(true);
                                try {
                                    const res = await fetch(`/api/tickets/verify/${encodeURIComponent(ticketCode)}`, { credentials: 'include' });
                                    const data = await res.json().catch(() => ({}));
                                    if (!res.ok) {
                                        setVerifyError(data.detail || data.error || 'Verification failed');
                                        return;
                                    }
                                    setVerifyError(null);
                                    setActiveStep(1);
                                } catch {
                                    setVerifyError('Unable to verify ticket. Please try again.');
                                } finally {
                                    setVerifyLoading(false);
                                }
                            }}
                            disabled={ticketCode.length !== 4 || verifyLoading}
                        >
                            {verifyLoading ? 'Verifying…' : 'Verify'}
                        </button>
                    </div>
                )}

                {activeStep === 1 && (
                    <div className="content-wrapper">
                        {pendingRegId && pendingStatus === 'loading' && (
                            <div className="pending-approval-card pending-approval-card--loading">
                                <div className="pending-approval-card__spinner" aria-hidden="true" />
                                <p className="pending-approval-card__loading-text">Checking registration status…</p>
                            </div>
                        )}
                        {(!pendingRegId || pendingStatus === 'pending_approval' || pendingStatus === 'awaiting_verification') && pendingStatus !== 'loading' && (
                            <div className="pending-approval-card">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__icon" aria-hidden="true">
                                        <svg width="10" height="11" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="5" cy="5.5" r="5" fill="currentColor" />
                                        </svg>
                                    </span>
                                    <span className="pending-approval-card__label">Registration Status</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    Your registration is being reviewed.
                                    <br /><br />
                                    We&apos;ll contact you via WhatsApp when it&apos;s approved or if we need more information.
                                </h2>
                                <a
                                    href="https://wa.me/233XXXXXXXXX"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="pending-approval-card__btn"
                                >
                                    <span>WhatsApp</span>
                                    <span className="pending-approval-card__btn-icon">
                                        <svg width="17" height="10" viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10.7402 0.758789C11.1101 1.43055 11.6506 1.99534 12.335 2.67969L12.3369 2.68066C12.563 2.90815 12.7969 3.12518 13.0391 3.32129L13.2979 3.52148C13.5554 3.71189 13.8112 3.87433 14.0771 4.00781L14.0908 4.01465C14.1127 4.0265 14.1327 4.03626 14.1494 4.04297L14.1738 4.05371C14.8406 4.36321 15.5323 4.46164 16.3486 4.48926L16.6221 4.49805L16.8135 4.49219V4.50488L16.8486 4.50684L16.8311 4.99805L16.8496 5.49121L16.8145 5.49219V5.50586L16.6299 5.49902L16.3496 5.50977C15.5318 5.53888 14.8415 5.6347 14.1758 5.94629L14.1494 5.95801C14.1326 5.96472 14.1128 5.97443 14.0908 5.98633L14.0742 5.99512C13.7223 6.16906 13.388 6.39803 13.04 6.67871C12.7966 6.87576 12.5613 7.09202 12.335 7.31836C11.6504 8.00447 11.1101 8.56842 10.7402 9.24023L10.499 9.67773L9.62305 9.19629L9.86426 8.75781C10.2003 8.14756 10.6449 7.6253 11.1309 7.11719L11.6279 6.61133C11.8735 6.36578 12.1346 6.12418 12.4111 5.90039H12.4121C12.5856 5.76046 12.7623 5.62776 12.9443 5.50391H0.5V4.50391H12.9561C12.8708 4.44617 12.7863 4.38669 12.7031 4.3252L12.4131 4.10156L12.4111 4.10059C12.1342 3.87643 11.873 3.63336 11.6279 3.38672L11.1309 2.88184C10.6449 2.37432 10.2003 1.85144 9.86426 1.24121L9.62305 0.803711L10.499 0.321289L10.7402 0.758789Z" fill="currentColor" />
                                        </svg>
                                    </span>
                                </a>
                            </div>
                        )}
                        {pendingRegId && pendingStatus === 'pending_payment' && (
                            <div className="pending-approval-card pending-approval-card--approved">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__icon pending-approval-card__icon--success" aria-hidden="true">✓</span>
                                    <span className="pending-approval-card__label">Approved</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    Your registration has been approved. Please complete payment.
                                </h2>
                                <a
                                    href={`/payment?id=${pendingRegId}`}
                                    className="pending-approval-card__btn"
                                >
                                    <span>Complete Payment</span>
                                    <span className="pending-approval-card__btn-icon">
                                        <svg width="17" height="10" viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10.7402 0.758789C11.1101 1.43055 11.6506 1.99534 12.335 2.67969L12.3369 2.68066C12.563 2.90815 12.7969 3.12518 13.0391 3.32129L13.2979 3.52148C13.5554 3.71189 13.8112 3.87433 14.0771 4.00781L14.0908 4.01465C14.1127 4.0265 14.1327 4.03626 14.1494 4.04297L14.1738 4.05371C14.8406 4.36321 15.5323 4.46164 16.3486 4.48926L16.6221 4.49805L16.8135 4.49219V4.50488L16.8486 4.50684L16.8311 4.99805L16.8496 5.49121L16.8145 5.49219V5.50586L16.6299 5.49902L16.3496 5.50977C15.5318 5.53888 14.8415 5.6347 14.1758 5.94629L14.1494 5.95801C14.1326 5.96472 14.1128 5.97443 14.0908 5.98633L14.0742 5.99512C13.7223 6.16906 13.388 6.39803 13.04 6.67871C12.7966 6.87576 12.5613 7.09202 12.335 7.31836C11.6504 8.00447 11.1101 8.56842 10.7402 9.24023L10.499 9.67773L9.62305 9.19629L9.86426 8.75781C10.2003 8.14756 10.6449 7.6253 11.1309 7.11719L11.6279 6.61133C11.8735 6.36578 12.1346 6.12418 12.4111 5.90039H12.4121C12.5856 5.76046 12.7623 5.62776 12.9443 5.50391H0.5V4.50391H12.9561C12.8708 4.44617 12.7863 4.38669 12.7031 4.3252L12.4131 4.10156L12.4111 4.10059C12.1342 3.87643 11.873 3.63336 11.6279 3.38672L11.1309 2.88184C10.6449 2.37432 10.2003 1.85144 9.86426 1.24121L9.62305 0.803711L10.499 0.321289L10.7402 0.758789Z" fill="currentColor" />
                                        </svg>
                                    </span>
                                </a>
                            </div>
                        )}
                        {pendingRegId && pendingStatus === 'rejected' && (
                            <div className="pending-approval-card pending-approval-card--rejected">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__icon pending-approval-card__icon--rejected" aria-hidden="true">✕</span>
                                    <span className="pending-approval-card__label">Not approved</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    Unfortunately, your registration was not approved.
                                </h2>
                            </div>
                        )}
                        {pendingRegId && pendingStatus === 'confirmed' && (
                            <div className="pending-approval-card pending-approval-card--confirmed">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__icon pending-approval-card__icon--success" aria-hidden="true">✓</span>
                                    <span className="pending-approval-card__label">Confirmed</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    Your registration is confirmed. See you at the event!
                                </h2>
                            </div>
                        )}
                        {pendingRegId && pendingStatus === 'error' && (
                            <div className="pending-approval-card pending-approval-card--error">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__label">Registration not found</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    We couldn&apos;t find this registration.
                                </h2>
                            </div>
                        )}
                        <button className="continue-btn" onClick={() => setActiveStep(2)}>Continue</button>
                    </div>
                )}

                {activeStep === 2 && (
                    <div className="content-wrapper">
                        <h2 className="onboarding-title">Choose a password</h2>
                        <p className="onboarding-subtitle">Placeholder for next step.</p>
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
