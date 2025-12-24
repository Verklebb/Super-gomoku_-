import { BoardState, Player, Coordinate, SkillType, PlayerState } from '../types';
import { BOARD_SIZE } from '../constants';

// --- Improved Evaluation Constants ---
// Using exponential weights to strictly prioritize stronger patterns
const SCORES = {
  WIN: 100_000_000,      // 5连
  LIVE_4: 10_000_000,    // 活4 (011110) - 必胜
  DEAD_4: 5_000_000,     // 冲4 (211110) - 必须防守
  LIVE_3: 1_000_000,     // 活3 (01110) - 巨大威胁
  DEAD_3: 50_000,        // 眠3 (21110)
  LIVE_2: 10_000,        // 活2 (0110)
  DEAD_2: 1_000,         // 眠2
  SINGLE: 10,
};

export type AiAction = 
  | { type: 'MOVE'; x: number; y: number }
  | { type: 'SKILL'; skill: SkillType; payload?: any };

// --- Helper Functions ---

const isValid = (x: number, y: number) => x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;

/**
 * Evaluates a single position (x, y) if 'player' puts a stone there.
 * Returns a total score summing up all 4 directions.
 */
const evaluatePoint = (board: BoardState, x: number, y: number, player: Player): number => {
  let totalScore = 0;
  // Directions: Horizontal, Vertical, Diagonal \, Diagonal /
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

  for (const [dx, dy] of directions) {
    let count = 1; // Start with 1 for the stone we are placing
    let blockedEnds = 0;
    
    // Check Forward
    let i = 1;
    while (true) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (!isValid(nx, ny)) {
        blockedEnds++;
        break;
      }
      const cell = board[ny][nx];
      if (cell === player) {
        count++;
      } else if (cell === Player.None) {
        // Open end, stop counting stones
        break;
      } else {
        // Opponent piece blocks this end
        blockedEnds++;
        break;
      }
      i++;
    }

    // Check Backward
    i = 1;
    while (true) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (!isValid(nx, ny)) {
        blockedEnds++;
        break;
      }
      const cell = board[ny][nx];
      if (cell === player) {
        count++;
      } else if (cell === Player.None) {
        break;
      } else {
        blockedEnds++;
        break;
      }
      i++;
    }

    // --- Scoring Logic based on Pattern ---
    
    if (count >= 5) {
      totalScore += SCORES.WIN;
    } else if (count === 4) {
      if (blockedEnds === 0) totalScore += SCORES.LIVE_4;
      else if (blockedEnds === 1) totalScore += SCORES.DEAD_4;
      // If blockedEnds === 2, it's useless (e.g. OXXXXO), score is low or 0
    } else if (count === 3) {
      if (blockedEnds === 0) totalScore += SCORES.LIVE_3;
      else if (blockedEnds === 1) totalScore += SCORES.DEAD_3;
    } else if (count === 2) {
      if (blockedEnds === 0) totalScore += SCORES.LIVE_2;
      else if (blockedEnds === 1) totalScore += SCORES.DEAD_2;
    } else {
        totalScore += SCORES.SINGLE;
    }
  }
  return totalScore;
};

// Get all empty spots sorted by potential value (heuristic pruning)
// Improved to consider slightly wider range for jump patterns
const getCandidateMoves = (board: BoardState): Coordinate[] => {
  const candidates: { x: number; y: number; score: number }[] = [];
  const radius = 2; // Increased radius to catch "Jump 3" patterns (X _ X X)

  // Use a Set to avoid duplicates if we optimized the loop, 
  // but simpler here to iterate board and check neighbors.
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== Player.None) continue;

      let hasNeighbor = false;
      // Scan area around the empty spot
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (isValid(nx, ny) && board[ny][nx] !== Player.None) {
            hasNeighbor = true;
            break;
          }
        }
        if (hasNeighbor) break;
      }

      // Always include center if empty (good opening)
      if (hasNeighbor || (x === 7 && y === 7)) {
        // Base positional score: closer to center is slightly better for tie-breaking
        const distFromCenter = Math.abs(x - 7) + Math.abs(y - 7);
        candidates.push({ x, y, score: 100 - distFromCenter });
      }
    }
  }
  
  // Sort simply by center proximity first, real eval happens later
  return candidates.sort((a, b) => b.score - a.score).map(c => ({ x: c.x, y: c.y }));
};

