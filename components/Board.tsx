import React from 'react';
import { BoardState, Coordinate, InteractionMode, Player } from '../types';
import { BOARD_SIZE } from '../constants';

interface BoardProps {
  board: BoardState;
  onCellClick: (x: number, y: number) => void;
  lastMove: Coordinate | null;
  interactionMode: InteractionMode;
  currentPlayer: Player;
}

const Board: React.FC<BoardProps> = ({ 
  board, 
  onCellClick, 
  lastMove, 
  interactionMode,
  currentPlayer 
}) => {
  
  // Helper to determine if a cell highlight is needed based on interaction mode
  const getCellHighlight = (x: number, y: number, value: number) => {
    if (interactionMode === InteractionMode.SelectTargetPiece) {
      // Highlight enemy pieces (assuming user is currentPlayer)
      const enemy = currentPlayer === Player.Black ? Player.White : Player.Black;
      if (value === enemy) return 'cursor-pointer hover:ring-4 ring-red-400 ring-opacity-70 z-10';
      return 'opacity-60 grayscale'; // Dim others
    }
    
    if (interactionMode === InteractionMode.SelectTargetDest) {
      if (value === Player.None) return 'cursor-pointer hover:bg-green-400/30 animate-pulse';
      return 'opacity-50';
    }

    // Normal play highlight
    if (value === Player.None) return 'cursor-pointer hover:bg-black/5 active:bg-black/10';
    return '';
  };

  return (
    <div className="relative p-1 md:p-3 bg-[#e0c292] rounded-lg shadow-xl border-[3px] border-[#8b5a2b] select-none shadow-[#8b5a2b]/30">
        {/* Wood Texture Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] rounded-lg mix-blend-multiply"></div>

        {/* Inner Border/Bevel */}
        <div className="relative bg-[#dcb280] p-[2px] rounded border border-[#c59160] shadow-inner">
            <div 
                className="grid relative"
                style={{
                    gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                    width: 'min(94vw, 550px)',
                    height: 'min(94vw, 550px)',
                }}
            >
                {/* Background Grid Lines Layer */}
                <div className="absolute inset-0 pointer-events-none">
                     {/* Horizontal Lines */}
                     {Array.from({ length: BOARD_SIZE }).map((_, i) => (
                        <div key={`h-${i}`} className="absolute w-full h-px bg-[#8b5a2b]/60" style={{ top: `${(i / BOARD_SIZE) * 100 + (100 / BOARD_SIZE / 2)}%` }}></div>
                     ))}
                     {/* Vertical Lines */}
                     {Array.from({ length: BOARD_SIZE }).map((_, i) => (
                        <div key={`v-${i}`} className="absolute h-full w-px bg-[#8b5a2b]/60" style={{ left: `${(i / BOARD_SIZE) * 100 + (100 / BOARD_SIZE / 2)}%` }}></div>
                     ))}
                     
                     {/* Star Points (Hoshi) */}
                     {[3, 7, 11].map(y => [3, 7, 11].map(x => (
                        <div key={`dot-${x}-${y}`} className="absolute w-1.5 h-1.5 bg-[#6d4834] rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm"
                            style={{ 
                                left: `${(x / BOARD_SIZE) * 100 + (100 / BOARD_SIZE / 2)}%`, 
                                top: `${(y / BOARD_SIZE) * 100 + (100 / BOARD_SIZE / 2)}%` 
                            }}
                        ></div>
                     )))}
                </div>

                {/* Interactive Cells Layer */}
                {board.map((row, y) => (
                    row.map((cellValue, x) => {
                        const isLastMove = lastMove?.x === x && lastMove?.y === y;
                        
                        return (
                            <div
                                key={`${x}-${y}`}
                                onClick={() => onCellClick(x, y)}
                                className={`
                                    relative flex items-center justify-center z-0
                                    ${getCellHighlight(x, y, cellValue)}
                                `}
                            >
                                {/* Piece */}
                                {cellValue !== Player.None && (
                                    <div
                                        className={`
                                            w-[85%] h-[85%] rounded-full shadow-[2px_2px_4px_rgba(0,0,0,0.4)] transition-all duration-300 transform
                                            ${cellValue === Player.Black 
                                                ? 'bg-gradient-to-br from-gray-700 via-black to-black' 
                                                : 'bg-gradient-to-br from-white via-stone-100 to-stone-300'
                                            }
                                            ${isLastMove ? 'ring-2 ring-green-500 ring-offset-1 scale-100' : 'scale-95'}
                                        `}
                                    >
                                        {/* 3D Highlight/Reflection */}
                                        <div className="absolute top-[15%] left-[15%] w-[30%] h-[30%] bg-white rounded-full opacity-30 blur-[1px]"></div>
                                        
                                        {/* Last move marker dot for clarity */}
                                        {isLastMove && (
                                            <div className={`absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${cellValue === Player.Black ? 'bg-green-500' : 'bg-green-600'}`}></div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ))}
            </div>
        </div>
    </div>
  );
};

export default Board;