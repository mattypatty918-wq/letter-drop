export interface Cell {
  letter: string
  row: number
  col: number
  played: boolean
}

const WORD_LIST = [
  'CAT','DOG','SUN','RUN','HAT','BED','CUP','PEN','BIG','RED',
  'BLUE','STAR','MOON','FIRE','TREE','FISH','BIRD','LOVE','HOME','GAME',
  'WORD','DROP','TIME','PLAY','SCORE','FIND','MOVE','WORK','LIFE','WAVE',
  'GOLD','NICE','FAST','SLOW','DARK','LIGHT','WATER','EARTH','WIND','SNOW',
  'HAPPY','SMILE','DREAM','MUSIC','DANCE','BEACH','OCEAN','CLOUD','STORM','BRAVE',
  'TIGER','EAGLE','WHALE','SNAKE','MOUSE','HEART','BRAIN','WORLD','SPACE','STONE',
  'SPRING','SUMMER','AUTUMN','WINTER','GARDEN','FOREST','RIVER','MOUNTAIN','VALLEY','ISLAND',
]

const LETTER_FREQ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => ({
  letter: l,
  count: {
    A:8,B:2,C:3,D:3,E:8,F:2,G:3,H:3,I:7,J:1,K:2,L:4,M:3,
    N:6,O:6,P:3,Q:1,R:6,S:6,T:6,U:4,V:2,W:2,X:1,Y:2,Z:1
  }[l] || 2
}))

export const LETTERS = LETTER_FREQ

function randomLetter(): string {
  const total = LETTER_FREQ.reduce((sum, l) => sum + l.count, 0)
  let r = Math.random() * total
  for (const lf of LETTER_FREQ) {
    r -= lf.count
    if (r <= 0) return lf.letter
  }
  return 'A'
}

export function generateBoard() {
  const board: Cell[][] = []
  for (let r = 0; r < 4; r++) {
    const row: Cell[] = []
    for (let c = 0; c < 4; c++) {
      row.push({ letter: randomLetter(), row: r, col: c, played: false })
    }
    board.push(row)
  }
  return { board }
}

interface TrieNode {
  children: Record<string, TrieNode>
  isWord: boolean
}

function buildTrie(): TrieNode {
  const root: TrieNode = { children: {}, isWord: false }
  for (const word of WORD_LIST) {
    let node = root
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = { children: {}, isWord: false }
      node = node.children[ch]
    }
    node.isWord = true
  }
  return root
}

const trie = buildTrie()

function getNeighbors(idx: number): number[] {
  const row = Math.floor(idx / 4)
  const col = idx % 4
  const neighbors: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
        neighbors.push(nr * 4 + nc)
      }
    }
  }
  return neighbors
}

export function findWords(indices: number[], board: Cell[][]): string[] {
  const words: Set<string> = new Set()
  const visited = new Set<number>(indices)

  function dfs(idx: number, node: TrieNode, path: string) {
    const letter = board[Math.floor(idx / 4)][idx % 4].letter
    const child = node.children[letter]
    if (!child) return

    const newPath = path + letter
    if (child.isWord && newPath.length >= 3) {
      words.add(newPath)
    }

    for (const nidx of getNeighbors(idx)) {
      if (!visited.has(nidx)) {
        visited.add(nidx)
        dfs(nidx, child, newPath)
        visited.delete(nidx)
      }
    }
  }

  const startIndices = indices.length > 0 ? [indices[indices.length - 1]] : Array.from({ length: 16 }, (_, i) => i)
  
  for (const startIdx of startIndices) {
    visited.add(startIdx)
    dfs(startIdx, trie, '')
    visited.delete(startIdx)
  }

  return Array.from(words)
}