// --- Main AI Logic ---

export const getAiDecision = (board: BoardState, aiPlayer: Player, aiState: PlayerState, currentTurn: number): AiAction => {
  const opponent = aiPlayer === Player.Black ? Player.White : Player.Black;
  const simBoard = JSON.parse(JSON.stringify(board)); 
  const candidates = getCandidateMoves(simBoard);
  
  if (candidates.length === 0) return { type: 'MOVE', x: 7, y: 7 };

  // --- Skill Cooldown Logic ---
  // Allow skill only if enough turns passed since last skill
  // Exception: ResetBoard can be used anytime if desperate, but we enforce strict conditions below
  const SKILL_COOLDOWN = 5;
  const isOnCooldown = (currentTurn - aiState.lastSkillTurn) < SKILL_COOLDOWN;

  let bestMove = candidates[0];
  let maxScore = -Infinity;
  
  // Track critical threats
  let maxMyAttack = 0;
  let maxOpponentThreat = 0;
  let threatLoc: Coordinate | null = null;
  
  // We will iterate candidates and calculate two values for each:
  // 1. Attack Score: Value if AI plays there.
  // 2. Defense Score: Value if Opponent plays there (Threat level).
  
  for (const move of candidates) {
    // 1. Attack Evaluation
    simBoard[move.y][move.x] = aiPlayer;
    const attackScore = evaluatePoint(simBoard, move.x, move.y, aiPlayer);
    simBoard[move.y][move.x] = Player.None; // Reset

    // 2. Defense Evaluation (What if opponent moves here?)
    simBoard[move.y][move.x] = opponent;
    const defenseScore = evaluatePoint(simBoard, move.x, move.y, opponent);
    simBoard[move.y][move.x] = Player.None; // Reset

    // Track global maximums to decide on Skills later
    if (attackScore > maxMyAttack) maxMyAttack = attackScore;
    if (defenseScore > maxOpponentThreat) {
        maxOpponentThreat = defenseScore;
        threatLoc = move;
    }

    // --- Decision Logic ---
    
    // Rule 1: If we can win immediately, Score is infinite.
    if (attackScore >= SCORES.WIN) {
        return { type: 'MOVE', x: move.x, y: move.y };
    }

    // Rule 2: If opponent wins immediately (LIVE_4 or WIN), we MUST block.
    // However, if we also have a win (checked above), we would have taken it.
    // Since we didn't return above, if opponent has a Win threat, this move becomes Mandatory.
    // We give it a huge score, but less than our own Win.
    let moveScore = 0;
    
    if (defenseScore >= SCORES.WIN) {
        // Opponent has 5 (impossible if we check every turn) or creates 5.
        // Actually defenseScore evaluates "If opponent plays here, they get X".
        // So if defenseScore >= WIN, opponent wins next turn if we don't block.
        moveScore = defenseScore * 2; // Super high priority
    } else if (defenseScore >= SCORES.LIVE_4) {
        // Opponent will create Live 4 (Guaranteed win). Must block.
        moveScore = defenseScore * 2;
    } else if (defenseScore >= SCORES.DEAD_4) {
        // Opponent creates Dead 4. High priority, but if we can create Live 4, we might ignore.
        // Generally, Attack > Defense if scores are similar, but Dead 4 is forcing.
        // Defense * 1.5 ensures we prefer blocking Dead 4 over making our own Live 3.
        moveScore = defenseScore * 1.5 + attackScore;
    } else {
        // General heuristic: Attack + Defense.
        // We slightly prefer Attack to keep initiative.
        moveScore = attackScore * 1.1 + defenseScore;
    }

    if (moveScore > maxScore) {
      maxScore = moveScore;
      bestMove = move;
    }
  }

  // --- Skill Logic (Updated thresholds & Cooldown) ---

  if (!isOnCooldown) {

      // Skill: Force Random (Still Water)
      if (!aiState.usedSkills.includes(SkillType.ForceRandom)) {
          // If opponent has a huge threat (e.g., Live 3 or Dead 4) and we can't win immediately
          // Force Random is good to disrupt setups
          if (maxOpponentThreat >= SCORES.LIVE_3 && maxMyAttack < SCORES.WIN) {
              return { type: 'SKILL', skill: SkillType.ForceRandom };
          }
      }

      // Skill: Move Piece or Remove Random
      // Trigger: Opponent is about to win (Live 4)
      if (maxOpponentThreat >= SCORES.LIVE_4) {
          // 1. Try Move Piece
          if (!aiState.usedSkills.includes(SkillType.MovePiece) && threatLoc) {
              const targets = getNeighbors(simBoard, threatLoc.x, threatLoc.y, opponent);
              if (targets.length > 0) {
                  const target = targets[0]; 
                  const dest = findEmptySpot(simBoard);
                  return { 
                      type: 'SKILL', 
                      skill: SkillType.MovePiece, 
                      payload: { from: target, to: dest } 
                  };
              }
          }
          
          // 2. Try Remove Random
          if (!aiState.usedSkills.includes(SkillType.RemoveRandom)) {
               return { type: 'SKILL', skill: SkillType.RemoveRandom };
          }
      }
  }

  // Skill: Reset Board (Last Resort)
  // Logic: ONLY if opponent has a guaranteed win (Live 4) AND we have no other skill available or on cooldown
  // AND we are not winning.
  if (!aiState.usedSkills.includes(SkillType.ResetBoard)) {
      if (maxOpponentThreat >= SCORES.LIVE_4 && maxMyAttack < SCORES.WIN) {
           // Check if we exhausted other options or are on cooldown
           if (isOnCooldown || 
               (aiState.usedSkills.includes(SkillType.MovePiece) && aiState.usedSkills.includes(SkillType.RemoveRandom))) {
               return { type: 'SKILL', skill: SkillType.ResetBoard };
           }
      }
      // If opponent ALREADY won (SCORES.WIN check earlier might catch it, but defensively here)
      if (maxOpponentThreat >= SCORES.WIN) {
           return { type: 'SKILL', skill: SkillType.ResetBoard };
      }
  }

  return { type: 'MOVE', x: bestMove.x, y: bestMove.y };
};

// Helper to find opponent pieces involved in a threat
const getNeighbors = (board: BoardState, x: number, y: number, player: Player): Coordinate[] => {
    const list: Coordinate[] = [];
    for(let dy=-1; dy<=1; dy++){
        for(let dx=-1; dx<=1; dx++){
            if(dx===0 && dy===0) continue;
            const nx = x+dx, ny=y+dy;
            if(isValid(nx,ny) && board[ny][nx] === player) {
                list.push({x: nx, y: ny});
            }
        }
    }
    return list;
}

const findEmptySpot = (board: BoardState): Coordinate => {
    for(let i=0; i<50; i++) {
        const x = Math.floor(Math.random() * BOARD_SIZE);
        const y = Math.floor(Math.random() * BOARD_SIZE);
        if(board[y][x] === Player.None) return {x,y};
    }
    // Fallback search
    for(let y=0; y<BOARD_SIZE; y++) {
        for(let x=0; x<BOARD_SIZE; x++) {
             if(board[y][x] === Player.None) return {x,y};
        }
    }
    return {x:0, y:0}; 
}