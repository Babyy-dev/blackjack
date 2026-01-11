import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="mx-auto flex w-full  flex-col items-center gap-6 px-6 py-20 text-center">
      <h1 className="text-5xl font-display uppercase tracking-[0.3rem] text-white">Table closed</h1>
      <p className="text-sm text-white/60">The page you are looking for has left the floor.</p>
      <Link
        to="/"
        className="rounded-full border border-white/20 px-6 py-3 text-xs uppercase tracking-[0.25rem] text-white/70 transition hover:border-white/40"
      >
        Return to lobby
      </Link>
    </div>
  )
}

export default NotFoundPage
