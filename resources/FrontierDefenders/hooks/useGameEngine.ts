import { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, TowerType, EnemyType, UnitType, Position, EnemyInstance, TowerInstance, Projectile, Particle, UnitInstance, DamageType, CELL_SIZE, TileType, MAP_HEIGHT, MAP_WIDTH, BiomeType, TargetingMode, PhaserState, VisualEffect } from '../types';
import { TOWER_DEFINITIONS } from '../data/towers';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { UNIT_DEFINITIONS } from '../data/units';

export const useGameEngine = () => {
  const [gameStateDisplay, setGameStateDisplay] = useState<{ 
      money: number; wave: number; baseHealth: number; maxHealth: number; enemies: number, loadout: TowerType[], mapConfig: any, gameStarted: boolean, waveTimer: number, gameTime: number, towerCounts: Record<string, number>, tutorialText: string | null
  }>({
    money: 800,
    wave: 1,
    baseHealth: 150,
    maxHealth: 150,
    enemies: 0,
    loadout: [],
    mapConfig: { scale: 3, biome: BiomeType.GRASSLAND },
    gameStarted: false,
    waveTimer: 0,
    gameTime: 0,
    towerCounts: {},
    tutorialText: null
  });

  const gameStateRef = useRef<GameState>({
    gameStarted: false,
    gameTime: 0,
    money: 800,
    baseHealth: 150,
    maxBaseHealth: 150,
    wave: 1,
    waveInProgress: false,
    enemiesRemaining: 0,
    frames: 0,
    towers: [],
    enemies: [],
    units: [],
    projectiles: [],
    particles: [],
    visualEffects: [],
    mapTiles: [],
    mapPath: [],
    mapConfig: { scale: 3, width: MAP_WIDTH, height: MAP_HEIGHT, biome: BiomeType.GRASSLAND },
    loadout: [],
    perfectWave: true,
    godMode: false,
    waveTimer: 0,
    tutorialActive: false,
    tutorialText: null
  });

  const requestRef = useRef<number>(0);
  const waveSpawningRef = useRef<{ active: boolean; queue: EnemyType[]; timer: number }>({ active: false, queue: [], timer: 0 });
  const seenTutorials = useRef<Set<string>>(new Set());

  useEffect(() => {
      const saved = localStorage.getItem('frontier_defense_seen_tutorials');
      if (saved) {
          try {
              seenTutorials.current = new Set(JSON.parse(saved));
          } catch(e) { console.error("Failed to load tutorial state", e); }
      }
  }, []);

  const triggerTutorial = (id: string, text: string) => {
      if (!seenTutorials.current.has(id)) {
          const state = gameStateRef.current;
          state.tutorialText = text;
          seenTutorials.current.add(id);
          localStorage.setItem('frontier_defense_seen_tutorials', JSON.stringify(Array.from(seenTutorials.current)));
          
          // Force immediate update to UI
          setGameStateDisplay(prev => ({ ...prev, tutorialText: text }));
      }
  };

  const dismissTutorial = useCallback(() => {
      const state = gameStateRef.current;
      state.tutorialText = null;
      setGameStateDisplay(prev => ({ ...prev, tutorialText: null }));
  }, []);

  // --- Map Generation (Winding Path) ---
  const generateMap = (scale: number, biome: BiomeType) => {
      const width = 15 + (scale - 1) * 8; 
      const height = 12 + (scale - 1) * 7; 
      
      const tiles: TileType[][] = Array(height).fill(0).map(() => Array(width).fill(TileType.GRASS));
      
      const numCliffs = 5 + scale * 3;
      for (let i = 0; i < numCliffs; i++) {
          const cx = Math.floor(Math.random() * (width - 4)) + 2;
          const cy = Math.floor(Math.random() * (height - 4)) + 2;
          const w = Math.floor(Math.random() * (scale + 2)) + 2;
          const h = Math.floor(Math.random() * (scale + 2)) + 2;
          for (let y = cy; y < Math.min(height, cy + h); y++) {
              for (let x = cx; x < Math.min(width, cx + w); x++) {
                  tiles[y][x] = TileType.CLIFF;
              }
          }
      }

      const path: Position[] = [];
      let current = { x: 0, y: Math.floor(Math.random() * (height - 4)) + 2 };
      path.push({ ...current });
      tiles[current.y][current.x] = TileType.SPAWN;

      let stuckCounter = 0;
      let lastDirection = 0; // 0: Right, 1: Up, 2: Down
      
      while (current.x < width - 1) {
          const directions: Position[] = [];
          
          // Winding Logic: Bias towards changing Y if we haven't in a while, but bias towards X if we are stuck
          // Add Right multiple times
          directions.push({ x: current.x + 1, y: current.y });
          
          // To encourage winding, we make vertical moves valid often
          if (current.y > 1) directions.push({ x: current.x, y: current.y - 1 });
          if (current.y < height - 2) directions.push({ x: current.x, y: current.y + 1 });
          
          // Filter out going back to visited
          const validMoves = directions.filter(d => tiles[d.y][d.x] !== TileType.PATH && tiles[d.y][d.x] !== TileType.SPAWN);
          
          let next;
          if (validMoves.length > 0) {
              // Prefer continuing direction slightly, or changing if moved far
              next = validMoves[Math.floor(Math.random() * validMoves.length)];
          } else {
              // Forced move right if stuck
              next = { x: current.x + 1, y: current.y };
          }
          
          next.x = Math.max(0, Math.min(width - 1, next.x));
          next.y = Math.max(0, Math.min(height - 1, next.y));

          // Overwrite cliff if forced
          tiles[next.y][next.x] = TileType.PATH;
          
          if (next.x !== current.x || next.y !== current.y) {
               path.push({ ...next });
               current = next;
               stuckCounter = 0;
          } else {
              stuckCounter++;
              if (stuckCounter > 10) {
                  current.x++;
                  stuckCounter = 0;
              }
          }
      }
      
      const pixelPath = path.map(p => ({
          x: p.x * CELL_SIZE + CELL_SIZE / 2,
          y: p.y * CELL_SIZE + CELL_SIZE / 2
      }));

      const last = path[path.length - 1];
      tiles[last.y][last.x] = TileType.BASE;

      return { tiles, path: pixelPath, width, height };
  };

  const spawnProjectile = (source: Position, targetId: string, stats: any, towerId: string) => {
    const state = gameStateRef.current;
    state.projectiles.push({
      id: Math.random().toString(36).substr(2, 9),
      x: source.x,
      y: source.y,
      targetId,
      damage: stats.damage,
      speed: 15,
      type: stats.piercesLead ? DamageType.ENERGY : DamageType.PHYSICAL,
      pierce: stats.pierce || 1,
      aoeRadius: stats.name.includes('Rocketeer') ? 40 : (stats.name.includes('Mortar') ? 60 : 0), 
      hitList: [],
      color: stats.piercesLead ? '#3498db' : '#f1c40f',
      sourceTowerId: towerId,
      isSnowball: stats.name === 'Snowballer'
    });
  };

  const getWaveComposition = (wave: number): EnemyType[] => {
      const q: EnemyType[] = [];
      const count = 5 + Math.floor(wave * 2);

      // Bosses
      if (wave === 10) return [EnemyType.BOSS_STOMPER];
      if (wave === 20) return [EnemyType.BOSS_SUMMONER];
      if (wave === 30) return [EnemyType.BOSS_TITAN];
      if (wave === 35) return [EnemyType.BOSS_SPEEDSTER];
      if (wave === 40) return [EnemyType.BOSS_NECROMANCER];
      if (wave === 45) return [EnemyType.BOSS_INFERNO];
      if (wave === 50) return [EnemyType.BOSS_THE_END];

      if (wave > 50) {
          const types = Object.values(EnemyType);
          const randType = types[Math.floor(Math.random() * types.length)];
          if (wave % 5 === 0) return [randType];
          for(let i=0; i<count; i++) q.push(types[Math.floor(Math.random() * types.length)]);
          return q;
      }

      for (let i = 0; i < count; i++) {
          const rand = Math.random();
          if (wave <= 5) {
              const types = [EnemyType.BASIC, EnemyType.BANDIT, EnemyType.WOLF, EnemyType.SLIME];
              q.push(types[Math.floor(Math.random() * Math.min(types.length, 1 + Math.floor(wave/2)))]);
          } else if (wave < 10) {
              const types = [EnemyType.FAST, EnemyType.GOBLIN, EnemyType.ORC, EnemyType.WOLF];
              q.push(types[Math.floor(Math.random() * types.length)]);
          } else if (wave < 15) {
              if (i % 5 === 0) q.push(EnemyType.TANK);
              else q.push(rand > 0.6 ? EnemyType.ZOMBIE_RUNNER : EnemyType.ZOMBIE);
          } else if (wave < 20) {
              if (i % 8 === 0) q.push(EnemyType.HIDDEN);
              else q.push(rand > 0.7 ? EnemyType.GHOUL : EnemyType.ZOMBIE);
          } else if (wave < 25) {
              q.push(rand > 0.8 ? EnemyType.MECH_DROID : EnemyType.ABOMINATION);
          } else if (wave < 30) {
              if (i % 10 === 0) q.push(EnemyType.LEAD);
              else q.push(EnemyType.MECH_WALKER);
          } else if (wave < 35) {
               q.push(rand > 0.5 ? EnemyType.FIRE_SPRITE : EnemyType.ICE_GOLEM);
          } else if (wave < 40) {
               q.push(rand > 0.5 ? EnemyType.ROCK_ELEMENTAL : EnemyType.STORM_WISP);
          } else {
               q.push(rand > 0.9 ? EnemyType.ARMORED_LEAD : (rand > 0.8 ? EnemyType.ASSASSIN : EnemyType.PALADIN));
          }
      }
      return q;
  };

  const updateWaveLogic = (state: GameState) => {
    if (state.loadout.length === 0 || !state.gameStarted) return; 

    // Tutorial Checks - No Pause
    if (state.wave === 1 && !seenTutorials.current.has('tutorial_basics')) {
        triggerTutorial('tutorial_basics', "COMMANDER: Welcome to the frontier! Hostiles are inbound. Select a tower from the bottom bar and click on the map to place it. Defend the base at all costs!");
    } else if (state.wave === 2 && !seenTutorials.current.has('tutorial_upgrades')) {
        triggerTutorial('tutorial_upgrades', "COMMANDER: Enemies will get tougher. Click on any placed tower to open the Command Panel. Here you can buy UPGRADES to increase stats or change targeting priority.");
    } else if (state.wave === 5 && !seenTutorials.current.has('tutorial_types')) {
        triggerTutorial('tutorial_types', "INTEL: We're detecting specialized enemies! Some are HIDDEN (invisible to normal towers) and others are ARMORED/LEAD (immune to sharp attacks). Ensure you have 'Detects Hidden' and 'Pierces Lead' capabilities!");
    } else if (state.wave === 8 && !seenTutorials.current.has('tutorial_economy')) {
        triggerTutorial('tutorial_economy', "ADVISOR: War is expensive. While killing enemies grants cash, building FARMS (if equipped) provides steady income every wave. Invest early to afford heavy artillery later.");
    } else if (state.wave === 10 && !seenTutorials.current.has('tutorial_boss')) {
        triggerTutorial('tutorial_boss', "WARNING: Massive seismic signature detected. A BOSS class enemy is approaching! Use Active Abilities (Commander/Medic) if available to survive this encounter.");
    }

    const waveData = waveSpawningRef.current;
    
    if (!state.waveInProgress && state.enemies.length === 0 && waveData.queue.length === 0) {
      if (state.waveTimer > 0) {
          state.waveTimer--;
      } else {
         if (state.wave > 1) {
             const baseBonus = 100 + (state.wave * 15);
             const perfectBonus = state.perfectWave ? 50 : 0;
             state.money += baseBonus + perfectBonus;
         }
         startWave(state.wave + 1);
      }
    }

    if (waveData.active && waveData.queue.length > 0) {
        waveData.timer--;
        if (waveData.timer <= 0) {
            const enemyType = waveData.queue.shift()!;
            const def = ENEMY_DEFINITIONS[enemyType];
            
            let hpMult = Math.pow(1.12, state.wave - 1);
            if (state.wave > 50) hpMult = Math.pow(1.15, state.wave - 1); 

            const startNode = state.mapPath[0];
            state.enemies.push({
                id: Math.random().toString(),
                type: enemyType,
                x: startNode.x,
                y: startNode.y,
                rotation: 0,
                pathIndex: 0,
                health: def.hp * hpMult,
                maxHealth: def.hp * hpMult,
                speed: def.speed,
                frozen: 0,
                chillStacks: 0,
                isLead: enemyType === EnemyType.LEAD || enemyType === EnemyType.ARMORED_LEAD || enemyType === EnemyType.SHIELD_BOT,
                isHidden: enemyType === EnemyType.HIDDEN || enemyType === EnemyType.GHOUL || enemyType === EnemyType.BOSS_PHANTOM || enemyType === EnemyType.ASSASSIN,
                radius: def.radius,
                frameOffset: Math.floor(Math.random() * 100),
                regenRate: def.regen
            });
            waveData.timer = Math.max(10, 60 - state.wave); 
        }
        if (waveData.queue.length === 0) {
            waveData.active = false;
        }
    }
  };

  const startWave = (waveNum: number) => {
      gameStateRef.current.wave = waveNum;
      gameStateRef.current.waveInProgress = true;
      gameStateRef.current.perfectWave = true;
      
      const queue = getWaveComposition(waveNum);
      waveSpawningRef.current = { active: true, queue, timer: 60 };
      
      gameStateRef.current.towers.forEach(t => {
          if (t.type === TowerType.FARM) {
              const income = 60 + (t.level * 25) + (t.level >= 3 ? 75 : 0) + (t.level === 5 ? 500 : 0);
              gameStateRef.current.money += income;
              t.cashGenerated += income;
          }
          if (t.type === TowerType.MEDIC) {
              const heal = 5 + (t.level * 5);
              gameStateRef.current.baseHealth = Math.min(gameStateRef.current.maxBaseHealth, gameStateRef.current.baseHealth + heal);
          }
      });
  };

  const getTarget = (tower: TowerInstance, enemies: EnemyInstance[], range: number): EnemyInstance | undefined => {
      const candidates = enemies.filter(e => {
          if (e.isHidden && !tower.stats.detectsHidden) return false;
          const dist = Math.sqrt(Math.pow(e.x - tower.x, 2) + Math.pow(e.y - tower.y, 2));
          return dist <= range;
      });

      if (candidates.length === 0) return undefined;

      const mode = tower.targetingMode;
      if (mode === TargetingMode.FIRST) return candidates.reduce((a, b) => a.pathIndex > b.pathIndex ? a : b);
      if (mode === TargetingMode.LAST) return candidates.reduce((a, b) => a.pathIndex < b.pathIndex ? a : b);
      if (mode === TargetingMode.STRONGEST) return candidates.reduce((a, b) => a.health > b.health ? a : b);
      if (mode === TargetingMode.WEAKEST) return candidates.reduce((a, b) => a.health < b.health ? a : b);
      if (mode === TargetingMode.CLOSEST) {
           return candidates.reduce((a, b) => {
               const da = Math.pow(a.x - tower.x, 2) + Math.pow(a.y - tower.y, 2);
               const db = Math.pow(b.x - tower.x, 2) + Math.pow(b.y - tower.y, 2);
               return da < db ? a : b;
           });
      }
      if (mode === TargetingMode.RANDOM) return candidates[Math.floor(Math.random() * candidates.length)];
      
      return candidates[0];
  };

  const updateTowers = (state: GameState) => {
    // Reset basic buffs
    state.towers.forEach(t => t.buffs = { rangeMultiplier: 1, firerateMultiplier: 1, damageMultiplier: 1 });
    
    // Apply Active & Passive Buffs
    state.towers.forEach(source => {
        // Decrease Ability Timers
        if (source.abilityCooldownTimer > 0) source.abilityCooldownTimer--;
        if (source.abilityActiveTimer > 0) source.abilityActiveTimer--;

        if (source.type === TowerType.COMMANDER || source.type === TowerType.CAMP) {
            state.towers.forEach(target => {
                const dist = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2));
                if (source.id !== target.id && dist <= source.stats.range) {
                    // Passive Commander
                    if (source.type === TowerType.COMMANDER) {
                        target.buffs.firerateMultiplier += (0.1 + (source.level * 0.05));
                        if (source.abilityActiveTimer > 0) target.buffs.firerateMultiplier += 0.3; 
                    }
                    // Passive Camp
                    if (source.type === TowerType.CAMP) {
                        target.buffs.rangeMultiplier += (0.1 + (source.level * 0.05));
                        if (source.abilityActiveTimer > 0) {
                            target.buffs.rangeMultiplier += 0.2;
                            target.buffs.damageMultiplier += 0.2;
                        }
                    }
                }
            });
        }
    });

    state.towers.forEach(tower => {
        if (tower.stunnedUntil > state.frames) return;

        // Phaser Logic
        if (tower.type === TowerType.PHASER) {
            const chargeTime = (tower.stats.chargeTime || 300);
            const fireDuration = (tower.stats.fireDuration || 300);
            const cooldown = (tower.stats.cooldown || 120);

            if (!tower.phaserState) tower.phaserState = PhaserState.IDLE;
            if (!tower.phaserTimer) tower.phaserTimer = 0;

            if (tower.phaserState === PhaserState.IDLE) {
                const target = getTarget(tower, state.enemies, tower.stats.range * tower.buffs.rangeMultiplier);
                if (target) {
                    tower.phaserState = PhaserState.CHARGING;
                    tower.phaserTimer = chargeTime;
                    tower.phaserTargetId = target.id;
                    // Initial rotation
                    tower.targetRotation = Math.atan2(target.y - tower.y, target.x - tower.x);
                    tower.rotation = tower.targetRotation;
                }
            } else if (tower.phaserState === PhaserState.CHARGING) {
                tower.phaserTimer--;
                
                // Keep tracking during charge
                let target = state.enemies.find(e => e.id === tower.phaserTargetId);
                if (target) {
                    tower.targetRotation = Math.atan2(target.y - tower.y, target.x - tower.x);
                    tower.rotation = tower.targetRotation;
                }

                if (tower.phaserTimer <= 0) {
                    tower.phaserState = PhaserState.FIRING;
                    tower.phaserTimer = fireDuration;
                }
            } else if (tower.phaserState === PhaserState.FIRING) {
                let target: EnemyInstance | undefined | null = state.enemies.find(e => e.id === tower.phaserTargetId);
                const range = tower.stats.range * tower.buffs.rangeMultiplier;
                
                if (!target || Math.sqrt(Math.pow(target.x - tower.x, 2) + Math.pow(target.y - tower.y, 2)) > range) {
                     target = getTarget(tower, state.enemies, range);
                     if (target) tower.phaserTargetId = target.id;
                     else {
                         tower.phaserState = PhaserState.COOLDOWN;
                         tower.phaserTimer = cooldown;
                     }
                }

                if (target) {
                     tower.targetRotation = Math.atan2(target.y - tower.y, target.x - tower.x);
                     tower.rotation = tower.targetRotation;
                     
                     if (state.frames % 5 === 0) {
                         const dmg = tower.stats.damage * tower.buffs.damageMultiplier;
                         target.health -= dmg;
                         tower.totalDamageDealt += dmg;
                     }
                }

                tower.phaserTimer--;
                if (tower.phaserTimer <= 0) {
                    tower.phaserState = PhaserState.COOLDOWN;
                    tower.phaserTimer = cooldown;
                }
            } else if (tower.phaserState === PhaserState.COOLDOWN) {
                tower.phaserTimer--;
                if (tower.phaserTimer <= 0) {
                    tower.phaserState = PhaserState.IDLE;
                }
            }
            return;
        }

        // Standard Logic
        if (tower.type !== TowerType.FARM && tower.type !== TowerType.CAMP && tower.type !== TowerType.MILITARY_CAMP && tower.type !== TowerType.RIFLING_SQUAD) {
            let diff = tower.targetRotation - tower.rotation;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            const speed = tower.stats.rotationSpeed;
            if (Math.abs(diff) < speed) tower.rotation = tower.targetRotation;
            else tower.rotation += Math.sign(diff) * speed;
        }

        // Production Buildings
        if (tower.type === TowerType.MILITARY_CAMP || tower.type === TowerType.RIFLING_SQUAD) {
            tower.lastAbility = (tower.lastAbility || 0) + 1;
            if (tower.lastAbility >= tower.stats.cooldown) {
                const uType = tower.type === TowerType.MILITARY_CAMP ? UnitType.JEEP : UnitType.SQUAD;
                const pathLen = state.mapPath.length - 1;
                state.units.push({
                    id: Math.random().toString(), type: uType,
                    x: state.mapPath[pathLen].x, y: state.mapPath[pathLen].y,
                    pathIndex: pathLen,
                    rotation: 0,
                    health: UNIT_DEFINITIONS[uType].hp * (1 + tower.level * 0.5),
                    damage: UNIT_DEFINITIONS[uType].damage * (1 + tower.level * 0.5),
                    range: UNIT_DEFINITIONS[uType].range, cooldown: UNIT_DEFINITIONS[uType].cooldown,
                    lastAttack: 0, targetId: null, moving: true, isCollision: UNIT_DEFINITIONS[uType].isCollision
                });
                tower.lastAbility = 0;
            }
            return;
        }

        if (tower.type === TowerType.FARM) return;

        const effectiveRange = tower.stats.range * tower.buffs.rangeMultiplier;
        const target = getTarget(tower, state.enemies, effectiveRange);

        if (target) {
            tower.targetRotation = Math.atan2(target.y - tower.y, target.x - tower.x);
            let diff = tower.targetRotation - tower.rotation;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            
            // Firing Logic
            const canFire = state.frames - tower.lastShot >= (tower.stats.cooldown / tower.buffs.firerateMultiplier);
            const aimed = Math.abs(diff) < 0.8;

            // Soldier Burst Logic
            if (tower.stats.burstCount && tower.stats.burstCount > 0) {
                if (tower.burstRemaining > 0) {
                     // In Burst Mode
                     tower.burstTimer--;
                     if (tower.burstTimer <= 0) {
                         spawnProjectile(tower, target.id, tower.stats, tower.id);
                         tower.burstRemaining--;
                         tower.burstTimer = tower.stats.burstRate || 5;
                     }
                } else if (canFire && aimed) {
                    // Start Burst
                    tower.lastShot = state.frames;
                    tower.burstRemaining = tower.stats.burstCount;
                    tower.burstTimer = 0; // Immediate first shot
                }
            }
            // Standard Fire
            else if (canFire && aimed) {
                tower.lastShot = state.frames;
                
                if (tower.type === TowerType.RAILGUNNER) {
                    state.visualEffects.push({
                        id: Math.random().toString(), type: 'BEAM', x: tower.x, y: tower.y, ex: target.x, ey: target.y,
                        life: 15, maxLife: 15, color: '#e74c3c'
                    });
                    applyDamage(state, target, { damage: tower.stats.damage * tower.buffs.damageMultiplier, type: DamageType.ENERGY, sourceTowerId: tower.id } as Projectile);
                } else if (tower.type === TowerType.SHOCKER) {
                    // Chain Lightning
                    const chainLimit = tower.stats.chainCount || 3;
                    const chainRange = 100;
                    let currentTarget: EnemyInstance | undefined | null = target;
                    const hitIds = new Set<string>();
                    
                    for(let i=0; i<chainLimit; i++) {
                        if (!currentTarget) break;
                        hitIds.add(currentTarget.id);
                        
                        // Visual
                        state.visualEffects.push({
                            id: Math.random().toString(), type: 'CHAIN', 
                            x: i===0 ? tower.x : currentTarget.x, 
                            y: i===0 ? tower.y : currentTarget.y,
                            ex: currentTarget.x, ey: currentTarget.y,
                            life: 10, maxLife: 10, color: '#f1c40f'
                        });

                        // Damage & Stun
                        applyDamage(state, currentTarget, { damage: tower.stats.damage * tower.buffs.damageMultiplier, type: DamageType.ENERGY, sourceTowerId: tower.id } as Projectile);
                        currentTarget.frozen = Math.max(currentTarget.frozen, tower.stats.stunDuration || 20);

                        // Find next
                        currentTarget = state.enemies.find(e => !hitIds.has(e.id) && Math.sqrt(Math.pow(e.x - currentTarget!.x, 2) + Math.pow(e.y - currentTarget!.y, 2)) < chainRange);
                    }

                } else {
                    spawnProjectile(tower, target.id, tower.stats, tower.id);
                }
            }
        }
    });
  };

  const applyDamage = (state: GameState, enemy: EnemyInstance, proj: Projectile) => {
      if (enemy.isLead && proj.type !== DamageType.ENERGY && proj.type !== DamageType.EXPLOSIVE && proj.damage < 50) {
          return;
      }
      enemy.health -= proj.damage;
      
      if (proj.isSnowball) {
          enemy.chillStacks++;
          enemy.speed = Math.max(0.2, enemy.speed * 0.8); // Slow
          if (enemy.chillStacks >= 3) {
              enemy.frozen = 60; // Freeze 1s
              enemy.chillStacks = 0;
          }
      }

      if (proj.sourceTowerId) {
          const t = state.towers.find(t => t.id === proj.sourceTowerId);
          if (t) {
              t.totalDamageDealt += proj.damage;
              const cashEarned = Math.max(1, Math.floor(proj.damage * 0.2)); 
              state.money += cashEarned;
              if (t.type === TowerType.COWBOY) {
                 const bonus = 2 + Math.floor(t.level);
                 state.money += bonus;
                 t.cashGenerated += bonus;
              }
          }
      }
  };

  const updateEntities = (state: GameState) => {
      // Units
      for (let i = state.units.length - 1; i >= 0; i--) {
          const unit = state.units[i];
          if (unit.health <= 0) { state.units.splice(i, 1); continue; }
          
          if (unit.moving) {
              unit.pathIndex -= (UNIT_DEFINITIONS[unit.type].speed / 50);
              if (unit.pathIndex <= 0) unit.pathIndex = 0;
              
              const idx = Math.floor(unit.pathIndex);
              const progress = unit.pathIndex - idx;
              
              if (idx < state.mapPath.length - 1) {
                  const p1 = state.mapPath[idx];
                  const p2 = state.mapPath[idx + 1];
                  unit.x = p1.x + (p2.x - p1.x) * progress;
                  unit.y = p1.y + (p2.y - p1.y) * progress;
                  unit.rotation = Math.atan2(p1.y - p2.y, p1.x - p2.x);
              } else {
                  const p = state.mapPath[state.mapPath.length-1];
                  unit.x = p.x;
                  unit.y = p.y;
              }
          }

          const hitEnemy = state.enemies.find(e => Math.sqrt(Math.pow(e.x - unit.x, 2) + Math.pow(e.y - unit.y, 2)) < 30);
          
          if (unit.isCollision && hitEnemy) {
               hitEnemy.health -= unit.damage; 
               unit.health = 0; 
          } else if (hitEnemy) {
               unit.health -= 5; 
          }

          if (unit.health > 0 && !unit.isCollision) {
              const target = state.enemies.find(e => Math.sqrt(Math.pow(e.x - unit.x, 2) + Math.pow(e.y - unit.y, 2)) <= unit.range);
              if (target) {
                  unit.moving = false;
                  unit.rotation = Math.atan2(target.y - unit.y, target.x - unit.x);
                  unit.lastAttack++;
                  if (unit.lastAttack >= unit.cooldown) {
                      unit.lastAttack = 0;
                      target.health -= unit.damage;
                  }
              } else {
                  unit.moving = true;
              }
          }
      }

      // Projectiles
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
          const p = state.projectiles[i];
          const t = state.enemies.find(e => e.id === p.targetId);
          if (!t) { state.projectiles.splice(i, 1); continue; }
          const dx = t.x - p.x, dy = t.y - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < p.speed) {
              if (p.aoeRadius > 0) {
                  // Visual for Explosion
                  state.visualEffects.push({
                      id: Math.random().toString(), type: 'EXPLOSION', x: p.x, y: p.y, life: 10, maxLife: 10, color: '#e74c3c'
                  });
                  state.enemies.forEach(e => {
                      if (Math.sqrt(Math.pow(e.x - p.x, 2) + Math.pow(e.y - p.y, 2)) <= p.aoeRadius) applyDamage(state, e, p);
                  });
              } else applyDamage(state, t, p);
              state.projectiles.splice(i, 1);
          } else {
              p.x += (dx/dist)*p.speed; p.y += (dy/dist)*p.speed;
          }
      }

      // Enemies
      for (let i = state.enemies.length - 1; i >= 0; i--) {
          const e = state.enemies[i];
          if (e.health <= 0) {
              state.money += ENEMY_DEFINITIONS[e.type].reward;
              state.enemies.splice(i, 1);
              continue;
          }
          if (e.regenRate && state.frames % 60 === 0) e.health = Math.min(e.maxHealth, e.health + e.regenRate * 10);

          if (e.frozen <= 0) {
              const idx = Math.floor(e.pathIndex);
              if (idx < state.mapPath.length - 1) {
                  const p1 = state.mapPath[idx], p2 = state.mapPath[idx+1];
                  const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                  e.pathIndex += e.speed / dist;
                  e.x = p1.x + (p2.x - p1.x) * (e.pathIndex - idx);
                  e.y = p1.y + (p2.y - p1.y) * (e.pathIndex - idx);
                  e.rotation = Math.atan2(p2.y - p1.y, p2.x - p1.x);
              } else {
                  if (!state.godMode) state.baseHealth -= Math.ceil(e.health);
                  state.perfectWave = false;
                  state.enemies.splice(i, 1);
              }
          } else e.frozen--;
      }

      for (let i = state.visualEffects.length - 1; i >= 0; i--) {
          state.visualEffects[i].life--;
          if (state.visualEffects[i].life <= 0) state.visualEffects.splice(i, 1);
      }
  };

  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (state.mapPath.length === 0 && state.loadout.length > 0) {
        const gen = generateMap(state.mapConfig.scale, state.mapConfig.biome);
        state.mapTiles = gen.tiles;
        state.mapPath = gen.path;
        state.mapConfig.width = gen.width;
        state.mapConfig.height = gen.height;
    }

    if (state.baseHealth <= 0) {
        state.gameStarted = false;
        state.baseHealth = 150; state.money = 800; state.wave = 1; state.enemies = []; state.towers = [];
        state.waveInProgress = false; waveSpawningRef.current.active = false; waveSpawningRef.current.queue = [];
        const gen = generateMap(state.mapConfig.scale, state.mapConfig.biome);
        state.mapTiles = gen.tiles; state.mapPath = gen.path;
        state.gameTime = 0;
    }

    // Always update game logic, even if tutorial is active (UNOBTRUSIVE)
    state.frames++;
    if (state.gameStarted) {
        if (state.frames % 60 === 0) state.gameTime++;
        updateWaveLogic(state);
    }
    
    updateTowers(state); 
    updateEntities(state);

    state.enemiesRemaining = state.enemies.length + waveSpawningRef.current.queue.length;
    state.waveInProgress = state.enemiesRemaining > 0 || waveSpawningRef.current.active;

    if (state.frames % 5 === 0) {
        const towerCounts: Record<string, number> = {};
        state.towers.forEach(t => {
            towerCounts[t.type] = (towerCounts[t.type] || 0) + 1;
        });

        setGameStateDisplay({
            money: Math.floor(state.money),
            wave: state.wave,
            baseHealth: state.baseHealth,
            maxHealth: state.maxBaseHealth,
            enemies: state.enemiesRemaining,
            loadout: state.loadout,
            mapConfig: state.mapConfig,
            gameStarted: state.gameStarted,
            waveTimer: Math.ceil(state.waveTimer / 60), 
            gameTime: state.gameTime,
            towerCounts,
            tutorialText: state.tutorialText
        });
    }

    requestRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  return {
    gameStateRef,
    gameStateDisplay,
    dismissTutorial,
    startGame: () => {
        gameStateRef.current.gameStarted = true;
        gameStateRef.current.waveTimer = 300; 
    },
    setLoadout: (towers: TowerType[], scale: number, biome: BiomeType) => {
        gameStateRef.current.loadout = towers;
        gameStateRef.current.mapConfig = { ...gameStateRef.current.mapConfig, scale, biome };
    },
    spawnTower: (type: TowerType, x: number, y: number) => {
        const state = gameStateRef.current;
        const def = TOWER_DEFINITIONS[type].base;
        const tx = Math.floor(x / CELL_SIZE), ty = Math.floor(y / CELL_SIZE);
        if (ty < 0 || ty >= state.mapConfig.height || tx < 0 || tx >= state.mapConfig.width) return false;
        
        const tile = state.mapTiles[ty][tx];
        if (def.isCliff && tile !== TileType.CLIFF) return false;
        if (!def.isCliff && tile !== TileType.GRASS) return false;
        
        // Check Placement Limit
        const currentCount = state.towers.filter(t => t.type === type).length;
        if (def.placementLimit && currentCount >= def.placementLimit) return false;

        // Placement Radius Check
        const placementRadius = def.placementRadius || 20;
        if (state.towers.some(t => Math.sqrt(Math.pow(t.x-x,2)+Math.pow(t.y-y,2)) < (placementRadius + (t.stats.placementRadius || 20)))) return false;

        if (state.money >= def.cost) {
            state.money -= def.cost;
            state.towers.push({
                id: Math.random().toString(), type, level: 0, x, y, rotation: 0, targetRotation: 0, lastShot: 0,
                stats: { ...def }, buffs: { rangeMultiplier: 1, damageMultiplier: 1, firerateMultiplier: 1 },
                stunnedUntil: 0, totalDamageDealt: 0, cashGenerated: 0,
                targetingMode: TargetingMode.FIRST,
                abilityCooldownTimer: 0,
                abilityActiveTimer: 0,
                burstRemaining: 0,
                burstTimer: 0
            });
            return true;
        }
        return false;
    },
    upgradeTower: (towerId: string) => {
        const state = gameStateRef.current;
        const tower = state.towers.find(t => t.id === towerId);
        if (tower && tower.level < 5) {
            const next = TOWER_DEFINITIONS[tower.type].upgrades[tower.level];
            if (state.money >= next.cost) {
                state.money -= next.cost;
                tower.level++;
                Object.assign(tower.stats, next);
                return true;
            }
        }
        return false;
    },
    sellTower: (id: string) => {
        const state = gameStateRef.current;
        const idx = state.towers.findIndex(t => t.id === id);
        if (idx > -1) { state.money += Math.floor(state.towers[idx].stats.cost * 0.7); state.towers.splice(idx, 1); }
    },
    setTargetingMode: (id: string, mode: TargetingMode) => {
        const t = gameStateRef.current.towers.find(t => t.id === id);
        if (t) t.targetingMode = mode;
    },
    activateAbility: (id: string) => {
        const state = gameStateRef.current;
        const tower = state.towers.find(t => t.id === id);
        if (tower && tower.stats.abilityCooldown && tower.abilityCooldownTimer === 0) {
            tower.abilityCooldownTimer = tower.stats.abilityCooldown;
            tower.abilityActiveTimer = tower.stats.abilityDuration || 1; 

            if (tower.type === TowerType.MEDIC) {
                 state.towers.forEach(target => {
                    const dist = Math.sqrt(Math.pow(target.x - tower.x, 2) + Math.pow(target.y - tower.y, 2));
                    if (dist <= tower.stats.range) {
                        target.stunnedUntil = 0;
                    }
                });
            }
            return true;
        }
        return false;
    },
    adminAddCash: (amt: number) => gameStateRef.current.money += amt,
    adminSkipWave: () => {
        gameStateRef.current.enemies = [];
        waveSpawningRef.current.queue = [];
        waveSpawningRef.current.active = false;
        gameStateRef.current.waveInProgress = false;
        gameStateRef.current.waveTimer = 60;
    },
    adminKillAll: () => gameStateRef.current.enemies = [],
    adminGodMode: () => {
        gameStateRef.current.godMode = !gameStateRef.current.godMode;
        return gameStateRef.current.godMode;
    }
  };
};
