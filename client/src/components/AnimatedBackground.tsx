import { useEffect, useRef } from 'react'

const AnimatedBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let width = (canvas.width = window.innerWidth)
        let height = (canvas.height = window.innerHeight)

        const particles: {
            x: number
            y: number
            size: number
            speedX: number
            speedY: number
            opacity: number
        }[] = []

        const particleCount = 40

        const resize = () => {
            width = canvas.width = window.innerWidth
            height = canvas.height = window.innerHeight
        }

        const initParticles = () => {
            particles.length = 0
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 2 + 0.5,
                    speedX: Math.random() * 0.2 - 0.1,
                    speedY: Math.random() * 0.2 - 0.1,
                    opacity: Math.random() * 0.5 + 0.1,
                })
            }
        }

        const animate = () => {
            if (!ctx) return
            ctx.clearRect(0, 0, width, height)

            // Gradient Background
            const gradient = ctx.createLinearGradient(0, 0, width, height)
            gradient.addColorStop(0, '#050f15')
            gradient.addColorStop(0.5, '#08161c')
            gradient.addColorStop(1, '#050f15')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            // Gold Glow Orbs (Subtle)
            ctx.shadowBlur = 40
            ctx.shadowColor = 'rgba(251, 191, 36, 0.1)'
            ctx.fillStyle = 'rgba(251, 191, 36, 0.05)'
            ctx.beginPath()
            ctx.arc(width * 0.2, height * 0.3, 100, 0, Math.PI * 2)
            ctx.fill()

            ctx.shadowColor = 'rgba(34, 211, 238, 0.1)'
            ctx.fillStyle = 'rgba(34, 211, 238, 0.05)'
            ctx.beginPath()
            ctx.arc(width * 0.8, height * 0.7, 120, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0

            // Particles
            ctx.fillStyle = '#ffffff'
            particles.forEach((p) => {
                p.x += p.speedX
                p.y += p.speedY

                // Wrap around
                if (p.x < 0) p.x = width
                if (p.x > width) p.x = 0
                if (p.y < 0) p.y = height
                if (p.y > height) p.y = 0

                ctx.globalAlpha = p.opacity
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fill()
            })
            ctx.globalAlpha = 1

            requestAnimationFrame(animate)
        }

        window.addEventListener('resize', resize)
        initParticles()
        const rafId = requestAnimationFrame(animate)

        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(rafId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 -z-10 h-full w-full object-cover"
        />
    )
}

export default AnimatedBackground
