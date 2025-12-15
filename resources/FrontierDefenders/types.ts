export enum TowerType {
  SCOUT = 'SCOUT',
  SOLDIER = 'SOLDIER',
  MINIGUNNER = 'MINIGUNNER',
  SNIPER = 'SNIPER',
  ROCKETEER = 'ROCKETEER',
  MEDIC = 'MEDIC',
  COMMANDER = 'COMMANDER',
  CAMP = 'CAMP',
  MILITARY_CAMP = 'MILITARY_CAMP',
  RIFLING_SQUAD = 'RIFLING_SQUAD',
  RAILGUNNER = 'RAILGUNNER',
  MORTAR = 'MORTAR',
  FARM = 'FARM',
  COWBOY = 'COWBOY',
  PHASER = 'PHASER',
  SHOCKER = 'SHOCKER',
  SNOWBALLER = 'SNOWBALLER'
}

export enum TargetingMode {
  FIRST = 'FIRST',
  LAST = 'LAST',
  STRONGEST = 'STRONGEST',
  WEAKEST = 'WEAKEST',
  CLOSEST = 'CLOSEST',
  RANDOM = 'RANDOM'
}

export enum PhaserState {
  IDLE = 0,
  CHARGING = 1,
  FIRING = 2,
  COOLDOWN = 3
}

export enum EnemyType {
  // T1 - Basic Early
  BASIC = 'BASIC', FAST = 'FAST', TANK = 'TANK', 
  BANDIT = 'BANDIT', WOLF = 'WOLF', SLIME = 'SLIME', GOBLIN = 'GOBLIN', ORC = 'ORC',
  
  // T2 - Undead
  ZOMBIE = 'ZOMBIE', ZOMBIE_RUNNER = 'ZOMBIE_RUNNER', GHOUL = 'GHOUL', ABOMINATION = 'ABOMINATION',
  // T3 - Mech
  MECH_DROID = 'MECH_DROID', MECH_WALKER = 'MECH_WALKER', SHIELD_BOT = 'SHIELD_BOT', DRONE_SWARM = 'DRONE_SWARM',
  // T4 - Elemental
  FIRE_SPRITE = 'FIRE_SPRITE', ICE_GOLEM = 'ICE_GOLEM', ROCK_ELEMENTAL = 'ROCK_ELEMENTAL', STORM_WISP = 'STORM_WISP',
  // T5 - Elite
  ARMORED_LEAD = 'ARMORED_LEAD', ASSASSIN = 'ASSASSIN', PALADIN = 'PALADIN',
  // Special
  HIDDEN = 'HIDDEN', LEAD = 'LEAD',
  // Bosses
  BOSS_STOMPER = 'BOSS_STOMPER',
  BOSS_SUMMONER = 'BOSS_SUMMONER',
  BOSS_TITAN = 'BOSS_TITAN',
  BOSS_SPEEDSTER = 'BOSS_SPEEDSTER',
  BOSS_PHANTOM = 'BOSS_PHANTOM',
  BOSS_NECROMANCER = 'BOSS_NECROMANCER',
  BOSS_CONSTRUCTOR = 'BOSS_CONSTRUCTOR',
  BOSS_INFERNO = 'BOSS_INFERNO',
  BOSS_ZERO = 'BOSS_ZERO',
  BOSS_THE_END = 'BOSS_THE_END'
}

export enum UnitType {
  JEEP = 'JEEP',
  SQUAD = 'SQUAD',
}

export enum DamageType {
  PHYSICAL = 'PHYSICAL',
  EXPLOSIVE = 'EXPLOSIVE',
  ENERGY = 'ENERGY',
  MAGIC = 'MAGIC',
  ICE = 'ICE',
  ELECTRIC = 'ELECTRIC'
}

export enum TileType {
  GRASS = 0,
  PATH = 1,
  CLIFF = 2,
  SPAWN = 3,
  BASE = 4
}

export enum BiomeType {
  GRASSLAND = 'GRASSLAND',
  DESERT = 'DESERT',
  SNOW = 'SNOW',
  VOLCANIC = 'VOLCANIC',
  ALIEN = 'ALIEN'
}

