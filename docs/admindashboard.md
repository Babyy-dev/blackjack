# Project MACA - Admin Dashboard Specification
Status: [!]

Progress notes
- UI layout and sections scaffolded in frontend
- Admin actions wired (user status, session reset, wallet adjustments)
- Admin action logs stored in backend with API access
- Live table snapshots and moderation endpoints available (kick/force stand/end round)
- Game action/round logs recorded in backend (UI views wired)
- Live game monitor and audit log feeds wired to backend APIs

The Admin Dashboard provides control over players, tables, economy, security, and system operations.

---

## Role Levels

| Role        | Access scope                       |
| ----------- | ---------------------------------- |
| Moderator   | Chat and player moderation         |
| Admin       | Game controls, economy, bans       |
| Super Admin | RNG tools, rollback, deep audits   |
| Owner       | Full system controls and overrides |

---

## Dashboard Sections

### 1. User Management

Features
- Search users by ID, username, or email
- View profile and stats
- View IP and device history
- View recent actions

Actions
- Kick user
- Mute and unmute
- Warn
- Temporary ban
- Permanent ban
- Lock and unlock account
- Reset session

---

### 2. Live Game Monitor

Features
- View all active tables
- See players and bets
- Realtime game state
- Spectator mode

Actions
- Pause and resume table
- End round
- Restart table
- Remove player
- Force stand (timeout)

---

### 3. Economy Control

Features
- View balances
- Transaction history
- Suspicious activity alerts

Actions
- Add balance
- Remove balance
- Refund bet
- Lock betting
- Unlock betting
- Set balance (Super Admin)

---

### 4. Referral System Control

Features
- View referrals
- Track rewards
- Detect abuse

Actions
- Adjust referral rewards
- Disable referral code
- Ban abusers

---

### 5. Crypto Gateway Control

Features
- View wallet addresses
- Deposit transaction verification
- Withdrawal requests
- Conversion logs

Actions
- Approve or reject withdrawals
- Flag suspicious wallets
- Freeze crypto accounts

---

### 6. Anti-Cheat and Security

Features
- IP tracking
- Device tracking
- Multi-account detection
- Action logs

Actions
- Flag user
- IP ban
- Device ban
- Lock table
- Audit round

---

### 7. RNG and Fairness (Super Admin)

Features
- View shuffle logs
- Deck state snapshots

Actions
- Verify RNG
- Reseed RNG
- Dump deck
- Dump game state

Note: Read-only in production.

---

### 8. System Controls

Features
- Platform status
- Feature flags
- Maintenance mode

Actions
- Broadcast messages
- Enable or disable features
- Restart server
- Graceful shutdown

---

### 9. Logs and Audits

Features
- Admin action logs
- Game history logs
- Security logs
- Economy logs

Filters
- By admin
- By date
- By user
- By table

---

## Security Rules

- All admin actions are logged
- Timestamp + Admin ID on every action
- Immutable logs
- Alert system for abuse

---

## Admin Dashboard UI Layout

Sidebar
- User Management
- Live Games
- Economy
- Crypto
- Referrals
- Security
- RNG Tools
- System
- Logs

Main Panel
- Data tables
- Action buttons
- Live views
- Audit logs
