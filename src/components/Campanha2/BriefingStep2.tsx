import { useCampanha2Store } from '../../stores/campanha2Store'
import { Link2, FileText, Plus, X, ChevronRight } from 'lucide-react'

export default function BriefingStep2() {
  const { briefingUrls, briefingText, campaignName, setBriefingUrls, setBriefingText, setCampaignName, setStep } = useCampanha2Store()

  const urls = briefingUrls.split('\n').map(u => u.trim()).filter(Boolean)
  const canContinue = urls.length > 0 || briefingText.trim().length > 10

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h2 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 700 }}>Briefing da campanha</h2>
        <p className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
          Envie links e informações para o Agente de Atendimento organizar tudo para a equipe.
        </p>
      </div>

      {/* Campaign name */}
      <div
        className="flex flex-col gap-3 p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Nome da campanha</label>
        <input
          value={campaignName}
          onChange={e => setCampaignName(e.target.value)}
          placeholder="Ex: Lançamento Edifício Brava Coast"
          className="px-4 py-2.5 rounded-xl body"
          style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', width: '100%' }}
        />
      </div>

      {/* URLs */}
      <div
        className="flex flex-col gap-3 p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Link2 size={16} style={{ color: 'var(--primary)' }} />
          <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Links do briefing</label>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>— Lovable, Google Docs, sites, etc.</span>
        </div>

        {/* URL list */}
        <div className="flex flex-col gap-2">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)' }}>
              <Link2 size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
              <span className="body-small flex-1 truncate" style={{ color: 'var(--foreground)' }}>{url}</span>
              <button
                onClick={() => {
                  const newUrls = urls.filter((_, j) => j !== i)
                  setBriefingUrls(newUrls.join('\n'))
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add URL */}
        <div className="flex gap-2">
          <input
            id="url-input"
            placeholder="Cole um link aqui..."
            className="flex-1 px-3 py-2 rounded-xl body-small"
            style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none' }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (val) {
                  setBriefingUrls([...urls, val].join('\n'));
                  (e.target as HTMLInputElement).value = ''
                }
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById('url-input') as HTMLInputElement
              const val = input?.value.trim()
              if (val) { setBriefingUrls([...urls, val].join('\n')); input.value = '' }
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>
      </div>

      {/* Manual text */}
      <div
        className="flex flex-col gap-3 p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--primary)' }} />
          <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Briefing adicional</label>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>— Informações complementares</span>
        </div>
        <textarea
          value={briefingText}
          onChange={e => setBriefingText(e.target.value)}
          placeholder="Descreva aqui pontos importantes: produto, diferenciais, tom de voz, público-alvo, proibições, dados financeiros..."
          rows={6}
          className="px-4 py-3 rounded-xl body-regular resize-none"
          style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', width: '100%' }}
        />
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <button
          onClick={() => setStep('assets')}
          disabled={!canContinue}
          className="flex items-center gap-2 px-6 py-3 rounded-full transition-all hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: canContinue ? 'var(--primary)' : 'var(--secondary)',
            color: canContinue ? '#fff' : 'var(--muted-foreground)',
            border: 'none', cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
        >
          <span className="p-ui">Continuar para Assets</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
