import React, { useEffect, useRef, useState } from 'react';

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
    pinToRight?: boolean;
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
    pinToRight = false
}) => {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const articleRef = useRef<HTMLElement | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [shift, setShift] = useState(0);

    const calcShift = () => {
        const wrapper = wrapperRef.current;
        if (!wrapper || !pinToRight || window.innerWidth < 769) {
            setShift(0);
            return;
        }
        const savedTransform = wrapper.style.transform;
        wrapper.style.transform = 'none';
        const wRect = wrapper.getBoundingClientRect();
        wrapper.style.transform = savedTransform;

        const container = wrapper.closest('.onboarding-content') as HTMLElement | null;
        const containerRight = container
            ? container.getBoundingClientRect().right
            : window.innerWidth;

        setShift(Math.max(0, containerRight - wRect.right - 10));
    };

    useEffect(() => {
        calcShift();
        window.addEventListener('resize', calcShift);
        return () => window.removeEventListener('resize', calcShift);
    }, [pinToRight]);

    useEffect(() => {
        if (spinOnceToken > 0) {
            setIsSpinning(true);
        }
    }, [spinOnceToken]);

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        if (isSpinning) return;
        const article = articleRef.current;
        if (!article) return;
        const rect = article.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const ry = (x - 0.5) * 8;
        const rx = (0.5 - y) * 8;
        article.style.setProperty('--event-ticket-glare-x', `${x * 100}%`);
        article.style.setProperty('--event-ticket-glare-y', `${y * 100}%`);
        article.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    };

    const handleMouseLeave = () => {
        if (isSpinning) return;
        const article = articleRef.current;
        if (!article) return;
        article.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        article.style.setProperty('--event-ticket-glare-x', '50%');
        article.style.setProperty('--event-ticket-glare-y', '50%');
    };

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 769;
    const isPinned = pinToRight && isDesktop && !isSpinning;

    return (
        <div
            ref={wrapperRef}
            className={`event-ticket-mover ${isSpinning ? 'event-ticket-mover--spinning' : ''}`}
            style={{
                '--ticket-shift': `${shift}px`,
                transform: isPinned ? `translateX(${shift}px)` : undefined,
                transition: isSpinning ? 'none' : 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)'
            } as React.CSSProperties}
            onAnimationEnd={() => {
                setIsSpinning(false);
                if (onSpinComplete) {
                    onSpinComplete();
                }
            }}
        >
            <article
                ref={articleRef}
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
        </div>
    );
};

export default TicketCard;
