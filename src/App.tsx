import { useState, useCallback, useEffect } from 'react'
import { generateBoard, findWords, LETTERS, type Cell } from './game'

interface GameState {
  board: Cell[][]
  currentWord: { row: number; col: number }[]
  foundWords: string[]
  score: number
  timeLeft: number
  hints: number
  stage: 'menu' | 'playing' | 'paused' | 'gameover'
  level: number
  streak: number
  bestScore: number
}

const GAME_TIME = 90
const HINT_COST = 50

export default function App() {
  const [state, setState] = useState<GameState>(() => ({
    board: [],
    currentWord: [],
    foundWords: [],
    score: 0,
    timeLeft: GAME_TIME,
    hints: 3,
    stage: 'menu',
    level: 1,
    streak: 0,
    bestScore: parseInt(localStorage.getItem('wordDropBest') || '0'),
  }))

  const startGame = useCallback(() => {
    const { board } = generateBoard()
    setState(s => ({
      ...s,
      board,
      currentWord: [],
      foundWords: [],
      score: 0,
      timeLeft: GAME_TIME,
      hints: 3,
      stage: 'playing',
      streak: 0,
    }))
  }, [])

  useEffect(() => {
    if (state.stage !== 'playing') return
    if (state.timeLeft <= 0) {
      const bs = Math.max(state.score, state.bestScore)
      localStorage.setItem('wordDropBest', String(bs))
      setState(s => ({ ...s, stage: 'gameover', bestScore: bs }))
      return
    }
    const timer = setInterval(() => {
      setState(s => ({ ...s, timeLeft: s.timeLeft - 1 }))
    }, 1000)
    return () => clearInterval(timer)
  }, [state.stage, state.timeLeft])

  const selectCell = useCallback((row: number, col: number) => {
    setState(s => {
      if (s.stage !== 'playing') return s
      const { board, currentWord, foundWords, score, streak } = s
      const already = currentWord.find(c => c.row === row && c.col === col)
      if (already) return s

      const newWord = [...currentWord, { row, col }]
      
      // Check adjacency
      if (currentWord.length > 0) {
        const last = currentWord[currentWord.length - 1]
        const dr = Math.abs(last.row - row)
        const dc = Math.abs(last.col - col)
        if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return s
      }

      const word = newWord.map(c => board[c.row][c.col].letter).join('')
      const found = findWords(newWord.map(c => c.row * 4 + c.col), board)
      
      let newScore = score
      let newStreak = streak
      
      if (found.length > 0 && foundWords.includes(word)) return s
      
      if (found.length > 0) {
        newScore += word.length * 10
        newStreak += 1
        if (newStreak >= 5) newScore += 25
      }

      return {
        ...s,
        currentWord: newWord,
        foundWords: found.length > 0 ? [...foundWords, word] : foundWords,
        score: newScore,
        streak: newStreak,
        board: found.length > 0 
          ? board.map(r => r.map(c => ({ ...c, played: c.played || (c.row === row && c.col === col) })))
          : board,
      }
    })
  }, [])

  const submitWord = useCallback(() => {
    setState(s => {
      const { currentWord, board } = s
      const indices = currentWord.map(c => c.row * 4 + c.col)
      const found = findWords(indices, board)
      let score = s.score
      let foundWords = s.foundWords
      const word = currentWord.map(c => board[c.row][c.col].letter).join('')
      
      if (found.length > 0 && !foundWords.includes(word)) {
        score += word.length * 50
        foundWords = [...foundWords, word]
      }
      
      return {
        ...s,
        currentWord: [],
        score,
        foundWords,
        board: found.length > 0 
          ? board.map(r => r.map(c => ({ ...c, played: c.played || currentWord.some(w => w.row === c.row && w.col === c.col) })))
          : board,
      }
    })
  }, [])

  const useHint = useCallback(() => {
    setState(s => {
      if (s.hints <= 0 || s.score < HINT_COST) return s
      const { board, foundWords } = s
      const allWords = findWords([], board)
      const newWord = allWords.find(w => !foundWords.includes(w))
      if (!newWord) return s
      return { ...s, hints: s.hints - 1, score: s.score - HINT_COST, currentWord: [], foundWords: [...foundWords, newWord] }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setState(s => ({ ...s, currentWord: [] }))
  }, [])

  if (state.stage === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">WORD DROP</h1>
        <p className="text-zinc-400 mb-8 text-lg">Find words. Beat the clock.</p>
        <div className="bg-white/5 rounded-2xl p-6 text-center mb-6">
          <p className="text-zinc-400 text-sm mb-1">Best Score</p>
          <p className="text-3xl font-bold text-purple-300">{state.bestScore}</p>
        </div>
        <button onClick={startGame} className="w-full max-w-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-2xl text-xl shadow-lg shadow-purple-500/30 active:scale-95 transition-transform">
          PLAY
        </button>
      </div>
    )
  }

  const word = state.currentWord.map(c => state.board[c.row]?.[c.col]?.letter || '').join('')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 flex flex-col text-white">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <div className="text-center">
          <p className="text-xs text-zinc-400">TIME</p>
          <p className={`text-2xl font-bold ${state.timeLeft <= 15 ? 'text-red-400' : 'text-white'}`}>{state.timeLeft}s</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-400">SCORE</p>
          <p className="text-2xl font-bold text-purple-300">{state.score}</p>
        </div>
        <button onClick={useHint} disabled={state.hints <= 0} className="px-3 py-2 bg-purple-500/20 rounded-xl text-sm text-purple-300 disabled:opacity-30">
          💡 {state.hints}
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="grid grid-cols-4 gap-2 max-w-sm w-full">
          {state.board.map((row, r) =>
            row.map((cell, c) => {
              const selected = state.currentWord.some(w => w.row === r && w.col === c)
              return (
                <button
                  key={`${r}-${c}`}
                  onTouchStart={() => selectCell(r, c)}
                  onMouseDown={() => selectCell(r, c)}
                  className={`aspect-square rounded-xl text-2xl font-black transition-all active:scale-90 select-none ${
                    cell.played ? 'bg-purple-500/30 text-purple-300' :
                    selected ? 'bg-pink-500 text-white scale-105 shadow-lg shadow-pink-500/40' :
                    'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {cell.letter}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Word bar */}
      <div className="p-4 flex gap-2 items-center justify-center">
        <div className="bg-white/10 rounded-xl px-4 py-3 min-w-[120px] text-center">
          <span className="text-xl font-bold tracking-widest text-purple-200">{word || 'TAP LETTERS'}</span>
        </div>
        <button onClick={submitWord} disabled={word.length < 2} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-30 active:scale-95 transition-transform">
          ✓
        </button>
        <button onClick={clearSelection} className="bg-white/10 text-zinc-400 px-4 py-3 rounded-xl active:scale-95">
          ✕
        </button>
      </div>

      {/* Found words */}
      <div className="p-4 max-h-32 overflow-y-auto">
        <div className="flex flex-wrap gap-1">
          {state.foundWords.map(w => (
            <span key={w} className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg text-sm font-medium">{w}</span>
          ))}
        </div>
      </div>

      {/* Game over modal */}
      {state.stage === 'gameover' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-sm w-full">
            <h2 className="text-3xl font-bold text-purple-300 mb-2">Time's Up!</h2>
            <p className="text-5xl font-black text-white mb-1">{state.score}</p>
            <p className="text-zinc-400 mb-1">{state.foundWords.length} words found</p>
            {state.score >= state.bestScore && state.score > 0 && (
              <p className="text-pink-400 font-bold mb-4">🎉 New Best Score!</p>
            )}
            <button onClick={startGame} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-xl mt-4 active:scale-95">
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  )
}