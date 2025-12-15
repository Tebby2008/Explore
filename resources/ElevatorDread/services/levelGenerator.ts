
import { GameLevel, Room, Item, Enemy, EntityType, ItemType, Interactable as InteractableType, Difficulty } from "../types";
import { CANVAS_WIDTH, CANVAS_HEIGHT, LORE_TEXTS } from "../constants";

export const generateLevel = (floor: number, difficultySettings: any, isSafeFloor: boolean, loreProgress: number[], difficulty: Difficulty): GameLevel => {
  const rooms: Room[] = [];
  const walls: { x: number; y: number; w: number; h: number }[] = [];
  const enemies: Enemy[] = [];
  const items: Item[] = [];
  const interactables: InteractableType[] = [];

  // Tutorial Logic Override
  let actualIsSafe = isSafeFloor;
  if (difficultySettings.safeFloors === 0 && floor === 5) {
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
      doorZones.push({x, y, r: 50}); 
  };

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

  // Closets
  interactables.push({ id: 'closet-c1', type: EntityType.INTERACTABLE, interactType: 'CLOSET', pos: { x: centralX + 60, y: centralY + 60 }, size: 40, color: '#444', isActive: false, locked: false });
  interactables.push({ id: 'closet-c2', type: EntityType.INTERACTABLE, interactType: 'CLOSET', pos: { x: centralX + centralW - 80, y: centralY + 60 }, size: 40, color: '#444', isActive: false, locked: false });


  const threatLevel = (100 - floor); 
  let maxDepth = 1;
  // Increased depth logic for slightly larger maps
  if (floor < 95) maxDepth = 2;
  if (floor < 75) maxDepth = 3;
  if (floor < 45) maxDepth = 4;
  if (floor < 15) maxDepth = 5;
  
  if (floor <= 5) maxDepth = 1;

  const placeInteractableSafely = (r: Room, type: 'CLOSET'|'CHEST'|'DRAWER'|'GENERATOR', contents?: Item) => {
      let attempts = 0;
      while(attempts < 10) {
          const padding = 30;
          const px = r.x + padding + Math.random() * (r.w - padding*2);
          const py = r.y + padding + Math.random() * (r.h - padding*2);
          const inDoorZone = doorZones.some(d => Math.hypot(px - d.x, py - d.y) < d.r + 30); 
          const overlapOther = interactables.some(i => Math.hypot(px - i.pos.x, py - i.pos.y) < 50);

          if (!inDoorZone && !overlapOther) {
               interactables.push({
                  id: `int-${r.id}-${interactables.length}`, type: EntityType.INTERACTABLE, interactType: type,
                  pos: { x: px, y: py },
                  size: 30, color: type === 'CHEST' ? '#d97706' : '#78350f', isActive: false, locked: false, contents: contents
               });
               return;
          }
          attempts++;
      }
  };

  const placeItemSafely = (r: Room, item: Item, containerType: 'CHEST'|'DRAWER') => {
      placeInteractableSafely(r, containerType, item);
  };

  const createBranch = (parent: Room, depth: number, direction: 'west'|'east'|'south', lockedChance: number) => {
      if (depth > maxDepth) return;

      const w = 180 + Math.random() * 80;
      const h = 180 + Math.random() * 80;
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

      const newRoom: Room = { id: roomId, x, y, w, h, hasConnection: { top: direction === 'south', right: direction === 'west', bottom: false, left: direction === 'east' }, type: Math.random() > 0.7 ? 'STORAGE' : 'NORMAL', visited: false };
      registerRoom(newRoom);
      
      const hallRoom: Room = { id: `hall-${roomId}`, x: hallX, y: hallY, w: hallW, h: hallH, hasConnection: { top: false, bottom: false, left: false, right: false }, type: 'HALLWAY', subtype: hallSubtype, visited: false };
      registerRoom(hallRoom);

      if (Math.random() < lockedChance) {
          const isPin = Math.random() > 0.5;
          const lockVal = Math.floor(1000 + Math.random() * 9000);
          interactables.push({ id: `door-${roomId}`, type: EntityType.INTERACTABLE, interactType: 'DOOR', pos: { x: doorCX, y: doorCY }, size: doorWidth + 10, color: '#991b1b', isActive: false, locked: true, lockType: isPin ? 'PIN' : 'KEY', lockValue: lockVal });
          const keyItem: Item = { id: isPin ? `note-${lockVal}` : `key-${lockVal}`, type: EntityType.ITEM, itemType: isPin ? ItemType.PIN_CODE : ItemType.KEY, value: lockVal, name: isPin ? 'Pincode Slip' : `Room Key ${lockVal}`, pos: { x: 0, y: 0 }, size: 10, color: '#fff' };
          placeItemSafely(parent, keyItem, Math.random()>0.5?'DRAWER':'CHEST');
      }

      const children = ['west', 'east', 'south'].filter(d => { if (direction === 'west' && d === 'east') return false; if (direction === 'east' && d === 'west') return false; if (direction === 'south' && d === 'north') return false; return true; });
      children.forEach(d => { if (Math.random() < 0.7) createBranch(newRoom, depth + 1, d as any, Math.min(0.8, lockedChance + 0.1)); });
  };

  if (floor > 90) {
      const dirs = ['west', 'east', 'south'];
      const numBranches = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numBranches; i++) {
          const d = dirs.splice(Math.floor(Math.random() * dirs.length), 1)[0];
          createBranch(centralRoom, 1, d as any, 0.1);
      }
  } else {
      createBranch(centralRoom, 1, 'west', 0.1);
      createBranch(centralRoom, 1, 'east', 0.1);
      createBranch(centralRoom, 1, 'south', 0.1);
  }

  // --- WALLS GENERATION ---
  const addWall = (x: number, y: number, w: number, h: number) => walls.push({x, y, w, h});
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
    for (const i of interactables) {
        if (x < i.pos.x + i.size/2 + size && x + size > i.pos.x - i.size/2 - size && y < i.pos.y + i.size/2 + size && y + size > i.pos.y - i.size/2 - size) return false;
    }
    for (const w of walls) {
        if (x < w.x + w.w && x + size > w.x && y < w.y + w.h && y + size > w.y) return false;
    }
    return true;
  };

  // --- EXIT ---
  if (floor === 1) {
      const potentialRooms = rooms.filter(r => r.type !== 'ELEVATOR' && r.id !== 'central' && r.type !== 'HALLWAY');
      const exitRoom = potentialRooms.length > 0 ? potentialRooms[potentialRooms.length - 1] : centralRoom;
      interactables.push({ id: 'exit-door', type: EntityType.INTERACTABLE, interactType: 'EXIT', pos: { x: exitRoom.x + exitRoom.w/2, y: exitRoom.y + exitRoom.h/2 }, size: 60, color: '#fff', isActive: true, locked: false });
  }

  // --- LORE SPAWNING ---
  const notesFoundCount = loreProgress.length;
  const maxLore = LORE_TEXTS[difficulty] ? LORE_TEXTS[difficulty].length : 10;
  
  const shouldSpawnLore = notesFoundCount < maxLore && floor <= (100 - (notesFoundCount * 10));

  rooms.forEach(r => {
      if (r.type === 'ELEVATOR' || r.type === 'HALLWAY') return;

      // Reduced Closet chance from 0.3 to 0.2
      if (r.id !== 'central' && Math.random() < 0.2) {
           placeInteractableSafely(r, 'CLOSET');
      }

      let numStorage = 0;
      // Decreased storage count logic
      if (floor > 80) numStorage = 3 + Math.floor(Math.random() * 2); 
      else if (floor <= 5) numStorage = 4;
      else { const lootScale = Math.floor((100 - floor) / 20); numStorage = 2 + Math.floor(Math.random() * 3) + lootScale; }
      
      for (let i = 0; i < numStorage; i++) {
          let content: Item | undefined = undefined;
          
          // Container spawn logic is implicitly reduced by reducing numStorage.
          // Item probability within a container:
          const rand = Math.random();
          // Probabilities: Battery 20%, Fuel 3%, Swift 5%, Flash 5%, Invis 2%, Medkit 2%, Repellent 0.5%
          // Cumulative: 0.20, 0.23, 0.28, 0.33, 0.35, 0.37, 0.375
          
          if (Math.random() < 0.375) { // Chance that container has an item at all
              if (rand < 0.20) content = { id: `bat-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.BATTERY, value: 7, name: 'Battery', pos: {x:0,y:0}, size:0, color:''}; // 15%
              else if (rand < 0.23) content = { id: `fuel-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.FUEL, value: 40, name: 'Fuel Can', pos: {x:0,y:0}, size:0, color:''}; // 3%
              else if (rand < 0.28) content = { id: `spd-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.SPEED_POTION, name: 'Swift Potion', pos: {x:0,y:0}, size:0, color:''}; // 5%
              else if (rand < 0.33) content = { id: `fb-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.FLASHBANG, name: 'Flashbang', pos: {x:0,y:0}, size:0, color:''}; // 5%
              else if (rand < 0.35) content = { id: `inv-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.INVISIBILITY_POTION, name: 'Invis Potion', pos: {x:0,y:0}, size:0, color:''}; // 2%
              else if (rand < 0.37) content = { id: `med-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.MEDKIT, name: 'Medkit', pos: {x:0,y:0}, size:0, color:''}; // 2%
              else if (rand < 0.375) content = { id: `rep-${r.id}-${i}`, type: EntityType.ITEM, itemType: ItemType.REPELLENT_POTION, name: 'Repellent', pos: {x:0,y:0}, size:0, color:''}; // 0.5%
          }
          
          placeInteractableSafely(r, Math.random()>0.5?'CHEST':'DRAWER', content);
      }
      
      // Spawn Lore in container if applicable
      if (shouldSpawnLore && items.filter(i => i.itemType === ItemType.LORE_NOTE).length === 0) {
          const loreItem: Item = { id: `lore-${notesFoundCount}`, type: EntityType.ITEM, itemType: ItemType.LORE_NOTE, name: 'Mysterious Page', loreId: notesFoundCount, pos: { x: 0, y: 0 }, size: 15, color: '#8b5cf6' };
          placeInteractableSafely(r, 'CHEST', loreItem);
          items.push(loreItem); 
      }

      // Enemy Generation
      const settings = difficultySettings; 
      const spawnChance = settings.spawnRate + (threatLevel/150) + 0.1;
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

  // Generator & Cable Logic (same as before)
  const normalRooms = rooms.filter(r => r.type === 'NORMAL' || r.type === 'STORAGE');
  let genChance = 0.06; if (floor === 2 && difficultySettings.spawnRate === 0.5) genChance = 1.0; 
  if (normalRooms.length > 0 && floor !== 1 && Math.random() < genChance) {
      const target = normalRooms[normalRooms.length-1];
      placeInteractableSafely(target, 'GENERATOR');
      const gen = interactables[interactables.length-1];
      if (gen) {
          gen.interactType = 'GENERATOR'; gen.size = 45; gen.color = '#f97316'; gen.locked = true;
          const containers = interactables.filter(i => i.interactType === 'CHEST' || i.interactType === 'DRAWER');
          const cableItem: Item = { id: `cable-${floor}`, type: EntityType.ITEM, itemType: ItemType.CABLE, name: 'Heavy Cable', pos: {x:0,y:0}, size:0, color:'#fbbf24' };
          if (containers.length > 0) { const container = containers[Math.floor(Math.random() * containers.length)]; container.contents = cableItem; } else { placeInteractableSafely(target, 'CHEST', cableItem); }
      }
  }

  // Remove the lore item from 'items' list so it doesn't spawn on floor too, since we added it to container
  const floorItems = items.filter(i => i.itemType !== ItemType.LORE_NOTE);

  return { floorNumber: floor, rooms, walls, enemies, items: floorItems, interactables, elevatorDoorOpen: true };
};
