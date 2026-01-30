import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'

const LandingPage = () => {
  const chipLayerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chipLayerRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      const chips = gsap.utils.toArray<HTMLElement>('.casino-chip-orbit')
      chips.forEach((chip, index) => {
        gsap.to(chip, {
          y: index % 2 === 0 ? -18 : 14,
          x: index % 3 === 0 ? 14 : -12,
          rotation: index % 2 === 0 ? 12 : -8,
          duration: 5 + index,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      })
    }, chipLayerRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="mx-auto flex w-full flex-col gap-12 px-6 py-12 sm:gap-20 sm:py-16">
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/80">
            Project MACA casino floor
          </p>
          <h1 className="text-3xl font-display uppercase tracking-[0.22rem] text-white sm:text-5xl sm:tracking-[0.35rem] lg:text-6xl">
            Spin up a private blackjack table with neon stakes, sync pulses, and a cinematic glow.
          </h1>
          <p className="text-base text-white/70 sm:text-lg">
            MACAJACK pairs a fast single-player engine with secure account vaults and a lobby ready
            for real-time multiplayer. Warm up on the practice table, then step into the high-limit
            lounge.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/lobby"
              className="casino-button rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.2rem] transition hover:-translate-y-0.5 sm:text-sm sm:tracking-[0.25rem]"
            >
              Enter the lobby
            </Link>
            <Link
              to="/auth"
              className="rounded-full border border-white/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2rem] text-white transition hover:border-white/60 sm:text-sm sm:tracking-[0.25rem]"
            >
              Member login
            </Link>
          </div>
        </motion.div>
        <motion.div
          ref={chipLayerRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="casino-panel casino-glow relative overflow-hidden rounded-3xl p-6 shadow-xl sm:p-8"
        >
          <div className="casino-chip casino-chip-orbit absolute -right-4 -top-6 h-24 w-24 rounded-full opacity-70" />
          <div className="casino-chip casino-chip-orbit absolute right-10 top-24 h-14 w-14 rounded-full opacity-60" />
          <div className="casino-chip casino-chip-orbit absolute bottom-10 right-6 h-20 w-20 rounded-full opacity-60" />
          <div className="casino-chip casino-chip-orbit absolute -left-6 bottom-6 h-28 w-28 rounded-full opacity-40" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_50%)]" />
          <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white sm:text-2xl sm:tracking-[0.25rem]">
            Tonight's highlights
          </h2>
          <div className="mt-6 space-y-5 text-sm text-white/70">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-amber-200">House rules</p>
              <p className="mt-2">6 decks - S17 - DAS - Blackjack pays 2:1</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-amber-200">Security</p>
              <p className="mt-2">JWT vault sessions and profile controls already live.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-amber-200">Next up</p>
              <p className="mt-2">Multiplayer tables, chat, and crypto-ready wallets.</p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: 'Private tables',
            copy: 'Spin up solo play or invite friends to a synchronized live table.',
          },
          {
            title: 'Vaulted accounts',
            copy: 'Profiles, avatars, and sessions secured with modern JWT flows.',
          },
          {
            title: 'Casino ambience',
            copy: 'Purpose-built visuals, custom cards, and the MACAJACK soundscape.',
          },
        ].map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.08 }}
            className="casino-panel rounded-3xl p-6 text-white/80"
          >
            <h3 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
              {item.title}
            </h3>
            <p className="mt-3 text-sm text-white/60">{item.copy}</p>
          </motion.div>
        ))}
      </section>

      <section className="casino-panel grid gap-8 rounded-3xl p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">How it works</p>
          <h2 className="mt-4 text-2xl font-display uppercase tracking-[0.2rem] text-white sm:text-3xl sm:tracking-[0.25rem]">
            From lobby to last hand
          </h2>
          <p className="mt-4 text-sm text-white/70">
            Build your table, sync with the dealer, and let the server run every card so the
            action stays fair and fast.
          </p>
        </div>
        <div className="space-y-4 text-sm text-white/70">
          {[
            {
              title: '01. Create or join a table',
              copy: 'Pick a public lounge or lock it with a private invite code.',
            },
            {
              title: '02. Ready up with the table',
              copy: 'Confirm your seat and sync the hand start with the group.',
            },
            {
              title: '03. Play with live stakes',
              copy: 'The server deals, validates moves, and updates balances in real time.',
            },
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-xs uppercase text-amber-200">{step.title}</p>
              <p className="mt-2">{step.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-amber-300/30 bg-gradient-to-br from-[#0e0b2a] via-[#12112d] to-[#0b1426] p-6 text-white/80 sm:p-8 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-2xl font-display uppercase tracking-[0.2rem] text-white sm:text-3xl sm:tracking-[0.25rem]">
            Build your legend
          </h2>
          <p className="mt-4 text-sm text-white/70">
            Create your profile, upload an avatar, and track your winnings as we expand into
            multiplayer and tournament play.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.2rem]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span>Active players</span>
            <span className="text-amber-300">1,284</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span>Hands dealt</span>
            <span className="text-amber-300">52,760</span>
          </div>
          <div className="flex items-center justify-between">
            <span>House edge</span>
            <span className="text-amber-300">0.5%</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
