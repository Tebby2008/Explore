
import React, { useState, useEffect, useRef } from 'react';
import GameCanvas, { GameCanvasRef } from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import ElevatorMenu from './components/ElevatorMenu';
import MenuBackground from './components/MenuBackground';
import { GameState, Difficulty, PlayerState, ItemType, CustomDifficultyConfig, SaveData, GameLevel, Position } from './types';
import { DIFFICULTY_CONFIG, LORE_TEXTS, DIALOGUE_TRIGGERS, NOISE_LEVELS } from './constants';

const WikiCanvas: React.FC<{ type: 'ITEM'|'ENEMY'; subtype: string }> = ({ type, subtype }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0,0,c.width,c.height);
        ctx.save();
        ctx.translate(c.width/2, c.height/2);
         
        if (type === 'ITEM') {
             if (subtype === 'BATTERY') { ctx.fillStyle = '#22c55e'; ctx.fillRect(-10,-15,20,30); ctx.fillStyle='#fff'; ctx.fillText('+', -4, 5); }
             if (subtype === 'FUEL') { ctx.fillStyle = '#dc2626'; ctx.fillRect(-15,-15,30,30); }
             if (subtype === 'KEY') { ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.arc(-5,0,8,0,Math.PI*2); ctx.fill(); ctx.fillRect(0,-4,15,8); ctx.fillRect(10,0,4,6); }
             if (subtype === 'MEDKIT') { ctx.fillStyle = '#fff'; ctx.fillRect(-10,-10,20,20); ctx.fillStyle='red'; ctx.fillRect(-3,-8,6,16); ctx.fillRect(-8,-3,16,6); }
             if (subtype === 'FLASHLIGHT') { ctx.fillStyle = '#555'; ctx.fillRect(-10,-5,20,10); ctx.fillStyle='#fbbf24'; ctx.fillRect(10,-5,4,10); }
             if (subtype === 'CABLE') { ctx.strokeStyle = '#eab308'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*1.5); ctx.stroke(); }
             if (subtype === 'SPEED') { ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(8,5); ctx.lineTo(-8,5); ctx.fill(); }
             if (subtype === 'INVISIBILITY') { ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-4,-4,3,0,Math.PI*2); ctx.fill(); }
             if (subtype === 'REPELLENT') { ctx.fillStyle = '#84cc16'; ctx.fillRect(-10,-15,20,30); ctx.fillStyle='#000'; ctx.font='16px monospace'; ctx.fillText('X',-5,5); }
             if (subtype === 'FLASHBANG') { ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle='red'; ctx.beginPath(); ctx.arc(0,-10,2,0,Math.PI*2); ctx.fill(); }
             if (subtype === 'NOTE') { ctx.fillStyle = '#fef3c7'; ctx.fillRect(-8,-10,16,20); ctx.fillStyle='#000'; ctx.fillRect(-5,-5,10,2); ctx.fillRect(-5,0,10,2); }
        } else {
             // Enemies
             const time = Date.now();
             if (subtype === 'LURKER') {
                ctx.fillStyle = '#2e1065'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#2e1065'; ctx.lineWidth = 3; 
                for(let i=0; i<8; i++) { const a=(i/8)*Math.PI*2; ctx.beginPath(); ctx.moveTo(Math.cos(a)*10, Math.sin(a)*10); ctx.lineTo(Math.cos(a)*30, Math.sin(a)*30); ctx.stroke(); }
             } else if (subtype === 'CHASER') {
                 ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); for(let i=0; i<16; i++) { const r = i%2===0?20:30; const a=(i/16)*Math.PI*2; ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.fill();
             } else if (subtype === 'SHADE') {
                 ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill(); ctx.shadowColor='#fff'; ctx.shadowBlur=5; ctx.stroke(); ctx.shadowBlur=0;
             } else if (subtype === 'PHANTOM') {
                 ctx.fillStyle = '#06b6d4'; ctx.globalAlpha=0.6; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
             } else if (subtype === 'SWARM') {
                 ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.arc(-5,-5,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5,5,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5,-5,4,0,Math.PI*2); ctx.fill();
             } else if (subtype === 'DREAD') {
                 ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0,0,25,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='red'; ctx.lineWidth=2; ctx.stroke();
             }
        }
        ctx.restore();
    }, [type, subtype]);

    return <canvas ref={canvasRef} width={60} height={60} className="bg-stone-900 rounded border border-stone-700 mx-auto mb-2 shrink-0" />;
};

