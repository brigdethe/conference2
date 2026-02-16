import React from 'react';
import { Plus, Grip, List } from 'lucide-react';

export const ControlsActions: React.FC = () => {
    return (
        <div className="flex items-center gap-2 ml-auto md:ml-0">
            <button className="p-2 bg-white rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm"><Grip className="w-4 h-4" />
            </button>
            <button className="p-2 bg-white rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm"><List className="w-4 h-4" />
            </button>
            <button className="p-2 bg-white rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm"><Plus className="w-4 h-4" />
            </button>

            <div className="flex items-center bg-black text-white pl-3 pr-1 py-1 rounded-lg ml-2 shadow-sm">
                <span className="text-xs font-semibold mr-2">+233</span>
                < div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                        <img key={i} src={`https://picsum.photos/32/32?random=${i}`} alt="User" className="w-6 h-6 rounded-full border border-black" />
                    ))}
                </div>
            </div>
        </div>
    );
};