import React, { useState, useEffect } from 'react';
import TicketCard from './TicketCard';
import CountdownCard from './CountdownCard';
import Confetti from './Confetti';

type PendingStatus = 'idle' | 'loading' | 'pending_approval' | 'pending_payment' | 'rejected' | 'confirmed' | 'awaiting_verification' | 'error';

function getRegIdFromSearch(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

const onboardingSteps = [
    { id: 0, title: 'Verify your ticket', desc: 'Enter your ticket code to get started', color: '#f8efe6', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/giammarco-boscaro-zeH-ljawHtg-unsplash.jpg?updatedAt=1770793618312' },
    { id: 1, title: 'Registration status', desc: 'Check approval and payment status', color: '#b7dcc2', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/maxresdefault.jpg?updatedAt=1770793618115' },
    { id: 2, title: 'Complete payment', desc: 'Pay with MTN MoMo', color: '#ddd4cc', bg: 'https://ik.imagekit.io/dr5fryhth/conferencenew/maxresdefault.jpg?updatedAt=1770793618115' },
    { id: 3, title: 'See you there', desc: 'Your ticket is ready for event day', color: '#3d2b27', bg: 'https://ik.imagekit.io/dr5fryhth/conference/Accra_xxxxxxxxx_i116585_13by5.webp?updatedAt=1771048872912' }
];

const POLL_INTERVAL_MS = 5000;

function statusToMaxStep(status: string | null, ticketType?: string | null): number {
    if (!status) return 0;
    const s = status.toLowerCase();
    const isAccessCode = ticketType?.toLowerCase() === 'access code';
    if (s === 'confirmed') return 3;
    if (s === 'pending_payment') return isAccessCode ? 3 : 2;
    if (s === 'pending_approval' || s === 'awaiting_verification' || s === 'payment_submitted' || s === 'rejected' || s === 'error') return 1;
    return 1;
}

function statusToStep(status: string | null, ticketType?: string | null): number {
    if (!status) return 1;
    const s = status.toLowerCase();
    const isAccessCode = ticketType?.toLowerCase() === 'access code';
    if (s === 'confirmed') return 3;
    if (s === 'pending_payment') return isAccessCode ? 3 : 2;
    return 1;
}

const OnboardingCard: React.FC = () => {
    const [activeStep, setActiveStep] = useState(() => getRegIdFromSearch() ? 1 : 0);
    const [ticketCode, setTicketCode] = useState('');
    const ticketCodeRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [regId, setRegId] = useState<string | null>(() => getRegIdFromSearch());
    const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
    const [pendingStatus, setPendingStatus] = useState<PendingStatus>('idle');
    const [paymentData, setPaymentData] = useState<{
        registration: { id: number; full_name: string; email: string; firm_name: string | null } | null;
        settings: { ticket_price: string; merchant_code: string; merchant_name: string };
        isExpired: boolean;
    } | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentSubmitted, setPaymentSubmitted] = useState(false);
    const [paymentConfirming, setPaymentConfirming] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [ticketData, setTicketData] = useState<{
        full_name: string;
        ticket_code: string;
        qr_image?: string | null;
        firm_name?: string | null;
    } | null>(null);
    const [ticketLoading, setTicketLoading] = useState(false);
    const [ticketType, setTicketType] = useState<string | null>(null);
    const [prevColor, setPrevColor] = useState(onboardingSteps[0].color);
    const [isAnimating, setIsAnimating] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [prevBg, setPrevBg] = useState(onboardingSteps[0].bg);
    const [bgFading, setBgFading] = useState(false);
    const [finalTabSpinToken, setFinalTabSpinToken] = useState(0);
    const [showPrintTicketButton, setShowPrintTicketButton] = useState(false);
    const previousStepRef = React.useRef(0);

    // Swipe gesture tracking
    const touchStartX = React.useRef<number>(0);
    const touchEndX = React.useRef<number>(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.changedTouches[0].screenX;
    };

    const maxAllowedStep = !regId ? 0 : (registrationStatus !== null ? statusToMaxStep(registrationStatus, ticketType) : 0);

    const handleTouchEnd = (e: React.TouchEvent) => {
        touchEndX.current = e.changedTouches[0].screenX;
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50;
        if (diff > threshold && activeStep < onboardingSteps.length - 1) {
            const next = Math.min(activeStep + 1, maxAllowedStep);
            setActiveStep(next);
        } else if (diff < -threshold && activeStep > 0) {
            setActiveStep(activeStep - 1);
        }
    };

    const resetOnboarding = () => {
        setRegId(null);
        setRegistrationStatus(null);
        setTicketType(null);
        setTicketCode('');
        setPendingStatus('idle');
        setPaymentData(null);
        setPaymentSubmitted(false);
        setPaymentConfirming(false);
        setTicketData(null);
        setVerifyError(null);
        setActiveStep(0);
        const url = new URL(window.location.href);
        url.searchParams.delete('id');
        window.history.replaceState({}, '', url.pathname + url.search);
    };

    const handleStepClick = (stepId: number) => {
        if (stepId > maxAllowedStep) return;
        setActiveStep(stepId);
        setSidebarOpen(false);
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

    useEffect(() => {
        if (activeStep === 3 && previousStepRef.current !== 3) {
            setShowPrintTicketButton(false);
            setFinalTabSpinToken((prev) => prev + 1);
        }
        previousStepRef.current = activeStep;
    }, [activeStep]);

    const isLightBackground = [0, 1, 2].includes(activeStep);

    useEffect(() => {
        const id = getRegIdFromSearch();
        if (id) setRegId(id);
    }, []);

    useEffect(() => {
        if (!regId) return;
        let cancelled = false;
        fetch(`/api/registration/${encodeURIComponent(regId)}/status`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled || !data) return;
                const s = (data.status || '').toLowerCase();
                const tt = data.ticket_type || null;
                setRegistrationStatus(s || null);
                setTicketType(tt);
                // Only update step if we're at step 0 or 1, and don't override if already at correct step
                setActiveStep((prev) => {
                    if (prev >= 2) return prev; // Don't override if already at payment or ticket step
                    const target = statusToStep(s || null, tt);
                    return target > prev ? target : prev;
                });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [regId]);

    useEffect(() => {
        if (activeStep !== 1 || !regId) {
            if (activeStep !== 1) setPendingStatus('idle');
            return;
        }
        let cancelled = false;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        setPendingStatus('loading');
        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/registration/${encodeURIComponent(regId)}/status`, { credentials: 'include' });
                if (cancelled) return;
                if (!res.ok) {
                    setPendingStatus('error');
                    return;
                }
                const data = await res.json();
                const s = (data.status || '').toLowerCase();
                const tt = data.ticket_type || null;
                setRegistrationStatus(s || null);
                setTicketType(tt);
                if (s === 'pending_approval') setPendingStatus('pending_approval');
                else if (s === 'pending_payment') setPendingStatus('pending_payment');
                else if (s === 'rejected') {
                    setPendingStatus('rejected');
                    if (intervalId) clearInterval(intervalId);
                } else if (s === 'confirmed') {
                    setPendingStatus('confirmed');
                    if (intervalId) clearInterval(intervalId);
                } else if (s === 'awaiting_verification' || s === 'payment_submitted') setPendingStatus('awaiting_verification');
                else setPendingStatus('pending_approval');
            } catch {
                if (!cancelled) setPendingStatus('error');
            }
        };
        fetchStatus();
        intervalId = setInterval(fetchStatus, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeStep, regId]);

    useEffect(() => {
        if (activeStep !== 2) return;
        if (!regId) {
            setPaymentData(null);
            return;
        }
        let cancelled = false;
        setPaymentLoading(true);
        (async () => {
            try {
                const [regRes, setRes] = await Promise.all([
                    fetch(`/api/registrations/${regId}`, { credentials: 'include' }),
                    fetch('/api/settings', { credentials: 'include' })
                ]);
                if (cancelled) return;
                if (!regRes.ok) {
                    setPaymentData(null);
                    setPaymentLoading(false);
                    return;
                }
                const registration = await regRes.json();
                if (registration.status === 'confirmed') {
                    setRegistrationStatus('confirmed');
                    setPaymentData({ registration, settings: { ticket_price: '150', merchant_code: '123456', merchant_name: 'CMC Conference' }, isExpired: false });
                    setPaymentConfirming(true);
                    setPaymentLoading(false);
                    return;
                }
                let isExpired = false;
                if (registration.approved_at) {
                    const approvedAt = new Date(registration.approved_at).getTime();
                    isExpired = (Date.now() - approvedAt) > 3 * 24 * 60 * 60 * 1000;
                }
                let settings = { ticket_price: '150', merchant_code: '123456', merchant_name: 'CMC Conference' };
                if (setRes.ok) {
                    const setArr = await setRes.json();
                    setArr.forEach((s: { key: string; value: string }) => {
                        if (s.key === 'ticket_price' && s.value) settings.ticket_price = s.value;
                        if (s.key === 'merchant_code' && s.value) settings.merchant_code = s.value;
                        if (s.key === 'merchant_name' && s.value) settings.merchant_name = s.value;
                    });
                }
                if (!cancelled) setPaymentData({ registration, settings, isExpired });
            } catch {
                if (!cancelled) setPaymentData(null);
            }
            if (!cancelled) setPaymentLoading(false);
        })();
        return () => { cancelled = true; };
    }, [activeStep, regId]);

    useEffect(() => {
        if (!paymentSubmitted || !regId || activeStep !== 2) return;
        let cancelled = false;
        const interval = setInterval(async () => {
            if (cancelled) return;
            try {
                const res = await fetch(`/api/registration/${regId}/status`, { credentials: 'include' });
                if (!cancelled && res.ok) {
                    const data = await res.json();
                    if (data.status === 'confirmed') {
                        setRegistrationStatus('confirmed');
                        setPaymentConfirming(true);
                        setPaymentSubmitted(false);
                    }
                }
            } catch { /* ignore */ }
        }, 3000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [paymentSubmitted, regId, activeStep]);

    useEffect(() => {
        if (paymentConfirming && activeStep === 2) {
            const timer = setTimeout(() => setActiveStep(3), 2000);
            return () => clearTimeout(timer);
        }
    }, [paymentConfirming, activeStep]);

    useEffect(() => {
        if (activeStep !== 3) return;
        if (!regId) {
            setTicketData(null);
            return;
        }
        let cancelled = false;
        setTicketLoading(true);
        fetch(`/api/registration/${regId}/ticket`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled || !data) {
                    if (!cancelled) setTicketData(null);
                    return;
                }
                setTicketData({
                    full_name: data.full_name ?? '—',
                    ticket_code: data.ticket_code ?? '—',
                    qr_image: data.qr_image ?? null,
                    firm_name: data.firm_name ?? null
                });
            })
            .catch(() => { if (!cancelled) setTicketData(null); })
            .finally(() => { if (!cancelled) setTicketLoading(false); });
        return () => { cancelled = true; };
    }, [activeStep, regId]);

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
                            const isLocked = step.id > maxAllowedStep;
                            let stepClass = "step";
                            if (isCompleted) stepClass += " completed";
                            if (isActive) stepClass += " active";
                            if (isLocked) stepClass += " step--locked";

                            return (
                                <div
                                    key={step.id}
                                    className={stepClass}
                                    onClick={() => !isLocked && handleStepClick(step.id)}
                                    style={{
                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                        '--step-color': step.color
                                    } as React.CSSProperties}
                                >
                                    <div className="step-icon">
                                        {isLocked ? (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                        ) : (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        )}
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
                        <a href="/" className="sidebar-home-btn" rel="noopener noreferrer">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                            <span>Home</span>
                        </a>
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
                        {regId ? (
                            <>
                                <div className="scan-icon-wrapper">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                                        <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                                        <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                                        <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                                    </svg>
                                </div>
                                <h2 className="onboarding-title">You&apos;re registered</h2>
                                <p className="onboarding-subtitle">We&apos;ve got your registration. Continue to see your status and next steps.</p>
                                <button
                                    className="continue-btn"
                                    onClick={() => setActiveStep(registrationStatus != null ? statusToStep(registrationStatus, ticketType) : 1)}
                                >
                                    Continue
                                </button>
                                <button
                                    type="button"
                                    className="check-another-btn"
                                    onClick={resetOnboarding}
                                >
                                    Check another ticket
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="scan-icon-wrapper">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                                        <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                                        <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                                        <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                                    </svg>
                                </div>
                                <h2 className="onboarding-title">Verify your ticket</h2>
                                <p className="onboarding-subtitle">Enter your 4-character ticket code below to continue.</p>
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
                                            // Ticket verified successfully - fetch full details
                                            const byCodeRes = await fetch(`/api/tickets/by-code/${encodeURIComponent(ticketCode)}`, { credentials: 'include' });
                                            if (byCodeRes.ok) {
                                                const byCodeData = await byCodeRes.json();
                                                const id = byCodeData.id != null ? String(byCodeData.id) : null;
                                                const status = (byCodeData.status || '').toLowerCase();
                                                const tt = byCodeData.ticket_type || null;
                                                if (id) {
                                                    const url = new URL(window.location.href);
                                                    url.searchParams.set('id', id);
                                                    window.history.replaceState({}, '', url.pathname + url.search);
                                                    // Set all state together, then navigate
                                                    setRegId(id);
                                                    setRegistrationStatus(status || null);
                                                    setTicketType(tt);
                                                    // For confirmed tickets, go directly to step 3
                                                    if (status === 'confirmed') {
                                                        setActiveStep(3);
                                                    } else {
                                                        setActiveStep(statusToStep(status || null, tt));
                                                    }
                                                } else {
                                                    setVerifyError('Could not retrieve ticket details.');
                                                }
                                            } else {
                                                setVerifyError('Could not retrieve ticket details.');
                                            }
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
                                <div className="verify-register-cta">
                                    <p className="verify-register-cta__text">Haven&apos;t registered yet? Register for the event to get your ticket.</p>
                                    <a href="/contact" className="verify-register-cta__btn" rel="noopener noreferrer">
                                        Go to registration
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeStep === 1 && (
                    <div className="content-wrapper">
                        {!regId && (
                            <div className="pending-approval-card pending-approval-card--no-id">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__label">Registration status</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    Open the link from your email to see your status.
                                    <br /><br />
                                    After you register, we send you a link that includes your registration ID. Use that link to check approval and payment status here.
                                </h2>
                            </div>
                        )}
                        {regId && pendingStatus === 'loading' && (
                            <div className="pending-approval-card pending-approval-card--loading">
                                <div className="pending-approval-card__spinner" aria-hidden="true" />
                                <p className="pending-approval-card__loading-text">Checking registration status…</p>
                            </div>
                        )}
                        {regId && pendingStatus === 'pending_approval' && (
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
                                    We&apos;ll contact you via email when it&apos;s approved or if we need more information.
                                </h2>
                            </div>
                        )}
                        {regId && pendingStatus === 'awaiting_verification' && (
                            <div className="pending-approval-card">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__icon" aria-hidden="true">
                                        <svg width="10" height="11" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="5" cy="5.5" r="5" fill="currentColor" />
                                        </svg>
                                    </span>
                                    <span className="pending-approval-card__label">Payment Status</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    Your payment is being verified.
                                    <br /><br />
                                    We&apos;ll confirm once it&apos;s processed. This usually takes a few minutes.
                                </h2>
                            </div>
                        )}
                        {regId && pendingStatus === 'pending_payment' && (
                            <div className="pending-approval-card pending-approval-card--approved">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__icon pending-approval-card__icon--success" aria-hidden="true">✓</span>
                                    <span className="pending-approval-card__label">Approved</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    Your registration has been approved. Please complete payment.
                                </h2>
                                <button
                                    type="button"
                                    className="pending-approval-card__btn"
                                    onClick={() => {
                                        setPaymentData(null);
                                        setPaymentSubmitted(false);
                                        setActiveStep(2);
                                    }}
                                >
                                    <span>Complete Payment</span>
                                    <span className="pending-approval-card__btn-icon">
                                        <svg width="17" height="10" viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10.7402 0.758789C11.1101 1.43055 11.6506 1.99534 12.335 2.67969L12.3369 2.68066C12.563 2.90815 12.7969 3.12518 13.0391 3.32129L13.2979 3.52148C13.5554 3.71189 13.8112 3.87433 14.0771 4.00781L14.0908 4.01465C14.1127 4.0265 14.1327 4.03626 14.1494 4.04297L14.1738 4.05371C14.8406 4.36321 15.5323 4.46164 16.3486 4.48926L16.6221 4.49805L16.8135 4.49219V4.50488L16.8486 4.50684L16.8311 4.99805L16.8496 5.49121L16.8145 5.49219V5.50586L16.6299 5.49902L16.3496 5.50977C15.5318 5.53888 14.8415 5.6347 14.1758 5.94629L14.1494 5.95801C14.1326 5.96472 14.1128 5.97443 14.0908 5.98633L14.0742 5.99512C13.7223 6.16906 13.388 6.39803 13.04 6.67871C12.7966 6.87576 12.5613 7.09202 12.335 7.31836C11.6504 8.00447 11.1101 8.56842 10.7402 9.24023L10.499 9.67773L9.62305 9.19629L9.86426 8.75781C10.2003 8.14756 10.6449 7.6253 11.1309 7.11719L11.6279 6.61133C11.8735 6.36578 12.1346 6.12418 12.4111 5.90039H12.4121C12.5856 5.76046 12.7623 5.62776 12.9443 5.50391H0.5V4.50391H12.9561C12.8708 4.44617 12.7863 4.38669 12.7031 4.3252L12.4131 4.10156L12.4111 4.10059C12.1342 3.87643 11.873 3.63336 11.6279 3.38672L11.1309 2.88184C10.6449 2.37432 10.2003 1.85144 9.86426 1.24121L9.62305 0.803711L10.499 0.321289L10.7402 0.758789Z" fill="currentColor" />
                                        </svg>
                                    </span>
                                </button>
                            </div>
                        )}
                        {regId && pendingStatus === 'rejected' && (
                            <div className="pending-approval-card pending-approval-card--rejected">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__icon pending-approval-card__icon--rejected" aria-hidden="true">✕</span>
                                    <span className="pending-approval-card__label">Not approved</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    Unfortunately, your registration was not approved.
                                </h2>
                                <div className="pending-approval-card__actions">
                                    <button type="button" className="check-another-btn" onClick={resetOnboarding}>
                                        Check another ticket
                                    </button>
                                    <a href="/contact" className="verify-register-cta__btn" rel="noopener noreferrer">
                                        Go to registration
                                    </a>
                                </div>
                            </div>
                        )}
                        {regId && pendingStatus === 'confirmed' && (
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
                        {regId && pendingStatus === 'error' && (
                            <div className="pending-approval-card pending-approval-card--error">
                                <div className="pending-approval-card__tag">
                                    <span className="pending-approval-card__label">Registration not found</span>
                                </div>
                                <h2 className="pending-approval-card__heading">
                                    We couldn&apos;t find this registration.
                                </h2>
                                <button type="button" className="check-another-btn" onClick={resetOnboarding}>
                                    Try again
                                </button>
                            </div>
                        )}
                        {maxAllowedStep >= 2 && (
                            <button className="continue-btn" onClick={() => setActiveStep(ticketType?.toLowerCase() === 'access code' ? 3 : 2)}>Continue</button>
                        )}
                    </div>
                )}

                {activeStep === 2 && (
                    <div className="content-wrapper payment-tab">
                        {paymentLoading && (
                            <div className="payment-card payment-card--loading">
                                <div className="payment-card__spinner" aria-hidden="true" />
                                <p className="payment-card__loading-text">Loading payment details…</p>
                            </div>
                        )}
                        {!paymentLoading && !paymentData && regId && (
                            <div className="payment-card payment-card--error">
                                <p className="payment-card__heading">Registration not found</p>
                                <p className="payment-card__sub">We couldn&apos;t load this payment.</p>
                                <button type="button" className="check-another-btn" onClick={resetOnboarding}>
                                    Check another ticket
                                </button>
                            </div>
                        )}
                        {!paymentLoading && !regId && (
                            <div className="payment-card payment-card--no-id">
                                <p className="payment-card__heading">Open the link from your email</p>
                                <p className="payment-card__sub">To see your payment details and complete payment, use the link we sent you after registration (it includes your registration ID).</p>
                            </div>
                        )}
                        {!paymentLoading && paymentData?.isExpired && (
                            <div className="payment-card payment-card--expired">
                                <div className="payment-card__icon-wrap payment-card__icon-wrap--error">
                                    <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <p className="payment-card__heading">Payment link expired</p>
                                <p className="payment-card__sub">This link is valid for 3 days after approval. Please register again.</p>
                                <a href="/contact" className="payment-card__btn payment-card__btn--primary">Register again</a>
                            </div>
                        )}
                        {!paymentLoading && paymentData && !paymentData.isExpired && !paymentSubmitted && !paymentConfirming && (
                            <div className="payment-card">
                                <div className="payment-card__header">
                                    <svg className="payment-card__momo-icon" viewBox="0 0 48 48" width="48" height="48">
                                        <circle cx="24" cy="24" r="24" fill="#FFCC00"/>
                                        <text x="24" y="20" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#000">MTN</text>
                                        <text x="24" y="30" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#000">MoMo</text>
                                    </svg>
                                    <h2 className="payment-card__title">Pay with Mobile Money</h2>
                                </div>
                                <div className="payment-card__momo">
                                    <div className="payment-card__row">
                                        <span className="payment-card__label">Merchant code</span>
                                        <span className="payment-card__value payment-card__value--code">{paymentData.settings.merchant_code}</span>
                                    </div>
                                    <div className="payment-card__row">
                                        <span className="payment-card__label">Merchant name</span>
                                        <span className="payment-card__value">{paymentData.settings.merchant_name}</span>
                                    </div>
                                    <div className="payment-card__row">
                                        <span className="payment-card__label">Amount</span>
                                        <span className="payment-card__value payment-card__value--amount">GHS {paymentData.settings.ticket_price}.00</span>
                                    </div>
                                    <div className="payment-card__row">
                                        <span className="payment-card__label">Reference</span>
                                        <span className="payment-card__value payment-card__value--ref">REG-{paymentData.registration?.id}</span>
                                    </div>
                                </div>
                                <p className="payment-card__hint">Dial <strong>*170#</strong> → Pay Merchant, or use MTN MoMo app</p>
                                <div className="payment-card__summary">
                                    <p className="payment-card__label">Attendee</p>
                                    <p className="payment-card__summary-value">{paymentData.registration?.full_name}</p>
                                    {paymentData.registration?.firm_name && (
                                        <>
                                            <p className="payment-card__label">Organization</p>
                                            <p className="payment-card__summary-value">{paymentData.registration.firm_name}</p>
                                        </>
                                    )}
                                </div>
                                <div className="payment-card__total">
                                    <span>Total</span>
                                    <span>GHS {paymentData.settings.ticket_price}.00</span>
                                </div>
                                <div className="payment-card__actions">
                                    <button
                                        type="button"
                                        className="payment-card__submit"
                                        onClick={async () => {
                                            if (!regId) return;
                                            setPaymentError(null);
                                            setPaymentLoading(true);
                                            try {
                                                const res = await fetch('/api/payment-submitted', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ registrationId: regId }),
                                                    credentials: 'include'
                                                });
                                                if (res.ok) {
                                                    setPaymentSubmitted(true);
                                                } else throw new Error();
                                            } catch {
                                                setPaymentLoading(false);
                                                setPaymentError('Something went wrong. Please try again.');
                                                return;
                                            }
                                            setPaymentLoading(false);
                                        }}
                                    >
                                        I have made payment
                                    </button>
                                </div>
                                {paymentError && (
                                    <p className="verify-error" role="alert">{paymentError}</p>
                                )}
                            </div>
                        )}
                        {!paymentLoading && paymentData && paymentSubmitted && !paymentConfirming && (
                            <div className="payment-card payment-card--pending">
                                <div className="payment-card__spinner payment-card__spinner--slow" aria-hidden="true" />
                                <p className="payment-card__heading">Payment processing</p>
                                <p className="payment-card__sub">Your payment is being verified. This usually takes a few minutes.</p>
                                <button
                                    type="button"
                                    className="check-another-btn"
                                    onClick={() => setPaymentSubmitted(false)}
                                >
                                    I haven&apos;t paid yet
                                </button>
                            </div>
                        )}
                        {paymentConfirming && (
                            <div className="payment-card payment-card--confirmed">
                                <div className="payment-card__icon-wrap payment-card__icon-wrap--success">✓</div>
                                <p className="payment-card__heading">Payment confirmed</p>
                                <p className="payment-card__sub">Your registration is confirmed. See you at the event!</p>
                            </div>
                        )}
                    </div>
                )}

                {activeStep === 3 && (
                    <>
                    <Confetti active={showPrintTicketButton} />
                    <div className="see-you-tab">
                        <div className={`see-you-tab__left ${showPrintTicketButton ? 'see-you-tab__left--visible' : ''}`}>
                            {showPrintTicketButton && (
                                <>
                                    <h2 className="see-you-tab__heading">You're in!</h2>
                                    <CountdownCard />
                                    <a
                                        href="https://maps.app.goo.gl/mj8J9C9djk545Sep9"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="countdown-directions-btn"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="3 11 22 2 13 21 11 13 3 11" />
                                        </svg>
                                        Directions
                                    </a>
                                    <a
                                        href="/#team-section"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="countdown-ask-card countdown-ask-card--speakers"
                                    >
                                        <div>
                                            <p className="countdown-ask-card__label">Who's presenting?</p>
                                            <p className="countdown-ask-card__heading">Read about speakers</p>
                                        </div>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </a>
                                    <a
                                        href="/#footer"
                                        className="countdown-ask-card"
                                    >
                                        <div>
                                            <p className="countdown-ask-card__label">Have a question?</p>
                                            <p className="countdown-ask-card__heading">Ask about seminar</p>
                                        </div>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </a>
                                </>
                            )}
                        </div>

                        <div className="see-you-tab__right">
                            {!regId && (
                                <div className="payment-card payment-card--no-id">
                                    <p className="payment-card__heading">Open the link from your email</p>
                                    <p className="payment-card__sub">To view your ticket, use the link we sent you after registration.</p>
                                </div>
                            )}
                            {regId && ticketLoading && (
                                <div className="payment-card payment-card--loading">
                                    <div className="payment-card__spinner" aria-hidden="true" />
                                    <p className="payment-card__loading-text">Loading your ticket…</p>
                                </div>
                            )}
                            {regId && !ticketLoading && !ticketData && (
                                <div className="payment-card payment-card--error">
                                    <p className="payment-card__heading">Couldn&apos;t load your ticket</p>
                                    <p className="payment-card__sub">Something went wrong. Please try again.</p>
                                    <button
                                        type="button"
                                        className="check-another-btn"
                                        onClick={() => {
                                            setTicketLoading(true);
                                            fetch(`/api/registration/${regId}/ticket`, { credentials: 'include' })
                                                .then((res) => (res.ok ? res.json() : null))
                                                .then((data) => {
                                                    if (!data) { setTicketData(null); return; }
                                                    setTicketData({
                                                        full_name: data.full_name ?? '—',
                                                        ticket_code: data.ticket_code ?? '—',
                                                        qr_image: data.qr_image ?? null,
                                                        firm_name: data.firm_name ?? null
                                                    });
                                                })
                                                .catch(() => setTicketData(null))
                                                .finally(() => setTicketLoading(false));
                                        }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            {regId && !ticketLoading && ticketData && (
                                <TicketCard
                                    name={ticketData?.full_name}
                                    ticketCode={ticketData?.ticket_code}
                                    qrImage={ticketData?.qr_image}
                                    spinOnceToken={finalTabSpinToken}
                                    onSpinComplete={() => setShowPrintTicketButton(true)}
                                >
                                    {showPrintTicketButton && (
                                        <button
                                            type="button"
                                            className="print-ticket-btn"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch('/api/ticket-pdf', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        credentials: 'include',
                                                        body: JSON.stringify({
                                                            ticketCode: ticketData?.ticket_code,
                                                            fullName: ticketData?.full_name,
                                                            qrImage: ticketData?.qr_image ?? null
                                                        })
                                                    });
                                                    if (!res.ok) throw new Error('PDF failed');
                                                    const blob = await res.blob();
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `ticket-${ticketData?.ticket_code ?? 'conference'}.pdf`;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                } catch {
                                                    alert('Could not generate PDF. Please try again.');
                                                }
                                            }}
                                        >
                                            Print ticket
                                        </button>
                                    )}
                                </TicketCard>
                            )}
                        </div>
                    </div>
                    </>
                )}

                <div className="onboarding-footer-controls" style={{ marginTop: 'auto', maxWidth: '400px', width: '100%' }}>
                    <div className="pagination-dots">
                        {onboardingSteps.map((step) => {
                            const isLocked = step.id > maxAllowedStep;
                            return (
                                <span
                                    key={step.id}
                                    className={`dot ${activeStep === step.id ? 'active' : ''} ${isLocked ? 'dot--locked' : ''}`}
                                    onClick={() => !isLocked && handleStepClick(step.id)}
                                ></span>
                            );
                        })}
                    </div>
                    <p className="active-step-label">{onboardingSteps[activeStep].title}</p>
                    <a href="/#footer" className="help-btn" rel="noopener noreferrer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default OnboardingCard;
