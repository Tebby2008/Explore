import React, { useRef, useEffect, useState } from 'react';
import { GameState, TowerInstance, CELL_SIZE, TowerType, TileType, BiomeType, UnitType, PhaserState, EnemyType } from '../types';
import { TOWER_DEFINITIONS } from '../data/towers';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { UNIT_DEFINITIONS } from '../data/units';

interface Props {
  gameStateRef: React.MutableRefObject<GameState>;
  onSelectTower: (t: TowerInstance | null) => void;
  selectedTowerId: string | null;
  placementMode: TowerType | null;
  onPlaceTower: (x: number, y: number) => void;
  onCancelPlacement: () => void;
}

const BIOME_COLORS: Record<BiomeType, { grass: string, grassDetail: string, cliff: string, cliffDark: string, path: string, bg: string }> = {
    [BiomeType.GRASSLAND]: { grass: '#27ae60', grassDetail: '#2ecc71', cliff: '#5d4037', cliffDark: '#795548', path: '#7f8c8d', bg: '#222' },
    [BiomeType.DESERT]: { grass: '#f1c40f', grassDetail: '#f39c12', cliff: '#d35400', cliffDark: '#e67e22', path: '#dcdde1', bg: '#574b35' },
    [BiomeType.SNOW]: { grass: '#ecf0f1', grassDetail: '#bdc3c7', cliff: '#34495e', cliffDark: '#2c3e50', path: '#95a5a6', bg: '#8395a7' },
    [BiomeType.VOLCANIC]: { grass: '#2c3e50', grassDetail: '#34495e', cliff: '#c0392b', cliffDark: '#a93226', path: '#1a1a1a', bg: '#000' },
    [BiomeType.ALIEN]: { grass: '#8e44ad', grassDetail: '#9b59b6', cliff: '#2980b9', cliffDark: '#3498db', path: '#2c3e50', bg: '#190a29' },
};

