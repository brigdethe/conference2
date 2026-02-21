import React, { useRef } from 'react';

export type TicketCardProps = {
    eventName?: string;
    date?: string;
    time?: string;
    name?: string;
    ticketCode?: string;
    location?: string;
    qrImage?: string | null;
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
    qrImage = null
}) => {
    const ticketRef = useRef<HTMLElement | null>(null);

    const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
        const ticket = ticketRef.current;
        if (!ticket) {
            return;
        }
        const rect = ticket.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * 8;
        const rotateX = (0.5 - y) * 8;

        ticket.style.setProperty('--event-ticket-glare-x', `${x * 100}%`);
        ticket.style.setProperty('--event-ticket-glare-y', `${y * 100}%`);
        ticket.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(0)`;
    };

    const handleMouseLeave = () => {
        const ticket = ticketRef.current;
        if (!ticket) {
            return;
        }
        ticket.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
        ticket.style.setProperty('--event-ticket-glare-x', '50%');
        ticket.style.setProperty('--event-ticket-glare-y', '50%');
    };

    return (
        <article
            ref={ticketRef}
            className="event-ticket"
            aria-label="Event Ticket"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
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
    );
};

export default TicketCard;
