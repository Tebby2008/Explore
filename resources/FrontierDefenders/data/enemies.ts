import { EnemyType } from "../types";

export const ENEMY_DEFINITIONS: Record<EnemyType, { hp: number, speed: number, reward: number, color: string, radius: number, regen?: number }> = {
  // Tier 1 - Basic Early Game
  [EnemyType.BASIC]: { hp: 5, speed: 1.2, reward: 3, color: '#e74c3c', radius: 12 },
  [EnemyType.BANDIT]: { hp: 8, speed: 1.3, reward: 4, color: '#d35400', radius: 13 },
  [EnemyType.WOLF]: { hp: 6, speed: 2.0, reward: 4, color: '#7f8c8d', radius: 10 },
  [EnemyType.SLIME]: { hp: 15, speed: 0.8, reward: 5, color: '#2ecc71', radius: 11 },
  [EnemyType.GOBLIN]: { hp: 10, speed: 1.5, reward: 5, color: '#27ae60', radius: 10 },
  [EnemyType.ORC]: { hp: 35, speed: 0.9, reward: 8, color: '#16a085', radius: 15 },

  [EnemyType.FAST]: { hp: 4, speed: 2.5, reward: 4, color: '#f1c40f', radius: 10 },
  [EnemyType.TANK]: { hp: 20, speed: 0.7, reward: 8, color: '#34495e', radius: 16 },
  
  // Tier 2 - Undead
  [EnemyType.ZOMBIE]: { hp: 12, speed: 1.0, reward: 5, color: '#27ae60', radius: 13 },
  [EnemyType.ZOMBIE_RUNNER]: { hp: 8, speed: 2.2, reward: 6, color: '#2ecc71', radius: 11 },
  [EnemyType.GHOUL]: { hp: 15, speed: 1.8, reward: 10, color: '#16a085', radius: 12 }, 
  [EnemyType.ABOMINATION]: { hp: 60, speed: 0.5, reward: 20, color: '#8e44ad', radius: 20 },

  // Tier 3 - Mech
  [EnemyType.MECH_DROID]: { hp: 30, speed: 1.5, reward: 12, color: '#95a5a6', radius: 14 },
  [EnemyType.MECH_WALKER]: { hp: 80, speed: 0.6, reward: 25, color: '#7f8c8d', radius: 22 },
  [EnemyType.SHIELD_BOT]: { hp: 50, speed: 1.0, reward: 20, color: '#3498db', radius: 16 }, 
  [EnemyType.DRONE_SWARM]: { hp: 5, speed: 3.5, reward: 2, color: '#e74c3c', radius: 6 },

  // Tier 4 - Elemental
  [EnemyType.FIRE_SPRITE]: { hp: 40, speed: 2.0, reward: 15, color: '#d35400', radius: 12 },
  [EnemyType.ICE_GOLEM]: { hp: 120, speed: 0.4, reward: 30, color: '#a29bfe', radius: 24 },
  [EnemyType.ROCK_ELEMENTAL]: { hp: 150, speed: 0.5, reward: 35, color: '#5d4037', radius: 24 },
  [EnemyType.STORM_WISP]: { hp: 25, speed: 3.0, reward: 20, color: '#f1c40f', radius: 10 },

  // Tier 5 - Elite
  [EnemyType.ARMORED_LEAD]: { hp: 200, speed: 0.8, reward: 50, color: '#2c3e50', radius: 18 },
  [EnemyType.ASSASSIN]: { hp: 80, speed: 4.0, reward: 60, color: '#000000', radius: 12 },
  [EnemyType.PALADIN]: { hp: 500, speed: 0.5, reward: 100, color: '#f1c40f', radius: 25, regen: 0.5 },

  // Special
  [EnemyType.HIDDEN]: { hp: 20, speed: 1.8, reward: 12, color: '#bdc3c7', radius: 12 },
  [EnemyType.LEAD]: { hp: 35, speed: 0.9, reward: 20, color: '#7f8c8d', radius: 14 },

  // Bosses
  [EnemyType.BOSS_STOMPER]: { hp: 800, speed: 0.6, reward: 500, color: '#8e44ad', radius: 30 },
  [EnemyType.BOSS_SUMMONER]: { hp: 600, speed: 0.7, reward: 500, color: '#d35400', radius: 30 },
  [EnemyType.BOSS_TITAN]: { hp: 2000, speed: 0.3, reward: 1000, color: '#34495e', radius: 45 },
  [EnemyType.BOSS_SPEEDSTER]: { hp: 500, speed: 3.0, reward: 600, color: '#f1c40f', radius: 20 },
  [EnemyType.BOSS_PHANTOM]: { hp: 400, speed: 1.5, reward: 800, color: '#ecf0f1', radius: 25 },
  [EnemyType.BOSS_NECROMANCER]: { hp: 700, speed: 0.5, reward: 700, color: '#2c3e50', radius: 28 },
  [EnemyType.BOSS_CONSTRUCTOR]: { hp: 1000, speed: 0.4, reward: 900, color: '#e67e22', radius: 35 },
  [EnemyType.BOSS_INFERNO]: { hp: 1500, speed: 0.8, reward: 1000, color: '#c0392b', radius: 32 },
  [EnemyType.BOSS_ZERO]: { hp: 1200, speed: 0.6, reward: 1000, color: '#74b9ff', radius: 32 },
  [EnemyType.BOSS_THE_END]: { hp: 10000, speed: 0.2, reward: 5000, color: '#000000', radius: 60 },
};
