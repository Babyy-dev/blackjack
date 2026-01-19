# Project MACA - Development Milestones
Status: [!]

Progress snapshot
- Done: 47
- In progress: 0
- Not started: 53
- Total tasks: 100

This roadmap tracks the build status for the Multiplayer Crypto-Enabled Blackjack Platform.

Legend:
- [x] done
- [!] in progress
- [?] not started

---

## Phase 1 - Infrastructure and Foundation [!]

Tasks
- [?] VPS setup (PostgreSQL + Redis)
- [?] Secure SSH and firewall configuration
- [x] Docker environment (not required; using native services)
- [x] Project folder structure
- [?] CI/CD pipeline
- [x] Environment variables management (examples in repo)

Deliverables
- [x] Running backend server
- [?] Database and Redis operational
- [?] Secure deployment pipeline

---

## Phase 2 - Authentication and User System [!]

Tasks
- [x] Email/password registration
- [x] JWT authentication
- [x] Password hashing (Argon2/bcrypt)
- [?] Email verification
- [x] Role system (player/admin now, moderator/super admin later)
- [x] Profile management
- [x] Avatar upload

Deliverables
- [x] Secure login system
- [x] Profile editing
- [x] Role-based access

---

## Phase 3 - Core Blackjack Engine [x]

Tasks
- [x] Secure RNG (secrets module)
- [x] Deck management
- [x] Dealer AI
- [x] Betting rules
- [x] Action validation
- [x] Timeout auto-stand
- [x] Game state logging

Deliverables
- [x] Server-authoritative Blackjack engine
- [x] Anti-cheat validation
- [x] Round history logs

---

## Phase 4 - Multiplayer and Lobby System [!]

Tasks
- [x] WebSocket integration (Socket.IO)
- [x] Public and private tables
- [x] Invite codes
- [?] Matchmaking
- [?] Spectator mode
- [x] Turn enforcement

Deliverables
- [x] 2-8 player tables
- [x] Live game sync
- [?] Spectator support

---

## Phase 5 - Chat and Social Features [?]

Tasks
- [?] Table chat
- [?] Emoji reactions
- [?] Profanity filter
- [?] Mute system
- [?] Friends list
- [?] Invitations and notifications

Deliverables
- [?] Live chat
- [?] Emoji support
- [?] Friend invites

---

## Phase 6 - Statistics and Leaderboards [?]

Tasks
- [?] Stats tracking
- [?] Win/loss history
- [?] Blackjack count
- [?] Weekly/monthly leaderboards
- [?] Friends leaderboard

Deliverables
- [?] Ranked leaderboards
- [?] User stats dashboard

---

## Phase 7 - Referral System [?]

Tasks
- [?] Unique referral codes
- [?] Bonus system
- [?] Referral tracking
- [?] Reward history

Deliverables
- [?] Referral rewards system
- [?] Referral dashboard

---

## Phase 8 - Economy and Token System [!]

Tasks
- [x] Token wallet system
- [x] Transaction logging
- [?] Daily rewards
- [?] Fraud detection

Deliverables
- [x] Secure balance system
- [x] Transaction logs

---

## Phase 9 - Crypto Gateway [?]

Tasks
- [x] Wallet linking (UI + API)
- [?] Blockchain TX verification
- [?] Token conversion (1 Token = 1 USD)
- [?] Withdrawal system
- [?] Admin approval flow

Deliverables
- [x] BTC/ETH/SOL UI hooks
- [?] Secure crypto gateway

---

## Phase 10 - Admin and Moderation System [!]

Tasks
- [x] Admin command system
- [?] Live spectating
- [x] User management
- [x] Economy controls (UI placeholders)
- [?] Audit logs (backend)

Deliverables
- [x] Admin dashboard
- [x] Moderation UI scaffolds

---

## Phase 11 - Frontend UI/UX [!]

Tasks
- [x] Lobby UI
- [x] Game table UI
- [x] Wallet UI
- [x] Admin panel UI
- [x] Mobile responsiveness

Deliverables
- [x] Complete frontend layout
- [x] Realtime UI wiring

---

## Phase 12 - Security Hardening [?]

Tasks
- [?] Rate limiting
- [?] Anti-cheat upgrades
- [?] Pen-testing
- [?] Load testing
- [?] Logging improvements

Deliverables
- [?] Hardened system
- [?] Security audit

---

## Phase 13 - Launch and Monitoring [?]

Tasks
- [?] Final QA
- [?] Backup system
- [?] Monitoring setup
- [?] Incident response plan

Deliverables
- [?] Live platform
- [?] Monitoring dashboards