interface TutorialModalProps {
    onClose: () => void;
    onStartTutorial: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ onClose, onStartTutorial }) => {
    const [tab, setTab] = useState<'BASICS'|'ITEMS'|'BESTIARY'>('BASICS');

    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
         <div className="bg-stone-800 w-[800px] h-[80vh] flex flex-col rounded-lg border-2 border-stone-600 shadow-2xl overflow-hidden animate-fade-in">
             <div className="flex bg-stone-900 border-b border-stone-700 shrink-0">
                 <button onClick={() => setTab('BASICS')} className={`flex-1 py-4 font-bold ${tab==='BASICS'?'text-orange-500 bg-stone-800 border-t-2 border-orange-500':'text-stone-500 hover:text-stone-300'}`}>SURVIVAL GUIDE</button>
                 <button onClick={() => setTab('ITEMS')} className={`flex-1 py-4 font-bold ${tab==='ITEMS'?'text-orange-500 bg-stone-800 border-t-2 border-orange-500':'text-stone-500 hover:text-stone-300'}`}>EQUIPMENT</button>
                 <button onClick={() => setTab('BESTIARY')} className={`flex-1 py-4 font-bold ${tab==='BESTIARY'?'text-orange-500 bg-stone-800 border-t-2 border-orange-500':'text-stone-500 hover:text-stone-300'}`}>BESTIARY</button>
             </div>
             
             <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-stone-300 space-y-6">
                 {tab === 'BASICS' && (
                     <>
                        <div className="border-b border-stone-700 pb-4">
                            <h2 className="text-2xl text-white font-bold mb-2">OBJECTIVE: DESCEND TO FLOOR 1</h2>
                            <p>You begin on Floor 100. The Exit is on Floor 1.</p> 
                            <p>To travel down, you must utilize the elevator. However, the elevator requires <span className="text-green-500">Battery Power</span>.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-orange-400 font-bold mb-2">BATTERY MANAGEMENT</h3>
                                <ul className="text-sm space-y-2 list-disc pl-4">
                                    <li>Traveling 1 floor consumes ~10-15% Power (depending on difficulty).</li>
                                    <li>Passive Drain: <span className="text-red-400">{DIFFICULTY_CONFIG[Difficulty.MEDIUM].batteryDrain * 100}% per tick</span> while outside elevator.</li>
                                    <li>If Battery reaches 0%, Life Support fails. <span className="text-red-500 font-bold">GAME OVER.</span></li>
                                    <li>Connect Generators (with Cables) for massive power boosts.</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-red-400 font-bold mb-2">HEALTH & DAMAGE</h3>
                                <ul className="text-sm space-y-2 list-disc pl-4">
                                    <li>You have limited Hearts. Contact with enemies removes 1 Heart.</li>
                                    <li>Easy/Normal: 5 Hearts. Nightmare: 3 Hearts.</li>
                                    <li>Healing items (Medkits) are rare. Avoid damage at all costs.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-black/40 p-4 rounded border border-stone-700">
                            <h3 className="text-blue-400 font-bold mb-2">NOISE & STEALTH</h3>
                            <p className="text-sm mb-2">Monsters react to sound. Manage your movement speed.</p>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div className="bg-stone-800 p-2 rounded"><div className="font-bold text-green-500">CROUCH</div>Vol: {NOISE_LEVELS.CROUCH}</div>
                                <div className="bg-stone-800 p-2 rounded"><div className="font-bold text-yellow-500">WALK</div>Vol: {NOISE_LEVELS.WALK}</div>
                                <div className="bg-stone-800 p-2 rounded"><div className="font-bold text-orange-500">RUN</div>Vol: {NOISE_LEVELS.RUN}</div>
                                <div className="bg-stone-800 p-2 rounded"><div className="font-bold text-red-500">ACTION</div>Vol: {NOISE_LEVELS.ACTION}</div>
                            </div>
                        </div>
                     </>
                 )}
                 {tab === 'ITEMS' && (
                     <div className="grid grid-cols-2 gap-4">
                         {[
                             {t:'FLASHLIGHT', n:'Flashlight', d:'Primary tool. Reveals enemies but attracts attention. Click to Pulse (stuns sensitive enemies).'},
                             {t:'BATTERY', n:'Battery', d:'Restores ~7% Power. Found in drawers.'},
                             {t:'FUEL', n:'Fuel Can', d:'Restores ~35% Power. Heavier and rarer.'},
                             {t:'CABLE', n:'Heavy Cable', d:'Connects Generators to Elevator. While carrying: Cannot run, items disabled.'},
                             {t:'KEY', n:'Key', d:'Unlocks specific numbered rooms.'},
                             {t:'NOTE', n:'Note', d:'Contains PIN codes for electronic locks.'},
                             {t:'MEDKIT', n:'Medkit', d:'Restores 1 Heart. Very Rare.'},
                             {t:'SPEED', n:'Swift Potion', d:'Increases movement speed for 10 seconds.'},
                             {t:'INVISIBILITY', n:'Invisibility Potion', d:'Invisible to visual enemies for 15s. Sound sensitive enemies can still hear you.'},
                             {t:'REPELLENT', n:'Repellent', d:'Forces nearby enemies to flee for 10s.'},
                             {t:'FLASHBANG', n:'Flashbang', d:'Thrown item. Stuns ALL enemies in a large radius for 7 seconds.'},
                         ].map(i => (
                             <div key={i.n} className="bg-stone-700/50 p-3 rounded flex items-start space-x-3">
                                 <WikiCanvas type="ITEM" subtype={i.t} />
                                 <div>
                                     <h3 className="text-white font-bold">{i.n}</h3>
                                     <p className="text-xs text-stone-400">{i.d}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
                 {tab === 'BESTIARY' && (
                     <div className="grid grid-cols-2 gap-4">
                         {[
                             {t:'LURKER', n:'Lurker', d:'Common threat. Sensitive to Sound. Moves erratically.', c:'text-purple-400'},
                             {t:'CHASER', n:'Chaser', d:'Aggressive hunter. Fast. High detection range. Use Flashbangs.', c:'text-red-500'},
                             {t:'SHADE', n:'Shade', d:'Avoids light. Freezes when illuminated. Deadly in the dark.', c:'text-stone-500'},
                             {t:'PHANTOM', n:'Phantom', d:'Ethereal. Passes through walls. Flees when hit by Light Pulse.', c:'text-cyan-400'},
                             {t:'SWARM', n:'Swarm', d:'Groups of small vermin. Disperses under sustained light.', c:'text-yellow-600'},
                             {t:'DREAD', n:'The Dread', d:'Event Entity. Cannot be fought. Hide in closets when the screen shakes and turns red.', c:'text-red-700'},
                         ].map(e => (
                             <div key={e.n} className="bg-stone-700/50 p-3 rounded flex items-start space-x-3">
                                 <WikiCanvas type="ENEMY" subtype={e.t} />
                                 <div>
                                     <h3 className={`${e.c} font-bold`}>{e.n}</h3>
                                     <p className="text-xs text-stone-400">{e.d}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>

             <div className="p-4 bg-stone-900 flex justify-between items-center border-t border-stone-700 shrink-0">
                 <button onClick={onClose} className="px-4 py-2 text-stone-400 hover:text-white">CLOSE GUIDE</button>
                 <button onClick={onStartTutorial} className="px-6 py-2 bg-green-700 hover:bg-green-600 text-white font-bold rounded shadow-lg animate-pulse">
                     START TRAINING (FLOOR 5)
                 </button>
             </div>
         </div>
      </div>
    );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [currentLevel, setCurrentLevel] = useState(100);
  const [logs, setLogs] = useState<{ id: number; text: string; timestamp: number; exiting?: boolean }[]>([]);
  const [objective, setObjective] = useState("Descend to Floor 1");
  const [showElevatorUI, setShowElevatorUI] = useState(false);
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [customConfig, setCustomConfig] = useState<CustomDifficultyConfig>(DIFFICULTY_CONFIG[Difficulty.CUSTOM]);
  const [deathReason, setDeathReason] = useState<string>("UNKNOWN");
  
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentLoreId, setCurrentLoreId] = useState<number | null>(null);
  const [currentDialogue, setCurrentDialogue] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  const [loadedLevelState, setLoadedLevelState] = useState<GameLevel | null>(null);
  const [loadedPlayerPos, setLoadedPlayerPos] = useState<Position | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.5);

  const gameCanvasRef = useRef<GameCanvasRef>(null);

  const [playerState, setPlayerState] = useState<PlayerState>({
    health: 5,
    maxHealth: 5,
    inventory: [{ id: 'init-light', type: 'ITEM' as any, itemType: ItemType.FLASHLIGHT, pos: {x:0,y:0}, size:0, color:'', name: 'Flashlight' }],
    equippedItemIndex: 0,
    battery: 100,
    stamina: 100,
    noiseLevel: 0,
    movementMode: 'WALK',
    flashlightOn: true,
    flashbangCooldown: 0,
    abilityCooldown: 0,
    isHiding: false,
    hidingTimer: 0,
    speedMultiplier: 1,
    activeNote: null,
    interactingWithPinPad: null,
    isCarryingCable: false,
    loreCollected: [],
    isInvisible: false,
    isRepelling: false
  });

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, { id: Date.now(), text: msg, timestamp: Date.now() }]);
  };

  useEffect(() => {
      const interval = setInterval(() => {
          const now = Date.now();
          setLogs(prev => {
              const needsUpdate = prev.some(l => (!l.exiting && now - l.timestamp > 3000) || (l.exiting && now - l.timestamp > 3500));
              if (!needsUpdate) return prev;
              return prev.map(l => {
                  if (!l.exiting && now - l.timestamp > 3000) return { ...l, exiting: true };
                  return l;
              }).filter(l => !(l.exiting && now - l.timestamp > 3500));
          });
      }, 100);
      return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
      if (currentLevel === 1) setObjective("LOCATE AND ENTER THE EXIT");
      else setObjective(`Descend to Floor 1`);
  }, [currentLevel]);

  // Check Save on Mount
  useEffect(() => {
      const save = localStorage.getItem('ed_save');
      if (save) setHasSave(true);
  }, []);

  // Timer
  useEffect(() => {
      let interval: number;
      if (gameState === GameState.PLAYING) {
          interval = window.setInterval(() => {
              setTimeElapsed(prev => prev + 1000);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [gameState]);

  // Dialogue Trigger
  const triggerDialogue = (textOrKey: string) => {
      // @ts-ignore
      const text = DIALOGUE_TRIGGERS[textOrKey] || textOrKey;
      if (text) {
          setCurrentDialogue(text);
          setTimeout(() => setCurrentDialogue(null), 5000);
      }
  };

  // Remove Save on Loss
  useEffect(() => {
      if (gameState === GameState.GAME_OVER) {
          localStorage.removeItem('ed_save');
          setHasSave(false);
      }
  }, [gameState]);

  const handleLorePickup = (id: number) => {
      setGameState(GameState.LORE_READING);
      setCurrentLoreId(id);
      setPlayerState(prev => ({...prev, loreCollected: [...prev.loreCollected, id]}));
  };

  const saveGame = () => {
      const snapshot = gameCanvasRef.current?.snapshot();
      const data: SaveData = {
          difficulty,
          currentLevel,
          playerState,
          timeElapsed,
          customConfig,
          loreProgress: playerState.loreCollected,
          levelState: snapshot?.level || undefined,
          playerPos: snapshot?.pos || undefined
      };
      localStorage.setItem('ed_save', JSON.stringify(data));
      setHasSave(true);
      addLog("Game Saved.");
      setGameState(GameState.PLAYING);
  };

  const loadGame = () => {
      const raw = localStorage.getItem('ed_save');
      if (raw) {
          const data: SaveData = JSON.parse(raw);
          setDifficulty(data.difficulty);
          setCurrentLevel(data.currentLevel);
          setPlayerState(data.playerState);
          setTimeElapsed(data.timeElapsed);
          if (data.customConfig) setCustomConfig(data.customConfig);
          if (data.levelState) setLoadedLevelState(data.levelState);
          if (data.playerPos) setLoadedPlayerPos(data.playerPos);
          setGameState(GameState.PLAYING);
          addLog("Game Loaded.");
      }
  };

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    const config = diff === Difficulty.CUSTOM ? customConfig : DIFFICULTY_CONFIG[diff];
    
    setLoadedLevelState(null);
    setLoadedPlayerPos(null);

    setGameState(GameState.PLAYING);
    const startFloor = diff === Difficulty.TUTORIAL ? 5 : 100;
    setCurrentLevel(startFloor);
    setTimeElapsed(0);
    
    setPlayerState({
        health: config.maxHealth,
        maxHealth: config.maxHealth,
        inventory: [{ id: 'init-light', type: 'ITEM' as any, itemType: ItemType.FLASHLIGHT, pos: {x:0,y:0}, size:0, color:'', name: 'Flashlight' }],
        equippedItemIndex: 0,
        battery: 100,
        stamina: 100,
        noiseLevel: 0,
        movementMode: 'WALK',
        flashlightOn: true,
        flashbangCooldown: 0,
        abilityCooldown: 0,
        isHiding: false,
        hidingTimer: 0,
        speedMultiplier: 1,
        activeNote: null,
        interactingWithPinPad: null,
        isCarryingCable: false,
        loreCollected: [],
        isInvisible: false,
        isRepelling: false
    });
    setLogs([]);
    addLog("System Initialized.");
    setShowElevatorUI(true); 
    setShowTutorial(false); 
    setShowCustomConfig(false);
    
    setTimeout(() => {
        triggerDialogue(diff === Difficulty.HARD ? 'START_HARD' : 'START_EASY');
    }, 2000);
  };

  const handleElevatorTravel = (floorsDescended: number) => {
      const config = difficulty === Difficulty.CUSTOM ? customConfig : DIFFICULTY_CONFIG[difficulty];
      const cost = config.elevatorCostPerFloor || config.elevatorCost; 
      const totalCost = (cost || 10) * floorsDescended;
      
      setPlayerState(prev => ({ ...prev, battery: prev.battery - totalCost }));
      const nextFloor = currentLevel - floorsDescended;
      setCurrentLevel(nextFloor);
      setLoadedLevelState(null);
      setLoadedPlayerPos(null);
      addLog(`Descended to Floor ${nextFloor}`);
      setShowElevatorUI(true); 
  };
  
  const renderLoreModal = () => (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative bg-[#fef3c7] text-stone-900 p-12 max-w-lg shadow-[0_0_50px_rgba(255,255,255,0.2)] transform rotate-1 rounded-sm">
              {/* Paper Texture Effect */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none"></div>
              
              <div className="relative z-10">
                  <h2 className="text-3xl font-serif font-bold mb-6 text-stone-800 border-b-2 border-stone-800 pb-2">
                      Recovered Entry #{currentLoreId !== null ? currentLoreId + 1 : '?'}
                  </h2>
                  <p className="text-lg font-serif leading-relaxed mb-8 italic">
                      "{currentLoreId !== null && LORE_TEXTS[difficulty] ? LORE_TEXTS[difficulty][currentLoreId] : '...'}"
                  </p>
                  
                  <div className="flex justify-center">
                      <button 
                          onClick={() => {
                              setGameState(GameState.PLAYING);
                              if (currentLoreId !== null) {
                                  // Unique reactions based on note ID
                                  const reactions = [
                                      "The elevator... keep it powered. Got it.",
                                      "Outrun them? I hope so.",
                                      "Batteries in drawers. Good to know.",
                                      "The generator... I need to check the voltage.",
                                      "Air scrubbers? Great, another thing to worry about.",
                                      "Medkits are rare. I better be careful.",
                                      "Floor 50... it gets harder from here.",
                                      "PIN codes written nearby... insecure but helpful.",
                                      "Machinery below... I'm getting close.",
                                      "Sunlight? Please let it be real."
                                  ];
                                  // Fallback reaction
                                  const reaction = reactions[currentLoreId] || "I need to keep moving.";
                                  triggerDialogue(reaction);
                              }
                          }} 
                          className="px-8 py-2 bg-stone-800 text-[#fef3c7] font-bold hover:bg-stone-700 transition-colors shadow-lg font-mono text-sm"
                      >
                          STOW NOTE
                      </button>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderPauseMenu = () => (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-stone-900 border border-stone-600 p-8 rounded-xl w-80 space-y-4 shadow-2xl">
              <h2 className="text-3xl text-white font-bold text-center mb-6">PAUSED</h2>
              <button onClick={() => setGameState(GameState.PLAYING)} className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded">RESUME</button>
              <button onClick={saveGame} className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded">SAVE & CONTINUE</button>
              <button onClick={() => setGameState(GameState.MENU)} className="w-full py-3 bg-red-900/50 hover:bg-red-900 text-red-200 rounded border border-red-900">EXIT TO MENU</button>
          </div>
      </div>
  );

  const renderSettings = () => (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-600 p-8 rounded-lg w-[400px]">
              <h2 className="text-2xl text-white font-bold mb-6 text-center border-b border-stone-700 pb-2">SETTINGS</h2>
              
              <div className="space-y-6">
                  <div className="flex justify-between items-center">
                      <label className="text-stone-300">Reduced Screen Shake</label>
                      <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} className="w-6 h-6 accent-orange-500" />
                  </div>
                  <div className="flex justify-between items-center">
                      <label className="text-stone-300">Ambience Volume</label>
                      <input type="range" min="0" max="1" step="0.1" value={ambientVolume} onChange={(e) => setAmbientVolume(parseFloat(e.target.value))} className="w-32 accent-orange-500" />
                  </div>
              </div>
              
              <button onClick={() => setShowSettings(false)} className="w-full mt-8 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded">
                  APPLY & CLOSE
              </button>
          </div>
      </div>
  );

  const renderCustomMenu = () => (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-stone-900 border-2 border-orange-800 p-6 rounded-lg text-white w-[500px] shadow-2xl relative">
          <h2 className="text-2xl font-bold text-orange-500 mb-4 text-center">CUSTOM CONFIGURATION</h2>
          <div className="space-y-4">
              <div>
                  <label className="block text-sm text-stone-400">Max Health: {customConfig.maxHealth}</label>
                  <input type="range" min="1" max="10" value={customConfig.maxHealth} onChange={(e) => setCustomConfig({...customConfig, maxHealth: parseInt(e.target.value, 10)})} className="w-full accent-orange-600"/>
              </div>
              <div>
                  <label className="block text-sm text-stone-400">Battery Drain Speed: {customConfig.batteryDrain.toFixed(2)}</label>
                  <input type="range" min="0.01" max="1.0" step="0.01" value={customConfig.batteryDrain} onChange={(e) => setCustomConfig({...customConfig, batteryDrain: parseFloat(e.target.value)})} className="w-full accent-orange-600"/>
              </div>
              <div>
                  <label className="block text-sm text-stone-400">Elevator Cost per Floor: {customConfig.elevatorCost}%</label>
                  <input type="range" min="1" max="50" value={customConfig.elevatorCost} onChange={(e) => setCustomConfig({...customConfig, elevatorCost: parseInt(e.target.value, 10)})} className="w-full accent-orange-600"/>
              </div>
              <div>
                  <label className="block text-sm text-stone-400">Enemy Spawn Rate: {customConfig.spawnRate.toFixed(1)}</label>
                  <input type="range" min="0" max="1" step="0.1" value={customConfig.spawnRate} onChange={(e) => setCustomConfig({...customConfig, spawnRate: parseFloat(e.target.value)})} className="w-full accent-orange-600"/>
              </div>
          </div>
          <div className="flex space-x-2 mt-6">
              <button onClick={() => setShowCustomConfig(false)} className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 rounded border border-stone-600">CANCEL</button>
              <button onClick={() => startGame(Difficulty.CUSTOM)} className="flex-1 py-2 bg-orange-700 hover:bg-orange-600 rounded border border-orange-500 font-bold">START CUSTOM GAME</button>
          </div>
        </div>
      </div>
  );

  return (
    <div className="w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden font-sans select-none relative">
      
      {gameState === GameState.MENU && (
        <>
        <MenuBackground />
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <div className="text-center mb-12 pointer-events-auto">
                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 tracking-tight drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]" style={{fontFamily: 'Impact, sans-serif'}}>
                    ELEVATOR DREAD
                </h1>
                <p className="text-stone-400 text-lg tracking-[0.5em] mt-2 font-light border-t border-stone-600 pt-2 inline-block">DESCEND. SURVIVE. ESCAPE.</p>
            </div>

            <div className="flex flex-col space-y-4 w-80 pointer-events-auto">
                {hasSave && (
                    <button onClick={loadGame} className="px-6 py-4 bg-orange-900/40 border border-orange-500 hover:bg-orange-900/60 transition-all rounded text-orange-400 font-bold tracking-widest mb-4">
                        CONTINUE GAME
                    </button>
                )}
                <button onClick={() => startGame(Difficulty.EASY)} className="group relative px-6 py-4 bg-black/50 border border-stone-700 hover:border-green-500 hover:bg-green-900/20 transition-all rounded clip-path-polygon">
                    <span className="text-xl font-bold text-stone-300 group-hover:text-green-400 tracking-wider">EASY</span>
                    <span className="absolute right-4 text-xs text-stone-500 group-hover:text-green-300">5 HEARTS</span>
                </button>
                <button onClick={() => startGame(Difficulty.MEDIUM)} className="group relative px-6 py-4 bg-black/50 border border-stone-700 hover:border-yellow-500 hover:bg-yellow-900/20 transition-all rounded">
                    <span className="text-xl font-bold text-stone-300 group-hover:text-yellow-400 tracking-wider">NORMAL</span>
                    <span className="absolute right-4 text-xs text-stone-500 group-hover:text-yellow-300">5 HEARTS</span>
                </button>
                <button onClick={() => startGame(Difficulty.HARD)} className="group relative px-6 py-4 bg-black/50 border border-stone-700 hover:border-red-600 hover:bg-red-900/20 transition-all rounded">
                    <span className="text-xl font-bold text-stone-300 group-hover:text-red-500 tracking-wider">NIGHTMARE</span>
                    <span className="absolute right-4 text-xs text-stone-500 group-hover:text-red-400">3 HEARTS</span>
                </button>
            </div>
        </div>

        <div className="absolute bottom-6 left-6 z-20 flex space-x-3 pointer-events-auto">
            <button onClick={() => setShowCustomConfig(true)} className="p-3 bg-stone-900 border border-stone-700 hover:border-purple-500 text-purple-500 rounded hover:bg-stone-800 transition-colors" title="Custom Game">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            </button>
            <button onClick={() => setShowTutorial(true)} className="p-3 bg-stone-900 border border-stone-700 hover:border-blue-500 text-blue-500 rounded hover:bg-stone-800 transition-colors" title="Tutorial / Wiki">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
            </button>
            <button onClick={() => setShowSettings(true)} className="p-3 bg-stone-900 border border-stone-700 hover:border-stone-400 text-stone-400 rounded hover:bg-stone-800 transition-colors" title="Settings">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            </button>
        </div>

        {showCustomConfig && renderCustomMenu()}
        {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} onStartTutorial={() => startGame(Difficulty.TUTORIAL)} />}
        {showSettings && renderSettings()}
        </>
      )}

      {/* GAME OVER */}
      {gameState === GameState.GAME_OVER && (
        <div className="text-center text-white z-50 bg-black/90 p-10 rounded-xl border border-red-900 overflow-hidden relative w-[600px]">
          <div className="drop-in">
              <h1 className="text-7xl font-bold text-red-700 mb-2 tracking-widest bg-red-950/50 p-4 border-y-4 border-red-600">TERMINATED</h1>
          </div>
          
          <div className="animate-fade-in">
              <p className="mb-2 text-xl text-stone-400 uppercase tracking-wide">CAUSE OF DEATH</p>
              <p className="mb-6 text-2xl text-red-500 font-mono border border-red-900/50 p-2 inline-block bg-black">{deathReason}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-left bg-stone-900 p-4 rounded mb-6">
              <div>Floor Reached: <span className="float-right font-bold text-orange-500">{currentLevel}</span></div>
              <div>Time Survived: <span className="float-right font-bold text-orange-500">{Math.floor(timeElapsed/1000)}s</span></div>
              <div>Lore Found: <span className="float-right font-bold text-purple-500">{playerState.loreCollected.length}</span></div>
          </div>

          <div className="flex gap-4">
              <button onClick={() => startGame(difficulty)} className="flex-1 py-3 bg-white text-black font-bold rounded hover:bg-stone-300">RESTART</button>
              <button onClick={() => setGameState(GameState.MENU)} className="flex-1 py-3 bg-stone-800 text-white rounded hover:bg-stone-700 border border-stone-600">MAIN MENU</button>
          </div>
        </div>
      )}
    
      {/* VICTORY */}
      {gameState === GameState.VICTORY && (
        <div className="text-center text-white z-50 bg-green-900/90 p-10 rounded-xl border border-green-500 w-[600px]">
          <h1 className="text-6xl font-bold text-green-300 mb-4">SURVIVED</h1>
          <p className="mb-6 text-xl">You escaped the facility.</p>
          <div className="bg-black/40 p-4 rounded mb-6 text-left">
              <p>Total Time: {Math.floor(timeElapsed/60000)}m {Math.floor((timeElapsed%60000)/1000)}s</p>
              <p>Difficulty: {difficulty}</p>
          </div>
          <div className="flex gap-4">
              <button onClick={() => startGame(difficulty)} className="flex-1 py-3 bg-white text-black font-bold rounded hover:bg-stone-300">PLAY AGAIN</button>
              <button onClick={() => setGameState(GameState.MENU)} className="flex-1 py-3 bg-stone-800 text-white rounded hover:bg-stone-700 border border-stone-600">MAIN MENU</button>
          </div>
        </div>
      )}

      {/* GAME VIEW */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED || gameState === GameState.LORE_READING) && (
        <div className="relative w-[800px] h-[600px] shadow-2xl border-4 border-stone-800 rounded-lg overflow-hidden bg-black">
          <GameCanvas 
            ref={gameCanvasRef}
            difficulty={difficulty}
            gameState={gameState}
            setGameState={setGameState}
            playerState={playerState}
            setPlayerState={setPlayerState}
            currentLevel={currentLevel}
            setCurrentLevel={setCurrentLevel}
            addLog={addLog}
            onElevatorStatusChange={setShowElevatorUI}
            customConfig={difficulty === Difficulty.CUSTOM ? customConfig : undefined}
            setDeathReason={setDeathReason}
            onLorePickup={handleLorePickup}
            onPause={() => setGameState(GameState.PAUSED)}
            triggerDialogue={triggerDialogue}
            initialLevelState={loadedLevelState}
            initialPlayerPos={loadedPlayerPos}
          />
          <UIOverlay 
            playerState={playerState}
            floor={currentLevel}
            logs={logs}
            objective={objective}
            timeElapsed={timeElapsed}
            currentDialogue={currentDialogue}
          />
          
          {showElevatorUI && gameState === GameState.PLAYING && (
              <ElevatorMenu 
                  currentFloor={currentLevel}
                  difficulty={difficulty}
                  battery={playerState.battery}
                  onTravel={handleElevatorTravel}
              />
          )}
          
          {gameState === GameState.PAUSED && renderPauseMenu()}
          {gameState === GameState.LORE_READING && renderLoreModal()}
        </div>
      )}
    </div>
  );
};

export default App;
