import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export type TicketCardProps = {
    eventName?: string;
    date?: string;
    time?: string;
    name?: string;
    ticketCode?: string;
    location?: string;
    qrImage?: string | null;
    spinOnceToken?: number;
    onSpinComplete?: () => void;
    children?: React.ReactNode;
};

const DEFAULT_EVENT = 'Ghana Competition Law & Policy Seminar';
const DEFAULT_DATE = '25 March, 2026';
const DEFAULT_TIME = '9:00 AM – 3:00 PM';
const DEFAULT_LOCATION = 'Mövenpick Ambassador Hotel, Independence Avenue, Accra';

const TicketCard: React.FC<TicketCardProps> = ({
    eventName = DEFAULT_EVENT,
    date = DEFAULT_DATE,
    time = DEFAULT_TIME,
    name = '—',
    ticketCode = '—',
    location = DEFAULT_LOCATION,
    qrImage = null,
    spinOnceToken = 0,
    onSpinComplete,
    children
}) => {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const ticketRef = useRef<HTMLElement | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        const article = ticketRef.current;
        if (!article) return;
        const rect = article.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        article.style.setProperty('--glow-x', `${x}%`);
        article.style.setProperty('--glow-y', `${y}%`);
        article.style.setProperty('--glow-visible', '1');
    };

    const handleMouseLeave = () => {
        const article = ticketRef.current;
        if (!article) return;
        article.style.setProperty('--glow-visible', '0');
    };

    const calcCenterOffset = (): number => {
        const wrapper = wrapperRef.current;
        if (!wrapper || window.innerWidth < 769) return 0;
        const saved = wrapper.style.transform;
        wrapper.style.transform = 'none';
        const wRect = wrapper.getBoundingClientRect();
        wrapper.style.transform = saved;
        const container = wrapper.closest('.onboarding-content') as HTMLElement | null;
        if (!container) return 0;
        const cRect = container.getBoundingClientRect();
        const contentCenter = cRect.left + cRect.width / 2;
        const wrapperCenter = wRect.left + wRect.width / 2;
        return contentCenter - wrapperCenter;
    };

    useEffect(() => {
        if (spinOnceToken <= 0 || !wrapperRef.current) return;
        const el = wrapperRef.current;
        const startOffset = calcCenterOffset();

        setIsSpinning(true);
        gsap.killTweensOf(el);
        gsap.fromTo(
            el,
            { rotationY: 0, x: startOffset },
            {
                rotationY: 360,
                x: 0,
                duration: 0.85,
                ease: 'power2.inOut',
                onComplete: () => {
                    gsap.set(el, { rotationY: 0, x: 0 });
                    setIsSpinning(false);
                    if (onSpinComplete) onSpinComplete();
                }
            }
        );
    }, [spinOnceToken]);

    return (
        <div
            ref={wrapperRef}
            className="event-ticket-mover"
        >
            <article
                ref={ticketRef}
                className="event-ticket"
                aria-label="Event Ticket"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <div className="event-ticket__top-hole" aria-hidden="true" />
                <section className="event-ticket__content">
                    <p className="event-ticket__label">Event</p>
                    <h1 className="event-ticket__title">{eventName}</h1>

                    <div className="event-ticket__row event-ticket__row--two-cols">
                        <div className="event-ticket__cell">
                            <p className="event-ticket__label">Date</p>
                            <p className="event-ticket__value">{date}</p>
                        </div>
                        <div className="event-ticket__cell">
                            <p className="event-ticket__label">Time</p>
                            <p className="event-ticket__value">{time}</p>
                        </div>
                    </div>

                    <div className="event-ticket__row event-ticket__row--two-cols">
                        <div className="event-ticket__cell">
                            <p className="event-ticket__label">Name</p>
                            <p className="event-ticket__value">{name}</p>
                        </div>
                        <div className="event-ticket__cell">
                            <p className="event-ticket__label">Ticket code</p>
                            <p className="event-ticket__value event-ticket__value--code">{ticketCode}</p>
                        </div>
                    </div>

                    <div className="event-ticket__row">
                        <div className="event-ticket__cell">
                            <p className="event-ticket__label">Location</p>
                            <p className="event-ticket__value">{location}</p>
                        </div>
                    </div>
                </section>

                <div className="event-ticket__tear-line" aria-hidden="true" />

                <section className="event-ticket__barcode-wrap" aria-label="Barcode section">
                    {qrImage ? (
                        <img
                            src={`data:image/png;base64,${qrImage}`}
                            alt="Ticket QR code"
                            className="event-ticket__qr"
                        />
                    ) : (
                        <div className="event-ticket__barcode" aria-hidden="true" />
                    )}
                </section>
            </article>
            {children}
        </div>
    );
};

export default TicketCard;
