import React, { useEffect, useState } from 'react';

const EVENT_DATE = new Date('2026-03-25T09:00:00');

function calcTime() {
    const diff = EVENT_DATE.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, started: true };
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        started: false
    };
}

const CountdownCard: React.FC = () => {
    const [time, setTime] = useState(calcTime);

    useEffect(() => {
        const id = setInterval(() => setTime(calcTime()), 60_000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="countdown-card">
            <p className="countdown-card__label">Time until Seminar</p>
            {time.started ? (
                <p className="countdown-card__value">Event has started!</p>
            ) : (
                <p className="countdown-card__value">
                    <span className="countdown-card__num">{time.days}</span>
                    <span className="countdown-card__unit">
                        <span className="unit-full"> {time.days === 1 ? 'day' : 'days'},</span>
                        <span className="unit-short">d</span>
                    </span>
                    {' '}
                    <span className="countdown-card__num">{time.hours}</span>
                    <span className="countdown-card__unit">
                        <span className="unit-full"> {time.hours === 1 ? 'hour' : 'hours'}</span>
                        <span className="unit-short">h</span>
                    </span>
                </p>
            )}
        </div>
    );
};

export default CountdownCard;
