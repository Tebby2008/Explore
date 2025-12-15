import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Entity, PlayerState, GameLevel, Enemy, Position, EntityType, ItemType, Interactable, Difficulty, CustomDifficultyConfig, GameState, Room } from '../types';
import { TILE_SIZE, PLAYER_SIZE, COLORS, CANVAS_WIDTH, CANVAS_HEIGHT, NOISE_LEVELS, FLASHLIGHT_ANGLE, FLASHLIGHT_DISTANCE, DIFFICULTY_CONFIG, INTERACTION_RANGE } from '../constants';
import { generateLevel } from '../services/levelGenerator';

interface GameCanvasProps {
  difficulty: Difficulty;
  gameState: GameState;
  setGameState: (s: any) => void;
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  currentLevel: number;
  setCurrentLevel: (l: number) => void;
  addLog: (msg: string) => void;
  onElevatorStatusChange: (inElevator: boolean) => void;
  customConfig?: CustomDifficultyConfig;
  setDeathReason: (reason: string) => void;
  onLorePickup: (id: number) => void;
  onPause: () => void;
  triggerDialogue: (type: string) => void;
  initialLevelState?: GameLevel | null;
  initialPlayerPos?: Position | null;
}

export interface GameCanvasRef {
    snapshot: () => { level: GameLevel | null, pos: Position };
}

