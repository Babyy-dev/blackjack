# Project File Structure

```
.
|-- client/
|   |-- public/
|   |   |-- favicon.svg
|   |   |-- screenshot.png
|   |   `-- fonts/
|   |       `-- big_shoulders_display.woff2
|   |-- src/
|   |   |-- api/
|   |   |   |-- admin.ts
|   |   |   |-- auth.ts
|   |   |   |-- authorized.ts
|   |   |   |-- client.ts
|   |   |   |-- profile.ts
|   |   |   |-- types.ts
|   |   |   `-- wallet.ts
|   |   |-- assets/
|   |   |   |-- sounds/
|   |   |   `-- sprite.svg
|   |   |-- components/
|   |   |   |-- RequireAdmin.tsx
|   |   |   |-- RequireAuth.tsx
|   |   |   `-- SiteLayout.tsx
|   |   |-- game/
|   |   |   |-- components/
|   |   |   |-- cards.ts
|   |   |   |-- sound.ts
|   |   |   |-- store.ts
|   |   |   `-- types.ts
|   |   |-- pages/
|   |   |   |-- AdminPage.tsx
|   |   |   |-- AuthPage.tsx
|   |   |   |-- GamePage.tsx
|   |   |   |-- LandingPage.tsx
|   |   |   |-- LobbyPage.tsx
|   |   |   |-- NotFoundPage.tsx
|   |   |   |-- ProfilePage.tsx
|   |   |   |-- TablePage.tsx
|   |   |   `-- WalletPage.tsx
|   |   |-- realtime/
|   |   |   `-- socket.ts
|   |   |-- store/
|   |   |   |-- authStore.ts
|   |   |   `-- lobbyStore.ts
|   |   |-- styles/
|   |   |   |-- base.css
|   |   |   `-- game.css
|   |   |-- types/
|   |   |   `-- wallets.d.ts
|   |   |-- App.tsx
|   |   |-- index.css
|   |   `-- main.tsx
|   |-- .env.example
|   |-- package.json
|   |-- tailwind.config.js
|   `-- vite.config.ts
|-- server/
|   |-- app/
|   |   |-- api/
|   |   |   |-- routes/
|   |   |   |   |-- admin.py
|   |   |   |   |-- auth.py
|   |   |   |   |-- health.py
|   |   |   |   |-- profile.py
|   |   |   |   `-- wallet.py
|   |   |   `-- __init__.py
|   |   |-- core/
|   |   |   |-- config.py
|   |   |   |-- deps.py
|   |   |   `-- security.py
|   |   |-- db/
|   |   |   |-- base.py
|   |   |   |-- models.py
|   |   |   |-- redis.py
|   |   |   `-- session.py
|   |   |-- realtime/
|   |   |   |-- auth.py
|   |   |   |-- server.py
|   |   |   `-- state.py
|   |   |-- schemas/
|   |   |   |-- admin.py
|   |   |   |-- auth.py
|   |   |   |-- profile.py
|   |   |   |-- user.py
|   |   |   `-- wallet.py
|   |   |-- scripts/
|   |   |   |-- __init__.py
|   |   |   `-- seed_demo.py
|   |   `-- main.py
|   |-- alembic/
|   |   |-- env.py
|   |   `-- versions/
|   |       |-- 0001_initial.py
|   |       |-- 0002_wallets.py
|   |       `-- 0003_wallet_addresses.py
|   |-- uploads/
|   |-- .env.example
|   |-- README.md
|   `-- requirements.txt
|-- src/ (legacy Vue frontend)
|-- public/
|-- README.md
|-- milestone.md
|-- tech stack.md
`-- filestructure.md
```
