
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LORE_READING = 'LORE_READING',
  ELEVATOR = 'ELEVATOR',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  CUSTOM = 'CUSTOM',
  TUTORIAL = 'TUTORIAL'
}

export interface CustomDifficultyConfig {
  maxHealth: number;
  maxInventory: number;
  batteryDrain: number;
  elevatorCost: number;
  elevatorCostPerFloor?: number;
  enemySpeedMult: number;
  spawnRate: number;
  safeFloors: number;
}

export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY_CHASER = 'ENEMY_CHASER',
  ENEMY_LURKER = 'ENEMY_LURKER',
  ENEMY_SHADE = 'ENEMY_SHADE',
  ENEMY_SWARM = 'ENEMY_SWARM',
  ENEMY_PHANTOM = 'ENEMY_PHANTOM', 
  ENEMY_DREAD_SNAKE = 'ENEMY_DREAD_SNAKE', 
  ITEM = 'ITEM',
  INTERACTABLE = 'INTERACTABLE'
}

export enum ItemType {
  FLASHLIGHT = 'FLASHLIGHT',
  BATTERY = 'BATTERY',
  FUEL = 'FUEL',
  CABLE = 'CABLE',
  KEY = 'KEY',
  MEDKIT = 'MEDKIT',
  SPEED_POTION = 'SPEED_POTION',
  FLASHBANG = 'FLASHBANG',
  PIN_CODE = 'PIN_CODE', 
  LORE_NOTE = 'LORE_NOTE',
  INVISIBILITY_POTION = 'INVISIBILITY_POTION',
  REPELLENT_POTION = 'REPELLENT_POTION'
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Position;
  size: number;
  color: string;
  rotation?: number; 
}

export interface Enemy extends Entity {
  subType: EntityType;
  state: 'IDLE' | 'CHASING' | 'SEARCHING' | 'FLEEING' | 'STUNNED' | 'DYING';
  lastKnownPlayerPos: Position | null;
  stunTimer: number;
  speed: number;
  health: number;
  roomId?: string; 
  exposureTime?: number; 
  detectionRadius?: number; 
}

export interface Item extends Entity {
  itemType: ItemType;
  value?: number; // battery amount, key ID, or PIN code
  name: string;
  loreId?: number; // For Lore Notes
}

export interface Interactable extends Entity {
  interactType: 'DOOR' | 'GENERATOR' | 'CLOSET' | 'ELEVATOR_CONSOLE' | 'EXIT' | 'DRAWER' | 'CHEST';
  isActive: boolean; 
  locked: boolean;
  lockType?: 'KEY' | 'PIN';
  lockValue?: number; 
  contents?: Item; 
}

export interface Room {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hasConnection: { top: boolean; right: boolean; bottom: boolean; left: boolean }; 
  type: 'ELEVATOR' | 'NORMAL' | 'HALLWAY' | 'STORAGE';
  subtype?: 'HORZ' | 'VERT'; 
  visited: boolean;
}

export interface PlayerState {
  health: number;
  maxHealth: number;
  inventory: Item[];
  equippedItemIndex: number;
  battery: number;
  stamina: number;
  noiseLevel: number;
  movementMode: 'CROUCH' | 'WALK' | 'RUN';
  flashlightOn: boolean;
  flashbangCooldown: number;
  abilityCooldown: number;
  isHiding: boolean;
  hidingTimer: number; 
  speedMultiplier: number;
  activeNote: Item | null; 
  interactingWithPinPad: Interactable | null; 
  isCarryingCable: boolean;
  loreCollected: number[];
  isInvisible: boolean;
  isRepelling: boolean; 
}

export interface GameLevel {
  floorNumber: number;
  rooms: Room[];
  walls: { x: number; y: number; w: number; h: number }[];
  enemies: Enemy[];
  items: Item[];
  interactables: Interactable[];
  elevatorDoorOpen: boolean;
}

export interface SaveData {
  difficulty: Difficulty;
  currentLevel: number;
  playerState: PlayerState;
  timeElapsed: number;
  customConfig?: CustomDifficultyConfig;
  loreProgress: number[];
  levelState?: GameLevel; // Saved level layout and entity positions
  playerPos?: Position;   // Saved player position
}