const GameCanvas = forwardRef<GameCanvasRef, GameCanvasProps>(({ 
  difficulty, gameState, setGameState, playerState, setPlayerState, currentLevel, setCurrentLevel, addLog, onElevatorStatusChange, customConfig, setDeathReason, onLorePickup, onPause, triggerDialogue, initialLevelState, initialPlayerPos
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null); // Use a ref to prevent recreation
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const walkingTimerRef = useRef<number>(0);
  const shakeIntensity = useRef<number>(0);
  const globalRedIntensity = useRef<number>(0);
  const globalWhiteout = useRef<number>(0); 
  const jumpScareRef = useRef<number>(0); 
  const chargingTimerRef = useRef<number>(0);
  const pulseEffectRef = useRef<number>(0); 
  const currentFovRef = useRef<number>(1.0); 
  
  const jumpRef = useRef<{active: boolean, timer: number, cooldown: number}>({ active: false, timer: 0, cooldown: 0 });

  const playerStateRef = useRef<PlayerState>(playerState);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);

  const levelRef = useRef<GameLevel | null>(null);
  const playerPosRef = useRef<Position>({ x: CANVAS_WIDTH / 2, y: 100 });
  const keysPressed = useRef<Set<string>>(new Set());
  const mousePos = useRef<Position>({ x: 0, y: 0 });
  const cameraOffset = useRef<Position>({ x: 0, y: 0 });
  const floorPatternRef = useRef<HTMLCanvasElement | null>(null);
  const carpetPatternRef = useRef<HTMLCanvasElement | null>(null);
  
  const inElevatorRef = useRef<boolean>(false);
  const exitAnimRef = useRef<{active: boolean, progress: number, startPos: Position, targetPos: Position} | null>(null);
  
  // Dread Ref: Changed snakePath to list of Room objects for room-based consumption
  const dreadRef = useRef<{
      state: 'IDLE'|'WARNING'|'KILL', 
      timer: number, 
      affectedRooms: Room[], // Rooms currently consumed
      nextRoomIndex: number,
      consuming: boolean,
      consumeTimer: number
  }>({ 
      state: 'IDLE', timer: 0, affectedRooms: [], nextRoomIndex: 0, consuming: false, consumeTimer: 0 
  });

  useImperativeHandle(ref, () => ({
      snapshot: () => ({
          level: levelRef.current,
          pos: { ...playerPosRef.current }
      })
  }));

  // --- Helper Functions ---
  const checkCollision = (newX: number, newY: number, size: number): boolean => {
    if (!levelRef.current) return false;
    
    // Treat position as center
    const half = size / 2;
    const l = newX - half;
    const r = newX + half;
    const t = newY - half;
    const b = newY + half;

    for (const wall of levelRef.current.walls) {
      if (l < wall.x + wall.w && r > wall.x && t < wall.y + wall.h && b > wall.y) return true;
    }
    
    if (!levelRef.current.elevatorDoorOpen) {
        const elRoom = levelRef.current.rooms.find(room => room.type === 'ELEVATOR');
        if (elRoom) {
            const doorY = elRoom.y + elRoom.h - 10;
            // Check door collision
            if (b > doorY && t < doorY + 10 && r > elRoom.x && l < elRoom.x + elRoom.w) return true;
        }
    }
    
    const isJumping = jumpRef.current.active;

    for (const i of levelRef.current.interactables) {
        if (i.interactType === 'DOOR') {
            if (i.locked) {
                const iHalf = i.size / 2;
                if (l < i.pos.x + iHalf && r > i.pos.x - iHalf && t < i.pos.y + iHalf && b > i.pos.y - iHalf) return true;
            }
        } else if (i.interactType === 'CLOSET' || i.interactType === 'CHEST' || i.interactType === 'DRAWER' || i.interactType === 'GENERATOR') {
            // Can jump over furniture
            if (isJumping && i.interactType !== 'GENERATOR') continue;

            const iHalf = i.size / 2;
            if (l < i.pos.x + iHalf && r > i.pos.x - iHalf && t < i.pos.y + iHalf && b > i.pos.y - iHalf) return true;
        }
    }
    return false;
  };

  const useEquippedItem = () => {
      if (exitAnimRef.current?.active || gameState !== GameState.PLAYING) return;
      if (dreadRef.current.consuming) return;
      const ps = playerStateRef.current;
      if (ps.activeNote || ps.interactingWithPinPad) return;
      if (ps.isCarryingCable) return; 

      if (ps.equippedItemIndex === -1) return;
      const item = ps.inventory[ps.equippedItemIndex];
      if (!item) return;

      if (item.itemType === ItemType.FLASHLIGHT) {
          if (ps.abilityCooldown > 0) return;
          pulseEffectRef.current = 1.0; 
          addLog("Pulse!");
          if (levelRef.current) {
            const p = playerPosRef.current;
            levelRef.current.enemies.forEach(e => {
                const dx = e.pos.x - p.x;
                const dy = e.pos.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 400) {
                    if (e.subType === EntityType.ENEMY_PHANTOM || e.subType === EntityType.ENEMY_SWARM) {
                         e.state = 'FLEEING'; 
                    } else if (e.subType === EntityType.ENEMY_SHADE) {
                        e.state = 'STUNNED'; e.stunTimer = 3000;
                    } else if (e.subType === EntityType.ENEMY_CHASER) {
                        e.state = 'STUNNED'; e.stunTimer = 5000; // Chaser stunned longer by pulse
                    }
                }
            });
          }
          setPlayerState(prev => ({ ...prev, abilityCooldown: 2000 }));
          return;
      }
      
      setPlayerState(prev => {
          if (item.itemType === ItemType.SPEED_POTION) {
            const newInv = [...prev.inventory];
            newInv.splice(prev.equippedItemIndex, 1);
            addLog("Speed Boost! (10s)");
            setTimeout(() => setPlayerState(p => ({...p, speedMultiplier: 1})), 10000);
            return { ...prev, inventory: newInv, equippedItemIndex: Math.max(0, prev.equippedItemIndex-1), speedMultiplier: 1.5 };
          }
          if (item.itemType === ItemType.INVISIBILITY_POTION) {
            const newInv = [...prev.inventory];
            newInv.splice(prev.equippedItemIndex, 1);
            addLog("Invisibility! (15s)");
            setTimeout(() => setPlayerState(p => ({...p, isInvisible: false})), 15000);
            return { ...prev, inventory: newInv, equippedItemIndex: Math.max(0, prev.equippedItemIndex-1), isInvisible: true };
          }
          if (item.itemType === ItemType.REPELLENT_POTION) {
            const newInv = [...prev.inventory];
            newInv.splice(prev.equippedItemIndex, 1);
            addLog("Repellent Active! (10s)");
            setTimeout(() => setPlayerState(p => ({...p, isRepelling: false})), 10000);
            return { ...prev, inventory: newInv, equippedItemIndex: Math.max(0, prev.equippedItemIndex-1), isRepelling: true };
          }
          if (item.itemType === ItemType.PIN_CODE) return { ...prev, activeNote: item };
          if (item.itemType === ItemType.FLASHBANG) {
            if (prev.flashbangCooldown > 0) return prev;
            const newInv = [...prev.inventory];
            newInv.splice(prev.equippedItemIndex, 1);
            globalWhiteout.current = 1.0; 
            if (levelRef.current) levelRef.current.enemies.forEach(e => { 
                if(Math.hypot(e.pos.x-playerPosRef.current.x, e.pos.y-playerPosRef.current.y) < 600) { 
                    if (e.subType === EntityType.ENEMY_CHASER) {
                        e.state = 'FLEEING'; // Chaser flees on flashbang
                    } else {
                        e.state='STUNNED'; e.stunTimer=7000; 
                    }
                } 
            });
            addLog("Flashbang Detonated!");
            return { ...prev, inventory: newInv, equippedItemIndex: Math.max(0, prev.equippedItemIndex-1), flashbangCooldown: 3000, noiseLevel: 300 };
          }
          if (item.itemType === ItemType.MEDKIT) {
             const newInv = [...prev.inventory];
             newInv.splice(prev.equippedItemIndex, 1);
             addLog("Healed.");
             return { ...prev, inventory: newInv, equippedItemIndex: Math.max(0, prev.equippedItemIndex-1), health: Math.min(prev.maxHealth, prev.health + 1) };
          }
          if (item.itemType === ItemType.FUEL || item.itemType === ItemType.BATTERY) {
            if (inElevatorRef.current) {
                const newInv = [...prev.inventory];
                newInv.splice(prev.equippedItemIndex, 1);
                // Battery now restores 7%
                const val = item.itemType === ItemType.FUEL ? 35 : (item.value || 7);
                addLog(`Elevator Charged (+${val}%)`);
                return { ...prev, inventory: newInv, equippedItemIndex: Math.max(0, prev.equippedItemIndex-1), battery: Math.min(100, prev.battery + val) };
            } else {
                addLog("Use in Elevator.");
                return prev;
            }
          }
          return prev;
      });
  };

  const dropItem = () => {
    if (playerStateRef.current.isCarryingCable) return;
    setPlayerState(prev => {
        if (prev.inventory.length === 0 || prev.equippedItemIndex === -1) return prev;
        const newInv = [...prev.inventory];
        const dropped = newInv.splice(prev.equippedItemIndex, 1)[0];
        if (levelRef.current && dropped) {
            levelRef.current.items.push({ ...dropped, pos: { ...playerPosRef.current }, type: EntityType.ITEM });
            addLog(`Dropped ${dropped.name}`);
        }
        return { ...prev, inventory: newInv, equippedItemIndex: Math.max(-1, Math.min(prev.equippedItemIndex, newInv.length - 1)) };
    });
  };

  const pickupItem = (index: number) => {
      const config = difficulty === Difficulty.CUSTOM && customConfig ? customConfig : DIFFICULTY_CONFIG[difficulty];
      const item = levelRef.current!.items[index];
      if (item.itemType === ItemType.LORE_NOTE) {
          levelRef.current!.items.splice(index, 1);
          if (item.loreId !== undefined) onLorePickup(item.loreId);
          return;
      }
      setPlayerState(prev => {
          if (prev.inventory.length >= config.maxInventory) { addLog("Inventory Full!"); return prev; }
          levelRef.current!.items.splice(index, 1);
          addLog(`Got ${item.name}`);
          return { ...prev, inventory: [...prev.inventory, item] };
      });
  };

  const triggerInteractable = (i: Interactable) => {
      const ps = playerStateRef.current;
      if (ps.isCarryingCable && i.interactType !== 'ELEVATOR_CONSOLE' && i.interactType !== 'EXIT') return; 

      if (i.interactType === 'EXIT') {
          if (!exitAnimRef.current) {
              exitAnimRef.current = { active: true, progress: 0, startPos: {...playerPosRef.current}, targetPos: i.pos };
              addLog("EXITING FACILITY...");
              triggerDialogue("EXIT_NEAR");
          }
      } else if (i.interactType === 'CLOSET') {
          if (chargingTimerRef.current > 0) {
              addLog("CANNOT HIDE - POWER SURGE");
              return;
          }
          const isEntering = !ps.isHiding;
          setPlayerState(prev => ({ ...prev, isHiding: isEntering, hidingTimer: 0 }));
          
          if (isEntering) {
              // Teleport to center
              playerPosRef.current = { x: i.pos.x, y: i.pos.y };
          } else {
              // Attempt to eject to a valid position
              const candidates = [
                  { x: i.pos.x, y: i.pos.y + 35 }, // Down
                  { x: i.pos.x, y: i.pos.y - 35 }, // Up
                  { x: i.pos.x + 35, y: i.pos.y }, // Right
                  { x: i.pos.x - 35, y: i.pos.y }  // Left
              ];
              let found = false;
              for(const c of candidates) {
                  if (!checkCollision(c.x, c.y, PLAYER_SIZE)) {
                      playerPosRef.current = c;
                      found = true;
                      break;
                  }
              }
              if (!found) {
                  // Fallback if surrounded
                  playerPosRef.current = { x: i.pos.x, y: i.pos.y + 35 };
              }
          }
          addLog(isEntering ? "Hiding..." : "Exited Closet");
      } else if (i.interactType === 'DRAWER' || i.interactType === 'CHEST') {
          i.isActive = true; 
          if (i.contents) {
              if (i.contents.itemType === ItemType.LORE_NOTE) {
                  if (i.contents.loreId !== undefined) onLorePickup(i.contents.loreId);
                  addLog("Found Lore.");
              } else {
                  levelRef.current!.items.push({ ...i.contents, pos: { x: i.pos.x + 10, y: i.pos.y + 10 } });
                  addLog("Found item.");
              }
              i.contents = undefined;
          } else addLog("Empty.");
      } else if (i.interactType === 'DOOR') {
          if (i.locked) {
              if (i.lockType === 'PIN') {
                  setPlayerState(prev => ({ ...prev, interactingWithPinPad: i }));
              } else {
                  const hasKey = ps.inventory.find(item => item.itemType === ItemType.KEY && item.value === i.lockValue);
                  if (hasKey) {
                      i.locked = false; i.isActive = true;
                      addLog("Door Unlocked.");
                  } else addLog("Locked. Need Key.");
              }
          }
      } else if (i.interactType === 'GENERATOR') {
          const hasCable = ps.inventory.some(x => x.itemType === ItemType.CABLE);
          if (hasCable && i.locked) {
               i.locked = false; i.isActive = true;
               setPlayerState(prev => ({ 
                   ...prev, 
                   inventory: prev.inventory.filter(x => x.itemType !== ItemType.CABLE), 
                   isCarryingCable: true
               }));
               addLog("Cable Connected! RETURN TO ELEVATOR!");
               levelRef.current!.enemies.forEach(e => {e.state='CHASING'; e.lastKnownPlayerPos=playerPosRef.current;});
          } else addLog(i.locked ? "Needs Cable" : "Already Active");
      } 
  };

  const interact = () => {
     if (!levelRef.current || exitAnimRef.current?.active) return;
     if (dreadRef.current.consuming) return;
     const ps = playerStateRef.current;
     if (ps.activeNote || ps.interactingWithPinPad) return; 
     
     const p = playerPosRef.current;
     const worldMouseX = mousePos.current.x + cameraOffset.current.x;
     const worldMouseY = mousePos.current.y + cameraOffset.current.y;
     
     const hoverItemIdx = levelRef.current.items.findIndex(i => Math.hypot(i.pos.x - worldMouseX, i.pos.y - worldMouseY) < 20);
     if (hoverItemIdx >= 0 && Math.hypot(levelRef.current.items[hoverItemIdx].pos.x - p.x, levelRef.current.items[hoverItemIdx].pos.y - p.y) < INTERACTION_RANGE) {
         pickupItem(hoverItemIdx); return;
     }
     // Increased detect radius for interactables (40 for mouse)
     const hoverInteract = levelRef.current.interactables.find(i => Math.hypot(i.pos.x - worldMouseX, i.pos.y - worldMouseY) < 40);
     if (hoverInteract && Math.hypot(hoverInteract.pos.x - p.x, hoverInteract.pos.y - p.y) < INTERACTION_RANGE) {
         triggerInteractable(hoverInteract); return;
     }
     const itemIndex = levelRef.current.items.findIndex(i => Math.hypot(i.pos.x - p.x, i.pos.y - p.y) < INTERACTION_RANGE);
     if (itemIndex >= 0) { pickupItem(itemIndex); return; }
     
     // Proximity Interaction
     const interactable = levelRef.current.interactables.find(i => Math.hypot(i.pos.x - p.x, i.pos.y - p.y) < INTERACTION_RANGE);
     if (interactable) triggerInteractable(interactable);
  };

  // --- Input ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (exitAnimRef.current?.active) return;
      keysPressed.current.add(e.code);
      if (e.code === 'KeyQ') dropItem();
      if (e.code === 'KeyE') interact();
      if (e.code === 'Space') {
          if (jumpRef.current.cooldown <= 0 && !playerStateRef.current.isHiding && !playerStateRef.current.isCarryingCable) {
              jumpRef.current.active = true;
              jumpRef.current.timer = 450; // Decreased jump time from 600
              jumpRef.current.cooldown = 1500;
          }
      }
      if (e.code === 'Escape') {
          if (playerStateRef.current.activeNote || playerStateRef.current.interactingWithPinPad) {
             setPlayerState(prev => ({...prev, activeNote: null, interactingWithPinPad: null}));
          } else {
             onPause(); 
          }
      }
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
          const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
          setPlayerState(prev => {
              if (idx === prev.equippedItemIndex) return { ...prev, equippedItemIndex: -1 }; 
              return { ...prev, equippedItemIndex: idx < prev.inventory.length ? idx : prev.equippedItemIndex };
          });
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
    const handleMouseMove = (e: MouseEvent) => {
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
    };
    const handleMouseDown = (e: MouseEvent) => {
        if (e.button === 0) useEquippedItem();
    };

    const handleElevatorOpen = () => { if(levelRef.current) levelRef.current.elevatorDoorOpen = true; };
    const handleElevatorClose = () => { if(levelRef.current) levelRef.current.elevatorDoorOpen = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('elevator-open', handleElevatorOpen);
    window.addEventListener('elevator-close', handleElevatorClose);
    const preventClose = (e: Event) => {
        if (dreadRef.current.state !== 'IDLE' || chargingTimerRef.current > 0) { e.stopPropagation(); addLog("ELEVATOR MALFUNCTION - CANNOT CLOSE"); }
    };
    window.addEventListener('elevator-close-attempt', preventClose);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('elevator-close-attempt', preventClose);
      window.removeEventListener('elevator-open', handleElevatorOpen);
      window.removeEventListener('elevator-close', handleElevatorClose);
    };
  }, []); 

  // --- Assets ---
  useEffect(() => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 100; pCanvas.height = 100;
      const pCtx = pCanvas.getContext('2d')!;
      pCtx.fillStyle = COLORS.FLOOR; pCtx.fillRect(0,0,100,100);
      pCtx.fillStyle = 'rgba(0,0,0,0.1)'; for(let i=0; i<15; i++) { pCtx.beginPath(); pCtx.arc(Math.random()*100, Math.random()*100, Math.random()*15, 0, Math.PI*2); pCtx.fill(); }
      floorPatternRef.current = pCanvas;

      const cCanvas = document.createElement('canvas');
      cCanvas.width = 40; cCanvas.height = 40;
      const cCtx = cCanvas.getContext('2d')!;
      cCtx.fillStyle = COLORS.ELEVATOR_CARPET; cCtx.fillRect(0,0,40,40);
      cCtx.fillStyle = 'rgba(0,0,0,0.2)'; cCtx.fillRect(0,0,20,20); cCtx.fillRect(20,20,20,20);
      carpetPatternRef.current = cCanvas;
      
      // Init overlay canvas
      if (!overlayCanvasRef.current) {
          overlayCanvasRef.current = document.createElement('canvas');
          overlayCanvasRef.current.width = CANVAS_WIDTH;
          overlayCanvasRef.current.height = CANVAS_HEIGHT;
      }
  }, []);

  // --- Level Init ---
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        if (initialLevelState && initialPlayerPos) {
            levelRef.current = initialLevelState;
            playerPosRef.current = initialPlayerPos;
        } else if (!levelRef.current || levelRef.current.floorNumber !== currentLevel) {
            const config = difficulty === Difficulty.CUSTOM && customConfig ? customConfig : DIFFICULTY_CONFIG[difficulty];
            const isSafe = (100 - currentLevel) < config.safeFloors;
            const lvl = generateLevel(currentLevel, config, isSafe, playerStateRef.current.loreCollected, difficulty);
            levelRef.current = lvl;
            const el = lvl.rooms.find(r => r.type === 'ELEVATOR');
            if (el) playerPosRef.current = { x: el.x + el.w/2, y: el.y + el.h/2 };
            dreadRef.current = { state: 'IDLE', timer: Math.random() * 60000 + 30000, affectedRooms: [], nextRoomIndex: 0, consuming: false, consumeTimer: 0 }; 
            globalRedIntensity.current = 0; globalWhiteout.current = 0; shakeIntensity.current = 0; jumpScareRef.current = 0; chargingTimerRef.current = 0; exitAnimRef.current = null;
            setPlayerState(prev => ({...prev, isCarryingCable: false}));
        }
    }
  }, [currentLevel, gameState, difficulty, initialLevelState, initialPlayerPos]);

  // --- Update Engine ---
  const updateEngine = useCallback((dt: number) => {
    if (!levelRef.current || gameState !== GameState.PLAYING) return;

    if (exitAnimRef.current?.active) {
        exitAnimRef.current.progress += dt * 0.0005; 
        if (exitAnimRef.current.progress >= 1) { setGameState('VICTORY'); }
        return; 
    }
    
    // Jump logic
    if (jumpRef.current.active) {
        jumpRef.current.timer -= dt;
        if (jumpRef.current.timer <= 0) jumpRef.current.active = false;
    }
    if (jumpRef.current.cooldown > 0) {
        jumpRef.current.cooldown -= dt;
    }
    
    const ps = playerStateRef.current;
    if (ps.activeNote || ps.interactingWithPinPad) return; 

    // Dread Consuming Logic (Propagates through rooms)
    if (!inElevatorRef.current && currentLevel < 95) { 
        dreadRef.current.timer -= dt;
        
        if (dreadRef.current.state === 'IDLE' && dreadRef.current.timer <= 0) {
            dreadRef.current.state = 'WARNING'; dreadRef.current.timer = 5000;
            addLog("!!! SOMETHING IS COMING !!!"); triggerDialogue("DREAD_START");
        } 
        else if (dreadRef.current.state === 'WARNING') {
             const progress = 1 - (dreadRef.current.timer / 5000); shakeIntensity.current = 5 + (progress * 25);
             if (dreadRef.current.timer <= 0) {
                dreadRef.current.state = 'KILL';
                const rooms = [...levelRef.current.rooms].filter(r => r.type !== 'ELEVATOR');
                for (let i = rooms.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [rooms[i], rooms[j]] = [rooms[j], rooms[i]];
                }
                dreadRef.current.affectedRooms = rooms; 
                dreadRef.current.nextRoomIndex = 0;
                dreadRef.current.consumeTimer = 0;
            }
        } 
        else if (dreadRef.current.state === 'KILL') {
            shakeIntensity.current = 8;
            dreadRef.current.consumeTimer += dt;
            
            if (dreadRef.current.consumeTimer > 1500) {
                dreadRef.current.consumeTimer = 0;
                dreadRef.current.nextRoomIndex++;
            }

            const activeRoomCount = dreadRef.current.nextRoomIndex + 1;
            
            // Check if player is in a consumed room
            const p = playerPosRef.current;
            for(let i=0; i<activeRoomCount && i<dreadRef.current.affectedRooms.length; i++) {
                const r = dreadRef.current.affectedRooms[i];
                if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) {
                    if (!ps.isHiding) {
                        setDeathReason("CONSUMED BY THE DREAD");
                        setGameState('GAME_OVER');
                        return;
                    }
                }
            }

            if (dreadRef.current.nextRoomIndex >= dreadRef.current.affectedRooms.length + 5) {
                dreadRef.current.state = 'IDLE'; 
                dreadRef.current.timer = Math.random() * 60000 + 40000; 
                shakeIntensity.current = 0; 
                addLog("The presence fades...");
            }
        }
    } else {
        dreadRef.current.state = 'IDLE'; shakeIntensity.current = 0;
    }

    if (ps.health <= 0) { setDeathReason("VITAL SIGNS LOST"); setGameState('GAME_OVER'); return; }
    if (ps.battery <= 0) { setDeathReason("POWER FAILURE"); setGameState('GAME_OVER'); return; }

    if (globalRedIntensity.current > 0) globalRedIntensity.current = Math.max(0, globalRedIntensity.current - dt * 0.002);
    if (globalWhiteout.current > 0) globalWhiteout.current = Math.max(0, globalWhiteout.current - dt * 0.003); 

    const p = playerPosRef.current;
    
    // FOV Animation
    const targetFov = ps.movementMode === 'RUN' ? 0.75 : ps.movementMode === 'CROUCH' ? 1.35 : 1.0;
    const fovSpeed = 0.005;
    currentFovRef.current += (targetFov - currentFovRef.current) * dt * fovSpeed;

    // Automatic exit disabled, use 'E' interaction
    if (currentLevel === 1) {
        const exit = levelRef.current.interactables.find(i => i.interactType === 'EXIT');
        if (exit && !ps.isHiding) {
             const dist = Math.hypot(p.x - exit.pos.x, p.y - exit.pos.y);
             if (dist < 60) {
                 triggerDialogue("EXIT_NEAR");
             }
        }
    }
    
    const elRoom = levelRef.current.rooms.find(r => r.type === 'ELEVATOR');
    let isInElevator = false;
    let playerRoomId = 'unknown';
    
    const pRoom = levelRef.current.rooms.find(r => 
        p.x >= r.x && p.x <= r.x + r.w && 
        p.y >= r.y && p.y <= r.y + r.h
    );
    if (pRoom) playerRoomId = pRoom.id;

    if (elRoom && !ps.isHiding) {
        if (p.x > elRoom.x && p.x < elRoom.x + elRoom.w && p.y > elRoom.y && p.y < elRoom.y + elRoom.h) isInElevator = true;
    }
    if (isInElevator !== inElevatorRef.current) {
        inElevatorRef.current = isInElevator;
        onElevatorStatusChange(isInElevator);
    }

    if (ps.isCarryingCable && isInElevator) {
        setPlayerState(prev => ({ ...prev, isCarryingCable: false }));
        chargingTimerRef.current = 10000; 
        addLog("CHARGING INITIATED... DEFEND THE ELEVATOR!");
        levelRef.current.elevatorDoorOpen = true; 
        levelRef.current.enemies.forEach(e => { e.state = 'CHASING'; e.detectionRadius = 10000; e.lastKnownPlayerPos = {...p}; });
    }

    if (chargingTimerRef.current > 0) {
        chargingTimerRef.current -= dt;
        levelRef.current.elevatorDoorOpen = true; 
        if (Math.random() < 0.1) shakeIntensity.current = 2; 
        if (chargingTimerRef.current <= 0) { setPlayerState(prev => ({ ...prev, battery: Math.min(100, prev.battery + 60) })); addLog("CHARGING COMPLETE."); }
    }

    if (ps.isHiding) {
        setPlayerState(prev => {
            const t = prev.hidingTimer + dt;
            if (t > 15000) { 
                addLog("FOUND YOU!");
                jumpScareRef.current = 1000; // Trigger Jumpscare
                return { ...prev, isHiding: false, health: prev.health - 1, hidingTimer: 0 };
            }
            return { ...prev, hidingTimer: t };
        });
        if (ps.hidingTimer > 10000 && Math.random() < 0.1) shakeIntensity.current = 5; 
    }
    
    if (jumpScareRef.current > 0) jumpScareRef.current -= dt;

    if (!ps.isHiding) {
        // Reduced base speed from 2 to 1.6
        let speed = 0.9 * (ps.speedMultiplier || 1);
        const hasCable = ps.inventory.some(i => i.itemType === ItemType.CABLE);
        if (ps.isCarryingCable) { speed *= 0.5; setPlayerState(s => s.movementMode !== 'WALK' ? {...s, movementMode: 'WALK', noiseLevel: 100} : {...s, noiseLevel: 100}); } 
        else {
             if (keysPressed.current.has('ShiftLeft') && !hasCable) { speed *= 1.5; setPlayerState(s => s.movementMode !== 'RUN' ? {...s, movementMode: 'RUN'} : s); }
             else if (keysPressed.current.has('KeyC')) { speed *= 0.5; setPlayerState(s => s.movementMode !== 'CROUCH' ? {...s, movementMode: 'CROUCH'} : s); }
             else setPlayerState(s => s.movementMode !== 'WALK' ? {...s, movementMode: 'WALK'} : s);
        }

        let dx = 0, dy = 0;
        if (keysPressed.current.has('KeyW')) dy -= 1;
        if (keysPressed.current.has('KeyS')) dy += 1;
        if (keysPressed.current.has('KeyA')) dx -= 1;
        if (keysPressed.current.has('KeyD')) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy); dx = (dx / len) * speed; dy = (dy / len) * speed;
            if (!checkCollision(p.x + dx, p.y, PLAYER_SIZE)) p.x += dx;
            if (!checkCollision(p.x, p.y + dy, PLAYER_SIZE)) p.y += dy;
            walkingTimerRef.current += dt; 
        }
        
        setPlayerState(prev => {
            let changed = false;
            let newCooldown = Math.max(0, prev.flashbangCooldown - dt);
            let newAbilityCd = Math.max(0, prev.abilityCooldown - dt);
            if (newCooldown !== prev.flashbangCooldown || newAbilityCd !== prev.abilityCooldown) changed = true;
            let newBattery = prev.battery;
            if (chargingTimerRef.current <= 0 && Math.random() < DIFFICULTY_CONFIG[difficulty].batteryDrain) { newBattery = Math.max(0, prev.battery - 0.1); changed = true; }
            if (!changed) return prev;
            return { ...prev, flashbangCooldown: newCooldown, abilityCooldown: newAbilityCd, battery: newBattery };
        });

        if (pulseEffectRef.current > 0) pulseEffectRef.current = Math.max(0, pulseEffectRef.current - dt * 0.002);
        if (shakeIntensity.current > 0) shakeIntensity.current = Math.max(0, shakeIntensity.current - dt * 0.05);

        const targetCamX = p.x - CANVAS_WIDTH / 2;
        const targetCamY = p.y - CANVAS_HEIGHT / 2;
        cameraOffset.current.x += (targetCamX - cameraOffset.current.x) * 0.1;
        cameraOffset.current.y += (targetCamY - cameraOffset.current.y) * 0.1;

        const wMouseX = mousePos.current.x + cameraOffset.current.x;
        const wMouseY = mousePos.current.y + cameraOffset.current.y;
        const lookAngle = Math.atan2(wMouseY - p.y, wMouseX - p.x);
        
        const flashlightActive = ps.isCarryingCable ? true : (ps.flashlightOn && !ps.isHiding && ps.equippedItemIndex !== -1 && ps.inventory[ps.equippedItemIndex]?.itemType === ItemType.FLASHLIGHT);
        const flashlightDist = ps.isCarryingCable ? FLASHLIGHT_DISTANCE * 0.6 : FLASHLIGHT_DISTANCE;

        levelRef.current.enemies.forEach(enemy => {
             if (enemy.state === 'DYING') return;
             
             // Fleeing Logic
             if (enemy.state === 'FLEEING') {
                 const angle = Math.atan2(enemy.pos.y - p.y, enemy.pos.x - p.x); 
                 enemy.pos.x += Math.cos(angle) * enemy.speed * 2; 
                 enemy.pos.y += Math.sin(angle) * enemy.speed * 2;
                 return;
             }

             if (enemy.stunTimer > 0) { 
                 enemy.stunTimer -= dt; 
                 if (enemy.stunTimer <= 0) enemy.state = 'IDLE'; 
                 return; 
             }

             const dist = Math.hypot(p.x - enemy.pos.x, p.y - enemy.pos.y);
             
             // Repellent Logic
             if (ps.isRepelling && dist < 300) {
                 enemy.state = 'FLEEING';
                 enemy.stunTimer = 1000; // Brief flee state re-evaluated constantly
                 return;
             }

             let isLit = false;
             if (flashlightActive) {
                const angleToEnemy = Math.atan2(enemy.pos.y - p.y, enemy.pos.x - p.x);
                let angleDiff = Math.abs(angleToEnemy - lookAngle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                if (dist < flashlightDist && angleDiff < FLASHLIGHT_ANGLE) {
                    if (!checkCollision((p.x+enemy.pos.x)/2, (p.y+enemy.pos.y)/2, 1)) isLit = true;
                }
             }

             let currentSpeed = enemy.speed;
             let detectionRange = enemy.detectionRadius || 300;
             
             // Invisibility Logic
             if (ps.isInvisible) {
                 if (enemy.subType === EntityType.ENEMY_LURKER) {
                     // Lurker is Sound Sensitive, reduced detection but not zero
                     detectionRange *= 0.5;
                 } else {
                     // Visual enemies (Chaser, Shade, Phantom, Swarm) ignore unless extremely close
                     detectionRange = 20; 
                 }
             }

             // Enemy Specific Logic
             if (enemy.subType === EntityType.ENEMY_SWARM) {
                 if (flashlightActive && Math.hypot(enemy.pos.x - wMouseX, enemy.pos.y - wMouseY) < 50) {
                     enemy.exposureTime = (enemy.exposureTime || 0) + dt; currentSpeed *= 0.2; 
                     if (enemy.exposureTime > 1500) { enemy.state = 'FLEEING'; addLog("Swarm dispersed."); }
                 } else enemy.exposureTime = Math.max(0, (enemy.exposureTime || 0) - dt);
                 if (enemy.roomId === playerRoomId && ps.noiseLevel > 20) enemy.state = 'CHASING';
             } else if (enemy.subType === EntityType.ENEMY_SHADE) {
                 // Shade is room limited
                 if (isLit) return; 
                 if (enemy.roomId === playerRoomId && !isInElevator) enemy.state = 'CHASING'; else enemy.state = 'IDLE';
             } else if (enemy.subType === EntityType.ENEMY_LURKER) {
                 // Lurker is room limited
                 if (enemy.roomId === playerRoomId && !isInElevator && (dist < detectionRange || ps.noiseLevel > 20)) enemy.state = 'CHASING'; else enemy.state = 'IDLE';
             } else if (enemy.subType === EntityType.ENEMY_PHANTOM || enemy.subType === EntityType.ENEMY_CHASER) {
                 if (dist < detectionRange) enemy.state = 'CHASING'; else enemy.state = 'IDLE';
             }

             if (enemy.state === 'IDLE' && Math.random() < 0.02) {
                 const angle = Math.random() * Math.PI * 2;
                 const wx = Math.cos(angle) * 10; const wy = Math.sin(angle) * 10;
                 if (!checkCollision(enemy.pos.x + wx, enemy.pos.y + wy, enemy.size)) { enemy.pos.x += wx; enemy.pos.y += wy; }
             }

             if (enemy.state === 'CHASING') {
                 const angle = Math.atan2(p.y - enemy.pos.y, p.x - enemy.pos.x);
                 const spd = currentSpeed || 1.5;
                 const mx = Math.cos(angle) * spd; const my = Math.sin(angle) * spd;
                 if (!checkCollision(enemy.pos.x + mx, enemy.pos.y, enemy.size)) enemy.pos.x += mx;
                 if (!checkCollision(enemy.pos.x, enemy.pos.y + my, enemy.size)) enemy.pos.y += my;
                 
                 if (dist < 25) {
                     setPlayerState(prev => ({...prev, health: prev.health - 1})); 
                     enemy.state = 'FLEEING'; addLog("IT HURTS!");
                     shakeIntensity.current = 5;
                     globalRedIntensity.current = 1.0;
                 }
             }
        });
    }
  }, [currentLevel, difficulty, gameState, addLog, setGameState, setPlayerState, triggerDialogue, setDeathReason, onElevatorStatusChange]);

  // --- Game Loop ---
  useEffect(() => {
    let animationFrameId: number;
    const loop = (time: number) => {
        if (lastTimeRef.current === 0) lastTimeRef.current = time;
        const dt = time - lastTimeRef.current;
        lastTimeRef.current = time;
        
        updateEngine(dt);
        render(); // Explicit call to render
        
        animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [updateEngine]);

  const drawItemIcon = (ctx: CanvasRenderingContext2D, type: ItemType) => {
      ctx.save();
      if (type === ItemType.BATTERY) { ctx.fillStyle = '#22c55e'; ctx.fillRect(-4,-6,8,12); ctx.fillStyle = '#fff'; ctx.fillRect(-2,-2,4,4); }
      else if (type === ItemType.FUEL) { ctx.fillStyle = '#dc2626'; ctx.fillRect(-5,-6,10,12); }
      else if (type === ItemType.KEY) { ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.arc(-2,0,3,0,Math.PI*2); ctx.fill(); ctx.fillRect(0,-1,6,2); }
      else if (type === ItemType.MEDKIT) { ctx.fillStyle = '#fff'; ctx.fillRect(-5,-5,10,10); ctx.fillStyle='red'; ctx.fillRect(-1.5,-4,3,8); ctx.fillRect(-4,-1.5,8,3); }
      else if (type === ItemType.FLASHLIGHT) { ctx.fillStyle = '#555'; ctx.fillRect(-4,-2,8,4); ctx.fillStyle='#fbbf24'; ctx.fillRect(4,-2,2,4); }
      else if (type === ItemType.CABLE) { ctx.strokeStyle = '#eab308'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*1.5); ctx.stroke(); }
      else if (type === ItemType.SPEED_POTION) { ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(4,3); ctx.lineTo(-4,3); ctx.fill(); }
      else if (type === ItemType.INVISIBILITY_POTION) { ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-2,-2,2,0,Math.PI*2); ctx.fill(); }
      else if (type === ItemType.REPELLENT_POTION) { ctx.fillStyle = '#84cc16'; ctx.fillRect(-4,-5,8,10); ctx.fillStyle='#000'; ctx.font='8px monospace'; ctx.fillText('X',-2,3); }
      else if (type === ItemType.FLASHBANG) { ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle='red'; ctx.beginPath(); ctx.arc(0,-3,1,0,Math.PI*2); ctx.fill(); }
      else if (type === ItemType.PIN_CODE || type === ItemType.LORE_NOTE) { ctx.fillStyle = type === ItemType.LORE_NOTE ? '#a855f7' : '#fef3c7'; ctx.fillRect(-3,-4,6,8); }
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
  };

  const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !levelRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const ps = playerStateRef.current;
      const p = playerPosRef.current;

      // Clear Main Canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      // Apply Camera & Shake
      let shakeX = 0, shakeY = 0;
      if (shakeIntensity.current > 0) { shakeX = (Math.random()-0.5)*shakeIntensity.current; shakeY = (Math.random()-0.5)*shakeIntensity.current; }
      
      const fov = currentFovRef.current;
      const centerX = CANVAS_WIDTH / 2;
      const centerY = CANVAS_HEIGHT / 2;
      
      ctx.translate(centerX, centerY);
      ctx.scale(fov, fov);
      ctx.translate(-centerX, -centerY);
      
      ctx.translate(-cameraOffset.current.x + shakeX, -cameraOffset.current.y + shakeY);
      
      // Background
      const ptrn = floorPatternRef.current ? ctx.createPattern(floorPatternRef.current, 'repeat') : COLORS.FLOOR;
      const carp = carpetPatternRef.current ? ctx.createPattern(carpetPatternRef.current, 'repeat') : COLORS.ELEVATOR_CARPET;

      levelRef.current.rooms.forEach(room => {
          if (room.type === 'ELEVATOR') ctx.fillStyle = carp || COLORS.ELEVATOR_CARPET;
          else if (room.type === 'HALLWAY') ctx.fillStyle = '#262626';
          else ctx.fillStyle = ptrn || COLORS.FLOOR;
          ctx.fillRect(room.x, room.y, room.w, room.h);
      });
      
      // Draw Dread Corruption
      if (dreadRef.current.state === 'KILL' && dreadRef.current.affectedRooms.length > 0) {
          ctx.fillStyle = '#1a0505'; // Dark corrupted color
          const activeIndex = dreadRef.current.nextRoomIndex;
          
          dreadRef.current.affectedRooms.forEach((room, idx) => {
              if (idx <= activeIndex) {
                  // Fully corrupted
                  ctx.fillRect(room.x, room.y, room.w, room.h);
                  
                  // Active leading edge pulsates
                  if (idx === activeIndex) {
                      ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.sin(Date.now() / 100) * 0.1})`;
                      ctx.fillRect(room.x, room.y, room.w, room.h);
                      ctx.fillStyle = '#1a0505'; // Reset for next loop
                  }
              }
          });
      }

      levelRef.current.walls.forEach(wall => {
        ctx.fillStyle = COLORS.WALL; ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = COLORS.WALL_TOP; ctx.fillRect(wall.x, wall.y, wall.w, 4);
      });

      levelRef.current.interactables.forEach(i => {
          if (i.interactType === 'CLOSET') {
            ctx.fillStyle = '#3f3f46'; ctx.fillRect(i.pos.x - 20, i.pos.y - 10, 40, 30);
            ctx.fillStyle = '#000'; ctx.fillRect(i.pos.x - 1, i.pos.y - 10, 2, 30); 
            ctx.fillStyle = '#52525b'; ctx.fillRect(i.pos.x - 15, i.pos.y, 4, 8); ctx.fillRect(i.pos.x + 11, i.pos.y, 4, 8); 
          } else if (i.interactType === 'DRAWER') {
            ctx.fillStyle = i.color; ctx.fillRect(i.pos.x-15, i.pos.y-10, 30, 20);
            ctx.fillStyle = '#451a03'; ctx.fillRect(i.pos.x-10, i.pos.y-8, 20, 16); 
            ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(i.pos.x, i.pos.y, 2, 0, Math.PI*2); ctx.fill(); 
            if(i.isActive) { ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(i.pos.x-15, i.pos.y-10, 30, 20); }
          } else if (i.interactType === 'CHEST') {
            ctx.fillStyle = i.color; ctx.fillRect(i.pos.x-15, i.pos.y-15, 30, 30);
            ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 3; ctx.strokeRect(i.pos.x-15, i.pos.y-15, 30, 30); 
            if(i.isActive) { ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(i.pos.x-15, i.pos.y-15, 30, 30); }
          } else if (i.interactType === 'DOOR') {
            if (i.locked) {
                ctx.fillStyle = '#7f1d1d'; ctx.fillRect(i.pos.x-i.size/2, i.pos.y-5, i.size, 10);
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(i.pos.x, i.pos.y, 6, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#ef4444'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(i.pos.x, i.pos.y-2, 3, Math.PI, 0); ctx.stroke();
            }
          } else if (i.interactType === 'EXIT') {
              ctx.shadowColor = '#fff'; ctx.shadowBlur = 20;
              ctx.fillStyle = '#fff'; ctx.fillRect(i.pos.x - 25, i.pos.y - 15, 50, 40); ctx.shadowBlur = 0;
              ctx.fillStyle = '#000'; ctx.fillRect(i.pos.x - 20, i.pos.y - 30, 40, 15);
              ctx.fillStyle = '#0f0'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText('EXIT', i.pos.x, i.pos.y - 19);
          } else if (i.interactType === 'GENERATOR') {
             ctx.fillStyle = i.color; ctx.fillRect(i.pos.x-20, i.pos.y-20, 40, 40);
             ctx.fillStyle = '#222'; ctx.fillRect(i.pos.x-15, i.pos.y-15, 30, 30);
             ctx.fillStyle = i.locked ? '#ef4444' : '#22c55e'; ctx.beginPath(); ctx.arc(i.pos.x, i.pos.y - 5, 4, 0, Math.PI*2); ctx.fill();
          }
      });

      levelRef.current.items.forEach(i => {
          ctx.save(); ctx.translate(i.pos.x, i.pos.y); ctx.scale(1.5, 1.5);
          drawItemIcon(ctx, i.itemType);
          ctx.restore();
      });

      // Updated Enemy Rendering with more detail/animation
      levelRef.current.enemies.forEach(e => {
        ctx.save(); ctx.translate(e.pos.x, e.pos.y);
        const time = Date.now();
        if (e.subType === EntityType.ENEMY_LURKER) {
            // Twitchy movement
            const twitchX = Math.random() * 2 - 1;
            const twitchY = Math.random() * 2 - 1;
            ctx.translate(twitchX, twitchY);
            ctx.fillStyle = '#2e1065'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 2; 
            for(let i=0; i<8; i++) { 
                const angle = (i/8)*Math.PI*2 + (time/500); 
                const len = 15+Math.sin(time/100+i*2)*8; 
                ctx.beginPath(); ctx.moveTo(Math.cos(angle)*5, Math.sin(angle)*5); ctx.lineTo(Math.cos(angle)*len, Math.sin(angle)*len); ctx.stroke(); 
            }
            // Eyes
            ctx.fillStyle = '#fff'; ctx.fillRect(-4, -4, 2, 2); ctx.fillRect(2, -4, 2, 2);
        } else if (e.subType === EntityType.ENEMY_SHADE) {
            // Smoky
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; 
            for(let i=0; i<6; i++) {
                const angle = (i/6)*Math.PI*2 + time/2000;
                const r = 10 + Math.sin(time/500 + i)*5;
                ctx.beginPath(); ctx.arc(Math.cos(angle)*r*0.5, Math.sin(angle)*r*0.5, r, 0, Math.PI*2); ctx.fill();
            }
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
        } else if (e.subType === EntityType.ENEMY_PHANTOM) {
            ctx.globalAlpha = 0.5 + Math.sin(time/500)*0.2;
            ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill(); 
            ctx.strokeStyle = '#fff'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.stroke();
            ctx.globalAlpha = 1;
        } else if (e.subType === EntityType.ENEMY_SWARM) {
             ctx.fillStyle = '#a16207'; 
             for(let i=0; i<7; i++) { 
                 const bx = Math.sin(time/150 + i)*8; 
                 const by = Math.cos(time/150 + i*2)*8; 
                 ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI*2); ctx.fill(); 
             }
        } else {
            // Chaser - Pulsing aggressive red
            const pulse = 1 + Math.sin(time/100)*0.1;
            ctx.scale(pulse, pulse);
            ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); 
            const spikes = 12; 
            for(let i=0; i<spikes*2; i++) { 
                const r = i%2===0 ? 12 : 20; 
                const angle = (i/(spikes*2)) * Math.PI*2 + (time/300); 
                ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r); 
            } 
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
      });

      // Player
      if (!ps.isHiding) {
           ctx.save();
           ctx.translate(playerPosRef.current.x, playerPosRef.current.y);
           const angle = Math.atan2(mousePos.current.y + cameraOffset.current.x - playerPosRef.current.x, mousePos.current.x + cameraOffset.current.x - playerPosRef.current.x);
           ctx.rotate(angle);
           if (exitAnimRef.current?.active) { const s = 1 - exitAnimRef.current.progress; ctx.scale(s, s); }
           
           // Jump Effect
           if (jumpRef.current.active) {
                ctx.scale(1.2, 1.2);
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetY = 15;
           }

           // Leg Animation
           if (walkingTimerRef.current % 300 < 150 && (keysPressed.current.size > 0)) {
               ctx.fillStyle = '#78350f'; 
               ctx.beginPath(); ctx.ellipse(5, 5, 4, 8, 0, 0, Math.PI*2); ctx.fill();
               ctx.beginPath(); ctx.ellipse(5, -5, 4, 8, 0, 0, Math.PI*2); ctx.fill();
           } else {
               ctx.fillStyle = '#78350f'; 
               ctx.beginPath(); ctx.ellipse(-5, 5, 4, 8, 0, 0, Math.PI*2); ctx.fill();
               ctx.beginPath(); ctx.ellipse(-5, -5, 4, 8, 0, 0, Math.PI*2); ctx.fill();
           }

           ctx.fillStyle = ps.isInvisible ? 'rgba(253, 186, 116, 0.4)' : COLORS.PLAYER; 
           ctx.beginPath(); ctx.arc(0,0, 9, 0, Math.PI*2); ctx.fill(); 
           ctx.fillStyle = '#fdba74'; ctx.beginPath(); ctx.arc(10, 8, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10, -8, 3, 0, Math.PI*2); ctx.fill();
           const equipped = playerState.inventory[playerState.equippedItemIndex];
           if (equipped && equipped.itemType === ItemType.FLASHLIGHT) {
                ctx.fillStyle = '#444'; ctx.fillRect(8, 4, 12, 6); 
           } else if (equipped) { ctx.save(); ctx.translate(12, 4); drawItemIcon(ctx, equipped.itemType); ctx.restore(); }
           ctx.restore();
      }
      
      ctx.restore(); // Restore Camera Transform for Overlay

      // --- LIGHTING OVERLAY (Offscreen) ---
      const oCtx = overlayCanvasRef.current?.getContext('2d');
      if (oCtx && overlayCanvasRef.current) {
          oCtx.globalCompositeOperation = 'source-over';
          // Clear overlay
          const darknessAlpha = currentLevel === 1 ? 0.6 : 0.95;
          oCtx.fillStyle = `rgba(0,0,0,${darknessAlpha})`;
          oCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          
          oCtx.save();
          // Apply Camera Transform to Overlay Context
          oCtx.translate(centerX, centerY);
          oCtx.scale(fov, fov);
          oCtx.translate(-centerX, -centerY);
          oCtx.translate(-cameraOffset.current.x + shakeX, -cameraOffset.current.y + shakeY);

          oCtx.globalCompositeOperation = 'destination-out';
          
          const elRoom = levelRef.current.rooms.find(r => r.type === 'ELEVATOR');
          if (elRoom) { oCtx.fillStyle = '#fff'; oCtx.fillRect(elRoom.x, elRoom.y, elRoom.w, elRoom.h); }

          const lightOn = !ps.isHiding && ps.isCarryingCable || (ps.flashlightOn && !ps.isHiding && ps.equippedItemIndex !== -1 && ps.inventory[ps.equippedItemIndex]?.itemType === ItemType.FLASHLIGHT);
          
          const wMouseX = mousePos.current.x + cameraOffset.current.x;
          const wMouseY = mousePos.current.y + cameraOffset.current.y;
          const lookAngle = Math.atan2(wMouseY - p.y, wMouseX - p.x);
          
          const blockers = [...levelRef.current.walls];
          levelRef.current.interactables.forEach(i => { if (i.interactType === 'DOOR' && i.locked) blockers.push({x: i.pos.x - i.size/2, y: i.pos.y - 5, w: i.size, h: 10}); });

          if (lightOn) {
              const combinedPoints: Position[] = [];
              const startA = lookAngle - FLASHLIGHT_ANGLE;
              const endA = lookAngle + FLASHLIGHT_ANGLE;
              const step = 0.01; // Higher resolution for smoother raycasting
              const epsilon = 0.5; // Tolerance for wall collision to avoid light leaking through seams

              for (let a = startA; a <= endA; a += step) {
                 let dx = Math.cos(a), dy = Math.sin(a);
                 let closest = FLASHLIGHT_DISTANCE;
                 
                 for(const w of blockers) {
                     // Check Vertical Intersections (x = w.x and x = w.x + w.w)
                     if (dx !== 0) {
                         // Left Wall Edge
                         let t = (w.x - p.x) / dx;
                         if (t > 0 && t < closest) {
                             const hitY = p.y + t * dy;
                             if (hitY >= w.y - epsilon && hitY <= w.y + w.h + epsilon) closest = t;
                         }
                         // Right Wall Edge
                         t = (w.x + w.w - p.x) / dx;
                         if (t > 0 && t < closest) {
                             const hitY = p.y + t * dy;
                             if (hitY >= w.y - epsilon && hitY <= w.y + w.h + epsilon) closest = t;
                         }
                     }
                     
                     // Check Horizontal Intersections (y = w.y and y = w.y + w.h)
                     if (dy !== 0) {
                         // Top Wall Edge
                         let t = (w.y - p.y) / dy;
                         if (t > 0 && t < closest) {
                             const hitX = p.x + t * dx;
                             if (hitX >= w.x - epsilon && hitX <= w.x + w.w + epsilon) closest = t;
                         }
                         // Bottom Wall Edge
                         t = (w.y + w.h - p.y) / dy;
                         if (t > 0 && t < closest) {
                             const hitX = p.x + t * dx;
                             if (hitX >= w.x - epsilon && hitX <= w.x + w.w + epsilon) closest = t;
                         }
                     }
                 }
                 combinedPoints.push({x: p.x + dx * closest, y: p.y + dy * closest});
              }
              
              if (combinedPoints.length > 0) {
                  oCtx.beginPath(); oCtx.moveTo(p.x, p.y); 
                  combinedPoints.forEach(pt => oCtx.lineTo(pt.x, pt.y)); 
                  oCtx.lineTo(p.x, p.y);
                  oCtx.fill();
              }
          }

          // Player Halo (Always Visible)
          const haloGrd = oCtx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 60);
          haloGrd.addColorStop(0, "rgba(255,255,255,1)");
          haloGrd.addColorStop(1, "rgba(255,255,255,0)");
          oCtx.fillStyle = haloGrd; oCtx.beginPath(); oCtx.arc(p.x, p.y, 60, 0, Math.PI*2); oCtx.fill();

          if (pulseEffectRef.current > 0) {
              oCtx.beginPath();
              oCtx.arc(p.x, p.y, pulseEffectRef.current * 400, 0, Math.PI*2);
              oCtx.lineWidth = 40;
              oCtx.strokeStyle = `rgba(255, 255, 255, ${pulseEffectRef.current})`;
              oCtx.stroke();
          }

          if (exitAnimRef.current?.active) { oCtx.fillStyle = '#fff'; oCtx.beginPath(); oCtx.arc(playerPosRef.current.x, playerPosRef.current.y, 200 * exitAnimRef.current.progress + 50, 0, Math.PI*2); oCtx.fill(); }
          
          oCtx.restore(); // Restore overlay transform
          
          // Draw Overlay to Main Canvas
          ctx.drawImage(overlayCanvasRef.current, 0, 0);
      }

      if (globalWhiteout.current > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${globalWhiteout.current})`; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }
      if (globalRedIntensity.current > 0) { ctx.fillStyle = `rgba(100, 0, 0, ${globalRedIntensity.current})`; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }

      const healthRatio = ps.health / ps.maxHealth;
      const batteryRatio = ps.battery / 100;
      const danger = 1 - Math.min(healthRatio, batteryRatio);
      if (danger > 0.3) {
          const vig = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH/3, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH);
          vig.addColorStop(0, "rgba(0,0,0,0)");
          vig.addColorStop(1, `rgba(0,0,0,${danger * 0.9})`);
          ctx.fillStyle = vig;
          ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      if (jumpScareRef.current > 0) {
          ctx.fillStyle = '#000'; ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.fillStyle = '#fff'; 
          ctx.font = '100px Impact'; ctx.textAlign = 'center'; ctx.textBaseline='middle';
          const shake = (Math.random()-0.5)*50;
          ctx.fillText("RUN", CANVAS_WIDTH/2 + shake, CANVAS_HEIGHT/2 + shake);
      }

      if (!ps.isHiding && !exitAnimRef.current?.active && !dreadRef.current.consuming) {
        // Use raw mouse pos for HUD hit testing logic
        const mx = mousePos.current.x;
        const my = mousePos.current.y;
        const wx = mx + cameraOffset.current.x;
        const wy = my + cameraOffset.current.y;

        const hoverItem = levelRef.current.items.find(i => Math.hypot(i.pos.x - wx, i.pos.y - wy) < 20);
        if (hoverItem && Math.hypot(hoverItem.pos.x - p.x, hoverItem.pos.y - p.y) < INTERACTION_RANGE) { 
            ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign='center';
            ctx.fillText(`${hoverItem.name} [E]`, mx, my + 25); 
        }
        
        const hoverInt = levelRef.current.interactables.find(i => Math.hypot(i.pos.x - wx, i.pos.y - wy) < 30);
        if (hoverInt && Math.hypot(hoverInt.pos.x - p.x, hoverInt.pos.y - p.y) < INTERACTION_RANGE) {
            ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign='center';
            let label = "Interact [E]";
            if (playerState.isCarryingCable) label = (hoverInt.interactType === 'ELEVATOR_CONSOLE' || hoverInt.interactType === 'EXIT') ? "Interact [E]" : "";
            if (!playerState.isCarryingCable) {
                if (hoverInt.interactType === 'CLOSET') label = "Hide [E]";
                else if (hoverInt.interactType === 'DRAWER') label = hoverInt.isActive ? (hoverInt.contents ? "" : "Empty") : "Search [E]";
                else if (hoverInt.interactType === 'CHEST') label = hoverInt.isActive ? (hoverInt.contents ? "" : "Empty") : "Open [E]";
                else if (hoverInt.interactType === 'DOOR') label = hoverInt.locked ? "Locked" : "Open";
                else if (hoverInt.interactType === 'EXIT') label = "Escape [E]"; 
                else if (hoverInt.interactType === 'GENERATOR') label = hoverInt.locked ? "Insert Cable [E]" : "Active";
            }
            if (label) ctx.fillText(label, mx, my + 25);
            
            // Draw Icon Overlay for found contents
            if ((hoverInt.interactType === 'DRAWER' || hoverInt.interactType === 'CHEST') && hoverInt.isActive && hoverInt.contents) {
                ctx.save(); ctx.translate(hoverInt.pos.x - cameraOffset.current.x + shakeX + (CANVAS_WIDTH/2)*(1-fov) + centerX*(fov-1), hoverInt.pos.y - cameraOffset.current.y + shakeY + (CANVAS_HEIGHT/2)*(1-fov) + centerY*(fov-1)); 
                // Note: The translation above is rough approximation for world-to-screen if using FOV scaling. 
                // Actually easier to just draw world space before overlay?
                // Let's draw this in world space pass actually. 
                // Since this block is HUD, let's keep text here.
                ctx.restore();
            }
        }
    }
    
    if (chargingTimerRef.current > 0) {
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.fillText("CHARGING IN PROGRESS", CANVAS_WIDTH/2, 100);
        ctx.fillStyle = '#000'; ctx.fillRect(CANVAS_WIDTH/2 - 100, 110, 200, 10);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(CANVAS_WIDTH/2 - 100, 110, 200 * (1 - chargingTimerRef.current/10000), 10);
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    const loop = (time: number) => {
        if (lastTimeRef.current === 0) lastTimeRef.current = time;
        const dt = time - lastTimeRef.current;
        lastTimeRef.current = time;
        
        updateEngine(dt);
        render(); // Explicit call to render
        
        animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [updateEngine]);

  return (
    <div className="relative">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border-4 border-[#3f2e2a] bg-black cursor-crosshair rounded shadow-2xl" />
        {playerState.activeNote && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#fef3c7] text-black p-8 rounded shadow-xl rotate-1 max-w-sm">
                <p className="font-serif italic mb-4 text-lg">"The code is..."</p>
                <h2 className="text-4xl font-bold font-mono text-center border-2 border-black p-2">{playerState.activeNote.value}</h2>
                <button onClick={() => setPlayerState(p => ({...p, activeNote: null}))} className="mt-4 w-full bg-stone-800 text-white py-1 rounded">Put Away</button>
            </div>
        )}
        {playerState.interactingWithPinPad && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-800 p-6 rounded border-2 border-stone-500 shadow-2xl flex flex-col items-center gap-2">
                <div className="text-xl text-red-500 font-mono mb-2">SECURE DOOR</div>
                <input type="text" maxLength={4} className="bg-black text-green-500 font-mono text-2xl p-2 w-32 text-center tracking-widest" placeholder="----" 
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const val = parseInt((e.target as HTMLInputElement).value, 10);
                            if (val === playerState.interactingWithPinPad?.lockValue) {
                                playerState.interactingWithPinPad.locked = false;
                                setPlayerState(p => ({...p, interactingWithPinPad: null}));
                                addLog("Access Granted.");
                            } else {
                                addLog("Access Denied.");
                                setPlayerState(p => ({...p, interactingWithPinPad: null}));
                            }
                        }
                    }}
                    autoFocus
                />
            </div>
        )}
    </div>
  );
});

export default GameCanvas;