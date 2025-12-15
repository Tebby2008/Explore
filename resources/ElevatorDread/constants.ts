
import { Difficulty, CustomDifficultyConfig } from "./types";

export const TILE_SIZE = 40;
export const PLAYER_SIZE = 16;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const INTERACTION_RANGE = 60; 

export const DIFFICULTY_CONFIG: Record<Difficulty, CustomDifficultyConfig> = {
  [Difficulty.EASY]: {
    maxHealth: 5,
    maxInventory: 5,
    batteryDrain: 0.02, 
    enemySpeedMult: 0.1,
    elevatorCostPerFloor: 10, 
    spawnRate: 0.6, 
    safeFloors: 5,
  } as any, 
  [Difficulty.MEDIUM]: {
    maxHealth: 5,
    maxInventory: 4,
    batteryDrain: 0.03, 
    enemySpeedMult: 1.0,
    elevatorCostPerFloor: 15, 
    spawnRate: 0.8, 
    safeFloors: 3, 
  } as any,
  [Difficulty.HARD]: {
    maxHealth: 3,
    maxInventory: 3,
    batteryDrain: 0.04, 
    enemySpeedMult: 1.2,
    elevatorCostPerFloor: 25, 
    spawnRate: 0.95, 
    safeFloors: 3, 
  } as any,
  [Difficulty.CUSTOM]: {
    maxHealth: 5,
    maxInventory: 5,
    batteryDrain: 0.04,
    elevatorCost: 10,
    enemySpeedMult: 1.0,
    spawnRate: 0.6,
    safeFloors: 3,
  } as any,
  [Difficulty.TUTORIAL]: {
    maxHealth: 10,
    maxInventory: 5,
    batteryDrain: 0.02, 
    elevatorCostPerFloor: 30, 
    enemySpeedMult: 0.6,
    spawnRate: 0.5,
    safeFloors: 0, 
  } as any
};

export const NOISE_LEVELS = {
  CROUCH: 10,
  WALK: 50,
  RUN: 100,
  ACTION: 150,
};

export const VISIBILITY_RADIUS = 600; 
export const FLASHLIGHT_ANGLE = Math.PI / 5; // ~36 degrees
export const FLASHLIGHT_DISTANCE = 550;

export const COLORS = {
  WALL: '#1c1917', 
  WALL_TOP: '#000000', 
  FLOOR: '#44403c', 
  FLOOR_VISITED: '#57534e', 
  ELEVATOR_CARPET: '#450a0a', 
  PLAYER: '#fdba74', 
  ENEMY_CHASER: '#7f1d1d', 
  ENEMY_LURKER: '#581c87', 
  ENEMY_SHADE: '#000000', 
  ENEMY_PHANTOM: '#06b6d4', 
  ENEMY_SWARM: '#a16207', 
  ITEM: '#16a34a', 
  DRAWER: '#78350f', 
  DOOR_FRAME: '#262626', 
  INTERACTABLE: '#c2410c', 
  ELEVATOR_FLOOR: '#292524', 
};

// --- LORE & DIALOGUE ---