export const GameCanvas: React.FC<Props> = ({ 
    gameStateRef, onSelectTower, selectedTowerId, 
    placementMode, onPlaceTower, onCancelPlacement 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 });
  const [hoveredEntity, setHoveredEntity] = useState<{ type: 'TOWER' | 'ENEMY' | 'UNIT', name: string, sub: string, x: number, y: number } | null>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const mouseWorldPos = useRef({ x: 0, y: 0 });

  const screenToWorld = (sx: number, sy: number) => ({
    x: (sx - viewState.x) / viewState.zoom,
    y: (sy - viewState.y) / viewState.zoom
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { 
        if (placementMode) onCancelPlacement();
        else { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }
    } else if (e.button === 0) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        if (placementMode) onPlaceTower(worldPos.x, worldPos.y);
        else {
            const clickedTower = gameStateRef.current.towers.find(t => Math.sqrt(Math.pow(t.x - worldPos.x, 2) + Math.pow(t.y - worldPos.y, 2)) < (t.stats.placementRadius || 25));
            onSelectTower(clickedTower || null);
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      mouseWorldPos.current = worldPos;

      if (isDragging.current) {
          const dx = e.clientX - lastMouse.current.x;
          const dy = e.clientY - lastMouse.current.y;
          setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          lastMouse.current = { x: e.clientX, y: e.clientY };
      }

      const hoverTower = gameStateRef.current.towers.find(t => Math.sqrt(Math.pow(t.x - worldPos.x, 2) + Math.pow(t.y - worldPos.y, 2)) < (t.stats.placementRadius || 20));
      const hoverEnemy = gameStateRef.current.enemies.find(en => Math.sqrt(Math.pow(en.x - worldPos.x, 2) + Math.pow(en.y - worldPos.y, 2)) < 20);
      const hoverUnit = gameStateRef.current.units.find(u => Math.sqrt(Math.pow(u.x - worldPos.x, 2) + Math.pow(u.y - worldPos.y, 2)) < 15);

      if (hoverTower) {
          const baseName = TOWER_DEFINITIONS[hoverTower.type].base.name;
          setHoveredEntity({ type: 'TOWER', name: baseName, sub: `Lvl ${hoverTower.level}`, x: e.clientX, y: e.clientY });
      }
      else if (hoverEnemy) setHoveredEntity({ type: 'ENEMY', name: hoverEnemy.type, sub: `${Math.ceil(hoverEnemy.health)} HP`, x: e.clientX, y: e.clientY });
      else if (hoverUnit) setHoveredEntity({ type: 'UNIT', name: hoverUnit.type, sub: `${Math.ceil(hoverUnit.health)} HP`, x: e.clientX, y: e.clientY });
      else setHoveredEntity(null);
  };

  const handleMouseUp = () => isDragging.current = false;
  const handleWheel = (e: React.WheelEvent) => {
      const scaleBy = 1.1;
      const newZoom = e.deltaY < 0 ? viewState.zoom * scaleBy : viewState.zoom / scaleBy;
      setViewState(prev => ({ ...prev, zoom: Math.min(Math.max(newZoom, 0.2), 4) }));
  };

  // --- RENDERING HELPERS ---
  const drawHumanoid = (ctx: CanvasRenderingContext2D, type: TowerType, level: number) => {
      // Body Base
      ctx.fillStyle = type === TowerType.COMMANDER ? '#e1b12c' : '#34495e';
      if (type === TowerType.MEDIC) ctx.fillStyle = '#ecf0f1';
      if (type === TowerType.SCOUT) ctx.fillStyle = '#3498db';
      if (type === TowerType.SOLDIER) ctx.fillStyle = '#27ae60';
      if (type === TowerType.PHASER) ctx.fillStyle = '#8e44ad';
      if (type === TowerType.SHOCKER) ctx.fillStyle = '#f1c40f';
      if (type === TowerType.SNOWBALLER) ctx.fillStyle = '#74b9ff';
      
      // Shoulders
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Arms holding weapon
      ctx.fillStyle = '#ffeaa7'; // Skin tone
      ctx.beginPath(); ctx.arc(12, 5, 4, 0, Math.PI*2); ctx.fill(); // R Hand
      ctx.beginPath(); ctx.arc(12, -5, 4, 0, Math.PI*2); ctx.fill(); // L Hand

      // Weapon
      ctx.fillStyle = '#2d3436';
      if (type === TowerType.MINIGUNNER) {
          ctx.fillRect(10, -6, 22, 12);
          ctx.fillStyle = '#636e72';
          ctx.fillRect(32, -4, 4, 2); ctx.fillRect(32, 0, 4, 2); ctx.fillRect(32, 4, 4, 2);
      } else if (type === TowerType.SNIPER) {
          ctx.fillRect(5, -2, 40, 4); 
          if (level >= 3) { ctx.fillStyle = '#2ecc71'; ctx.fillRect(15, -3, 8, 6); }
      } else if (type === TowerType.RAILGUNNER) {
          ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, -5, 45, 10);
          ctx.fillStyle = '#3498db'; ctx.fillRect(10, -1, 30, 2); 
      } else if (type === TowerType.PHASER) {
          ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, -6, 30, 12);
          ctx.beginPath(); ctx.arc(30, 0, 6, 0, Math.PI*2); ctx.fillStyle = '#9b59b6'; ctx.fill(); 
      } else if (type === TowerType.SCOUT) {
           ctx.fillRect(10, -3, 12, 6);
           if (level >= 3) { ctx.fillStyle = '#f1c40f'; ctx.fillRect(10, -3, 12, 6); }
           if (level >= 4) { ctx.fillRect(10, 6, 12, 6); }
      } else if (type === TowerType.ROCKETEER || type === TowerType.MORTAR) {
          ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, -6, 25, 12);
          ctx.fillStyle = '#c0392b'; ctx.fillRect(25, -6, 4, 12);
      } else if (type === TowerType.SHOCKER) {
          ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(15, 0); ctx.lineTo(0, 5); ctx.fill();
          ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.stroke();
      } else if (type === TowerType.SNOWBALLER) {
          ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.arc(10, 0, 8, 0, Math.PI*2); ctx.fill();
      } else {
          ctx.fillRect(8, -3, 20, 6);
      }

      // Head
      ctx.fillStyle = '#ffeaa7'; // Skin
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();

      // Hats
      if (type === TowerType.SOLDIER) {
          ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI*2); ctx.fill();
          if (level >= 2) { ctx.fillStyle = '#2ecc71'; ctx.fillRect(-4, -6, 8, 4); }
      } else if (type === TowerType.COMMANDER) {
          ctx.fillStyle = '#2c3e50'; 
          ctx.beginPath(); ctx.arc(0, 0, 9.5, Math.PI, 0); ctx.fill();
          ctx.fillRect(-10, -10, 20, 5);
          ctx.fillStyle = '#f1c40f'; ctx.fillRect(-10, -6, 20, 2);
      } else if (type === TowerType.COWBOY) {
          ctx.fillStyle = '#d35400'; 
          ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#a04000'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill();
      } else if (type === TowerType.MEDIC) {
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#e74c3c'; ctx.fillRect(-6, -2, 12, 4); ctx.fillRect(-2, -6, 4, 12);
      } else if (type === TowerType.SNIPER) {
          ctx.fillStyle = '#556b2f'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
      } else if (type === TowerType.PHASER) {
          ctx.fillStyle = '#8e44ad'; ctx.fillRect(-8, -2, 16, 4); // Visor
      } else if (type === TowerType.SNOWBALLER) {
          ctx.fillStyle = '#2980b9'; ctx.fillRect(-8, -4, 16, 4); // Beanie
      }
  };

  const drawVehicle = (ctx: CanvasRenderingContext2D, type: UnitType) => {
      if (type === UnitType.JEEP) {
          ctx.fillStyle = '#3498db'; ctx.fillRect(-14, -10, 28, 20);
          ctx.fillStyle = '#2c3e50'; 
          ctx.fillRect(-12, -14, 8, 4); ctx.fillRect(4, -14, 8, 4);
          ctx.fillRect(-12, 10, 8, 4); ctx.fillRect(4, 10, 8, 4);
          ctx.fillStyle = '#81ecec'; ctx.fillRect(2, -8, 6, 16);
      } else {
          ctx.fillStyle = '#1abc9c'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#333'; ctx.fillRect(4, -2, 10, 4);
      }
  };

  const drawBuilding = (ctx: CanvasRenderingContext2D, type: TowerType, level: number) => {
      if (type === TowerType.FARM) {
          ctx.fillStyle = '#2c3e50'; ctx.fillRect(-15, -15, 30, 30);
          ctx.fillStyle = level >= 3 ? '#3498db' : '#2ecc71'; 
          ctx.fillRect(-10, -10, 8, 20); ctx.fillRect(2, -10, 8, 20);
          ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(-6, -6, 2, 0, Math.PI*2); ctx.fill();
      } else if (type === TowerType.MILITARY_CAMP) {
          ctx.fillStyle = '#5d4037'; ctx.fillRect(-18, -18, 36, 36);
          ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 2; 
          ctx.beginPath(); ctx.moveTo(-18, -18); ctx.lineTo(18, 18); ctx.moveTo(18, -18); ctx.lineTo(-18, 18); ctx.stroke();
      } else if (type === TowerType.CAMP) {
          ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
          ctx.save();
          ctx.rotate(Date.now() / 500);
          ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI, false); ctx.stroke();
          ctx.restore();
      } else if (type === TowerType.RIFLING_SQUAD) {
          ctx.fillStyle = '#2c3e50'; ctx.fillRect(-20, -15, 40, 30);
          ctx.fillStyle = '#95a5a6'; ctx.fillRect(-15, -10, 30, 20); // Roof
          ctx.fillStyle = '#34495e'; ctx.fillRect(-5, 5, 10, 10); // Door
      }
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, e: any, state: GameState) => {
      const wobble = Math.sin((state.frames + e.frameOffset) * 0.2) * 3;
      const def = ENEMY_DEFINITIONS[e.type as EnemyType];
      
      // HP Bar
      const hpPct = Math.max(0, e.health / e.maxHealth);
      ctx.fillStyle = 'red'; ctx.fillRect(-10, -def.radius - 8, 20, 4);
      ctx.fillStyle = '#2ecc71'; ctx.fillRect(-10, -def.radius - 8, 20 * hpPct, 4);
      
      // Status Effects
      if (e.frozen > 0) { ctx.fillStyle = '#74b9ff'; ctx.fillRect(-10, -def.radius - 12, 20, 2); }

      ctx.rotate(e.rotation);
      
      ctx.fillStyle = def.color;
      if (e.isHidden) ctx.globalAlpha = 0.5;
      if (e.frozen > 0) ctx.fillStyle = '#a29bfe'; // Frozen tint

      // Shape variation based on name checks (rough logic)
      if (e.type.includes('MECH') || e.type.includes('TANK')) {
          // Boxy
          ctx.fillRect(-def.radius, -def.radius, def.radius*2, def.radius*2);
          ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2; ctx.strokeRect(-def.radius, -def.radius, def.radius*2, def.radius*2);
      } else if (e.type.includes('ZOMBIE') || e.type.includes('GHOUL')) {
          // Ragged
          ctx.beginPath();
          for(let i=0; i<8; i++) {
              const angle = (i/8)*Math.PI*2;
              const r = def.radius + (Math.random() * 2 - 1);
              ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
          }
          ctx.closePath(); ctx.fill();
      } else if (e.type.includes('BOSS')) {
          // Spiky Boss
          ctx.beginPath();
          const spikes = 12;
          for(let i=0; i<spikes*2; i++) {
              const r = (i%2===0) ? def.radius : def.radius + 5;
              const a = (i/(spikes*2)) * Math.PI*2;
              ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
          }
          ctx.closePath(); ctx.fill();
          // Boss Crown
          ctx.fillStyle = 'gold'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
      } else {
          // Circle
          ctx.beginPath(); ctx.arc(0, 0, def.radius, 0, Math.PI * 2); ctx.fill();
      }

      if (e.isLead) { ctx.strokeStyle = '#95a5a6'; ctx.lineWidth = 3; ctx.stroke(); }
      
      // Hands
      ctx.fillStyle = '#ecf0f1'; 
      ctx.beginPath(); ctx.arc(def.radius + wobble, 5, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(def.radius - wobble, -5, 4, 0, Math.PI*2); ctx.fill();

      ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const render = () => {
      if (containerRef.current) { canvas.width = containerRef.current.clientWidth; canvas.height = containerRef.current.clientHeight; }
      const state = gameStateRef.current;
      const mapTiles = state.mapTiles;
      const colors = BIOME_COLORS[state.mapConfig.biome] || BIOME_COLORS[BiomeType.GRASSLAND];

      ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.translate(viewState.x, viewState.y); ctx.scale(viewState.zoom, viewState.zoom);

      // Render Map
      if (mapTiles.length > 0) {
          for (let y = 0; y < mapTiles.length; y++) {
              for (let x = 0; x < mapTiles[0].length; x++) {
                  const tile = mapTiles[y][x];
                  const px = x * CELL_SIZE, py = y * CELL_SIZE;
                  if (tile === TileType.CLIFF) {
                      ctx.fillStyle = colors.cliff; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                      ctx.fillStyle = colors.cliffDark; ctx.fillRect(px, py, CELL_SIZE, 5);
                  } else if (tile === TileType.PATH) {
                      ctx.fillStyle = colors.path; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                      ctx.strokeStyle = '#000'; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
                  } else if (tile === TileType.SPAWN) {
                      ctx.fillStyle = '#c0392b'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                  } else if (tile === TileType.BASE) {
                      ctx.fillStyle = '#2980b9'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                  } else {
                      ctx.fillStyle = colors.grass; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                      if ((x+y)%5===0) { ctx.fillStyle = colors.grassDetail; ctx.fillRect(px+5, py+5, 8, 8); }
                  }
              }
          }
      }

      // Pre-Game Arrows
      if (!state.gameStarted && state.mapPath.length > 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for(let i=0; i<state.mapPath.length-1; i+=2) {
             const p1 = state.mapPath[i];
             const p2 = state.mapPath[i+1];
             const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
             ctx.moveTo(p1.x - Math.cos(ang)*5, p1.y - Math.sin(ang)*5);
             ctx.lineTo(p1.x + Math.cos(ang)*10, p1.y + Math.sin(ang)*10);
             ctx.lineTo(p1.x - Math.cos(ang+0.5)*8, p1.y - Math.sin(ang+0.5)*8);
             ctx.moveTo(p1.x + Math.cos(ang)*10, p1.y + Math.sin(ang)*10);
             ctx.lineTo(p1.x - Math.cos(ang-0.5)*8, p1.y - Math.sin(ang-0.5)*8);
          }
          ctx.stroke();
      }

      // Towers
      state.towers.forEach(t => {
          if (selectedTowerId === t.id) {
              ctx.beginPath(); ctx.arc(t.x, t.y, t.stats.range * t.buffs.rangeMultiplier, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fill(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 1; ctx.stroke();
          }
          ctx.save(); ctx.translate(t.x, t.y);
          
          if (t.type === TowerType.FARM || t.type === TowerType.MILITARY_CAMP || t.type === TowerType.CAMP || t.type === TowerType.RIFLING_SQUAD) {
              drawBuilding(ctx, t.type, t.level);
          } else {
              ctx.rotate(t.rotation);
              drawHumanoid(ctx, t.type, t.level);
              
              if (t.type === TowerType.PHASER && t.phaserState === PhaserState.CHARGING) {
                  // Growing Plasma Ball
                  const chargeRatio = 1 - (t.phaserTimer || 0) / (t.stats.chargeTime || 300);
                  const scale = 3 + chargeRatio * 6;
                  ctx.fillStyle = `rgba(142, 68, 173, ${0.5 + chargeRatio * 0.5})`;
                  ctx.shadowBlur = 10 * chargeRatio; ctx.shadowColor = '#9b59b6';
                  ctx.beginPath(); ctx.arc(30, 0, scale, 0, Math.PI*2); ctx.fill();
                  ctx.shadowBlur = 0;
              }
              if (t.type === TowerType.PHASER && t.phaserState === PhaserState.FIRING && t.phaserTargetId) {
                  const target = state.enemies.find(e => e.id === t.phaserTargetId);
                  if (target) {
                      const dist = Math.sqrt(Math.pow(target.x - t.x, 2) + Math.pow(target.y - t.y, 2));
                      ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(dist, 0);
                      const width = 3 + Math.random() * 4;
                      ctx.lineWidth = width; ctx.strokeStyle = '#9b59b6'; ctx.shadowBlur = 10; ctx.shadowColor = '#8e44ad';
                      ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); ctx.shadowBlur = 0;
                  }
              }
          }
          ctx.restore();
          
          // Level Dots
          for(let i=0; i<t.level; i++) { ctx.fillStyle = '#f1c40f'; ctx.fillRect(t.x - 10 + (i*5), t.y + 15, 3, 3); }

          // Buff Indicators (High Visibility)
          let buffY = -35;
          ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          
          const drawBuff = (text: string, color: string) => {
              const w = ctx.measureText(text).width + 8;
              ctx.fillStyle = 'rgba(0,0,0,0.8)';
              ctx.beginPath(); ctx.roundRect(t.x - w/2, t.y + buffY - 6, w, 12, 4); ctx.fill();
              ctx.fillStyle = color;
              ctx.fillText(text, t.x, t.y + buffY);
              buffY -= 14;
          };

          if (t.buffs.firerateMultiplier > 1.05) drawBuff(`⚡+${Math.round((t.buffs.firerateMultiplier - 1)*100)}%`, '#f1c40f');
          if (t.buffs.rangeMultiplier > 1.05) drawBuff(`🎯+${Math.round((t.buffs.rangeMultiplier - 1)*100)}%`, '#3498db');
          if (t.buffs.damageMultiplier > 1.05) drawBuff(`⚔️+${Math.round((t.buffs.damageMultiplier - 1)*100)}%`, '#e74c3c');
      });

      // Units
      state.units.forEach(u => {
          ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.rotation);
          drawVehicle(ctx, u.type);
          ctx.restore();
      });

      // Enemies
      state.enemies.forEach(e => {
          ctx.save(); ctx.translate(e.x, e.y);
          drawEnemy(ctx, e, state);
          ctx.restore();
      });

      // Visual Effects (Beams, Explosions)
      state.visualEffects.forEach(fx => {
          if (fx.type === 'BEAM' || fx.type === 'CHAIN') {
             ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.ex!, fx.ey!);
             ctx.lineWidth = fx.type === 'CHAIN' ? 2 : 2 * (fx.life / fx.maxLife);
             ctx.strokeStyle = fx.color;
             
             if (fx.type === 'CHAIN') {
                 // Zigzag for lightning
                 const midX = (fx.x + fx.ex!) / 2;
                 const midY = (fx.y + fx.ey!) / 2;
                 const offset = (Math.random() - 0.5) * 20;
                 ctx.quadraticCurveTo(midX + offset, midY + offset, fx.ex!, fx.ey!);
             }
             
             ctx.globalAlpha = fx.life / fx.maxLife;
             ctx.stroke(); ctx.globalAlpha = 1;
          } else if (fx.type === 'EXPLOSION') {
              ctx.beginPath(); ctx.arc(fx.x, fx.y, 40 * (1 - fx.life/fx.maxLife), 0, Math.PI*2);
              ctx.fillStyle = fx.color; ctx.globalAlpha = fx.life/fx.maxLife * 0.5; ctx.fill();
              ctx.globalAlpha = 1;
          }
      });

      // Projectiles & Particles
      state.projectiles.forEach(p => { 
          ctx.fillStyle = p.color; 
          ctx.beginPath(); 
          if (p.isSnowball) {
              ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          } else {
              ctx.arc(p.x, p.y, p.aoeRadius > 0 ? 6 : 4, 0, Math.PI * 2); 
          }
          ctx.fill(); 
      });
      state.particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 20; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; });

      // Ghost Placement
      if (placementMode) {
           const stats = TOWER_DEFINITIONS[placementMode].base;
           const { x, y } = mouseWorldPos.current;
           const range = stats.range;
           const placeRad = stats.placementRadius || 20;

           // Range circle
           ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fill();
           
           // Placement Hitbox visual
           ctx.beginPath(); ctx.arc(x, y, placeRad, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'; ctx.lineWidth = 1; ctx.stroke();

           ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.6;
           if (placementMode === TowerType.FARM || placementMode === TowerType.MILITARY_CAMP || placementMode === TowerType.CAMP || placementMode === TowerType.RIFLING_SQUAD) {
               drawBuilding(ctx, placementMode, 0);
           } else {
               drawHumanoid(ctx, placementMode, 0);
           }
           ctx.restore(); ctx.globalAlpha = 1;
      }

      ctx.restore(); animId = requestAnimationFrame(render);
    };
    render(); return () => cancelAnimationFrame(animId);
  }, [gameStateRef, viewState, selectedTowerId, placementMode]);

  return (
    <div 
        ref={containerRef} className={`w-full h-full relative bg-[#1a1a1a] ${placementMode ? 'cursor-crosshair' : 'cursor-default'}`}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}
    >
        <canvas ref={canvasRef} className="block" />
        {hoveredEntity && !placementMode && (
            <div className="absolute pointer-events-none bg-black/80 text-white p-2 rounded border border-white/20 text-xs z-50 transform -translate-y-full -translate-x-1/2 mt-[-10px]" style={{ left: hoveredEntity.x, top: hoveredEntity.y }}>
                <div className="font-bold uppercase">{hoveredEntity.name}</div>
                <div className="text-gray-300">{hoveredEntity.sub}</div>
            </div>
        )}
    </div>
  );
};
