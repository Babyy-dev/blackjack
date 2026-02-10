import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getLeaderboard } from '../api/stats'
import DashboardNav from '../components/DashboardNav'
import AnimatedBackground from '../components/AnimatedBackground'

const LeaderboardPage = () => {
    const { data: leaderboard, isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: () => getLeaderboard(50),
    })

    return (
        <div className="min-h-screen w-full bg-[#050f15] text-white">
            <AnimatedBackground />
            <DashboardNav />

            <main className="mx-auto max-w-4xl px-6 py-12">
                <div className="mb-8 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-display text-4xl font-bold uppercase tracking-widest text-white sm:text-5xl"
                    >
                        Leaderboard
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="mt-2 text-sm text-white/50"
                    >
                        Top 50 Players by Total Winnings
                    </motion.p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
                    {isLoading ? (
                        <div className="p-12 text-center text-white/40">Loading rankings...</div>
                    ) : (
                        <div className="grid gap-1">
                            <div className="grid grid-cols-[3rem_1fr_1fr] border-b border-white/10 bg-black/20 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/40">
                                <div>#</div>
                                <div>Player</div>
                                <div className="text-right">Winnings</div>
                            </div>

                            {leaderboard?.map((entry, index) => (
                                <motion.div
                                    key={entry.user_id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group grid grid-cols-[3rem_1fr_1fr] items-center px-6 py-4 transition-colors hover:bg-white/5"
                                >
                                    <div className={`font-display text-xl font-bold ${index === 0 ? 'text-amber-400' :
                                            index === 1 ? 'text-gray-300' :
                                                index === 2 ? 'text-amber-700' : 'text-white/40'
                                        }`}>
                                        {entry.rank}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold">
                                            {entry.avatar_url ? (
                                                <img src={entry.avatar_url} alt={entry.display_name} className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                entry.display_name[0].toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{entry.display_name}</div>
                                            <div className="text-xs text-white/40">{entry.wins} Wins</div>
                                        </div>
                                    </div>
                                    <div className="text-right font-display text-lg font-bold text-amber-400">
                                        ${entry.total_winnings.toLocaleString()}
                                    </div>
                                </motion.div>
                            ))}

                            {leaderboard?.length === 0 && (
                                <div className="p-12 text-center text-white/40">No entries yet. Be the first!</div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default LeaderboardPage
