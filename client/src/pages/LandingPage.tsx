import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { useEffect } from 'react'
import AnimatedBackground from '../components/AnimatedBackground'

const HeroCards = ({ mouseX, mouseY }: { mouseX: MotionValue<number>; mouseY: MotionValue<number> }) => {
  // Smooth out the mouse values
  const springConfig = { damping: 25, stiffness: 150 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  // Calculate transforms based on mouse position
  const rotateX = useTransform(y, [-0.5, 0.5], [15, -15])
  const rotateY = useTransform(x, [-0.5, 0.5], [-15, 15])

  // Parallax layers
  const card1X = useTransform(x, [-0.5, 0.5], [-30, 30])
  const card1Y = useTransform(y, [-0.5, 0.5], [-30, 30])

  const card2X = useTransform(x, [-0.5, 0.5], [30, -30])
  const card2Y = useTransform(y, [-0.5, 0.5], [30, -30])

  return (
    <div className="relative h-full w-full perspective-[1200px]" style={{ perspective: 1200 }}>
      <motion.div
        style={{
          rotateX,
          rotateY,
          x: card1X,
          y: card1Y,
          z: 100
        } as any}
        className="absolute top-1/2 left-1/2 h-96 w-64 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1820] to-[#050f15] shadow-2xl origin-center"
      >
        <div className="flex h-full flex-col justify-between p-8">
          <div className="font-display text-5xl font-bold text-white">A</div>
          <div className="text-center text-8xl text-white">♠</div>
          <div className="rotate-180 font-display text-5xl font-bold text-white">A</div>
        </div>
      </motion.div>

      <motion.div
        style={{
          rotateX,
          rotateY,
          x: card2X,
          y: card2Y,
          z: 50
        } as any}
        className="absolute top-1/2 left-1/2 h-96 w-64 -translate-x-1/4 -translate-y-1/2 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#0a1820] to-[#050f15] shadow-[0_0_60px_rgba(251,191,36,0.15)] origin-center"
      >
        <div className="flex h-full flex-col justify-between p-8">
          <div className="font-display text-5xl font-bold text-amber-500">K</div>
          <div className="text-center text-8xl text-amber-500">♥</div>
          <div className="rotate-180 font-display text-5xl font-bold text-amber-500">K</div>
        </div>
      </motion.div>
    </div>
  )
}

const LandingPage = () => {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) - 0.5)
      mouseY.set((e.clientY / window.innerHeight) - 0.5)
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [mouseX, mouseY])

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      <AnimatedBackground />

      <main className="container mx-auto flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center md:px-12">

        {/* Hero Section */}
        <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-3xl text-center lg:text-left"
          >
            <div className="mb-6 flex justify-center lg:justify-start">
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2rem] text-amber-300 backdrop-blur-md">
                Project Maca Casino
              </span>
            </div>

            <h1 className="font-display text-6xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl md:text-8xl">
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                The Next
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 drop-shadow-2xl">
                Generation
              </span>
              <span className="block text-white/90">
                Of Blackjack
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-base text-white/60 sm:text-lg md:text-xl font-body leading-relaxed lg:mx-0">
              Experience the thrill of a high-stakes table from anywhere.
              Real-time multiplayer, secure vaults, and a cinematic interface designed for the pros.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                to="/lobby"
                className="group relative flex items-center gap-3 overflow-hidden rounded-full bg-white px-8 py-4 text-sm font-bold uppercase tracking-widest text-black transition-all hover:bg-amber-300 hover:scale-105"
              >
                <span className="relative z-10">Enter Lobby</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>

              <Link
                to="/auth"
                className="group rounded-full border border-white/20 bg-white/5 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/40"
              >
                Member Login
              </Link>
            </div>
          </motion.div>

          {/* Hero Visuals */}
          <div className="relative hidden h-[600px] w-full perspective-[1000px] lg:block">
            <HeroCards mouseX={mouseX} mouseY={mouseY} />
          </div>
        </div>

        {/* Live Activity Ticker - Larger */}
        <div className="absolute top-28 left-0 w-full overflow-hidden whitespace-nowrap border-y border-white/5 bg-[#050f15]/50 py-4 backdrop-blur-md">
          <div className="animate-ticker inline-block">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="mx-12 text-sm font-bold uppercase tracking-[0.2em] text-white/40">
                <span className="text-amber-400">WIN</span> PRO_PLAYER_{i} just won <span className="text-white">{(Math.random() * 2000 + 500).toFixed(0)} Tokens</span>
              </span>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid - Massive Scale */}
        <div className="mt-48 grid w-full max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Live Multiplayer", icon: "Users", desc: "Sync up with friends or challenge rivals at real-time tables." },
            { title: "Secure Vaults", icon: "Lock", desc: "JWT-authenticated sessions keeping your bankroll safe." },
            { title: "Pro Analytics", icon: "TrendingUp", desc: "Track your win rates, blackjack streaks, and dealer busts." }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + (i * 0.1), duration: 0.7 }}
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-10 text-left backdrop-blur-md transition-all duration-500 hover:border-amber-400/30 hover:bg-white/10 hover:-translate-y-2"
            >
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5 text-amber-300 shadow-inner ring-1 ring-white/10">
                <div className="h-8 w-8 bg-current opacity-80" style={{ maskImage: 'url(/favicon.svg)', maskSize: 'contain' }} />
              </div>
              <h3 className="mb-4 font-display text-3xl font-bold uppercase tracking-wider text-white group-hover:text-amber-300 transition-colors">
                {item.title}
              </h3>
              <p className="text-lg leading-relaxed text-white/50 group-hover:text-white/80">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* How It Works Section - Larger */}
        <div className="mt-48 w-full max-w-6xl text-left">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16 border-l-8 border-amber-400 pl-10"
          >
            <h2 className="font-display text-6xl font-black uppercase tracking-widest text-white sm:text-7xl">
              Ready to <span className="text-amber-400">Win?</span>
            </h2>
            <p className="mt-4 text-2xl font-bold uppercase tracking-widest text-white/40">
              Getting started is simple.
            </p>
          </motion.div>

          <div className="grid gap-12 md:grid-cols-3">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up in seconds. No KYC required for crypto deposits.' },
              { step: '02', title: 'Deposit Funds', desc: 'Load your wallet with tokens instantly.' },
              { step: '03', title: 'Hit the Tables', desc: 'Join a live lobby and start printing chips.' },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative border-t border-white/10 pt-10"
              >
                <span className="absolute -top-5 left-0 bg-[#050f15] pr-6 text-6xl font-black text-white/5">
                  {step.step}
                </span>
                <h3 className="mt-6 text-2xl font-bold uppercase tracking-wider text-white">
                  {step.title}
                </h3>
                <p className="mt-4 text-base text-white/50 leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>


        {/* Visual Showcase / Density Section */}
        <div className="mt-32 grid w-full max-w-7xl gap-8 px-4 sm:px-0 md:mt-48 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0f1f2e] to-[#050a10] p-12 border border-white/10 shadow-2xl"
          >
            <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-amber-500/10 blur-[80px]" />
            <h3 className="relative z-10 font-display text-4xl font-bold uppercase tracking-widest text-white mb-6">
              Premium <span className="text-amber-400">Assets</span>
            </h3>
            <p className="relative z-10 text-lg text-white/60 mb-10 max-w-sm">
              Immerse yourself with high-fidelity 3D chips, fluid animations, and a soundscape that puts you right on the casino floor.
            </p>

            <div className="relative z-10 grid grid-cols-2 gap-4">
              {[100, 500, 1000, 5000].map((val) => (
                <div key={val} className="flex items-center gap-4 rounded-xl bg-white/5 p-4 border border-white/5 backdrop-blur-sm">
                  <div className={`h-12 w-12 rounded-full shadow-lg ${val === 100 ? 'bg-white' :
                    val === 500 ? 'bg-red-500' :
                      val === 1000 ? 'bg-blue-500' : 'bg-black border border-amber-400'
                    }`} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">Chip Value</span>
                    <span className="font-display text-xl font-bold text-white">${val}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1a120b] to-[#0a0500] p-12 border border-amber-500/20 shadow-2xl"
          >
            <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-64 w-64 rounded-full bg-amber-600/10 blur-[80px]" />
            <h3 className="relative z-10 font-display text-4xl font-bold uppercase tracking-widest text-white mb-6">
              Provably <span className="text-amber-500">Fair</span>
            </h3>
            <p className="relative z-10 text-lg text-white/60 mb-10 max-w-sm">
              Every shuffle, every deal, and every outcome is cryptographically verifiable. Play with total confidence.
            </p>

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-5 border border-white/5">
                <span className="text-sm font-bold uppercase tracking-widest text-white/60">Server Seed Hashing</span>
                <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">SHA-256</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-5 border border-white/5">
                <span className="text-sm font-bold uppercase tracking-widest text-white/60">Client Seed Control</span>
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-400">USER_EDITABLE</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-5 border border-white/5">
                <span className="text-sm font-bold uppercase tracking-widest text-white/60">RNG Certification</span>
                <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400">VERIFIED</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Marquee Section - Partners/Winners */}
        <div className="mt-32 w-full overflow-hidden border-y border-white/5 bg-black/20 py-12">
          <div className="animate-ticker flex whitespace-nowrap">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="mx-12 flex items-center gap-4 opacity-30 grayscale transition-all hover:grayscale-0 hover:opacity-100">
                <div className="h-8 w-8 rounded-full bg-white/20" />
                <span className="font-display text-xl font-bold uppercase tracking-widest">Partner_Casino_{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="mt-40 w-full max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="font-display text-5xl font-black uppercase tracking-widest text-white">
              Elite <span className="text-amber-400">Circle</span>
            </h2>
            <p className="mt-4 text-lg text-white/50">Join thousands of players winning daily.</p>
          </motion.div>

          <div className="grid gap-8 px-4 sm:px-0 md:grid-cols-3">
            {[
              { name: "Alex K.", role: "Pro Player", text: "The interface is unlike anything else. I've switched from Stake entirely." },
              { name: "Sarah J.", role: "VIP Member", text: "Withdrawals are instant and the animations make every hand feel cinematic." },
              { name: "Mike R.", role: "High Roller", text: "Finally, a platform that respects the aesthetic of high-stakes play." }
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md"
              >
                <div className="mb-6 flex text-amber-400 gap-1">
                  {[...Array(5)].map((_, j) => <span key={j}>★</span>)}
                </div>
                <p className="mb-8 text-lg font-medium leading-relaxed text-white/80">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600" />
                  <div>
                    <div className="font-bold text-white">{t.name}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-white/40">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-40 mb-32 w-full max-w-4xl">
          <h2 className="mb-12 font-display text-4xl font-black uppercase tracking-widest text-white text-center">
            F.A.Q
          </h2>
          <div className="space-y-4">
            {[
              { q: "Is the gameplay provably fair?", a: "Yes. Every hand utilizes a SHA-256 seed pair that you can verify in the settings." },
              { q: "How fast are withdrawals?", a: "Crypto withdrawals are processed automatically and typically settle within 10 minutes." },
              { q: "Can I play with friends?", a: "Absolutely. Create a private lobby and share the invite code to play at the same table." }
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-white/20"
              >
                <div className="flex cursor-pointer items-center justify-between p-6">
                  <span className="font-bold text-white text-lg">{faq.q}</span>
                  <span className="text-2xl text-amber-400 group-hover:rotate-45 transition-transform">+</span>
                </div>
                <div className="px-6 pb-6 pt-0 text-white/50 leading-relaxed">
                  {faq.a}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </main>

      {/* Decorative Gradient Overlay at bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black to-transparent" />
    </div>
  )
}

export default LandingPage
