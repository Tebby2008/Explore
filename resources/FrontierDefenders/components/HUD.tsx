import React, { useState, useEffect, useRef } from 'react';
import { TowerType, TowerInstance, BiomeType, TargetingMode } from '../types';
import { TOWER_DEFINITIONS } from '../data/towers';

interface Props {
  money: number;
  wave: number;
  baseHealth: number;
  maxHealth: number;
  enemies: number;
  loadout: TowerType[];
  mapConfig: any;
  onSelectType: (type: TowerType) => void;
  selectedTower: TowerInstance | null;
  onUpgrade: () => void;
  onSell: () => void;
  onDeselect: () => void;
  isLoadoutSelection: boolean;
  onConfirmLoadout: (towers: TowerType[], scale: number, biome: BiomeType) => void;
  isAdminOpen: boolean;
  closeAdmin: () => void;
  adminActions: any;
  gameStarted: boolean;
  onStartGame: () => void;
  setTargeting: (id: string, mode: TargetingMode) => void;
  waveTimer: number;
  gameTime: number;
  onActivateAbility: (id: string) => void;
  towerCounts: Record<string, number>;
  tutorialText: string | null;
  onDismissTutorial: () => void;
}

export const HUD: React.FC<Props> = ({ 
  money, wave, baseHealth, maxHealth, enemies, loadout, mapConfig,
  onSelectType, selectedTower, onUpgrade, onSell, onDeselect,
  isLoadoutSelection, onConfirmLoadout,
  isAdminOpen, closeAdmin, adminActions,
  gameStarted, onStartGame, setTargeting, waveTimer, gameTime, onActivateAbility, towerCounts,
  tutorialText, onDismissTutorial
}) => {
  const [selectedLoadout, setSelectedLoadout] = useState<TowerType[]>([]);
  const [mapScale, setMapScale] = useState(3);
  const [selectedBiome, setSelectedBiome] = useState<BiomeType>(BiomeType.GRASSLAND);
  const [adminPin, setAdminPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [godModeActive, setGodModeActive] = useState(false);
  
  // Tutorial States
  const [displayedTutorial, setDisplayedTutorial] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const timeoutRefs = useRef<number[]>([]);

  const allTowers = Object.keys(TOWER_DEFINITIONS) as TowerType[];

  const toggleLoadout = (t: TowerType) => {
      if (selectedLoadout.includes(t)) setSelectedLoadout(selectedLoadout.filter(x => x !== t));
      else if (selectedLoadout.length < 5) setSelectedLoadout([...selectedLoadout, t]);
  };

  const handleAdminSubmit = () => {
      if (adminPin === 'adm1n') setIsUnlocked(true);
      else alert("ACCESS DENIED");
      setAdminPin('');
  };

  const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Tutorial Typewriter Effect
  useEffect(() => {
    // Clear previous timeouts
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    if (tutorialText) {
        setShowTutorial(true);
        setDisplayedTutorial('');
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedTutorial(tutorialText.substring(0, i + 1));
            i++;
            if (i > tutorialText.length) {
                clearInterval(interval);
                // Auto dismiss after 8 seconds (reading time)
                const t1 = setTimeout(() => {
                    setShowTutorial(false);
                    const t2 = setTimeout(onDismissTutorial, 500); // Wait for fade out
                    timeoutRefs.current.push(t2 as unknown as number);
                }, 8000);
                timeoutRefs.current.push(t1 as unknown as number);
            }
        }, 30);
        return () => {
            clearInterval(interval);
            timeoutRefs.current.forEach(clearTimeout);
        };
    }
  }, [tutorialText, onDismissTutorial]);

  if (isAdminOpen) {
      return (
          <div className="absolute inset-0 bg-black/90 z-[100] flex items-center justify-center text-white">
              <div className="bg-slate-900 p-8 border border-red-500 rounded-lg shadow-2xl w-96">
                  <h2 className="text-2xl font-bold text-red-500 mb-6 font-mono tracking-widest text-center">ADMIN TERMINAL</h2>
                  
                  {!isUnlocked ? (
                      <div className="space-y-4">
                          <input 
                            type="password" 
                            value={adminPin}
                            onChange={(e) => setAdminPin(e.target.value)}
                            className="w-full bg-black border border-red-800 text-red-500 p-3 font-mono text-center text-xl tracking-[0.5em] focus:outline-none focus:border-red-500"
                            placeholder="PIN"
                          />
                          <div className="flex gap-2">
                              <button onClick={handleAdminSubmit} className="flex-1 bg-red-900 hover:bg-red-700 p-2 font-bold font-mono">UNLOCK</button>
                              <button onClick={closeAdmin} className="bg-gray-800 hover:bg-gray-700 p-2 px-4 font-bold font-mono">EXIT</button>
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-3 font-mono">
                          <button onClick={() => adminActions.addCash(10000)} className="w-full bg-slate-800 hover:bg-green-900 p-3 border-l-4 border-green-500 text-left hover:pl-5 transition-all">
                              $ ADD FUNDS (10k)
                          </button>
                          <button onClick={() => adminActions.skipWave()} className="w-full bg-slate-800 hover:bg-blue-900 p-3 border-l-4 border-blue-500 text-left hover:pl-5 transition-all">
                              SKIP WAVE
                          </button>
                          <button onClick={() => adminActions.killAll()} className="w-full bg-slate-800 hover:bg-red-900 p-3 border-l-4 border-red-500 text-left hover:pl-5 transition-all">
                              X KILL ENTITIES
                          </button>
                          <button onClick={() => setGodModeActive(adminActions.godMode())} className={`w-full p-3 border-l-4 text-left hover:pl-5 transition-all ${godModeActive ? 'bg-yellow-900 border-yellow-500 text-yellow-200' : 'bg-slate-800 border-gray-500 hover:bg-gray-700'}`}>
                              * GOD MODE {godModeActive ? '[ON]' : '[OFF]'}
                          </button>
                          <button onClick={closeAdmin} className="w-full bg-black hover:bg-gray-900 p-3 border border-red-900 text-red-500 text-center mt-6">
                              CLOSE TERMINAL
                          </button>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  if (isLoadoutSelection) {
      return (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-white overflow-y-auto">
              <h1 className="text-4xl font-bold mb-2 uppercase tracking-widest text-blue-500 mt-10">Operation Config</h1>
              <p className="mb-6 text-gray-400">Configure mission parameters and resources.</p>
              
              <div className="grid grid-cols-2 gap-8 mb-8 max-w-4xl w-full px-4">
                  <div>
                      <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">1. Map Configuration</h3>
                      <div className="mb-4">
                          <label className="block text-gray-400 text-sm mb-2">Map Scale ({mapScale})</label>
                          <input 
                            type="range" min="1" max="5" step="1" 
                            value={mapScale} onChange={(e) => setMapScale(parseInt(e.target.value))}
                            className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>Tiny</span><span>Medium</span><span>GIGANTIC</span>
                          </div>
                      </div>
                      <div className="mb-4">
                          <label className="block text-gray-400 text-sm mb-2">Biome</label>
                          <div className="grid grid-cols-3 gap-2">
                              {Object.values(BiomeType).map(b => (
                                  <button 
                                    key={b} onClick={() => setSelectedBiome(b)}
                                    className={`p-2 text-xs font-bold border rounded ${selectedBiome === b ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-700'}`}
                                  >
                                      {b}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">2. Squad Loadout ({selectedLoadout.length}/5)</h3>
                      <div className="grid grid-cols-4 gap-2 h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {allTowers.map(t => {
                            const def = TOWER_DEFINITIONS[t].base;
                            const selected = selectedLoadout.includes(t);
                            return (
                                <button 
                                    key={t} onClick={() => toggleLoadout(t)}
                                    className={`p-2 border rounded flex flex-col items-center transition-all ${selected ? 'bg-green-900 border-green-400' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'} relative`}
                                >
                                    <div className={`w-2 h-2 rounded-full mb-1 ${def.isCliff ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                                    <span className="font-bold text-[10px] mb-1 truncate w-full text-center">{def.name}</span>
                                    <span className="text-[10px] text-yellow-400">${def.cost}</span>
                                </button>
                            )
                        })}
                      </div>
                  </div>
              </div>

              <button 
                  onClick={() => selectedLoadout.length === 5 && onConfirmLoadout(selectedLoadout, mapScale, selectedBiome)}
                  disabled={selectedLoadout.length !== 5}
                  className={`px-12 py-4 font-bold rounded uppercase tracking-widest text-lg shadow-lg mb-10 transition-all ${selectedLoadout.length === 5 ? 'bg-green-600 hover:bg-green-500 text-white hover:scale-105' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
              >
                  Deploy Squad
              </button>
          </div>
      )
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      {/* Top Bar */}
      <div className="bg-slate-900/90 text-white p-3 flex justify-between items-center border-b border-slate-700 pointer-events-auto backdrop-blur">
         <div className="flex gap-8 items-center font-mono">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase">Budget</span>
                <span className="text-2xl font-bold text-green-400">${money}</span>
            </div>
            <div className="flex flex-col w-32">
                 <div className="flex justify-between text-[10px] text-gray-400 uppercase">
                     <span>Base Integrity</span>
                     <span>{Math.ceil(baseHealth)}/{maxHealth}</span>
                 </div>
                 <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden mt-1">
                     <div className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-500" style={{ width: `${(baseHealth/maxHealth)*100}%` }} />
                 </div>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase">Wave</span>
                <span className="text-2xl font-bold text-blue-400">{wave}</span>
            </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase">Hostiles</span>
                <span className="text-2xl font-bold text-red-400">{enemies}</span>
            </div>
            {!gameStarted ? (
                 <button 
                    onClick={onStartGame}
                    className="ml-4 bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-6 rounded border border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.4)] animate-pulse uppercase tracking-wider text-sm hover:scale-105 transition-transform"
                 >
                    Start Mission
                 </button>
            ) : (
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase">Next Wave</span>
                    <span className="text-xl font-bold text-yellow-400">{waveTimer}s</span>
                </div>
            )}
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase">Time</span>
                <span className="text-xl font-bold text-white">{formatTime(gameTime)}</span>
            </div>
         </div>
         <div className="text-xs text-gray-500 font-mono text-right">
             <div>SCALE: {mapConfig.scale}</div>
             <div>BIOME: {mapConfig.biome}</div>
         </div>
      </div>

      {/* Unobtrusive Tutorial Overlay */}
      <div className={`absolute top-24 left-1/2 transform -translate-x-1/2 z-40 max-w-xl w-full transition-opacity duration-500 pointer-events-none ${showTutorial ? 'opacity-100' : 'opacity-0'}`}>
         {tutorialText && (
             <div className="bg-slate-900/80 border border-blue-500/50 p-4 rounded-lg shadow-lg backdrop-blur-sm">
                 <div className="flex items-center gap-3 mb-2">
                     <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                     <span className="text-blue-400 font-bold text-xs uppercase tracking-widest">Incoming Transmission</span>
                 </div>
                 <p className="text-white font-mono text-sm leading-relaxed text-shadow-sm">
                     {displayedTutorial}
                     <span className="animate-pulse">_</span>
                 </p>
             </div>
         )}
      </div>

      {/* Main Area */}
      <div className="flex-1 relative">
         {/* Upgrade Panel */}
         {selectedTower && (
             <div className="absolute right-4 top-4 w-72 bg-slate-900/95 border border-slate-600 text-white rounded shadow-xl p-4 pointer-events-auto backdrop-blur-md">
                 <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-2">
                     <div>
                         <h2 className="text-lg font-bold text-blue-400 uppercase">{selectedTower.stats.name}</h2>
                         <div className="text-xs text-gray-400">Level {selectedTower.level}</div>
                     </div>
                     <button onClick={onDeselect} className="text-gray-400 hover:text-white font-bold px-2">X</button>
                 </div>
                 
                 {/* Targeting UI */}
                 {![TowerType.FARM, TowerType.CAMP, TowerType.MILITARY_CAMP, TowerType.RIFLING_SQUAD].includes(selectedTower.type) && (
                     <div className="mb-4">
                         <label className="text-[10px] text-gray-500 uppercase block mb-1">Targeting</label>
                         <select 
                            value={selectedTower.targetingMode} 
                            onChange={(e) => setTargeting(selectedTower.id, e.target.value as TargetingMode)}
                            className="w-full bg-slate-800 border border-slate-600 text-xs p-1 rounded focus:outline-none"
                         >
                             {Object.values(TargetingMode).map(m => <option key={m} value={m}>{m}</option>)}
                         </select>
                     </div>
                 )}

                 {/* Ability Button */}
                 {selectedTower.stats.abilityCooldown && (
                     <div className="mb-4">
                        <label className="text-[10px] text-gray-500 uppercase block mb-1">Active Ability</label>
                        <div className="text-[10px] text-gray-400 italic mb-1">
                             {/* Ability Description */}
                             {selectedTower.stats.name === 'Commander' ? 'Boosts nearby Fire Rate (+30%) for 5s' :
                              selectedTower.stats.name === 'Medic' ? 'Instantly removes Stun from nearby towers' :
                              selectedTower.stats.name === 'Radar Camp' ? 'Boosts Range & Damage (+20%) for 10s' : 'Special Effect'}
                        </div>
                        <button
                            onClick={() => onActivateAbility(selectedTower.id)}
                            disabled={selectedTower.abilityCooldownTimer > 0 || selectedTower.abilityActiveTimer > 0}
                            className={`w-full py-2 px-3 rounded font-bold border transition-all text-xs uppercase tracking-wider relative overflow-hidden ${
                                selectedTower.abilityActiveTimer > 0 ? 'bg-yellow-900 border-yellow-600 text-yellow-200' :
                                selectedTower.abilityCooldownTimer > 0 ? 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed' :
                                'bg-purple-900 border-purple-500 text-purple-200 hover:bg-purple-800'
                            }`}
                        >
                            {selectedTower.abilityActiveTimer > 0 ? `ACTIVE (${Math.ceil(selectedTower.abilityActiveTimer / 60)}s)` :
                             selectedTower.abilityCooldownTimer > 0 ? `COOLDOWN (${Math.ceil(selectedTower.abilityCooldownTimer / 60)}s)` :
                             "ACTIVATE"}
                             
                             {selectedTower.abilityCooldownTimer > 0 && (
                                 <div className="absolute bottom-0 left-0 h-1 bg-gray-500 transition-all duration-100" style={{ width: `${(selectedTower.abilityCooldownTimer / selectedTower.stats.abilityCooldown) * 100}%` }} />
                             )}
                        </button>
                     </div>
                 )}

                 <div className="space-y-1 mb-4 text-xs font-mono text-gray-300">
                     <div className="flex justify-between"><span>DMG</span> <span className="text-white">{selectedTower.stats.damage}</span></div>
                     <div className="flex justify-between"><span>RNG</span> <span className="text-white">{selectedTower.stats.range}</span></div>
                     <div className="flex justify-between"><span>SPD</span> <span className="text-white">{(60/selectedTower.stats.cooldown).toFixed(2)}/s</span></div>
                     <div className="flex justify-between"><span>HIT</span> <span className="text-orange-400">{Math.floor(selectedTower.totalDamageDealt)}</span></div>
                 </div>
                 <div className="space-y-2">
                     {selectedTower.level < 5 ? (
                         <button 
                            onClick={onUpgrade}
                            disabled={money < TOWER_DEFINITIONS[selectedTower.type].upgrades[selectedTower.level].cost}
                            className={`w-full py-2 px-3 rounded font-bold border flex flex-col items-center transition-colors ${money >= TOWER_DEFINITIONS[selectedTower.type].upgrades[selectedTower.level].cost ? 'bg-green-800 border-green-600 hover:bg-green-700' : 'bg-gray-800 border-gray-700 opacity-50'}`}
                         >
                             <span className="text-xs text-gray-200">{TOWER_DEFINITIONS[selectedTower.type].upgrades[selectedTower.level].name}</span>
                             <span className="text-sm text-yellow-300 font-mono">${TOWER_DEFINITIONS[selectedTower.type].upgrades[selectedTower.level].cost}</span>
                         </button>
                     ) : (
                         <div className="text-center text-xs text-yellow-500 font-bold border border-yellow-500/30 bg-yellow-900/20 p-2 rounded uppercase">Max Level</div>
                     )}
                     <button onClick={onSell} className="w-full py-1 px-3 rounded font-bold bg-red-900/30 border border-red-800 text-red-300 hover:bg-red-900/50 text-xs mt-2">
                         Sell (${Math.floor(selectedTower.stats.cost * 0.7)})
                     </button>
                 </div>
             </div>
        )}
      </div>

      {/* Bottom Shop Bar */}
      {!selectedTower && (
          <div className="bg-slate-900/95 border-t border-slate-700 p-2 pointer-events-auto flex flex-col justify-end backdrop-blur-md">
              <div className="flex justify-center gap-2 overflow-x-auto pb-1">
                  {loadout.map(type => {
                      const def = TOWER_DEFINITIONS[type].base;
                      const canAfford = money >= def.cost;
                      const currentCount = towerCounts[type] || 0;
                      // Explicit boolean cast to fix TS error
                      const isAtLimit = def.placementLimit ? currentCount >= def.placementLimit : false;
                      
                      return (
                          <button 
                            key={type}
                            onClick={() => canAfford && !isAtLimit && onSelectType(type)}
                            disabled={!canAfford || isAtLimit}
                            className={`group relative w-20 h-20 rounded border flex flex-col items-center justify-center transition-all 
                                ${isAtLimit ? 'bg-red-900/20 border-red-800 opacity-60 cursor-not-allowed' :
                                  canAfford ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-green-400' : 
                                  'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed'}`}
                          >
                              <div className={`w-3 h-3 rounded-full mb-1 ${def.isCliff ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                              <span className="text-[10px] font-bold text-gray-200 text-center leading-none mb-1">{def.name}</span>
                              <span className={`text-xs font-mono ${canAfford ? 'text-green-400' : 'text-red-400'}`}>${def.cost}</span>
                              
                              {def.placementLimit && (
                                  <span className={`absolute top-1 right-1 text-[9px] font-bold ${isAtLimit ? 'text-red-500' : 'text-gray-400'}`}>
                                      {currentCount}/{def.placementLimit}
                                  </span>
                              )}

                              <div className="absolute bottom-full mb-2 w-48 bg-black/90 text-white p-2 rounded text-xs hidden group-hover:block z-50 pointer-events-none border border-gray-600">
                                  <div className="font-bold text-blue-300 mb-1">{def.name}</div>
                                  <div className="text-gray-400 mb-1">{def.description}</div>
                                  <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                                      <span>DMG: {def.damage}</span>
                                      <span>RNG: {def.range}</span>
                                      <span>SPD: {(60/def.cooldown).toFixed(1)}/s</span>
                                      <span className={def.isCliff ? "text-orange-400" : "text-green-400"}>{def.isCliff ? "CLIFF" : "GROUND"}</span>
                                  </div>
                              </div>
                          </button>
                      )
                  })}
              </div>
              <div className="text-center text-[10px] text-gray-500 mt-1">Press 'Q' to Cancel Placement</div>
          </div>
      )}
    </div>
  );
};