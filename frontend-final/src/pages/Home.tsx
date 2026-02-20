import React from 'react';
import HeroImage from '../components/HeroImage';

const Home: React.FC = () => {
    return (
        <div className="grid-container">
            <div className="left-column">
            </div>
            <div className="right-column">
                <HeroImage />
            </div>
        </div>
    );
};

export default Home;
