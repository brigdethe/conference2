import React from 'react';

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
    return (
        <article className="event-ticket" aria-label="Event Ticket">
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
