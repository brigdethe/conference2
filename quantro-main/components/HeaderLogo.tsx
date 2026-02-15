import React from 'react';
import { QuantroLogo } from './icons/QuantroLogo';

export const HeaderLogo: React.FC = () => {
    return (
        <div className="flex items-center gap-2">
            <QuantroLogo className="text-textPrimary w-6 h-6" />
            <span className="font-semibold text-lg tracking-tight">Quantro</span>
        </div>
    );
};