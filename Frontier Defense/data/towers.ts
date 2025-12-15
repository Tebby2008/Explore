import { TowerType, TowerStats } from "../types";

const DEFAULT_RADIUS = 20;
const LARGE_RADIUS = 35;

export const TOWER_DEFINITIONS: Record<TowerType, { base: TowerStats, upgrades: (Partial<TowerStats> & { cost: number; name: string })[] }> = {
  [TowerType.SCOUT]: {
    base: { name: 'Scout', damage: 2, range: 100, cooldown: 30, cost: 400, detectsHidden: true, piercesLead: false, description: "Fast firing, reveals hidden.", isCliff: false, rotationSpeed: 0.2, placementRadius: DEFAULT_RADIUS },
    upgrades: [
      { cost: 150, damage: 3, name: "Sharp Eyes" },
      { cost: 300, range: 130, name: "Binoculars" },
      { cost: 600, cooldown: 20, name: "Quick Draw" },
      { cost: 1200, damage: 6, name: "Dual Pistols" },
      { cost: 2500, cooldown: 10, range: 160, name: "Elite Scout" }
    ]
  },
  [TowerType.SOLDIER]: {
    base: { 
        name: 'Soldier', damage: 3, range: 120, cooldown: 100, cost: 550, detectsHidden: false, piercesLead: false, 
        description: "Bursts of 3 shots.", isCliff: false, rotationSpeed: 0.15, placementRadius: DEFAULT_RADIUS,
        burstCount: 3, burstRate: 10
    },
    upgrades: [
      { cost: 300, burstCount: 4, damage: 4, name: "Extended Mag" },
      { cost: 600, range: 150, detectsHidden: true, name: "Night Vision" },
      { cost: 1200, cooldown: 80, burstRate: 8, name: "Gas Piston" },
      { cost: 2400, damage: 10, burstCount: 6, name: "Assault Rifle" },
      { cost: 5000, cooldown: 50, burstCount: 10, burstRate: 5, name: "Spec Ops" }
    ]
  },
  [TowerType.MINIGUNNER]: {
    base: { name: 'Minigunner', damage: 1, range: 140, cooldown: 8, cost: 2200, detectsHidden: false, piercesLead: false, description: "Ramps up damage.", isCliff: false, rotationSpeed: 0.08, placementRadius: DEFAULT_RADIUS, placementLimit: 8 },
    upgrades: [
      { cost: 1000, damage: 2, name: "Heavy Barrels" },
      { cost: 2000, cooldown: 5, name: "Motor Upgrade" },
      { cost: 3500, range: 180, name: "Long Belt" },
      { cost: 6000, damage: 5, piercesLead: true, name: "Depleted Uranium" },
      { cost: 12000, cooldown: 2, damage: 8, name: "Vulcan Cannon" }
    ]
  },
  [TowerType.SNIPER]: {
    base: { name: 'Sniper', damage: 30, range: 300, cooldown: 120, cost: 1000, detectsHidden: false, piercesLead: true, description: "High damage, global range potential. Cliff only.", isCliff: true, rotationSpeed: 0.1, placementRadius: DEFAULT_RADIUS, placementLimit: 10 },
    upgrades: [
      { cost: 500, damage: 50, name: "Large Bore" },
      { cost: 1200, range: 500, detectsHidden: true, name: "Thermal Scope" },
      { cost: 2500, damage: 120, cooldown: 100, name: "Full Metal Jacket" },
      { cost: 5000, damage: 300, name: "Anti-Materiel" },
      { cost: 9000, damage: 800, range: 1200, name: "Rail Sniper" }
    ]
  },
  [TowerType.ROCKETEER]: {
    base: { name: 'Rocketeer', damage: 15, range: 130, cooldown: 90, cost: 850, detectsHidden: false, piercesLead: true, description: "Area damage explosions (AoE 40).", isCliff: false, rotationSpeed: 0.1, placementRadius: DEFAULT_RADIUS, placementLimit: 8 },
    upgrades: [
      { cost: 400, damage: 25, name: "Larger Payload" },
      { cost: 900, range: 160, name: "Rocket Propellant" },
      { cost: 2000, damage: 50, cooldown: 70, name: "Double Barrel" },
      { cost: 4500, damage: 100, name: "High Explosive" },
      { cost: 8500, cooldown: 30, damage: 150, name: "Rocket Storm" }
    ]
  },
  [TowerType.MEDIC]: {
    base: { 
        name: 'Medic', damage: 3, range: 100, cooldown: 60, cost: 750, detectsHidden: false, piercesLead: false, 
        description: "Heals base. Active: Cleanse Stun.", isCliff: false, rotationSpeed: 0.2, placementRadius: DEFAULT_RADIUS, placementLimit: 4,
        abilityCooldown: 900, abilityDuration: 0
    },
    upgrades: [
      { cost: 400, damage: 6, name: "Self Defense" },
      { cost: 1000, range: 140, name: "Field Kit" },
      { cost: 2500, damage: 12, abilityCooldown: 600, name: "Combat Medic" }, 
      { cost: 5000, cooldown: 40, name: "Rapid Response" },
      { cost: 10000, damage: 25, abilityCooldown: 300, name: "Surgeon General" } 
    ]
  },
  [TowerType.COMMANDER]: {
    base: { 
        name: 'Commander', damage: 8, range: 120, cooldown: 60, cost: 1500, detectsHidden: true, piercesLead: false, 
        description: "Buffs firerate. Active: Overdrive (+30% FR).", isCliff: false, rotationSpeed: 0.15, placementRadius: DEFAULT_RADIUS, placementLimit: 3,
        abilityCooldown: 1200, abilityDuration: 300
    },
    upgrades: [
      { cost: 800, range: 150, name: "Megaphone" }, 
      { cost: 2000, damage: 15, name: "Sidearm Training" },
      { cost: 4500, range: 180, name: "Tactical Uplink" },
      { cost: 8000, cooldown: 40, abilityDuration: 600, name: "Call in Support" },
      { cost: 15000, damage: 30, abilityCooldown: 900, name: "General" }
    ]
  },
  [TowerType.CAMP]: {
    base: { 
        name: 'Radar Camp', damage: 0, range: 120, cooldown: 1000, cost: 900, detectsHidden: false, piercesLead: false, 
        description: "Buffs range. Active: Precision Scan (+20% Dmg/Rng).", isCliff: false, rotationSpeed: 0, placementRadius: LARGE_RADIUS, placementLimit: 4,
        abilityCooldown: 1800, abilityDuration: 600
    },
    upgrades: [
      { cost: 500, range: 150, name: "Better Antenna" },
      { cost: 1200, range: 180, name: "Satellite Link" },
      { cost: 2800, range: 220, name: "Command Center" },
      { cost: 6000, range: 260, abilityCooldown: 1200, name: "Global Network" },
      { cost: 12000, range: 300, name: "Orbital Scanner" }
    ]
  },
  [TowerType.MILITARY_CAMP]: {
    base: { name: 'Military Base', damage: 0, range: 0, cooldown: 1200, cost: 2500, detectsHidden: false, piercesLead: false, description: "Spawns a Jeep periodically.", isCliff: false, rotationSpeed: 0, placementRadius: LARGE_RADIUS, placementLimit: 4 },
    upgrades: [
      { cost: 1800, cooldown: 1000, name: "Faster Production" },
      { cost: 4000, cooldown: 900, name: "Armored Jeeps" },
      { cost: 8000, cooldown: 800, name: "Tank Factory" },
      { cost: 15000, cooldown: 600, name: "Mass Production" },
      { cost: 30000, cooldown: 400, name: "War Machine" }
    ]
  },
  [TowerType.RIFLING_SQUAD]: {
    base: { name: 'Barracks', damage: 0, range: 0, cooldown: 900, cost: 1500, detectsHidden: false, piercesLead: false, description: "Spawns Infantry Squads.", isCliff: false, rotationSpeed: 0, placementRadius: LARGE_RADIUS, placementLimit: 6 },
    upgrades: [
      { cost: 1000, cooldown: 800, name: "Recruitment" },
      { cost: 2200, cooldown: 700, name: "Drill Sergeant" },
      { cost: 4500, cooldown: 600, name: "Special Forces" },
      { cost: 9000, cooldown: 500, name: "Elite Squad" },
      { cost: 18000, cooldown: 400, name: "Clone Army" }
    ]
  },
  [TowerType.RAILGUNNER]: {
    base: { name: 'Railgunner', damage: 80, range: 350, cooldown: 180, cost: 2800, detectsHidden: false, piercesLead: true, description: "Instant beam damage.", isCliff: true, rotationSpeed: 0.05, placementRadius: DEFAULT_RADIUS, placementLimit: 4 },
    upgrades: [
      { cost: 1800, damage: 120, name: "Capacitors" },
      { cost: 4000, damage: 200, range: 400, name: "Supercondutors" },
      { cost: 8000, cooldown: 150, name: "Auto-Loader" },
      { cost: 16000, damage: 400, name: "Hyper Velocity" },
      { cost: 32000, damage: 1000, piercesLead: true, name: "Doomsday Cannon" } 
    ]
  },
  [TowerType.MORTAR]: {
    base: { name: 'Mortar', damage: 40, range: 200, cooldown: 180, cost: 1200, detectsHidden: false, piercesLead: false, description: "Huge AoE (60), slow fire. Cliff only.", isCliff: true, rotationSpeed: 0.08, placementRadius: DEFAULT_RADIUS, placementLimit: 6 },
    upgrades: [
      { cost: 800, damage: 60, name: "Bigger Shells" },
      { cost: 1800, range: 250, name: "Long Barrel" },
      { cost: 4000, damage: 120, cooldown: 150, name: "Cluster Bomb" },
      { cost: 8500, damage: 250, name: "Napalm" },
      { cost: 16000, damage: 600, range: 350, name: "Nuke" }
    ]
  },
  [TowerType.FARM]: {
    base: { name: 'Crypto Farm', damage: 0, range: 0, cooldown: 0, cost: 1250, detectsHidden: false, piercesLead: false, description: "Generates $60 per wave.", isCliff: false, rotationSpeed: 0, placementRadius: LARGE_RADIUS, placementLimit: 8 },
    upgrades: [
      { cost: 500, name: "Faster GPUs" }, // +$25
      { cost: 1200, name: "Solar Power" }, // +$50
      { cost: 2500, name: "Server Rack" }, // +$150
      { cost: 6000, name: "Data Center" }, // +$400
      { cost: 15000, name: "Quantum Computer" } // +$1000
    ]
  },
  [TowerType.COWBOY]: {
    base: { name: 'Bounty Hunter', damage: 12, range: 110, cooldown: 40, cost: 900, detectsHidden: false, piercesLead: false, description: "Earns cash on hit.", isCliff: false, rotationSpeed: 0.25, placementRadius: DEFAULT_RADIUS, placementLimit: 4 },
    upgrades: [
      { cost: 600, damage: 18, name: "Magnum" },
      { cost: 1400, cooldown: 30, name: "Quick Hands" },
      { cost: 3000, damage: 35, range: 140, name: "Rifle" },
      { cost: 7000, damage: 70, name: "Wanted Dead/Alive" }, 
      { cost: 14000, cooldown: 10, damage: 120, name: "High Noon" }
    ]
  },
  [TowerType.PHASER]: {
    base: { 
        name: 'Phaser Array', damage: 2, range: 180, cooldown: 120, cost: 4000, 
        detectsHidden: false, piercesLead: true, 
        description: "Charges up to unleash a devastating continuous beam.", 
        isCliff: false, rotationSpeed: 0.1, placementRadius: DEFAULT_RADIUS, placementLimit: 4,
        chargeTime: 300, // 5s
        fireDuration: 300 // 5s
    },
    upgrades: [
      { cost: 2500, damage: 4, name: "Focus Lens" },
      { cost: 5000, chargeTime: 240, name: "Capacitor Bank" }, // 4s charge
      { cost: 10000, fireDuration: 420, damage: 8, name: "Heat Sink" }, // 7s fire
      { cost: 20000, damage: 15, range: 220, name: "Plasma Injection" },
      { cost: 40000, cooldown: 90, chargeTime: 120, damage: 30, name: "Singularity Beam" } // 2s charge, 1.5s cool
    ]
  },
  [TowerType.SHOCKER]: {
    base: { 
        name: 'Tesla Coil', damage: 2, range: 100, cooldown: 60, cost: 750, 
        detectsHidden: false, piercesLead: true, 
        description: "Chains electricity to nearby enemies, briefly stunning.", 
        isCliff: false, rotationSpeed: 0, placementRadius: DEFAULT_RADIUS, placementLimit: 6,
        chainCount: 3, stunDuration: 30
    },
    upgrades: [
      { cost: 450, damage: 4, name: "Higher Voltage" },
      { cost: 1000, range: 130, chainCount: 5, name: "Arc Reactor" },
      { cost: 2200, cooldown: 40, stunDuration: 45, name: "Overcharge" },
      { cost: 5000, damage: 10, chainCount: 8, name: "Storm Generator" },
      { cost: 10000, range: 180, cooldown: 20, name: "Zeus Module" }
    ]
  },
  [TowerType.SNOWBALLER]: {
    base: { 
        name: 'Snowballer', damage: 2, range: 120, cooldown: 40, cost: 600, 
        detectsHidden: false, piercesLead: false, 
        description: "Chills enemies. 3 Hits = Frozen.", 
        isCliff: false, rotationSpeed: 0.15, placementRadius: DEFAULT_RADIUS, placementLimit: 6,
        freezeStacks: 1
    },
    upgrades: [
      { cost: 350, damage: 5, name: "Packed Ice" },
      { cost: 800, range: 150, cooldown: 30, name: "Strong Arm" },
      { cost: 2000, damage: 10, name: "Snow Cannon" },
      { cost: 4000, cooldown: 15, name: "Blizzard" },
      { cost: 9000, damage: 15, freezeStacks: 2, name: "Absolute Zero" } // 2 hits to freeze
    ]
  }
};
