import deal from '@/assets/sounds/757328__steaq__ui-hover-item.mp3'
import click from '@/assets/sounds/159698__qubodup__scroll-step-hover-sound-for-user-interface.mp3'
import win from '@/assets/sounds/636649__cogfirestudios__ui-app.mp3'
import bust from '@/assets/sounds/636642__cogfirestudios__app-ui-puzzle-game.mp3'
import lose from '@/assets/sounds/636647__cogfirestudios__ui-app.mp3'
import blackjack from '@/assets/sounds/619832__cogfirestudios__puzzle-game-victory-melody.mp3'
import dealerBlackjack from '@/assets/sounds/619840__cogfirestudios__achievement-accomplish-jingle-app-ui.mp3'
import chipDown from '@/assets/sounds/636635__cogfirestudios__app-ui-puzzle-game.mp3'
import chipUp from '@/assets/sounds/636634__cogfirestudios__app-ui-puzzle-game.mp3'
import bank from '@/assets/sounds/636659__cogfirestudios__ui-achievement-puzzle-game-application.mp3'
import badHit from '@/assets/sounds/636677__cogfirestudios__app-ui-sound.mp3'
import goodHit from '@/assets/sounds/636674__cogfirestudios__app-ui-sound.mp3'
import blackjackBoom from '@/assets/sounds/636624__cogfirestudios__deep-hit.mp3'
import gameOver from '@/assets/sounds/636655__cogfirestudios__ui-achievement-puzzle-game-application.mp3'
import bet from '@/assets/sounds/677860__el_boss__ui-button-click-snap.mp3'

export const Sounds = {
  Deal: 'deal',
  Click: 'click',
  Blackjack: 'blackjack',
  BlackjackBoom: 'blackjackBoom',
  Bust: 'bust',
  BadHit: 'badHit',
  GoodHit: 'goodHit',
  Push: 'push',
  Win: 'win',
  Bet: 'bet',
  Lose: 'lose',
  Title: 'title',
  ChipDown: 'chipDown',
  ChipUp: 'chipUp',
  Bank: 'bank',
  GameOver: 'gameOver',
  DealerBlackjack: 'dealerBlackjack',
} as const

export type SoundId = (typeof Sounds)[keyof typeof Sounds]

const files = new Map<SoundId, string>([
  [Sounds.Deal, deal],
  [Sounds.Click, click],
  [Sounds.Blackjack, blackjack],
  [Sounds.BlackjackBoom, blackjackBoom],
  [Sounds.DealerBlackjack, dealerBlackjack],
  [Sounds.Bust, bust],
  [Sounds.Win, win],
  [Sounds.ChipDown, chipDown],
  [Sounds.ChipUp, chipUp],
  [Sounds.Bet, bet],
  [Sounds.Lose, lose],
  [Sounds.Bank, bank],
  [Sounds.BadHit, badHit],
  [Sounds.GoodHit, goodHit],
  [Sounds.GameOver, gameOver],
])

const SOUND_PERCENT = 100 / files.size

const buffers = new Map<SoundId, AudioBuffer>()
const sources = new Map<SoundId, AudioBufferSourceNode>()

const ctx = new AudioContext()
const gainNode = ctx.createGain()
gainNode.connect(ctx.destination)

export const initSound = async (): Promise<void> => {
  if (ctx.state === 'suspended') await ctx.resume()
}

const loadSound = async (
  sound: SoundId,
  onProgress?: (value: number) => void,
): Promise<void> => {
  try {
    const response = await fetch(files.get(sound)!)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    buffers.set(sound, audioBuffer)
  } catch {
    // Ignore individual sound failures so the game can still start.
  } finally {
    if (onProgress) onProgress(SOUND_PERCENT)
  }
}

export const loadSounds = async (onProgress?: (value: number) => void): Promise<void[]> => {
  let progress = 0
  const handler = (delta: number) => {
    progress += delta
    if (onProgress) onProgress(progress)
  }
  return Promise.all(Array.from(files.keys()).map((sound) => loadSound(sound, handler)))
}

export const stopSound = (sound: SoundId) => {
  if (!sources.has(sound)) return
  const source = sources.get(sound)!
  source.stop()
  sources.delete(sound)
}

export const playSound = async (
  sound: SoundId,
  options: { restartIfPlaying?: boolean; isMuted?: boolean } = {},
) => {
  const { restartIfPlaying = true, isMuted = false } = options
  if (ctx.state === 'suspended') await ctx.resume()
  if (!buffers.has(sound)) return
  if (isMuted) return
  if (sources.has(sound)) {
    if (!restartIfPlaying) return
    stopSound(sound)
  }
  const source = ctx.createBufferSource()
  source.buffer = buffers.get(sound)!
  sources.set(sound, source)
  source.addEventListener('ended', () => stopSound(sound))
  source.connect(gainNode)
  source.start()
}

export const setLooping = (sound: SoundId, loop: boolean) => {
  if (!sources.has(sound)) return
  sources.get(sound)!.loop = loop
}