export interface Position {
  x: number;
  y: number;
}

export interface PathNode extends Position {
  index: number;
}

export interface TowerStats {
  damage: number;
  range: number;
  cooldown: number; // in frames
  cost: number;
  projectiles?: number;
  pierce?: number;
  detectsHidden: boolean;
  piercesLead: boolean;
  description: string;
  name: string;
  isCliff: boolean;
  placementRadius: number; // For hitbox
  placementLimit?: number; // Max number of this tower allowed
  rotationSpeed: number; // radians per frame
  chargeTime?: number; // for Phaser
  fireDuration?: number; // for Phaser
  abilityCooldown?: number; // frames
  abilityDuration?: number; // frames
  // Burst logic
  burstCount?: number; 
  burstRate?: number; // frames between burst shots
  // Stun logic
  stunDuration?: number;
  chainCount?: number;
  freezeStacks?: number;
}

export interface TowerInstance {
  id: string;
  type: TowerType;
  level: number;
  x: number;
  y: number;
  rotation: number;
  targetRotation: number;
  lastShot: number;
  lastAbility?: number; 
  stats: TowerStats;
  buffs: {
    rangeMultiplier: number;
    firerateMultiplier: number;
    damageMultiplier: number;
  };
  stunnedUntil: number; // Frame number
  totalDamageDealt: number;
  cashGenerated: number;
  
  // New properties
  targetingMode: TargetingMode;
  phaserState?: PhaserState;
  phaserTimer?: number; // Used for charging, firing, and cooldown tracking
  phaserTargetId?: string | null;

  abilityCooldownTimer: number;
  abilityActiveTimer: number;

  // Burst state
  burstRemaining: number;
  burstTimer: number;
}

export interface EnemyInstance {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  rotation: number;
  pathIndex: number; // Progress along path
  health: number;
  maxHealth: number;
  speed: number;
  frozen: number; // Frames (Hard stun)
  chillStacks: number; // For snowballer
  isLead: boolean;
  isHidden: boolean;
  radius: number;
  frameOffset: number; // For animation
  regenRate?: number;
}

export interface UnitInstance {
  id: string;
  type: UnitType;
  x: number;
  y: number;
  rotation: number; 
  pathIndex: number; 
  health: number;
  damage: number;
  range: number;
  cooldown: number;
  lastAttack: number;
  targetId: string | null;
  moving: boolean;
  isCollision: boolean; 
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  type: DamageType;
  pierce: number;
  aoeRadius: number;
  hitList: string[]; 
  color: string;
  sourceTowerId?: string;
  isBeam?: boolean; // Visual tag
  isSnowball?: boolean;
}

export interface VisualEffect {
    id: string;
    type: 'BEAM' | 'EXPLOSION' | 'TEXT' | 'CHAIN';
    x: number;
    y: number;
    ex?: number; // end x
    ey?: number; // end y
    life: number;
    maxLife: number;
    color: string;
    text?: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface MapConfig {
  scale: number; // 1-5
  width: number;
  height: number;
  biome: BiomeType;
}

export interface GameState {
  gameStarted: boolean;
  gameTime: number; // Total seconds
  money: number;
  baseHealth: number;
  maxBaseHealth: number;
  wave: number;
  waveInProgress: boolean;
  enemiesRemaining: number;
  frames: number;
  towers: TowerInstance[];
  enemies: EnemyInstance[];
  units: UnitInstance[];
  projectiles: Projectile[];
  particles: Particle[];
  visualEffects: VisualEffect[];
  mapTiles: TileType[][]; // [y][x]
  mapPath: Position[];
  mapConfig: MapConfig;
  loadout: TowerType[];
  perfectWave: boolean;
  godMode: boolean;
  waveTimer: number; // Countdown to next wave
  
  // Tutorial State
  tutorialActive: boolean;
  tutorialText: string | null;
}

export const CELL_SIZE = 40;
export const MAP_WIDTH = 31;
export const MAP_HEIGHT = 26;
