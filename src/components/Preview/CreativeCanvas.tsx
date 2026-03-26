import type { Estrutura, Variacao, Briefing, SafeZone, FormatoExport } from '../../types/briefing'

interface Props {
  estrutura: Estrutura
  variacao: Variacao
  briefing: Briefing
  formato: FormatoExport
  safeZone: SafeZone
  selectedEstrutura: number
  selectedVariacao: number
  onEditHeadline: (value: string) => void
  onEditTexto: (index: number, value: string) => void
}

const LOGO_WHITE_SVG = `<svg viewBox="0 0 256 43" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.0782 32.7817C21.0782 25.7633 0.327619 29.86 0.327619 18.0982C0.327619 12.8384 5.59716 8.48145 13.1403 8.48145C21.1413 8.48145 25.6293 12.5781 25.6293 15.1805C25.6293 16.4738 24.5912 17.842 22.8347 17.842C21.7926 17.842 21.0782 17.1914 20.4269 16.5408C19.1282 15.2396 16.3296 13.6822 13.0811 13.6822C8.33258 13.6822 6.05898 15.697 6.05898 17.5817C6.05898 24.0126 27.1332 20.5705 27.1332 32.2612C27.1332 38.566 20.565 42.2723 13.3416 42.2723C4.81561 42.2684 0 37.7183 0 35.3131C0 33.6925 1.23943 32.5846 2.73148 32.5846C3.77354 32.5846 4.48799 33.1721 4.94587 33.6255C6.83264 35.6403 9.56411 37.0046 13.4048 37.0046C17.8927 37.0046 21.0821 35.25 21.0821 32.7817" fill="white"/><path d="M37.9559 27.9083C38.7374 33.4284 43.4228 36.9376 49.012 36.9376C52.5882 36.9376 55.3868 35.5102 57.1433 34.5324C57.5341 34.3431 58.0551 34.146 58.7025 34.146C60.2616 34.146 61.3708 35.3131 61.3708 36.8114C61.3708 38.0455 60.5892 38.9563 60.0051 39.2836C58.7025 40.0643 54.6684 42.2723 49.0081 42.2723C39.2506 42.2723 31.8337 34.9898 31.8337 25.3138C31.8337 15.6379 39.5742 8.48145 48.6805 8.48145C57.7867 8.48145 64.6825 16.1504 64.6825 23.9456C64.6825 25.9644 63.0563 27.9122 61.0432 27.9122H37.948L37.9559 27.9083ZM37.9559 22.9007H59.0972C58.6433 18.4847 54.2816 13.6782 48.6884 13.6782C43.0952 13.6782 38.4769 17.7079 37.9559 22.9007Z" fill="white"/><path d="M119.087 14.2145C117.33 14.2145 116.047 13.0711 116.047 11.3125C116.047 9.55396 117.33 8.47754 119.087 8.47754H139.675C141.91 8.47754 143.125 10.2992 143.125 11.8527C143.125 13.0671 142.715 13.7413 141.91 14.6837L123.748 36.4723H140.627C142.379 36.4723 143.733 37.7538 143.733 39.4414C143.733 41.1289 142.383 42.2053 140.627 42.2053H118.881C116.991 42.2053 115.436 40.7228 115.436 38.7671C115.436 37.6868 115.775 37.0795 116.722 35.9321L134.749 14.2145H119.087Z" fill="white"/><path d="M163.249 42.2684C153.622 42.2684 146.272 34.7295 146.272 25.3099C146.272 15.8902 153.752 8.48145 163.249 8.48145C172.746 8.48145 180.289 15.9572 180.289 25.3099C180.289 34.6625 172.742 42.2684 163.249 42.2684ZM163.249 13.8754C157.005 13.8754 151.996 19.1392 151.996 25.3099C151.996 31.4805 156.811 36.9415 163.249 36.9415C169.687 36.9415 174.436 31.4805 174.436 25.3099C174.436 19.1392 169.557 13.8754 163.249 13.8754Z" fill="white"/><path d="M229.265 27.9083C230.047 33.4284 234.728 36.9376 240.322 36.9376C243.902 36.9376 246.7 35.5102 248.457 34.5324C248.84 34.3431 249.365 34.146 250.012 34.146C251.575 34.146 252.676 35.3131 252.676 36.8114C252.676 38.0455 251.895 38.9563 251.319 39.2836C250.012 40.0643 245.982 42.2723 240.322 42.2723C230.556 42.2723 223.147 34.9898 223.147 25.3138C223.147 15.6379 230.888 8.48145 239.99 8.48145C249.092 8.48145 256 16.1504 256 23.9456C256 25.9644 254.37 27.9122 252.353 27.9122H229.261L229.265 27.9083ZM229.265 22.9007H250.411C249.945 18.4847 245.591 13.6782 239.994 13.6782C234.397 13.6782 229.786 17.7079 229.265 22.9007Z" fill="white"/><path d="M202.982 8.55232C200.57 8.32363 198.142 8.30786 195.723 8.3394C193.402 8.37094 191.057 8.29603 188.74 8.40249C188.199 8.42614 187.67 8.52077 187.181 8.75735C187.063 8.81255 186.948 8.87564 186.834 8.94661C186.34 9.24233 185.874 9.66817 185.567 10.1729C185.207 10.7682 185.207 11.3124 185.239 11.9787C185.271 12.6096 185.239 13.2483 185.239 13.8792C185.231 16.174 185.227 18.4727 185.219 20.7715C185.215 22.2382 185.199 39.1494 185.199 39.1494C185.199 40.7739 186.632 42.2722 188.318 42.2722C190.003 42.2722 191.444 40.7739 191.444 39.1494V24.7302C191.444 18.0981 196.323 13.9384 201.719 13.9384C207.114 13.9384 211.997 18.0981 211.997 24.7302V39.1494C211.997 40.7739 213.371 42.2722 215.052 42.2722C216.734 42.2722 218.242 40.7739 218.242 39.1494V25.1796C218.242 16.5565 211.393 9.35273 202.978 8.55232" fill="white"/><path d="M109.176 13.0945L101.834 8.77302C101.85 8.6705 101.897 8.57587 101.897 8.47335V1.95569C101.897 0.87533 101.021 0 99.9396 0H96.0239C94.9424 0 94.0661 0.87533 94.0661 1.95569V4.23076L91.4017 2.67331C90.3202 2.02667 88.8953 2.13707 87.8927 2.87834L87.8413 2.89805L70.9512 12.6844C69.542 13.5242 68.9539 15.476 69.8302 16.9388C70.738 18.4568 72.7393 18.8669 74.1445 18.0271L75.155 17.4435C73.959 19.7817 73.2129 22.4234 73.2129 25.3057C73.2129 29.8637 74.9655 34.3547 78.2022 37.5919C79.4732 38.8654 80.9534 39.93 82.5758 40.7147C83.8231 41.3179 85.1414 41.8226 86.5111 42.075C88.3269 42.4062 90.2057 42.2366 92.0412 42.2406C94.0227 42.2406 96.0081 42.2445 97.9897 42.2485C99.7856 42.2524 101.582 42.2603 103.397 42.2642C103.851 42.2642 104.297 42.146 104.7 41.9409C105.217 41.6768 105.525 41.3889 105.864 40.9355C106.251 40.4229 106.52 39.8039 106.52 39.1414V18.6225C107.866 19.1074 109.5 18.6855 110.301 17.3449C111.177 15.8821 110.589 13.9304 109.176 13.0905M100.729 25.629C100.729 31.8667 96.5015 36.9374 90.1268 36.9374C83.752 36.9374 79.0667 31.5434 79.0667 25.3057C79.0667 19.068 83.752 13.8712 90.1268 13.8712C96.5015 13.8712 100.729 18.6816 100.729 24.8523V25.633V25.629Z" fill="#F1605D"/></svg>`

