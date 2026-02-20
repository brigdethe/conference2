import React from 'react';
import QRCodeSection from './QRCodeSection';
import CodeInput from './CodeInput';

const Card: React.FC = () => {
    return (
        <div className="card">
            <div className="card-header">
                <h2>Scan QR code</h2>
                <span className="close-icon">&times;</span>
            </div>
            <p className="card-subtitle">Scan this code to verify your account.</p>

            <QRCodeSection />

            <div className="divider">
                <span>or enter the code manually</span>
            </div>

            <CodeInput />

            <button className="verify-btn">Verify account</button>
        </div>
    );
};

export default Card;