export const LORE_TEXTS: Record<string, string[]> = {
    [Difficulty.EASY]: [
        "EASY LOG 1: Facility Orientation. The elevator is the safest place. Keep it powered.",
        "EASY LOG 2: Entities seem sluggish on the upper floors. You can outrun them easily.",
        "EASY LOG 3: Battery packs are standard issue. Look in drawers.",
        "EASY LOG 4: The lights keep flickering. I think the generator is failing.",
        "EASY LOG 5: Don't let the battery die. The air scrubbers run on the same circuit.",
        "EASY LOG 6: Found a Medkit. Rare find. I feel safer holding it.",
        "EASY LOG 7: Floor 50. Halfway there? No, the floors get bigger.",
        "EASY LOG 8: Some doors require a PIN. The codes are always written nearby.",
        "EASY LOG 9: I hear machinery below. Is the exit operational?",
        "EASY LOG 10: Floor 1. Sunlight... I think I see sunlight."
    ],
    [Difficulty.MEDIUM]: [
        "LOG 01: Core instabilities detected. Evacuation protocols initiated.",
        "LOG 02: They aren't human. They wear the darkness like a coat.",
        "LOG 03: The 'Shades' freeze in light. But your battery won't last forever.",
        "LOG 04: Locked doors. Changed the PINs to random 4-digits. Security is paramount.",
        "LOG 05: The Dread. A massive bio-signature moving through the walls. Hide when the ground shakes.",
        "LOG 06: Phantoms pass through walls. Pulse your light to disrupt their form.",
        "LOG 07: Generators can overcharge the elevator. Find the heavy cables.",
        "LOG 08: We dug too deep. Floor 1 isn't an exit, it's a seal. But I have to open it.",
        "LOG 09: My flashlight is dying. The darkness has weight now.",
        "LOG 10: The Exit Door. It's barred from the outside. Who locked us in?"
    ],
    [Difficulty.HARD]: [
        "AUDIO LOG 1: ...screams... they came from the vents...",
        "AUDIO LOG 2: It hunts by sound. Even walking is too loud. CRAWL.",
        "AUDIO LOG 3: No supplies left. The drawers are empty. We have to keep moving.",
        "AUDIO LOG 4: The Swarm strips flesh in seconds. Light burns them away.",
        "AUDIO LOG 5: THE DREAD IS HERE. CLOSETS ARE COFFINS IF YOU STAY TOO LONG.",
        "AUDIO LOG 6: I tried to fight. My bullets passed right through. RUN.",
        "AUDIO LOG 7: Battery critical. Life support failing. hallucinations setting in.",
        "AUDIO LOG 8: There is no rescue. We are just feeding it.",
        "AUDIO LOG 9: Floor 5... 4... 3... It's waiting for me.",
        "AUDIO LOG 10: The Exit is open. But I'm not leaving alone."
    ],
    [Difficulty.TUTORIAL]: [
        "TUTORIAL: Welcome. Use W,A,S,D to move.",
        "TUTORIAL: Interaction. Press 'E' to open drawers or pick up items.",
        "TUTORIAL: Light. Your flashlight drains battery? No, but it attracts attention.",
        "TUTORIAL: Hiding. Press 'E' on a closet to hide. Don't stay too long.",
        "TUTORIAL: Inventory. Press 1-5 to equip items. Press Q to drop.",
        "TUTORIAL: Combat. You have none. Use the Flashlight Pulse (Click) to stun.",
        "TUTORIAL: Power. The Elevator needs fuel or batteries.",
        "TUTORIAL: Sound. Crouch (C) to stay silent.",
        "TUTORIAL: Objective. Find the exit on Floor 1.",
        "TUTORIAL: Good luck. You will need it."
    ],
    [Difficulty.CUSTOM]: [
        "CUSTOM 1: User defined parameters loaded.",
        "CUSTOM 2: Simulation active.",
        "CUSTOM 3: Anomaly detected.",
        "CUSTOM 4: Test subject #402.",
        "CUSTOM 5: Variable difficulty.",
        "CUSTOM 6: Data corrupted.",
        "CUSTOM 7: System override.",
        "CUSTOM 8: Admin access required.",
        "CUSTOM 9: Sandbox mode.",
        "CUSTOM 10: End of file."
    ]
};

export const DIALOGUE_TRIGGERS = {
    START_EASY: "I have to find a way to escape this place.",
    START_HARD: "They're already here. I can hear them.",
    FIRST_MONSTER: "Ahh! What is that thing?!",
    DREAD_START: "The air... it's heavy. Something massive is moving!",
    DREAD_HIDE: "I need to hide! NOW!",
    LORE_FOUND: "Hmm... So that's why this place is abandoned...",
    LOW_BATTERY: "Power is critical. I need a battery.",
    EXIT_NEAR: "Is that... daylight? The exit!",
};