export function CreativeCanvas({
  estrutura,
  variacao,
  briefing,
  formato,
  safeZone,
  selectedEstrutura: _selectedEstrutura,
  selectedVariacao,
  onEditHeadline,
  onEditTexto,
}: Props) {
  const dims = { '4:5': { w: 1080, h: 1350 }, '9:16': { w: 1080, h: 1920 }, '1:1': { w: 1080, h: 1080 } }
  const { w, h } = dims[formato]
  const pad = 80

  // Escolhe imagem de fundo
  const bgImages = briefing.backgroundImages
  const bgIndex = variacao.backgroundImageIndex
  const bgImage =
    bgImages.length > 0
      ? bgImages[Math.min(bgIndex, bgImages.length - 1)]
      : briefing.referenceImage || null

  const accent = briefing.accentColor

  const showSafeZones = formato === '9:16'

  return (
    <div
      id="creative-preview"
      style={{
        width: w,
        height: h,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: '#080E32',
        letterSpacing: '0.02em',
      }}
    >
      {/* ── Background foto ─────────────────────────────────── */}
      {bgImage ? (
        <img
          src={bgImage}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
          }}
        />
      ) : (
        /* fallback: gradiente azul-marinho */
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #162456 0%, #193CB8 40%, #0f3460 100%)',
        }} />
      )}

      {/* ── Gradiente overlay (legibilidade) ─────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: bgImage
          ? 'linear-gradient(to bottom, rgba(8,14,50,0.15) 0%, rgba(8,14,50,0.35) 30%, rgba(8,14,50,0.75) 60%, rgba(8,14,50,0.95) 100%)'
          : 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
      }} />

      {/* ── Safe zones (9:16) ────────────────────────────────── */}
      {showSafeZones && (
        <>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:safeZone.top, backgroundColor:'rgba(231,0,11,0.12)', borderBottom:'2px dashed rgba(231,0,11,0.5)', zIndex:20 }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:safeZone.bottom, backgroundColor:'rgba(231,0,11,0.12)', borderTop:'2px dashed rgba(231,0,11,0.5)', zIndex:20 }} />
          <div style={{ position:'absolute', top:0, bottom:0, left:0, width:safeZone.left, backgroundColor:'rgba(231,0,11,0.12)', borderRight:'2px dashed rgba(231,0,11,0.5)', zIndex:20 }} />
          <div style={{ position:'absolute', top:0, bottom:0, right:0, width:safeZone.right, backgroundColor:'rgba(231,0,11,0.12)', borderLeft:'2px dashed rgba(231,0,11,0.5)', zIndex:20 }} />
        </>
      )}

      {/* ── Conteúdo principal ───────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        padding: pad,
        zIndex: 10,
        color: '#FFFFFF',
      }}>

        {/* TOP: badge hipótese */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {estrutura.nome ? (
            <span style={{
              display: 'inline-block',
              padding: '10px 28px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 9999,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
            }}>
              {estrutura.nome}
            </span>
          ) : <div />}

          {/* Variação number badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48,
            backgroundColor: accent,
            borderRadius: 9999,
            fontSize: 20, fontWeight: 700, color: '#FFFFFF',
          }}>
            {selectedVariacao + 1}
          </span>
        </div>

        {/* SPACER */}
        <div style={{ flex: 1 }} />

        {/* ACCENT LINE */}
        <div style={{
          width: 80, height: 6,
          backgroundColor: accent,
          borderRadius: 9999,
          marginBottom: 36,
        }} />

        {/* HEADLINE — editável */}
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onEditHeadline(e.currentTarget.textContent || '')}
          style={{
            fontSize: formato === '4:5' ? 90 : 80,
            fontWeight: 800,
            lineHeight: 1.05,
            marginBottom: 40,
            color: '#FFFFFF',
            outline: 'none',
            cursor: 'text',
            wordBreak: 'break-word',
          }}
        >
          {variacao.fraseDestaque || 'Frase de destaque'}
        </div>

        {/* TEXTOS FIXOS — editáveis */}
        {variacao.textosFixos.filter(Boolean).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 56 }}>
            {variacao.textosFixos.map((texto, i) => (
              texto ? (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: accent,
                    flexShrink: 0,
                  }} />
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEditTexto(i, e.currentTarget.textContent || '')}
                    style={{
                      fontSize: 30,
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.88)',
                      outline: 'none',
                      cursor: 'text',
                      lineHeight: 1.4,
                    }}
                  >
                    {texto}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        )}

        {/* DIVIDER */}
        <div style={{
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.12)',
          marginBottom: 40,
        }} />

        {/* BOTTOM: pontos fortes + logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          {/* Pontos fortes */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {estrutura.pontosFortes.map((ponto, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 76, height: 76,
                backgroundColor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 16,
                fontSize: 24,
                fontWeight: 700,
                color: '#FFFFFF',
              }}>
                {ponto}
              </div>
            ))}
          </div>

          {/* Logo */}
          <div style={{ flexShrink: 0 }}>
            {briefing.logoImage ? (
              <img
                src={briefing.logoImage}
                alt="Logo"
                style={{ height: 44, width: 'auto', maxWidth: 220, objectFit: 'contain' }}
              />
            ) : (
              <div
                style={{ height: 44, width: 220 }}
                dangerouslySetInnerHTML={{ __html: LOGO_WHITE_SVG }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
