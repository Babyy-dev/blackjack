import { Link } from 'react-router-dom'

const LandingPage = () => {
  return (
    <div className="mx-auto flex w-full  flex-col gap-20 px-6 py-16">
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-6">
          <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/80">
            Project MACA casino floor
          </p>
          <h1 className="text-5xl font-display uppercase tracking-[0.35rem] text-white sm:text-6xl">
            Spin up a private blackjack table with real stakes, real pacing, and a cinematic glow.
          </h1>
          <p className="text-lg text-white/70">
            Vlackjack pairs a fast single-player engine with secure account vaults and a lobby ready
            for real-time multiplayer. Warm up on the practice table, then step into the high-limit
            lounge.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/lobby"
              className="rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25rem] text-[#1b1200] shadow-glow transition hover:-translate-y-0.5 hover:bg-amber-200"
            >
              Enter the lobby
            </Link>
            <Link
              to="/auth"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25rem] text-white transition hover:border-white/40"
            >
              Member login
            </Link>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d1f28]/80 p-8 shadow-xl">
          <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
          <h2 className="text-2xl font-display uppercase tracking-[0.25rem] text-white">
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
        </div>
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
            copy: 'Purpose-built visuals, custom cards, and the Vlackjack soundscape.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80"
          >
            <h3 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
              {item.title}
            </h3>
            <p className="mt-3 text-sm text-white/60">{item.copy}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-8 rounded-3xl border border-white/10 bg-[#071a22]/80 p-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">How it works</p>
          <h2 className="mt-4 text-3xl font-display uppercase tracking-[0.25rem] text-white">
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

      <section className="grid gap-6 rounded-3xl border border-amber-300/20 bg-gradient-to-br from-[#0b1f26] via-[#13252f] to-[#0b1f26] p-8 text-white/80 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-3xl font-display uppercase tracking-[0.25rem] text-white">
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
