import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { InvitationModal } from '../modals/InvitationModal';

export const HeaderNotifications: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 bg-white rounded-lg shadow-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
                <Bell className="w-4 h-4" />
            </button>
            <InvitationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
};