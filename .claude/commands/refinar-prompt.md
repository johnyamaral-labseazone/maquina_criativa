# /refinar-prompt

Analise a função `buildCreativePrompt` no projeto e proponha melhorias baseadas
no problema descrito em $ARGUMENTS (ou nos últimos criativos gerados se nenhum
argumento for passado).

## O que fazer

1. Leia `server/index.ts` e `api/index.ts` — localize `buildCreativePrompt` em ambos
2. Identifique o problema relatado:
   - Texto ilegível ou sobreposto → ajustar instruções de tipografia e posicionamento
   - Estilo diferente da referência → fortalecer `styleInstruction` e análise do Gemini
   - Layout desorganizado → detalhar coordenadas de posição dos elementos
   - Cores erradas → especificar hex codes em mais elementos
   - Negative prompt insuficiente → adicionar o artefato problemático à lista
3. Proponha a versão melhorada do trecho afetado com explicação do raciocínio
4. Aplique a mudança em AMBOS os arquivos (server/index.ts e api/index.ts)
5. Confirme que o negative prompt em ambos os arquivos está alinhado

## Contexto do projeto

- Gerador primário: Gemini `gemini-2.0-flash-exp-image-generation` com referência de estilo
- Fallback: FAL.AI Flux Dev → Freepik Mystic
- Formatos: `4:5` (feed, 1080x1350) e `9:16` (story, 1080x1920)
- Marca: Seazone — navy #0A1628, azul #0055FF, verde #5EA500, tipografia sans-serif
- As referências visuais são analisadas por `analyzeReferenceStyle` antes da geração

## Elementos proibidos (não remover do negative prompt)

- Distância da praia em metros ou minutos (restrição legal/compliance)
- Vista do mar a partir dos quartos das unidades
- Fontes serifadas
- Vinheta excessiva
