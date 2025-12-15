
import React from 'react';
import { PlayerState, ItemType } from '../types';

interface UIOverlayProps {
  playerState: PlayerState;
  floor: number;
  logs: { id: number; text: string; timestamp: number; exiting?: boolean }[];
  objective: string;
  timeElapsed: number;
  currentDialogue: string | null;
}

const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs < 10 ? '0' : ''}${secs}`;
};

const ItemIcon: React.FC<{ type: ItemType }> = ({ type }) => {
    if (type === ItemType.BATTERY) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-green-500">
            <rect x="8" y="6" width="8" height="14" rx="1" />
            <rect x="10" y="4" width="4" height="2" />
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">+</text>
        </svg>
    );
    if (type === ItemType.FUEL) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-red-600 stroke-white stroke-1">
            <path d="M6 8h12v12H6z" />
            <rect x="8" y="4" width="4" height="4" />
            <path d="M16 6h2v10" fill="none" strokeWidth="2" />
        </svg>
    );
    if (type === ItemType.FLASHLIGHT) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-stone-400">
            <rect x="4" y="8" width="10" height="8" rx="1" />
            <path d="M14 6h6v12h-6z" fill="#fbbf24" />
        </svg>
    );
    if (type === ItemType.CABLE) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-yellow-600 stroke-2">
            <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" />
        </svg>
    );
    if (type === ItemType.SPEED_POTION) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
            <path d="M12 2L8 6v4l-4 4v8h16v-8l-4-4V6z" fill="#0ea5e9" stroke="#0284c7" strokeWidth="2"/>
            <path d="M10 8h4" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    );
    if (type === ItemType.INVISIBILITY_POTION) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
            <path d="M12 2a9 9 0 00-9 9v11l4.5-2.5L12 22l4.5-2.5L21 22V11a9 9 0 00-9-9z" fill="#8b5cf6" stroke="#5b21b6" strokeWidth="1" />
            <circle cx="8" cy="10" r="2" fill="white" />
            <circle cx="16" cy="10" r="2" fill="white" />
        </svg>
    );
    if (type === ItemType.REPELLENT_POTION) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
            <rect x="8" y="8" width="8" height="14" fill="#84cc16" stroke="#3f6212" strokeWidth="1" />
            <path d="M12 2v6" stroke="#3f6212" strokeWidth="2" />
            <path d="M9 4h6" stroke="#3f6212" strokeWidth="2" />
            <path d="M6 6l3 2" stroke="#3f6212" strokeWidth="1" />
            <path d="M18 6l-3 2" stroke="#3f6212" strokeWidth="1" />
        </svg>
    );
    if (type === ItemType.PIN_CODE) return ( 
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#fef3c7]">
            <path d="M4 4h16v16H4z" stroke="#78350f" strokeWidth="1" />
            <path d="M6 8h12M6 12h8M6 16h10" stroke="#78350f" strokeWidth="1" />
            <text x="12" y="14" fontSize="8" textAnchor="middle">PIN</text>
        </svg>
    );
    if (type === ItemType.KEY) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-yellow-500">
            <circle cx="8" cy="12" r="4" />
            <rect x="12" y="10" width="10" height="4" />
            <rect x="18" y="14" width="2" height="4" />
        </svg>
    );
    if (type === ItemType.MEDKIT) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="red" strokeWidth="1" />
            <path d="M12 7v10M7 12h10" stroke="red" strokeWidth="4" />
        </svg>
    );
    if (type === ItemType.FLASHBANG) return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-slate-500">
             <circle cx="12" cy="12" r="8" />
             <rect x="10" y="2" width="4" height="4" fill="red" />
        </svg>
    );
    if (type === ItemType.LORE_NOTE) return (
         <svg viewBox="0 0 24 24" className="w-8 h-8 fill-purple-900">
             <rect x="4" y="4" width="16" height="16" />
             <path d="M8 8h8M8 12h8M8 16h4" stroke="violet" strokeWidth="2" />
         </svg>
    );
    return <div className="w-4 h-4 rounded-full bg-green-500" />;
};

const UIOverlay: React.FC<UIOverlayProps> = ({ playerState, floor, logs, objective, timeElapsed, currentDialogue }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4 flex flex-col justify-between font-mono">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="bg-[#2a1d1a]/90 p-4 rounded text-orange-100 border border-orange-900 shadow-lg">
          <div className="flex items-center space-x-4">
             <h1 className="text-3xl font-bold text-red-600 tracking-widest drop-shadow-md">FLOOR {floor}</h1>
             <div className="text-xl font-mono text-stone-400">{formatTime(timeElapsed)}</div>
          </div>
          <div className="mt-2 text-sm text-orange-400">ELEVATOR BATTERY</div>
          <div className="w-48 h-4 bg-black rounded overflow-hidden border border-orange-800 mt-1">
            <div 
              className={`h-full ${playerState.battery < 20 ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`} 
              style={{ width: `${playerState.battery}%` }}
            />
          </div>
        </div>

        <div className="bg-[#2a1d1a]/90 p-4 rounded text-orange-100 border border-orange-900 shadow-lg">
          <div className="flex space-x-2 mb-2">
            {[...Array(playerState.maxHealth)].map((_, i) => (
              <span key={i} className={`text-2xl drop-shadow ${i < playerState.health ? 'text-red-600' : 'text-stone-700'}`}>♥</span>
            ))}
          </div>
          <div className="text-right text-xs text-orange-400">
             STANCE: <span className="text-yellow-500 font-bold">{playerState.movementMode}</span>
          </div>
          {playerState.speedMultiplier > 1 && (
             <div className="text-right text-xs text-cyan-400 animate-pulse mt-1">{'>>'} SWIFT POTION ACTIVE</div>
          )}
          {playerState.isInvisible && (
             <div className="text-right text-xs text-purple-400 animate-pulse mt-1">{'>>'} INVISIBILITY ACTIVE</div>
          )}
          {playerState.isRepelling && (
             <div className="text-right text-xs text-green-400 animate-pulse mt-1">{'>>'} REPELLENT ACTIVE</div>
          )}
        </div>
      </div>
      
      {/* CARRYING CABLE WARNING */}
      {playerState.isCarryingCable && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-yellow-900/90 border-2 border-yellow-500 text-yellow-100 p-4 rounded text-center animate-pulse">
              <div className="font-bold text-lg">⚠️ CABLE CONNECTED ⚠️</div>
              <div className="text-sm mt-1">RETURN TO ELEVATOR TO INITIATE CHARGE</div>
              <div className="text-xs text-yellow-300 mt-2">MOVEMENT RESTRICTED | NOISE INCREASED | ITEMS DISABLED</div>
          </div>
      )}

      {/* Logs and Objective */}
      <div className="w-1/3 space-y-2 mt-4 overflow-hidden relative min-h-[150px]">
        <div className="bg-stone-900/80 p-3 rounded border-l-4 border-yellow-500 text-yellow-100 shadow-md mb-4">
            <div className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-1">Current Objective</div>
            <div className="text-sm">{objective}</div>
        </div>
        
        <div className="flex flex-col space-y-1">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className={`text-sm text-orange-200/80 bg-black/60 p-2 rounded border-l-2 border-orange-800 transition-all duration-300 ${log.exiting ? 'slide-out' : 'fade-in'}`}
              >
                {log.text}
              </div>
            ))}
        </div>
      </div>

      {/* INTERNAL MONOLOGUE */}
      {currentDialogue && (
          <div className="absolute bottom-32 left-0 w-full flex justify-center">
              <div className="bg-gradient-to-r from-transparent via-black/80 to-transparent px-20 py-4 animate-fade-in text-center">
                  <p className="text-xl italic font-serif text-stone-300 tracking-wide">"{currentDialogue}"</p>
              </div>
          </div>
      )}

      {/* Bottom Inventory */}
      <div className="flex justify-center mb-6 pointer-events-auto">
        <div className="bg-[#2a1d1a]/95 p-4 rounded-xl border border-orange-900 flex space-x-4 shadow-2xl">
           {playerState.inventory.map((item, idx) => (
             <div key={idx} className="relative group">
                <div className="absolute -top-3 -left-2 bg-black text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-gray-600 font-bold">{idx + 1}</div>
                <div className={`w-14 h-14 rounded border-2 flex items-center justify-center transition-all
                   ${idx === playerState.equippedItemIndex ? 'border-yellow-600 bg-orange-900/50 scale-110 shadow-[0_0_10px_rgba(234,88,12,0.5)]' : 'border-stone-700 bg-stone-900/50 opacity-70'}
                `}>
                   <ItemIcon type={item.itemType} />
                </div>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-orange-200 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-orange-900 z-50">
                  {item.name}
                </div>
             </div>
           ))}
           {playerState.inventory.length === 0 && <div className="text-stone-500 text-sm py-3 italic">Pockets Empty</div>}
        </div>
      </div>
      
      {/* Controls Hint */}
      <div className="absolute bottom-4 right-4 text-xs text-stone-500 text-right bg-black/40 p-2 rounded">
        WASD - Move | SHIFT - Run | C - Crouch <br/>
        ESC - Pause | 1-5 - Equip/Unequip | Q - Drop <br/>
        E - Interact | SPACE - Jump
      </div>
    </div>
  );
};

export default UIOverlay;
