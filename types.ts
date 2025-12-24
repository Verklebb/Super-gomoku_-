export enum Player {
  None = 0,
  Black = 1,
  White = 2,
}

export enum GameStatus {
  Idle = 'IDLE',
  Playing = 'PLAYING',
  Won = 'WON',
  Draw = 'DRAW',
}

export enum SkillType {
  RemoveRandom = 'REMOVE_RANDOM', // 飞沙走石
  ForceRandom = 'FORCE_RANDOM',   // 静如止水
  ResetBoard = 'RESET_BOARD',     // 力拔山兮
  MovePiece = 'MOVE_PIECE',       // 擒擒拿拿
}

export interface Skill {
  id: SkillType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface PlayerState {
  id: Player;
  usedSkills: SkillType[]; // List of skill IDs already used
  lastSkillTurn: number;   // Turn number when the last skill was used
}

export type BoardState = Player[][];

export interface Coordinate {
  x: number;
  y: number;
}

export enum InteractionMode {
  Normal = 'NORMAL',
  SelectTargetPiece = 'SELECT_TARGET_PIECE', // For "Move Piece" skill: step 1
  SelectTargetDest = 'SELECT_TARGET_DEST',   // For "Move Piece" skill: step 2
}