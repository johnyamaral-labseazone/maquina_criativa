import { useNavigate } from 'react-router-dom'
import { Logo } from '../imports/Logo1'
import { ArrowRight, MessageSquare, Bot, Construction } from 'lucide-react'

const APPS = [
  {
    id: 'campanha2',
    path: '/campanha2',
    title: 'Campanha 2.0 — Agentes IA',
    description: 'Equipe de agentes IA (Atendimento, Redator, Designer, Vídeo Maker, Diretor de Arte) trabalha junto para criar a campanha completa a partir do briefing.',
    icon: Bot,
    accent: 'linear-gradient(135deg, #7C3AED, #EA580C)',
    accentSolid: '#7C3AED',
    accentLight: 'rgba(124,58,237,0.07)',
    accentBorder: 'rgba(124,58,237,0.18)',
    formats: ['Feed 4:5', 'Story 9:16', 'Vídeo Narrado', 'Vídeo Apresentadora'],
    badge: 'Novo',
    status: 'dev' as const,
    destaque: true,
  },
  {
    id: 'whatsapp',
    path: '/whatsapp',
    title: 'Estáticos WhatsApp',
    description: 'Crie uma arte de WhatsApp dentro da identidade Seazone.',
    icon: MessageSquare,
    accent: 'var(--cores-verde-600, #5EA500)',
    accentSolid: '#5EA500',
    accentLight: 'rgba(94,165,0,0.06)',
    accentBorder: 'rgba(94,165,0,0.12)',
    formats: ['WhatsApp 1:1', 'Story 9:16'],
    badge: 'WhatsApp',
    status: 'stable' as const,
    destaque: false,
  },
]

export default function Hub() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="gradient-header">
        <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex items-center gap-4 py-5">
            <div style={{ width: '140px', flexShrink: 0 }}>
              <Logo variant="white" />
            </div>
            <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <span className="body flex-shrink-0" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Design Hub
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-10 md:py-14">
        <div className="animate-fade-in-up flex flex-col gap-8">

          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 style={{ color: 'var(--foreground)' }}>Ferramentas de criação</h1>
            <span className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
              Selecione uma aplicação para começar
            </span>
          </div>

          {/* App cards */}
          <div className="flex flex-col gap-5">
            {APPS.map((app) => {
              const Icon = app.icon
              const isDev = app.status === 'dev'
              const isBeta = (app.status as string) === 'beta'
              return (
                <button
                  key={app.id}
                  onClick={() => navigate(app.path)}
                  className={`text-left rounded-2xl overflow-hidden transition-all hover-lift active:scale-[0.98] ${app.destaque ? 'w-full' : ''}`}
                  style={{
                    backgroundColor: 'var(--card)',
                    border: app.destaque ? '2px solid rgba(124,58,237,0.35)' : '1px solid var(--border)',
                    boxShadow: app.destaque ? '0 8px 32px rgba(124,58,237,0.15)' : 'var(--elevation-sm)',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {/* Destaque top gradient bar */}
                  {app.destaque && (
                    <div style={{ height: 3, background: 'linear-gradient(90deg, #7C3AED, #EA580C)', width: '100%' }} />
                  )}

                  <div className={app.destaque ? 'flex' : 'flex flex-col'}>
                    {/* Card header */}
                    <div
                      className={`${app.destaque ? 'px-6 py-6 flex-1' : 'px-6 pt-6 pb-5'}`}
                      style={{
                        background: `linear-gradient(135deg, ${app.accentLight} 0%, transparent 100%)`,
                        borderBottom: app.destaque ? 'none' : `1px solid ${app.accentBorder}`,
                        borderRight: app.destaque ? `1px solid ${app.accentBorder}` : 'none',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span
                          className="w-12 h-12 flex items-center justify-center rounded-2xl flex-shrink-0"
                          style={{ background: app.destaque ? 'linear-gradient(135deg, #7C3AED, #EA580C)' : app.accent, color: '#fff' }}
                        >
                          <Icon size={22} />
                        </span>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {isDev && (
                            <span
                              className="detail-medium px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
                              style={{ backgroundColor: 'rgba(234,88,12,0.1)', color: '#EA580C', border: '1px solid rgba(234,88,12,0.25)', fontSize: 10 }}
                            >
                              <Construction size={9} /> Em desenvolvimento
                            </span>
                          )}
                          {isBeta && (
                            <span
                              className="detail-medium px-2.5 py-1 rounded-full flex-shrink-0"
                              style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)', fontSize: 10 }}
                            >
                              Beta
                            </span>
                          )}
                          <span
                            className="detail-medium px-3 py-1 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: app.accentLight,
                              color: app.accentSolid,
                              border: `1px solid ${app.accentBorder}`,
                            }}
                          >
                            {app.badge}
                          </span>
                        </div>
                      </div>
                      <h2 style={{ color: 'var(--foreground)', margin: 0, fontSize: app.destaque ? '1.25rem' : '1.1rem', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700 }}>
                        {app.title}
                      </h2>
                    </div>

                    {/* Card body */}
                    <div className={`${app.destaque ? 'px-6 py-6 flex-1' : 'px-6 py-4'} flex flex-col gap-4`}>
                      <span className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
                        {app.description}
                      </span>

                      {/* Formats */}
                      <div className="flex gap-2 flex-wrap">
                        {app.formats.map((fmt) => (
                          <span
                            key={fmt}
                            className="detail-medium px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: 'var(--secondary)',
                              color: 'var(--secondary-foreground)',
                            }}
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>

                      {/* CTA */}
                      <div
                        className="flex items-center gap-2 pt-1"
                        style={{ color: app.accentSolid }}
                      >
                        <span className="p-ui-medium">Abrir aplicação</span>
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
