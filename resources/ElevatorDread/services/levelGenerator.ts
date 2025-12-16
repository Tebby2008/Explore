
import { GameLevel, Room, Item, Enemy, EntityType, ItemType, Interactable as InteractableType, Difficulty } from "../types";
import { CANVAS_WIDTH, CANVAS_HEIGHT, LORE_TEXTS } from "../constants";

export const generateLevel = (floor: number, maxFloor: number, difficultySettings: any, isSafeFloor: boolean, loreProgress: number[], difficulty: Difficulty): GameLevel => {
  const rooms: Room[] = [];
  const walls: { x: number; y: number; w: number; h: number }[] = [];
  const enemies: Enemy[] = [];
  const items: Item[] = [];
  const interactables: InteractableType[] = [];

  // Tutorial Logic Override
  let actualIsSafe = isSafeFloor;
  if (difficulty === Difficulty.TUTORIAL && floor === maxFloor) {
      actualIsSafe = true;
  }

  const mapCenterX = CANVAS_WIDTH / 2;
  const mapCenterY = CANVAS_HEIGHT / 2;
  const doorWidth = 60;
  const wallThickness = 10;
  const gap = 30; 

  const occupiedRects: {x:number, y:number, w:number, h:number}[] = [];
  const doorZones: {x:number, y:number, r:number}[] = [];

  const checkOverlap = (x: number, y: number, w: number, h: number) => {
      const buffer = 10; 
      for (const r of occupiedRects) {
          if (x < r.x + r.w + buffer && x + w > r.x - buffer &&
              y < r.y + r.h + buffer && y + h > r.y - buffer) return true;
      }
      return false;
  };

  const registerRoom = (r: Room) => {
      rooms.push(r);
      occupiedRects.push({x: r.x, y: r.y, w: r.w, h: r.h});
  };

  const addDoorZone = (x: number, y: number) => {
      doorZones.push({x, y, r: 60}); // Increased slightly to keep props away from doors
  };

  const addWall = (x: number, y: number, w: number, h: number) => walls.push({x, y, w, h});

  // 1. Elevator Room
  const elevatorW = 160; 
  const elevatorH = 120;
  const elevatorX = mapCenterX - elevatorW / 2;
  const elevatorY = 40;

  const elevatorRoom: Room = { 
      id: 'elevator', x: elevatorX, y: elevatorY, w: elevatorW, h: elevatorH, 
      hasConnection: { top: false, right: false, bottom: true, left: false }, 
      type: 'ELEVATOR', visited: true 
  };
  registerRoom(elevatorRoom);
  addDoorZone(mapCenterX, elevatorY + elevatorH); 

  // 2. Central Room
  const centralW = 300; 
  const centralH = 300;
  const centralX = mapCenterX - centralW / 2;
  const centralY = elevatorY + elevatorH + gap; 

  const centralRoom: Room = { 
      id: 'central', x: centralX, y: centralY, w: centralW, h: centralH, 
      hasConnection: { top: true, right: false, bottom: false, left: false }, 
      type: 'NORMAL', visited: false 
  };
  registerRoom(centralRoom);
  addDoorZone(mapCenterX, centralY); 
  
  // Hallway
  const elevHall: Room = {
      id: 'hall-elev', x: mapCenterX - doorWidth/2, y: elevatorY + elevatorH, w: doorWidth, h: gap,
      hasConnection: { top: false, bottom: false, left: false, right: false },
      type: 'HALLWAY', subtype: 'VERT', visited: true
  };
  registerRoom(elevHall);

  // Initial Closets (Central Room) - manually placed
  interactables.push({ id: 'closet-c1', type: EntityType.INTERACTABLE, interactType: 'CLOSET', pos: { x: centralX + 60, y: centralY + 30 }, size: 40, color: '#444', isActive: false, locked: false });
  interactables.push({ id: 'closet-c2', type: EntityType.INTERACTABLE, interactType: 'CLOSET', pos: { x: centralX + centralW - 60, y: centralY + 30 }, size: 40, color: '#444', isActive: false, locked: false });

  // PROGRESSION CALCULATIONS
  // 0.0 = Top Floor (Start), 1.0 = Floor 1 (End)
  const depthRatio = (maxFloor - floor) / Math.max(1, maxFloor - 1);
  const threatLevel = depthRatio * 100; // Scaled 0-100

  let maxDepth = 1;
  if (depthRatio > 0.10) maxDepth = 2;
  if (depthRatio > 0.25) maxDepth = 3;
  if (depthRatio > 0.45) maxDepth = 4;
  if (depthRatio > 0.65) maxDepth = 5;
  if (depthRatio > 0.85) maxDepth = 6; 
  if (floor === 1) maxDepth = 2;

  // --- WALL & PROP UTILITIES ---
  
  const checkPropCollision = (x: number, y: number, size: number) => {
      // Check walls
      for (const w of walls) {
          if (x - size/2 < w.x + w.w && x + size/2 > w.x && y - size/2 < w.y + w.h && y + size/2 > w.y) return true;
      }
      // Check other interactables
      for (const i of interactables) {
          if (Math.hypot(x - i.pos.x, y - i.pos.y) < size + i.size) return true;
      }
      // Check door zones
      for (const d of doorZones) {
          if (Math.hypot(x - d.x, y - d.y) < d.r + size/2) return true;
      }
      return false;
  };

  const placeInteractableSafely = (r: Room, type: 'CLOSET'|'CHEST'|'DRAWER'|'GENERATOR', contents?: Item, alignToWall: boolean = false) => {
      let attempts = 0;
      const size = type === 'GENERATOR' ? 45 : (type === 'CLOSET' ? 40 : 30);
      const padding = wallThickness + size/2 + 2; 

      while(attempts < 15) {
          let px = 0, py = 0;
          
          if (alignToWall) {
             // Pick a wall
             const side = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
             
             // Randomize position along that wall
             if (side === 0) { // Top
                 px = r.x + padding + Math.random() * (r.w - padding*2);
                 py = r.y + padding;
             } else if (side === 1) { // Right
                 px = r.x + r.w - padding;
                 py = r.y + padding + Math.random() * (r.h - padding*2);
             } else if (side === 2) { // Bottom
                 px = r.x + padding + Math.random() * (r.w - padding*2);
                 py = r.y + r.h - padding;
             } else { // Left
                 px = r.x + padding;
                 py = r.y + padding + Math.random() * (r.h - padding*2);
             }
          } else {
             // Random placement (mostly for chests, but keeping them away from dead center can be nice too)
             px = r.x + padding + Math.random() * (r.w - padding*2);
             py = r.y + padding + Math.random() * (r.h - padding*2);
          }

          if (!checkPropCollision(px, py, size)) {
               interactables.push({
                  id: `int-${r.id}-${interactables.length}`, type: EntityType.INTERACTABLE, interactType: type,
                  pos: { x: px, y: py },
                  size: size, color: type === 'CHEST' ? '#d97706' : '#78350f', isActive: false, locked: false, contents: contents
               });
               return;
          }
          attempts++;
      }
  };

  const createBranch = (parent: Room, depth: number, direction: 'west'|'east'|'south', lockedChance: number) => {
      if (depth > maxDepth) return;

      const w = 200 + Math.random() * 100;
      const h = 200 + Math.random() * 100;
      let x=0,y=0,hallX=0,hallY=0,hallW=0,hallH=0,doorCX=0,doorCY=0,hallSubtype: 'HORZ'|'VERT'='HORZ';
      
      if (direction === 'west') { x = parent.x - w - gap; y = parent.y + (parent.h - h)/2; hallX = x + w; hallY = parent.y + parent.h/2 - doorWidth/2; hallW = gap; hallH = doorWidth; doorCX = hallX + hallW/2; doorCY = hallY + hallH/2; hallSubtype = 'HORZ'; } 
      else if (direction === 'east') { x = parent.x + parent.w + gap; y = parent.y + (parent.h - h)/2; hallX = parent.x + parent.w; hallY = parent.y + parent.h/2 - doorWidth/2; hallW = gap; hallH = doorWidth; doorCX = hallX + hallW/2; doorCY = hallY + hallH/2; hallSubtype = 'HORZ'; } 
      else if (direction === 'south') { x = parent.x + (parent.w - w)/2; y = parent.y + parent.h + gap; hallX = parent.x + parent.w/2 - doorWidth/2; hallY = parent.y + parent.h; hallW = doorWidth; hallH = gap; doorCX = hallX + hallW/2; doorCY = hallY + hallH/2; hallSubtype = 'VERT'; }

      if (checkOverlap(x, y, w, h)) return;
      addDoorZone(doorCX, doorCY); 
      const roomId = `room-${Math.floor(x)}-${Math.floor(y)}`;
      if (direction === 'west') parent.hasConnection.left = true;
      if (direction === 'east') parent.hasConnection.right = true;
      if (direction === 'south') parent.hasConnection.bottom = true;

      // ROOM SHAPE VARIATION (L, T, Rect)
      // Determine if we apply structural blocks to shape the room
      const shapeType = Math.random();
      const newRoom: Room = { id: roomId, x, y, w, h, hasConnection: { top: direction === 'south', right: direction === 'west', bottom: false, left: direction === 'east' }, type: Math.random() > 0.7 ? 'STORAGE' : 'NORMAL', visited: false };
      registerRoom(newRoom);
      
      // Add Structural Blocks for Shapes
      // Don't block the door! 
      // Entry is based on direction.
      // If South (Top Entry): Don't block top-center.
      // If West (Right Entry): Don't block right-center.
      // If East (Left Entry): Don't block left-center.
      
      // 30% chance for complex shape if room is big enough
      if (w > 220 && h > 220 && shapeType < 0.35) {
          const blockW = w * 0.4;
          const blockH = h * 0.4;
          const corners = [
              { x: x, y: y }, // Top-Left
              { x: x + w - blockW, y: y }, // Top-Right
              { x: x, y: y + h - blockH }, // Bottom-Left
              { x: x + w - blockW, y: y + h - blockH } // Bottom-Right
          ];
          
          // Filter out corners that would block the entrance door
          const safeCorners = corners.filter(c => {
              // Expand block slightly for safety check
              const bx = c.x - 10, by = c.y - 10, bw = blockW + 20, bh = blockH + 20;
              // Check intersection with door center
              if (doorCX > bx && doorCX < bx + bw && doorCY > by && doorCY < by + bh) return false;
              return true;
          });

          if (safeCorners.length > 0) {
              // Pick 1 for L-Shape, 2 for T-shape/U-shape
              const numBlocks = (Math.random() < 0.3 && safeCorners.length >= 2) ? 2 : 1;
              for(let i=0; i<numBlocks; i++) {
                  if (safeCorners.length === 0) break;
                  const idx = Math.floor(Math.random() * safeCorners.length);
                  const c = safeCorners.splice(idx, 1)[0];
                  // Add as a wall
                  addWall(c.x, c.y, blockW, blockH);
              }
          }
      }

      const hallRoom: Room = { id: `hall-${roomId}`, x: hallX, y: hallY, w: hallW, h: hallH, hasConnection: { top: false, bottom: false, left: false, right: false }, type: 'HALLWAY', subtype: hallSubtype, visited: false };
      registerRoom(hallRoom);

      if (Math.random() < lockedChance) {
          const isPin = Math.random() > 0.5;
          const lockVal = Math.floor(1000 + Math.random() * 9000);
          interactables.push({ id: `door-${roomId}`, type: EntityType.INTERACTABLE, interactType: 'DOOR', pos: { x: doorCX, y: doorCY }, size: doorWidth + 10, color: '#991b1b', isActive: false, locked: true, lockType: isPin ? 'PIN' : 'KEY', lockValue: lockVal });
          const keyItem: Item = { id: isPin ? `note-${lockVal}` : `key-${lockVal}`, type: EntityType.ITEM, itemType: isPin ? ItemType.PIN_CODE : ItemType.KEY, value: lockVal, name: isPin ? 'Pincode Slip' : `Room Key ${lockVal}`, pos: { x: 0, y: 0 }, size: 10, color: '#fff' };
          // Keys in drawers
          placeInteractableSafely(parent, Math.random()>0.5?'DRAWER':'CHEST', keyItem, true);
      }

      const children = ['west', 'east', 'south'].filter(d => { if (direction === 'west' && d === 'east') return false; if (direction === 'east' && d === 'west') return false; if (direction === 'south' && d === 'north') return false; return true; });
      
      // Dynamic branching probability based on depthRatio AND Room Size
      // Large rooms spawn fewer sub-rooms to keep density balanced
      let sizePenalty = 0;
      if (w * h > 60000) sizePenalty = 0.3; // If massive room, reduced chance of children

      const recursionChance = Math.max(0.1, (0.4 + (depthRatio * 0.4)) - sizePenalty);

      children.forEach(d => { 
          if (Math.random() < recursionChance) createBranch(newRoom, depth + 1, d as any, Math.min(0.8, lockedChance + 0.1)); 
      });
  };

  // Branch Generation
  if (depthRatio < 0.1) {
      // Top Floors
      const dirs = ['west', 'east', 'south'];
      for (let i = dirs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [dirs[i], dirs[j]] = [dirs[j], dirs[i]]; }
      createBranch(centralRoom, 1, dirs[0] as any, 0.1); 
      if (Math.random() < 0.3) createBranch(centralRoom, 1, dirs[1] as any, 0.1);
  } else {
      // Deeper floors
      const dirs = ['west', 'east', 'south'];
      const numBranches = 1 + Math.floor(Math.random() * 2); 
      const actualBranches = depthRatio > 0.3 ? Math.max(2, numBranches) : numBranches;
      const availableDirs = [...dirs];
      for (let i = 0; i < actualBranches; i++) {
          if (availableDirs.length > 0) {
              const idx = Math.floor(Math.random() * availableDirs.length);
              const d = availableDirs.splice(idx, 1)[0];
              createBranch(centralRoom, 1, d as any, 0.1 + (depthRatio * 0.2));
          }
      }
  }

  // --- WALLS GENERATION ---
  const buildWalls = (r: Room) => {
      if (r.hasConnection.top) { const mid = r.x + r.w/2; addWall(r.x, r.y, (r.w - doorWidth)/2, wallThickness); addWall(mid + doorWidth/2, r.y, (r.w - doorWidth)/2, wallThickness); } else addWall(r.x, r.y, r.w, wallThickness);
      if (r.hasConnection.bottom) { const mid = r.x + r.w/2; addWall(r.x, r.y + r.h - wallThickness, (r.w - doorWidth)/2, wallThickness); addWall(mid + doorWidth/2, r.y + r.h - wallThickness, (r.w - doorWidth)/2, wallThickness); } else addWall(r.x, r.y + r.h - wallThickness, r.w, wallThickness);
      if (r.hasConnection.left) { const mid = r.y + r.h/2; addWall(r.x, r.y, wallThickness, (r.h - doorWidth)/2); addWall(r.x, mid + doorWidth/2, wallThickness, (r.h - doorWidth)/2); } else addWall(r.x, r.y, wallThickness, r.h);
      if (r.hasConnection.right) { const mid = r.y + r.h/2; addWall(r.x + r.w - wallThickness, r.y, wallThickness, (r.h - doorWidth)/2); addWall(r.x + r.w - wallThickness, mid + doorWidth/2, wallThickness, (r.h - doorWidth)/2); } else addWall(r.x + r.w - wallThickness, r.y, wallThickness, r.h);
  };
  rooms.forEach(r => {
      if (r.type === 'ELEVATOR') { addWall(r.x, r.y, wallThickness, r.h); addWall(r.x + r.w - wallThickness, r.y, wallThickness, r.h); addWall(r.x, r.y, r.w, wallThickness); addWall(r.x, r.y + r.h - wallThickness, (r.w - doorWidth)/2, wallThickness); addWall(r.x + r.w/2 + doorWidth/2, r.y + r.h - wallThickness, (r.w - doorWidth)/2, wallThickness); } 
      else if (r.type === 'HALLWAY') { if (r.subtype === 'VERT') { addWall(r.x - wallThickness, r.y, wallThickness, r.h); addWall(r.x + r.w, r.y, wallThickness, r.h); } else { addWall(r.x, r.y - wallThickness, r.w, wallThickness); addWall(r.x, r.y + r.h, r.w, wallThickness); } } 
      else { buildWalls(r); }
  });

  const isPositionClearForEnemy = (x: number, y: number, size: number) => {
    // Basic check against interactables + walls
    if (checkPropCollision(x, y, size)) return false;
    return true;
  };

  // --- EXIT ---
  if (floor === 1) {
      const potentialRooms = rooms.filter(r => r.type !== 'ELEVATOR' && r.id !== 'central' && r.type !== 'HALLWAY');
      const exitRoom = potentialRooms.length > 0 ? potentialRooms[potentialRooms.length - 1] : centralRoom;
      interactables.push({ id: 'exit-door', type: EntityType.INTERACTABLE, interactType: 'EXIT', pos: { x: exitRoom.x + exitRoom.w/2, y: exitRoom.y + exitRoom.h/2 }, size: 60, color: '#fff', isActive: true, locked: false });
  }

  // --- PROP POPULATION ---
  const notesFoundCount = loreProgress.length;
  const maxLore = LORE_TEXTS[difficulty] ? LORE_TEXTS[difficulty].length : 10;
  const shouldSpawnLore = notesFoundCount < maxLore && floor <= (maxFloor - (notesFoundCount * (maxFloor/10)));

  // Tracking for closet density
  let closetCounter = 0;

  rooms.forEach((r, idx) => {
      if (r.type === 'ELEVATOR' || r.type === 'HALLWAY') return;

      // Closet Distribution Logic
      // Ensure at least 1 closet every 3 rooms. Cap at 3 per room.
      closetCounter++;
      let closetCount = 0;
      let forceCloset = false;
      
      if (r.id !== 'central') {
          if (closetCounter >= 3) { forceCloset = true; closetCounter = 0; }
          
          if (forceCloset || Math.random() < 0.25) {
              const num = 1 + Math.floor(Math.random() * 2); // 1 or 2 closets, rarely 3
              const cap = Math.min(3, num);
              for(let k=0; k<cap; k++) {
                   placeInteractableSafely(r, 'CLOSET', undefined, true); // Align to wall
                   closetCount++;
              }
              if (closetCount > 0) closetCounter = 0;
          }
      }

      let numStorage = 0;
      if (depthRatio < 0.2) { 
          numStorage = 3 + Math.floor(Math.random() * 2); 
      } else if (floor <= Math.max(1, Math.floor(maxFloor * 0.05))) { 
          numStorage = 4;
      } else { 
          const lootScale = Math.floor(depthRatio * 4); 
          numStorage = 2 + Math.floor(Math.random() * 3) + lootScale; 
      }
      
      for (let i = 0; i < numStorage; i++) {
          let content: Item | undefined = undefined;
          
          const rand = Math.random();
          if (Math.random() < 0.475) { 
              if (rand < 0.25) content = { id: `bat-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.BATTERY, value: 7, name: 'Battery', pos: {x:0,y:0}, size:0, color:''}; 
              else if (rand < 0.30) content = { id: `fuel-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.FUEL, value: 40, name: 'Fuel Can', pos: {x:0,y:0}, size:0, color:''}; 
              else if (rand < 0.35) content = { id: `spd-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.SPEED_POTION, name: 'Swift Potion', pos: {x:0,y:0}, size:0, color:''}; 
              else if (rand < 0.40) content = { id: `fb-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.FLASHBANG, name: 'Flashbang', pos: {x:0,y:0}, size:0, color:''}; 
              else if (rand < 0.42) content = { id: `inv-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.INVISIBILITY_POTION, name: 'Invis Potion', pos: {x:0,y:0}, size:0, color:''}; 
              else if (rand < 0.47) content = { id: `med-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.MEDKIT, name: 'Medkit', pos: {x:0,y:0}, size:0, color:''}; 
              else if (rand < 0.475) content = { id: `rep-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.REPELLENT_POTION, name: 'Repellent', pos: {x:0,y:0}, size:0, color:''}; 
          }
          
          // Drawers align to walls, Chests can be anywhere (but placeInteractableSafely defaults to random if align=false)
          // Make Drawers more common for wall storage
          if (Math.random() > 0.3) {
             placeInteractableSafely(r, 'DRAWER', content, true); // Wall aligned
          } else {
             placeInteractableSafely(r, 'CHEST', content, false);
          }
      }
      
      // Spawn Lore
      if (shouldSpawnLore && items.filter(i => i.itemType === ItemType.LORE_NOTE).length === 0) {
          const loreItem: Item = { id: `lore-${notesFoundCount}`, type: EntityType.ITEM, itemType: ItemType.LORE_NOTE, name: 'Mysterious Page', loreId: notesFoundCount, pos: { x: 0, y: 0 }, size: 15, color: '#8b5cf6' };
          // Lore almost always in a distinct chest or drawer
          placeInteractableSafely(r, 'CHEST', loreItem, false);
          items.push(loreItem); 
      }

      // Enemy Generation
      const settings = difficultySettings; 
      const spawnChance = settings.spawnRate + (threatLevel/120) + 0.15;
      const baseRadius = 300; const extraRadius = threatLevel * 1.5; const detectionRadius = baseRadius + extraRadius;

      if (r.id !== 'central' && !actualIsSafe && Math.random() < spawnChance) {
          const rand = Math.random();
          let mType = EntityType.ENEMY_LURKER; let color = '#581c87'; let speed = (settings.enemySpeedMult || 1) * (1.6 + (threatLevel/200));
          const trySpawnEnemy = (enemyObj: Enemy) => {
             let attempts = 0;
             while (attempts < 5) {
                const rx = (Math.random() - 0.5) * (r.w - 40); const ry = (Math.random() - 0.5) * (r.h - 40); const ex = r.x + r.w/2 + rx; const ey = r.y + r.h/2 + ry;
                if (isPositionClearForEnemy(ex, ey, enemyObj.size)) { enemyObj.pos = { x: ex, y: ey }; enemies.push(enemyObj); return true; }
                attempts++;
             }
             return false;
          };

          if (rand < 0.3) { mType = EntityType.ENEMY_LURKER; trySpawnEnemy({ id: `en-${r.id}`, type: mType, subType: mType, pos: {x:0, y:0}, size: 26, color, state: 'IDLE', lastKnownPlayerPos: null, stunTimer: 0, speed, health: 3, roomId: r.id, detectionRadius: detectionRadius }); } 
          else if (rand < 0.5) { mType = EntityType.ENEMY_SHADE; color = '#000000'; trySpawnEnemy({ id: `en-${r.id}`, type: mType, subType: mType, pos: {x:0, y:0}, size: 26, color, state: 'IDLE', lastKnownPlayerPos: null, stunTimer: 0, speed: speed * 1.5, health: 3, roomId: r.id, detectionRadius: detectionRadius * 0.8 }); } 
          else if (rand < 0.7) { mType = EntityType.ENEMY_PHANTOM; color = '#06b6d4'; trySpawnEnemy({ id: `en-${r.id}`, type: mType, subType: mType, pos: {x:0, y:0}, size: 24, color, state: 'IDLE', lastKnownPlayerPos: null, stunTimer: 0, speed: speed * 1.8, health: 3, roomId: r.id, detectionRadius: detectionRadius * 1.2 }); } 
          else if (rand < 0.9) { mType = EntityType.ENEMY_SWARM; color = '#a16207'; for (let j=0; j<5; j++) { trySpawnEnemy({ id: `en-${r.id}-sw-${j}`, type: mType, subType: mType, pos: {x:0, y:0}, size: 12, color, state: 'IDLE', lastKnownPlayerPos: null, stunTimer: 0, speed: speed * 2.0, health: 1, roomId: r.id, exposureTime: 0, detectionRadius: detectionRadius * 0.6 }); } } 
          else { mType = EntityType.ENEMY_CHASER; color = '#7f1d1d'; trySpawnEnemy({ id: `en-${r.id}`, type: mType, subType: mType, pos: {x:0, y:0}, size: 28, color, state: 'IDLE', lastKnownPlayerPos: null, stunTimer: 0, speed: speed * 1.1, health: 3, roomId: r.id, detectionRadius: detectionRadius * 1.5 }); }
      }
  });

  // Generator & Cable Logic
  const normalRooms = rooms.filter(r => r.type === 'NORMAL' || r.type === 'STORAGE');
  let genChance = 0.06 + (depthRatio * 0.05); 
  if (floor === 2 && difficultySettings.spawnRate === 0.5) genChance = 1.0; 
  if (normalRooms.length > 0 && floor !== 1 && Math.random() < genChance) {
      const target = normalRooms[normalRooms.length-1];
      placeInteractableSafely(target, 'GENERATOR', undefined, false); // Generators can be anywhere
      const gen = interactables[interactables.length-1];
      if (gen) {
          gen.interactType = 'GENERATOR'; gen.size = 45; gen.color = '#f97316'; gen.locked = true;
          const containers = interactables.filter(i => i.interactType === 'CHEST' || i.interactType === 'DRAWER');
          const cableItem: Item = { id: `cable-${floor}`, type: EntityType.ITEM, itemType: ItemType.CABLE, name: 'Heavy Cable', pos: {x:0,y:0}, size:0, color:'#fbbf24' };
          if (containers.length > 0) { const container = containers[Math.floor(Math.random() * containers.length)]; container.contents = cableItem; } else { placeInteractableSafely(target, 'CHEST', cableItem, false); }
      }
  }

  const floorItems = items.filter(i => i.itemType !== ItemType.LORE_NOTE);
  return { floorNumber: floor, rooms, walls, enemies, items: floorItems, interactables, elevatorDoorOpen: true };
};
