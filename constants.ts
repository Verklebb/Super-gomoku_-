import { Skill, SkillType } from './types';

export const BOARD_SIZE = 15;

export const WIN_COUNT = 5;

export const SKILLS: Skill[] = [
  {
    id: SkillType.RemoveRandom,
    name: "飞沙走石",
    description: "随机掀翻对手一颗棋子",
    icon: "Wind",
    color: "bg-orange-500 from-orange-500 to-red-500",
  },
  {
    id: SkillType.ForceRandom,
    name: "静如止水",
    description: "让对方随机走一颗棋子", // Updated description
    icon: "Waves",
    color: "bg-blue-500 from-blue-500 to-cyan-400",
  },
  {
    id: SkillType.ResetBoard,
    name: "力拔山兮",
    description: "棋盘瞬间归零，重启战局",
    icon: "Mountain",
    color: "bg-stone-600 from-stone-600 to-stone-800",
  },
  {
    id: SkillType.MovePiece,
    name: "擒擒拿拿",
    description: "把对手的一颗棋子搬家",
    icon: "Hand",
    color: "bg-purple-500 from-purple-500 to-pink-600",
  },
];

export const INITIAL_BOARD = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));