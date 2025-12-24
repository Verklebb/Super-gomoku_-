import { GoogleGenAI, Type } from "@google/genai";
import { BoardState, Coordinate, Player } from "../types";

// Initialize the Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-3-flash-preview";

export const getAiMove = async (board: BoardState, currentPlayer: Player): Promise<Coordinate | null> => {
  try {
    const flatBoard = board.map(row => row.join(',')).join(';');
    
    // Construct a compact representation for the AI
    // 0: Empty, 1: Black, 2: White
    
    const prompt = `
      You are a Gomoku (Five-in-a-Row) expert.
      Board size: 15x15.
      You are playing as player ID ${currentPlayer} (2=White, 1=Black).
      The opponent is player ID ${currentPlayer === Player.Black ? Player.White : Player.Black}.
      
      Current board state (rows separated by semicolons, 0=empty, 1=black, 2=white):
      ${flatBoard}
      
      Analyze the board carefully. 
      1. Check if you can win immediately (5 in a row).
      2. Check if the opponent is about to win (open 4 or 4, or open 3) and block them.
      3. Otherwise, make the best strategic move to build your line.
      
      Return ONLY a JSON object with 'x' (column index 0-14) and 'y' (row index 0-14).
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.INTEGER },
            y: { type: Type.INTEGER },
          },
          required: ["x", "y"],
        },
        thinkingConfig: {
            thinkingBudget: 1024
        }
      },
    });

    const jsonText = response.text;
    if (!jsonText) return null;

    const move = JSON.parse(jsonText) as Coordinate;
    
    // Simple validation
    if (move.x >= 0 && move.x < 15 && move.y >= 0 && move.y < 15) {
      if (board[move.y][move.x] === 0) {
        return move;
      }
    }
    
    // Fallback if AI hallucinates an occupied spot (simple random fallback)
    console.warn("AI attempted invalid move, using fallback.");
    return null; 

  } catch (error) {
    console.error("Error getting AI move:", error);
    return null;
  }
};