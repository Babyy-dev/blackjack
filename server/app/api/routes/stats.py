from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import deps
from app.db.models import Profile, User
from app.schemas.user import User as UserSchema

router = APIRouter()


@router.get("/leaderboard", response_model=list[dict[str, Any]])
async def get_leaderboard(
    session: AsyncSession = Depends(deps.get_db),
    limit: int = 50,
) -> Any:
    """
    Get top players by total winnings.
    """
    stmt = (
        select(Profile)
        .join(User)
        .where(User.is_active == True)  # noqa: E712
        .order_by(desc(Profile.total_winnings))
        .limit(limit)
    )
    result = await session.execute(stmt)
    profiles = result.scalars().all()

    leaderboard = []
    for rank, profile in enumerate(profiles, start=1):
        leaderboard.append({
            "rank": rank,
            "user_id": profile.user_id,
            "display_name": profile.display_name,
            "avatar_url": profile.avatar_url,
            "wins": profile.wins,
            "losses": profile.losses,
            "total_winnings": profile.total_winnings,
            "biggest_win": profile.biggest_win,
        })
    
    return leaderboard


@router.get("/me", response_model=dict[str, Any])
async def get_my_stats(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's detailed stats.
    """
    if not current_user.profile:
        return {}

    p = current_user.profile
    win_rate = 0
    if p.hands_played > 0:
        win_rate = (p.wins / p.hands_played) * 100

    return {
        "wins": p.wins,
        "losses": p.losses,
        "hands_played": p.hands_played,
        "total_winnings": p.total_winnings,
        "biggest_win": p.biggest_win,
        "win_rate": round(win_rate, 1),
    }
