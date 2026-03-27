import { useRef } from 'react'
import { useCampanha2Store } from '../../stores/campanha2Store'
import { FolderOpen, Upload, X, Image, User, ChevronRight, ChevronLeft } from 'lucide-react'

export default function AssetsStep2() {
  const { assetsUrl, assetsContext, referenceImages, presenterImage, presenterImageName, setAssetsUrl, setAssetsContext, addReferenceImage, removeReferenceImage, setPresenterImage, setStep } = useCampanha2Store()
  const refInput = useRef<HTMLInputElement>(null)
  const presInput = useRef<HTMLInputElement>(null)

  const handleRefImages = (files: FileList | null) => {
    if (!files) return
    Array.from(files).slice(0, 5 - referenceImages.length).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        addReferenceImage({ id: `ref-${Date.now()}-${Math.random()}`, name: file.name, dataUrl: e.target?.result as string })
      }
      reader.readAsDataURL(file)
    })
  }

  const handlePresenter = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setPresenterImage(e.target?.result as string, file.name)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <h2 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 700 }}>Assets da campanha</h2>
        <p className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
          Materiais que os agentes usarão como base visual e referência criativa.
        </p>
      </div>

      {/* Google Drive */}
      <div className="flex flex-col gap-3 p-5 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <FolderOpen size={16} style={{ color: '#0055FF' }} />
          <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Link do Google Drive</label>
        </div>
        <input
          value={assetsUrl}
          onChange={e => setAssetsUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          className="px-4 py-2.5 rounded-xl body"
          style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', width: '100%' }}
        />
        <p className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>Pasta com fotos do empreendimento, logo, materiais de apoio.</p>
      </div>

      {/* Reference images */}
      <div className="flex flex-col gap-3 p-5 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image size={16} style={{ color: '#7C3AED' }} />
            <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Referência visual</label>
            <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>— até 5 peças para identidade visual</span>
          </div>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>{referenceImages.length}/5</span>
        </div>

        {referenceImages.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {referenceImages.map(img => (
              <div key={img.id} className="relative group" style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={img.dataUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => removeReferenceImage(img.id)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {referenceImages.length < 5 && (
          <button
            onClick={() => refInput.current?.click()}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-dashed transition-all hover:opacity-80"
            style={{ border: '1.5px dashed var(--border)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', width: '100%', justifyContent: 'center' }}
          >
            <Upload size={15} />
            <span className="body-small">Adicionar referência(s)</span>
          </button>
        )}
        <input ref={refInput} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleRefImages(e.target.files)} />
      </div>

      {/* Presenter photo */}
      <div className="flex flex-col gap-3 p-5 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <User size={16} style={{ color: '#EA580C' }} />
          <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Foto da apresentadora</label>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>— para Vídeo Apresentadora</span>
        </div>

        {presenterImage ? (
          <div className="flex items-center gap-3">
            <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
              <img src={presenterImage} alt="Apresentadora" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className="body-small" style={{ color: 'var(--foreground)' }}>{presenterImageName}</span>
              <button onClick={() => setPresenterImage(null, null)} className="flex items-center gap-1" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 12, padding: 0 }}>
                <X size={12} /> Remover
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => presInput.current?.click()}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-dashed transition-all hover:opacity-80"
            style={{ border: '1.5px dashed var(--border)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', width: '100%', justifyContent: 'center' }}
          >
            <Upload size={15} />
            <span className="body-small">Upload da foto</span>
          </button>
        )}
        <input ref={presInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePresenter(e.target.files)} />
      </div>

      {/* Context */}
      <div className="flex flex-col gap-3 p-5 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <label className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Orientações criativas adicionais</label>
        <textarea
          value={assetsContext}
          onChange={e => setAssetsContext(e.target.value)}
          placeholder="Instruções específicas para os agentes: cores a usar, elementos obrigatórios, tom visual, restrições..."
          rows={3}
          className="px-4 py-3 rounded-xl body-regular resize-none"
          style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', width: '100%' }}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep('briefing')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full"
          style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={15} />
          <span className="p-ui">Voltar</span>
        </button>
        <button
          onClick={() => setStep('parametros')}
          className="flex items-center gap-2 px-6 py-3 rounded-full transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <span className="p-ui">Continuar para Parâmetros</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
