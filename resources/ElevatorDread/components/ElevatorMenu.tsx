
import React, { useState } from 'react';
import { DIFFICULTY_CONFIG } from '../constants';
import { Difficulty } from '../types';

interface ElevatorMenuProps {
  currentFloor: number;
  difficulty: Difficulty;
  battery: number;
  onTravel: (floorsToTravel: number) => void;
}

const ElevatorMenu: React.FC<ElevatorMenuProps> = ({ currentFloor, difficulty, battery, onTravel }) => {
  const config = DIFFICULTY_CONFIG[difficulty];
  const costPerFloor = config.elevatorCostPerFloor || config.elevatorCost;
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  const availableFloors = Array.from({ length: 20 }, (_, i) => currentFloor - 1 - i).filter(f => f >= 1);

  const handleTravel = () => {
      if (selectedFloor !== null) {
          // Trigger Close Door event
          window.dispatchEvent(new CustomEvent('elevator-close'));
          setTimeout(() => {
              onTravel(currentFloor - selectedFloor);
          }, 1000); // Animation delay
      }
  };

  const handleOpen = () => window.dispatchEvent(new CustomEvent('elevator-open'));
  const handleClose = () => window.dispatchEvent(new CustomEvent('elevator-close'));

  return (
    <div className="absolute top-4 right-4 w-56 bg-stone-900 border-4 border-[#450a0a] p-3 rounded-xl shadow-2xl text-white font-mono opacity-95 z-40">
        <div className="flex justify-between items-center mb-2 border-b border-stone-700 pb-1">
            <span className="text-orange-500 font-bold text-sm">LVL {currentFloor}</span>
            <span className="text-xs text-stone-400">{battery.toFixed(0)}% PWR</span>
        </div>

        {/* Door Controls */}
        <div className="flex justify-center space-x-4 mb-3">
            <button onClick={handleOpen} className="w-10 h-10 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-full flex items-center justify-center font-bold text-green-500 shadow-inner" title="Open Door">
                &lt;|&gt;
            </button>
            <button onClick={handleClose} className="w-10 h-10 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-full flex items-center justify-center font-bold text-red-500 shadow-inner" title="Close Door">
                &gt;|&lt;
            </button>
        </div>

        <div className="grid grid-cols-4 gap-1 mb-2 max-h-48 overflow-y-auto custom-scrollbar bg-black/50 p-1 rounded-lg">
            {availableFloors.map(f => {
                const diff = currentFloor - f;
                const cost = diff * costPerFloor;
                const canAfford = cost <= battery;

                return (
                    <button 
                        key={f}
                        disabled={!canAfford}
                        onClick={() => setSelectedFloor(f)}
                        className={`
                           h-8 w-full rounded-full flex items-center justify-center text-[10px] border shadow-sm
                           ${canAfford ? (selectedFloor === f ? 'bg-yellow-600 text-white border-yellow-400' : 'bg-stone-800 text-stone-400 hover:bg-stone-700 border-stone-600') : 'bg-red-900/20 text-red-900 opacity-50 border-red-900/30'}
                        `}
                    >
                        {f}
                    </button>
                );
            })}
        </div>

        <button 
            disabled={selectedFloor === null}
            onClick={handleTravel}
            className={`
                w-full font-bold py-2 rounded-full text-xs border shadow-lg transition-all
                ${selectedFloor !== null ? 'bg-red-700 border-red-500 text-white hover:bg-red-600 animate-pulse' : 'bg-stone-800 border-stone-700 text-stone-600'}
            `}
        >
            DESCEND
        </button>
    </div>
  );
};

export default ElevatorMenu;