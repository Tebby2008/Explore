import React, { useState, useEffect } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TowerType, BiomeType } from './types';

const App = () => {
  const { gameStateRef, gameStateDisplay, spawnTower, upgradeTower, sellTower, setLoadout, adminAddCash, adminSkipWave, adminKillAll, adminGodMode, startGame, setTargetingMode, activateAbility, dismissTutorial } = useGameEngine();
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [placementMode, setPlacementMode] = useState<TowerType | null>(null);
  const [isLoadoutPhase, setIsLoadoutPhase] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Admin secret key listener & Cancel
  useEffect(() => {
      let slashes = 0;
      let lastTime = 0;
      const handler = (e: KeyboardEvent) => {
          if (e.key === '/') {
              const now = Date.now();
              if (now - lastTime < 500) slashes++;
              else slashes = 1;
              lastTime = now;
              if (slashes === 5) {
                  setIsAdminOpen(true);
                  slashes = 0;
              }
          }
          if (e.key === 'q' || e.key === 'Q') {
              setPlacementMode(null);
          }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelectType = (type: TowerType) => {
    setPlacementMode(type);
    setSelectedTowerId(null);
  };

  const handlePlaceTower = (x: number, y: number) => {
      if (placementMode) {
          const success = spawnTower(placementMode, x, y);
          if (success) {
              // Optionally keep placement mode active for multi-place, but prompt said "quit current tower", usually single place.
              // Let's keep single place for now, user can click again.
              setPlacementMode(null);
          } 
      }
  };

  const handleConfirmLoadout = (towers: TowerType[], scale: number, biome: BiomeType) => {
      setLoadout(towers, scale, biome);
      setIsLoadoutPhase(false);
  };

  return (
    <div className="w-screen h-screen relative bg-black overflow-hidden select-none font-sans">
        <GameCanvas 
            gameStateRef={gameStateRef} 
            selectedTowerId={selectedTowerId}
            placementMode={placementMode}
            onSelectTower={(tower) => {
                if (!placementMode) setSelectedTowerId(tower ? tower.id : null);
            }}
            onPlaceTower={handlePlaceTower}
            onCancelPlacement={() => setPlacementMode(null)}
        />

      <HUD 
        money={gameStateDisplay.money}
        wave={gameStateDisplay.wave}
        baseHealth={gameStateDisplay.baseHealth}
        maxHealth={gameStateDisplay.maxHealth}
        enemies={gameStateDisplay.enemies}
        loadout={gameStateDisplay.loadout}
        mapConfig={gameStateDisplay.mapConfig}
        gameStarted={gameStateDisplay.gameStarted}
        waveTimer={gameStateDisplay.waveTimer}
        gameTime={gameStateDisplay.gameTime}
        towerCounts={gameStateDisplay.towerCounts}
        
        onSelectType={handleSelectType}
        selectedTower={selectedTowerId ? gameStateRef.current.towers.find(t => t.id === selectedTowerId) || null : null}
        onUpgrade={() => selectedTowerId && upgradeTower(selectedTowerId)}
        onSell={() => {
            if (selectedTowerId) {
                sellTower(selectedTowerId);
                setSelectedTowerId(null);
            }
        }}
        onDeselect={() => setSelectedTowerId(null)}
        isLoadoutSelection={isLoadoutPhase}
        onConfirmLoadout={handleConfirmLoadout}
        onStartGame={startGame}
        setTargeting={setTargetingMode}
        onActivateAbility={activateAbility}
        
        tutorialText={gameStateDisplay.tutorialText}
        onDismissTutorial={dismissTutorial}

        isAdminOpen={isAdminOpen}
        closeAdmin={() => setIsAdminOpen(false)}
        adminActions={{
            addCash: adminAddCash,
            skipWave: adminSkipWave,
            killAll: adminKillAll,
            godMode: adminGodMode
        }}
      />
    </div>
  );
};

export default App;
