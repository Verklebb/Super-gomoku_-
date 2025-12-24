import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BoardState, 
  GameStatus, 
  Player, 
  Coordinate, 
  PlayerState, 
  SkillType, 
  InteractionMode,
  Skill
} from './types';
import { BOARD_SIZE, INITIAL_BOARD, WIN_COUNT, SKILLS } from './constants';
import Board from './components/Board';
import SkillCard from './components/SkillCard';
import SkillEffectOverlay from './components/SkillEffectOverlay';
import { getAiDecision, AiAction } from './services/aiService';
import { Bot, User, RotateCcw, Play, Trophy, AlertTriangle, Menu, X, Zap } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [board, setBoard] = useState<BoardState>(JSON.parse(JSON.stringify(INITIAL_BOARD)));
  const [currentPlayer, setCurrentPlayer] = useState<Player>(Player.Black);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Idle);
  const [winner, setWinner] = useState<Player>(Player.None);
  const [lastMove, setLastMove] = useState<Coordinate | null>(null);
  const [turnCount, setTurnCount] = useState<number>(0); 
  
  const [isAiMode, setIsAiMode] = useState<boolean>(true);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Interaction State
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.Normal);
  const [selectedPieceToMove, setSelectedPieceToMove] = useState<Coordinate | null>(null);
  
  // Players State
  const [player1State, setPlayer1State] = useState<PlayerState>({ id: Player.Black, usedSkills: [], lastSkillTurn: -999 });
  const [player2State, setPlayer2State] = useState<PlayerState>({ id: Player.White, usedSkills: [], lastSkillTurn: -999 });
  
  const [activeSkill, setActiveSkill] = useState<SkillType | null>(null);
  const [previewSkill, setPreviewSkill] = useState<Skill | null>(null); // New: For Modal
  const [notification, setNotification] = useState<string | null>(null);
  const [animatingSkill, setAnimatingSkill] = useState<SkillType | null>(null);

  // --- Helpers ---
  const updatePlayerState = (player: Player, newState: PlayerState) => {
      if (player === Player.Black) setPlayer1State(newState);
      else setPlayer2State(newState);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const triggerSkillAnimation = (skill: SkillType) => {
    setAnimatingSkill(skill);
    setTimeout(() => setAnimatingSkill(null), 2500); 
  };

  // --- Win Check Algorithm ---
  const checkWin = useCallback((boardCheck: BoardState, player: Player, x: number, y: number): boolean => {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dx, dy] of directions) {
      let count = 1;
      for (let i = 1; i < WIN_COUNT; i++) {
        const nx = x + dx * i;
        const ny = y + dy * i;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
        if (boardCheck[ny][nx] === player) count++; else break;
      }
      for (let i = 1; i < WIN_COUNT; i++) {
        const nx = x - dx * i;
        const ny = y - dy * i;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
        if (boardCheck[ny][nx] === player) count++; else break;
      }
      if (count >= WIN_COUNT) return true;
    }
    return false;
  }, []);

  // --- Game Loop Logic ---
  const startGame = (ai: boolean) => {
    setBoard(JSON.parse(JSON.stringify(INITIAL_BOARD)));
    setCurrentPlayer(Player.Black);
    setGameStatus(GameStatus.Playing);
    setWinner(Player.None);
    setLastMove(null);
    setTurnCount(0);
    setIsAiMode(ai);
    setPlayer1State({ id: Player.Black, usedSkills: [], lastSkillTurn: -999 });
    setPlayer2State({ id: Player.White, usedSkills: [], lastSkillTurn: -999 });
    setInteractionMode(InteractionMode.Normal);
    setActiveSkill(null);
    setPreviewSkill(null);
    setSelectedPieceToMove(null);
    setNotification("Game Started!");
  };

  const switchTurn = () => {
    setCurrentPlayer(prev => prev === Player.Black ? Player.White : Player.Black);
  };

  // --- Skills ---
  const handleSkillClick = (skillId: SkillType) => {
    if (gameStatus !== GameStatus.Playing || isAiThinking) return;
    if (isAiMode && currentPlayer === Player.White) return;

    // If clicking the active skill, cancel it immediately (toggle off)
    if (activeSkill === skillId) {
        cancelSkill();
        return;
    }

    // Open Preview Modal instead of immediate execution
    const skill = SKILLS.find(s => s.id === skillId);
    if (skill) {
        setPreviewSkill(skill);
    }
  };

  const confirmUseSkill = () => {
    if (!previewSkill) return;
    const skillId = previewSkill.id;
    setPreviewSkill(null); // Close modal

    setActiveSkill(skillId);
    if (skillId === SkillType.RemoveRandom) executeRemoveRandom();
    else if (skillId === SkillType.ForceRandom) executeForceRandom();
    else if (skillId === SkillType.ResetBoard) executeResetBoard();
    else if (skillId === SkillType.MovePiece) {
      setInteractionMode(InteractionMode.SelectTargetPiece);
      showNotification("Select opponent's piece.");
    }
  };

  const markSkillUsed = (skillId: SkillType, player: Player = currentPlayer) => {
    const pState = player === Player.Black ? player1State : player2State;
    updatePlayerState(player, {
      ...pState,
      usedSkills: [...pState.usedSkills, skillId],
      lastSkillTurn: turnCount
    });
    if (player === currentPlayer) setActiveSkill(null);
    triggerSkillAnimation(skillId);
  };

  const cancelSkill = () => {
    setActiveSkill(null);
    setInteractionMode(InteractionMode.Normal);
    setSelectedPieceToMove(null);
    setNotification("Skill cancelled.");
  };

  const executeRemoveRandom = (playerOverride?: Player) => {
    const player = playerOverride || currentPlayer;
    const opponent = player === Player.Black ? Player.White : Player.Black;
    const opponentPieces: Coordinate[] = [];
    board.forEach((row, y) => row.forEach((cell, x) => { if (cell === opponent) opponentPieces.push({ x, y }); }));

    if (opponentPieces.length === 0) {
      if(!playerOverride) showNotification("No opponent pieces!");
      if(!playerOverride) setActiveSkill(null);
      return;
    }

    const randomIdx = Math.floor(Math.random() * opponentPieces.length);
    const target = opponentPieces[randomIdx];
    const newBoard = [...board];
    newBoard[target.y][target.x] = Player.None;
    setBoard(newBoard);
    showNotification(player === Player.White ? "AI used Flying Sand!" : "Opponent piece blown away!");
    markSkillUsed(SkillType.RemoveRandom, player);
    if (!playerOverride) showNotification("Your turn continues!");
  };

  const executeForceRandom = (playerOverride?: Player) => {
    const player = playerOverride || currentPlayer;
    const opponent = player === Player.Black ? Player.White : Player.Black;
    const emptySpots: Coordinate[] = [];
    board.forEach((row, y) => row.forEach((cell, x) => { if (cell === Player.None) emptySpots.push({x, y}); }));
    if (emptySpots.length === 0) return;

    const randomSpot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
    const newBoard = [...board];
    newBoard[randomSpot.y][randomSpot.x] = opponent; 
    setBoard(newBoard);
    showNotification(player === Player.White ? "AI used Still Water!" : "Opponent moved randomly!");
    markSkillUsed(SkillType.ForceRandom, player);

    if (checkWin(newBoard, opponent, randomSpot.x, randomSpot.y)) {
        setGameStatus(GameStatus.Won);
        setWinner(opponent);
        return;
    }
    if (!playerOverride) showNotification("Your turn continues!");
  };

  const executeResetBoard = (playerOverride?: Player) => {
    const player = playerOverride || currentPlayer;
    setBoard(JSON.parse(JSON.stringify(INITIAL_BOARD)));
    setLastMove(null);
    setTurnCount(0);
    showNotification(player === Player.White ? "AI used Mountain Move!" : "Board reset!");
    markSkillUsed(SkillType.ResetBoard, player);
  };

  const handleBoardClick = (x: number, y: number) => {
    if (gameStatus !== GameStatus.Playing || isAiThinking) return;

    if (interactionMode === InteractionMode.SelectTargetPiece) {
      const opponent = currentPlayer === Player.Black ? Player.White : Player.Black;
      if (board[y][x] === opponent) {
        setSelectedPieceToMove({ x, y });
        setInteractionMode(InteractionMode.SelectTargetDest);
        showNotification("Select empty square.");
      } else showNotification("Invalid choice.");
      return;
    }

    if (interactionMode === InteractionMode.SelectTargetDest) {
      if (board[y][x] === Player.None && selectedPieceToMove) {
        performMovePiece(selectedPieceToMove, { x, y }, currentPlayer);
      } else showNotification("Must be empty.");
      return;
    }

    if (board[y][x] !== Player.None) return;

    const newBoard = [...board];
    newBoard[y][x] = currentPlayer;
    setBoard(newBoard);
    setLastMove({ x, y });
    setTurnCount(prev => prev + 1);

    if (checkWin(newBoard, currentPlayer, x, y)) {
      setGameStatus(GameStatus.Won);
      setWinner(currentPlayer);
    } else {
        const isFull = newBoard.every(row => row.every(cell => cell !== Player.None));
        if (isFull) setGameStatus(GameStatus.Draw);
        else switchTurn();
    }
  };

  const performMovePiece = (from: Coordinate, to: Coordinate, player: Player) => {
        const newBoard = [...board];
        const opponent = player === Player.Black ? Player.White : Player.Black;
        newBoard[from.y][from.x] = Player.None;
        newBoard[to.y][to.x] = opponent; 
        setBoard(newBoard);
        markSkillUsed(SkillType.MovePiece, player);
        if (player === currentPlayer) {
             setInteractionMode(InteractionMode.Normal);
             setSelectedPieceToMove(null);
        }
        showNotification(player === Player.White ? "AI moved your piece!" : "Piece moved!");
        if (checkWin(newBoard, opponent, to.x, to.y)) {
           setGameStatus(GameStatus.Won);
           setWinner(opponent);
           return;
        }
        if (player === currentPlayer) showNotification("Your turn continues!");
  };

  useEffect(() => {
    if (gameStatus === GameStatus.Playing && isAiMode && currentPlayer === Player.White && !isAiThinking) {
      const makeAiTurn = async () => {
        setIsAiThinking(true);
        await new Promise(r => setTimeout(r, 600)); 
        try {
            const action: AiAction = getAiDecision(board, Player.White, player2State, turnCount);
            if (action.type === 'MOVE') {
                const { x, y } = action;
                const newBoard = [...board];
                if (newBoard[y][x] === Player.None) {
                    newBoard[y][x] = Player.White;
                    setBoard(newBoard);
                    setLastMove({ x, y });
                    setTurnCount(c => c + 1);
                    if (checkWin(newBoard, Player.White, x, y)) {
                        setGameStatus(GameStatus.Won);
                        setWinner(Player.White);
                    } else {
                        const isFull = newBoard.every(row => row.every(cell => cell !== Player.None));
                        if (isFull) setGameStatus(GameStatus.Draw);
                        else setCurrentPlayer(Player.Black);
                    }
                }
            } else if (action.type === 'SKILL') {
                switch(action.skill) {
                    case SkillType.RemoveRandom: executeRemoveRandom(Player.White); break;
                    case SkillType.ForceRandom: executeForceRandom(Player.White); break;
                    case SkillType.ResetBoard: executeResetBoard(Player.White); break;
                    case SkillType.MovePiece:
                        if (action.payload?.from && action.payload?.to) performMovePiece(action.payload.from, action.payload.to, Player.White);
                        else setCurrentPlayer(Player.Black); 
                        break;
                }
            }
        } catch (error) {
            console.error("AI Error", error);
            setCurrentPlayer(Player.Black);
        }
        setIsAiThinking(false);
      };
      makeAiTurn();
    }
  }, [currentPlayer, isAiMode, gameStatus, board, player2State, turnCount]);

  return (
    <div className="h-full min-h-screen bg-stone-100 flex flex-col items-center justify-between lg:justify-center py-2 lg:py-6 font-sans overflow-hidden">
      
      <SkillEffectOverlay skillType={animatingSkill} onAnimationEnd={() => setAnimatingSkill(null)} />

      {/* --- Header (Mobile Only) --- */}
      <div className="lg:hidden w-full px-4 pt-2 pb-1 flex justify-between items-center bg-white shadow-sm z-10">
         <h1 className="text-xl font-black text-stone-800 tracking-tight">Super Gomoku</h1>
         <div className="text-xs text-stone-500 font-medium">Turn: {Math.floor(turnCount/2) + 1}</div>
      </div>

      {/* --- Main Layout --- */}
      <div className="flex-1 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center lg:gap-8 px-2 lg:px-4">
        
        {/* --- Section 1: Opponent (White) --- */}
        <div className="order-2 lg:order-3 w-full lg:w-72 flex lg:flex-col items-center lg:items-stretch justify-between lg:justify-start gap-2 lg:gap-4 p-2 lg:p-0">
             {/* Opponent Identity Card */}
            <div className={`flex-1 lg:flex-none flex items-center gap-2 p-2 lg:p-4 rounded-xl border-2 transition-all
                 ${currentPlayer === Player.White 
                    ? 'bg-white border-stone-800 shadow-md scale-100' 
                    : 'bg-stone-50 border-transparent opacity-80 scale-95'}`}>
                <div className="relative">
                    <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center shadow-inner">
                        {isAiMode ? <Bot className="text-stone-600 w-5 h-5 lg:w-6 lg:h-6" /> : <User className="text-stone-600 w-5 h-5 lg:w-6 lg:h-6" />}
                    </div>
                    {currentPlayer === Player.White && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-sm lg:text-lg text-stone-800">White</span>
                    <span className="text-[10px] lg:text-xs text-gray-500">{isAiMode ? 'AI (Smart)' : 'Player 2'}</span>
                </div>
            </div>

            {/* Opponent Skills (Status Only) */}
            <div className="flex lg:grid lg:grid-cols-1 gap-1 lg:gap-2">
                 <div className="flex gap-1 lg:hidden">
                    {SKILLS.map(s => {
                        const used = player2State.usedSkills.includes(s.id);
                        return (
                            <div key={s.id} className={`w-2 h-2 rounded-full ${used ? 'bg-gray-300' : s.color.split(' ')[0]}`}></div>
                        )
                    })}
                 </div>
                 <div className="hidden lg:flex flex-col gap-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Opponent Skills</p>
                    {SKILLS.map(skill => (
                        <SkillCard 
                        key={skill.id} 
                        skill={skill}
                        isActive={activeSkill === skill.id && currentPlayer === Player.White}
                        isAvailable={!player2State.usedSkills.includes(skill.id) && currentPlayer === Player.White && !isAiMode} 
                        disabled={gameStatus !== GameStatus.Playing || isAiMode} 
                        onClick={() => handleSkillClick(skill.id)}
                        />
                    ))}
                    {isAiMode && <div className="text-xs text-gray-400 italic text-center">AI uses skills automatically</div>}
                 </div>
            </div>
        </div>


        {/* --- Section 2: Board (Center) --- */}
        <div className="order-3 lg:order-2 flex-1 flex flex-col items-center justify-center relative my-2 lg:my-0">
             {/* Notification Overlay/Toast */}
             <div className="absolute -top-10 lg:-top-12 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap pointer-events-none">
                {notification ? (
                    <div className="px-4 py-1.5 bg-stone-800 text-white text-sm lg:text-base font-medium rounded-full shadow-xl animate-float flex items-center gap-2">
                         <AlertTriangle className="w-4 h-4 text-yellow-400"/> {notification}
                    </div>
                ) : isAiThinking ? (
                    <div className="px-4 py-1.5 bg-white/80 backdrop-blur text-stone-600 text-sm font-medium rounded-full shadow-lg border animate-pulse flex items-center gap-2">
                        <Bot className="w-4 h-4"/> AI Thinking...
                    </div>
                ) : null}
            </div>

            <Board 
              board={board} 
              onCellClick={handleBoardClick} 
              lastMove={lastMove}
              interactionMode={interactionMode}
              currentPlayer={currentPlayer}
            />

            {/* Game Over Screen */}
            {(gameStatus === GameStatus.Won || gameStatus === GameStatus.Draw) && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-stone-900/40 backdrop-blur-[2px] animate-in fade-in">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl text-center border-4 border-wood-600 w-[85%] max-w-sm animate-shake">
                        <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2 drop-shadow-md" />
                        <h2 className="text-2xl font-black text-stone-800 mb-1">
                            {gameStatus === GameStatus.Draw ? 'Draw!' : (winner === Player.Black ? 'Black Wins!' : 'White Wins!')}
                        </h2>
                        <button 
                            onClick={() => startGame(isAiMode)}
                            className="mt-4 w-full py-3 bg-stone-800 text-white rounded-xl font-bold active:scale-95 transition-transform"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            )}
             {/* Start Screen */}
             {gameStatus === GameStatus.Idle && (
                <div className="absolute inset-0 bg-stone-100/95 z-40 flex flex-col items-center justify-center rounded-lg">
                    <div className="bg-white p-8 rounded-2xl shadow-xl w-[90%] max-w-md text-center border border-stone-200">
                        <h1 className="text-3xl font-black text-stone-800 mb-2 tracking-tighter">Super Gomoku</h1>
                        <p className="text-stone-500 mb-6 text-sm">Traditional 5-in-a-row with powerful skills.</p>
                        <div className="space-y-3">
                            <button onClick={() => startGame(true)} className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                <Bot size={20}/> Vs AI
                            </button>
                            <button onClick={() => startGame(false)} className="w-full py-3 bg-white text-stone-900 border-2 border-stone-200 rounded-xl font-bold active:scale-95 flex items-center justify-center gap-2">
                                <User size={20}/> Local PvP
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Skill Preview Modal */}
            {previewSkill && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-[2px] p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden transform scale-100 transition-all">
                        {/* Header color stripe */}
                        <div className={`h-16 w-full ${previewSkill.color} relative flex items-center justify-center`}>
                           {/* Icon circle */}
                           <div className="absolute -bottom-6 w-12 h-12 rounded-full bg-white p-1 shadow-lg flex items-center justify-center">
                                <div className={`w-full h-full rounded-full ${previewSkill.color} flex items-center justify-center text-white`}>
                                     <Zap size={20} />
                                </div>
                           </div>
                        </div>
                        
                        <div className="pt-8 pb-6 px-6 text-center">
                            <h3 className="text-xl font-black text-stone-800 mb-2">{previewSkill.name}</h3>
                            <p className="text-stone-500 text-sm mb-6 leading-relaxed">
                                {previewSkill.description}
                            </p>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setPreviewSkill(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-500 font-bold text-sm hover:bg-stone-50 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmUseSkill}
                                    className={`flex-1 py-2.5 rounded-lg text-white font-bold text-sm shadow-md active:scale-95 ${previewSkill.color}`}
                                >
                                    Activate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>


        {/* --- Section 3: Player (Black/You) --- */}
        <div className="order-4 lg:order-1 w-full lg:w-72 flex flex-col gap-2 lg:gap-4 p-2 lg:p-0">
             {/* Player Identity */}
             <div className={`flex items-center justify-between p-2 lg:p-4 rounded-xl border-2 transition-all
                 ${currentPlayer === Player.Black 
                    ? 'bg-white border-stone-800 shadow-lg' 
                    : 'bg-stone-50 border-transparent opacity-80'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-stone-900 shadow-inner flex items-center justify-center">
                        <User className="text-gray-200 w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm lg:text-lg leading-none">Black</h2>
                        <span className="text-[10px] lg:text-xs text-gray-500">You</span>
                    </div>
                </div>
                {currentPlayer === Player.Black && <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>}
             </div>

             {/* Skills Grid */}
             <div className="grid grid-cols-4 lg:flex lg:flex-col gap-2 lg:gap-3">
                 <p className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-wider">Your Skills</p>
                 {SKILLS.map(skill => (
                    <SkillCard 
                      key={skill.id} 
                      skill={skill}
                      isActive={activeSkill === skill.id}
                      isAvailable={!player1State.usedSkills.includes(skill.id) && currentPlayer === Player.Black}
                      disabled={gameStatus !== GameStatus.Playing || (currentPlayer !== Player.Black && isAiMode)} 
                      onClick={() => handleSkillClick(skill.id)}
                    />
                 ))}
             </div>
        </div>

      </div>
    </div>
  );
};

export default App;