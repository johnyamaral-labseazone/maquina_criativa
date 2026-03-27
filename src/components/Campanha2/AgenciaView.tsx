import { useState } from 'react'
import { useCampanha2Store, AgentId, AgentBase, CopySet2, Roteiro } from '../../stores/campanha2Store'
import {
  CheckCircle2, AlertCircle, Clock, Loader2, ChevronRight,
  Headphones, PenLine, Palette, Film, Award, Ban, Edit3, Check, RotateCcw
} from 'lucide-react'

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  idle:    { label: 'Aguardando',  color: 'var(--muted-foreground)',   bg: 'var(--secondary)',           icon: Clock },
  working: { label: 'Trabalhando', color: '#0055FF',                   bg: 'rgba(0,85,255,0.1)',         icon: Loader2 },
  waiting: { label: 'Revisão',     color: '#EA580C',                   bg: 'rgba(234,88,12,0.1)',        icon: Edit3 },
  done:    { label: 'Concluído',   color: '#5EA500',                   bg: 'rgba(94,165,0,0.1)',         icon: CheckCircle2 },
  error:   { label: 'Erro',        color: '#EF4444',                   bg: 'rgba(239,68,68,0.1)',        icon: AlertCircle },
}

function StatusBadge({ status }: { status: AgentBase['status'] }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.bg }}>
      <Icon size={11} style={{ color: cfg.color, animation: status === 'working' ? 'spin 1s linear infinite' : 'none' }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
    </div>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 3, backgroundColor: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', backgroundColor: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ── Log viewer ───────────────────────────────────────────────────────────────
function AgentLogs({ logs }: { logs: AgentBase['logs'] }) {
  if (!logs.length) return null
  const logColors = { info: 'var(--muted-foreground)', success: '#5EA500', error: '#EF4444', action: '#EA580C' }
  return (
    <div className="rounded-xl px-3 py-2 flex flex-col gap-0.5" style={{ backgroundColor: 'var(--secondary)', maxHeight: 80, overflowY: 'auto' }}>
      {logs.slice(-5).map((l, i) => (
        <div key={i} className="flex gap-2" style={{ fontSize: 11, fontFamily: 'monospace' }}>
          <span style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>{l.time}</span>
          <span style={{ color: logColors[l.type] }}>{l.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ── Agent card ────────────────────────────────────────────────────────────────
function AgentCard({
  icon: Icon, label, role, color, agent, children,
}: {
  icon: React.ElementType; label: string; role: string; color: string; agent: AgentBase; children?: React.ReactNode
}) {
  const active = agent.status !== 'idle'
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-2xl transition-all"
      style={{
        border: active ? `1.5px solid ${color}30` : '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        boxShadow: agent.status === 'working' ? `0 0 0 2px ${color}20` : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: active ? color : 'var(--secondary)' }}
          >
            <Icon size={18} style={{ color: active ? '#fff' : 'var(--muted-foreground)' }} />
          </div>
          <div className="flex flex-col" style={{ lineHeight: 1.3 }}>
            <span className="p-ui-medium" style={{ color: 'var(--foreground)' }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{role}</span>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Progress */}
      {(agent.status === 'working' || agent.status === 'done') && (
        <ProgressBar value={agent.progress} color={color} />
      )}

      {/* Message */}
      {active && (
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>{agent.message}</p>
      )}

      {/* Logs */}
      {active && <AgentLogs logs={agent.logs} />}

      {/* Custom content */}
      {children}
    </div>
  )
}

// ── Copy editor panel ─────────────────────────────────────────────────────────
function CopyEditor() {
  const { redator, updateCopy, approveRedator, cancelAgency } = useCampanha2Store()
  const copies = redator.copies ?? []
  const [activeIdx, setActiveIdx] = useState(0)

  const estruturas = [...new Set(copies.map(c => c.estrutura))].sort()

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl" style={{ border: '1.5px solid #EA580C40', backgroundColor: 'var(--card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Edit3 size={16} style={{ color: '#EA580C' }} />
          <span className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Revisão do Redator</span>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>— revise as copies antes de enviar ao Designer</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cancelAgency}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 12 }}
          >
            <Ban size={12} /> Cancelar
          </button>
          <button
            onClick={() => approveRedator()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: '#5EA500', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            <Check size={13} /> Aprovar e Gerar
          </button>
        </div>
      </div>

      {/* Structure tabs */}
      <div className="flex gap-1">
        {estruturas.map(e => {
          const eCopies = copies.filter(c => c.estrutura === e)
          const isActive = copies[activeIdx]?.estrutura === e
          return (
            <button
              key={e}
              onClick={() => setActiveIdx(copies.findIndex(c => c.estrutura === e))}
              className="px-3 py-1.5 rounded-xl transition-all"
              style={{
                backgroundColor: isActive ? 'var(--primary)' : 'var(--secondary)',
                color: isActive ? '#fff' : 'var(--muted-foreground)',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              E{e} <span style={{ opacity: 0.7 }}>({eCopies.length}v)</span>
            </button>
          )
        })}
      </div>

      {/* Variation tabs */}
      {copies[activeIdx] && (
        <div className="flex gap-1">
          {copies.filter(c => c.estrutura === copies[activeIdx].estrutura).map(c => {
            const idx = copies.indexOf(c)
            return (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className="px-2.5 py-1 rounded-lg transition-all"
                style={{
                  backgroundColor: activeIdx === idx ? '#EA580C' : 'var(--secondary)',
                  color: activeIdx === idx ? '#fff' : 'var(--muted-foreground)',
                  border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                }}
              >
                V{c.variacao}{c.edited ? ' ✎' : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* Copy form */}
      {copies[activeIdx] && (
        <CopyForm copy={copies[activeIdx]} idx={activeIdx} onUpdate={updateCopy} />
      )}

      {/* Roteiros preview */}
      <RoteirosPreview redator={redator} />
    </div>
  )
}

function CopyForm({ copy, idx, onUpdate }: { copy: CopySet2; idx: number; onUpdate(i: number, f: Partial<CopySet2>): void }) {
  const fields: { key: keyof CopySet2; label: string; multiline?: boolean }[] = [
    { key: 'headline', label: 'Headline' },
    { key: 'body', label: 'Corpo do texto', multiline: true },
    { key: 'cta', label: 'CTA' },
  ]
  return (
    <div className="grid grid-cols-1 gap-3">
      {fields.map(f => (
        <div key={f.key} className="flex flex-col gap-1">
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
          {f.multiline ? (
            <textarea
              value={String(copy[f.key] ?? '')}
              onChange={e => onUpdate(idx, { [f.key]: e.target.value })}
              rows={2}
              className="px-3 py-2 rounded-xl resize-none"
              style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', fontSize: 13, width: '100%' }}
            />
          ) : (
            <input
              value={String(copy[f.key] ?? '')}
              onChange={e => onUpdate(idx, { [f.key]: e.target.value })}
              className="px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', fontSize: 13, width: '100%' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function RoteirosPreview({ redator }: { redator: ReturnType<typeof useCampanha2Store>['redator'] }) {
  const { roteirosNarrado, roteirosApresentadora } = redator
  if (!roteirosNarrado.length && !roteirosApresentadora.length) return null

  const renderRoteiro = (rot: Roteiro, tipo: string) => (
    <div key={`${tipo}-e${rot.estrutura}`} className="flex flex-col gap-1 p-3 rounded-xl" style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>{tipo} — E{rot.estrutura} · {rot.duracao}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--foreground)', margin: 0, lineHeight: 1.5 }}>{rot.roteiro}</p>
      {rot.legenda && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic', margin: 0 }}>📱 {rot.legenda}</p>}
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Roteiros</span>
      {roteirosNarrado.map(r => renderRoteiro(r, 'Narrado'))}
      {roteirosApresentadora.map(r => renderRoteiro(r, 'Apresentadora'))}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function AgenciaView() {
  const state = useCampanha2Store()
  const { atendimento, redator, designer, videoMaker, diretorArte, cancelAgency, restartWithFeedback, campaignName } = state

  const showCopyReview = redator.status === 'waiting'

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700 }}>
            Agência IA em execução
          </h2>
          {campaignName && (
            <span className="body-small" style={{ color: 'var(--muted-foreground)' }}>{campaignName}</span>
          )}
        </div>
        {(atendimento.status !== 'idle' && diretorArte.status !== 'done') && (
          <button
            onClick={cancelAgency}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 12 }}
          >
            <Ban size={13} /> Cancelar geração
          </button>
        )}
      </div>

      {/* ── Fase 1: Inteligência ── */}
      <div className="flex flex-col gap-3">
        <PhaseLabel number={1} label="Inteligência" active={atendimento.status === 'working' || redator.status === 'working'} done={redator.status === 'done' || redator.status === 'waiting'} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AgentCard icon={Headphones} label="Atendimento" role="Lê e organiza o briefing" color="#0055FF" agent={atendimento}>
            {atendimento.status === 'done' && atendimento.result && (
              <div className="px-3 py-2 rounded-xl text-xs flex flex-col gap-0.5" style={{ backgroundColor: 'rgba(0,85,255,0.05)', border: '1px solid rgba(0,85,255,0.15)' }}>
                <span style={{ fontWeight: 600, color: '#0055FF' }}>{atendimento.result.produto}</span>
                <span style={{ color: 'var(--muted-foreground)' }}>{atendimento.result.localizacao}</span>
              </div>
            )}
          </AgentCard>

          <AgentCard icon={PenLine} label="Redator" role="Cria copies e roteiros" color="#EA580C" agent={redator}>
            {redator.status === 'done' && redator.copies && (
              <div className="px-3 py-2 rounded-xl text-xs flex flex-col gap-0.5" style={{ backgroundColor: 'rgba(234,88,12,0.05)', border: '1px solid rgba(234,88,12,0.15)' }}>
                <span style={{ color: '#EA580C', fontWeight: 600 }}>{redator.copies.length} copies criadas</span>
                {redator.roteirosNarrado.length > 0 && <span style={{ color: 'var(--muted-foreground)' }}>+ {redator.roteirosNarrado.length} roteiro(s) narrado</span>}
              </div>
            )}
          </AgentCard>
        </div>

        {/* Copy Review Panel */}
        {showCopyReview && <CopyEditor />}
      </div>

      {/* ── Fase 2: Criação ── */}
      <div className="flex flex-col gap-3">
        <PhaseLabel number={2} label="Criação" active={designer.status === 'working' || videoMaker.status === 'working'} done={designer.status === 'done' && videoMaker.status === 'done'} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AgentCard icon={Palette} label="Designer" role="Cria imagens e carrosseis" color="#7C3AED" agent={designer}>
            {designer.status !== 'idle' && (
              <div className="flex gap-1 flex-wrap">
                {designer.creatives.map(cr => (
                  <div
                    key={cr.id}
                    className="flex items-center justify-center rounded-lg"
                    style={{
                      width: 32, height: 32,
                      backgroundColor: cr.status === 'done' && cr.imageDataUrl ? 'transparent' : 'var(--secondary)',
                      border: `1px solid ${cr.status === 'done' ? '#5EA50040' : cr.status === 'error' ? '#EF444440' : 'var(--border)'}`,
                      overflow: 'hidden',
                    }}
                  >
                    {cr.status === 'done' && cr.imageDataUrl
                      ? <img src={cr.imageDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 8, color: 'var(--muted-foreground)' }}>{cr.status === 'generating' ? '⟳' : cr.status === 'error' ? '✗' : '·'}</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </AgentCard>

          <AgentCard icon={Film} label="Vídeo Maker" role="Gera vídeos narrados e com apresentadora" color="#0891B2" agent={videoMaker}>
            {videoMaker.status !== 'idle' && videoMaker.videos.length > 0 && (
              <div className="flex flex-col gap-1">
                {videoMaker.videos.map(v => (
                  <div key={v.id} className="flex items-center gap-2 text-xs" style={{ color: v.status === 'done' ? '#5EA500' : v.status === 'error' ? '#EF4444' : 'var(--muted-foreground)' }}>
                    <span>{v.status === 'done' ? '✓' : v.status === 'generating' ? '⟳' : v.status === 'error' ? '✗' : '·'}</span>
                    <span>{v.tipo === 'narrado' ? 'Narrado' : 'Apresentadora'} E{v.estrutura}</span>
                  </div>
                ))}
              </div>
            )}
          </AgentCard>
        </div>
      </div>

      {/* ── Fase 3: Direção ── */}
      <div className="flex flex-col gap-3">
        <PhaseLabel number={3} label="Direção de Arte" active={diretorArte.status === 'working'} done={diretorArte.status === 'done'} />
        <AgentCard icon={Award} label="Diretor de Arte" role="Revisa tudo e garante aderência ao briefing" color="#059669" agent={diretorArte}>
          {diretorArte.status === 'done' && diretorArte.review && (
            <div
              className="flex flex-col gap-2 p-3 rounded-xl"
              style={{ backgroundColor: diretorArte.review.aprovado ? 'rgba(94,165,0,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${diretorArte.review.aprovado ? 'rgba(94,165,0,0.2)' : 'rgba(239,68,68,0.2)'}` }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontWeight: 700, color: diretorArte.review.aprovado ? '#5EA500' : '#EF4444', fontSize: 13 }}>
                  {diretorArte.review.aprovado ? '✓ Campanha aprovada' : '⚠ Ajustes necessários'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Score: {diretorArte.review.score}/100</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>{diretorArte.review.relatorio}</p>
              {!diretorArte.review.aprovado && diretorArte.review.problemas.length > 0 && (
                <RestartPanel problemas={diretorArte.review.problemas} onRestart={restartWithFeedback} />
              )}
            </div>
          )}
        </AgentCard>
      </div>
    </div>
  )
}

function PhaseLabel({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: done ? '#5EA500' : active ? '#0055FF' : 'var(--secondary)',
          color: done || active ? '#fff' : 'var(--muted-foreground)',
          fontSize: 10, fontWeight: 700,
        }}
      >
        {done ? '✓' : number}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: done ? '#5EA500' : active ? 'var(--foreground)' : 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
    </div>
  )
}

function RestartPanel({ problemas, onRestart }: { problemas: string[]; onRestart(obs: string): void }) {
  const [obs, setObs] = useState(problemas.join('. '))
  return (
    <div className="flex flex-col gap-2">
      <p style={{ fontSize: 11, color: '#EF4444', margin: 0 }}>Problemas: {problemas.join(' · ')}</p>
      <textarea
        value={obs}
        onChange={e => setObs(e.target.value)}
        rows={2}
        className="px-3 py-2 rounded-xl resize-none"
        style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', fontSize: 12, width: '100%' }}
      />
      <button
        onClick={() => onRestart(obs)}
        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl"
        style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
      >
        <RotateCcw size={12} /> Reiniciar com observações
      </button>
    </div>
  )
}
