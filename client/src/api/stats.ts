import { request } from './client'

export type LeaderboardEntry = {
    rank: number
    user_id: string
    display_name: string
    avatar_url: string | null
    wins: number
    losses: number
    total_winnings: number
    biggest_win: number
}

export type PersonalStats = {
    wins: number
    losses: number
    hands_played: number
    total_winnings: number
    biggest_win: number
    win_rate: number
}

export const getLeaderboard = async (limit = 50): Promise<LeaderboardEntry[]> => {
    return request<LeaderboardEntry[]>(`/stats/leaderboard?limit=${limit}`)
}

export const getMyStats = async (): Promise<PersonalStats> => {
    return request<PersonalStats>('/stats/me')
}
