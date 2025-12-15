import { UnitType } from "../types";

export const UNIT_DEFINITIONS: Record<UnitType, { hp: number, damage: number, range: number, cooldown: number, speed: number, isCollision: boolean, color: string }> = {
  [UnitType.JEEP]: { hp: 50, damage: 100, range: 0, cooldown: 0, speed: 3.0, isCollision: true, color: '#3498db' }, 
  [UnitType.SQUAD]: { hp: 30, damage: 5, range: 80, cooldown: 40, speed: 1.2, isCollision: false, color: '#1abc9c' },
};
