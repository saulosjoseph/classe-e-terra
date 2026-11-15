# Solução para Flickering de Assets em Android

## Problema Identificado

O jogo estava apresentando "flickering" (piscamento) dos assets no mapa quando executado em dispositivos Android. Isso era causado por **dessincronização com VSync**, uma configuração que faz o Phaser renderizar frames sem sincronizar com o refresh rate do dispositivo.

## Raiz do Problema

A configuração `desynchronized: true` no `main.ts` desabilita o VSync (sincronização vertical), causando:
- ✗ Tearing visual (divisão horizontal do frame)
- ✗ Flickering de sprites
- ✗ Inconsistência na renderização
- ✗ Alto consumo de CPU sem benefício de desempenho

## Mudanças Implementadas

### 1. **main.ts** - Configuração do Phaser
```typescript
// ANTES:
render: {
  desynchronized: true,  // ❌ Causa flickering
}

// DEPOIS:
render: {
  desynchronized: false,  // ✅ Sincroniza com VSync
  maxLights: 10,
  batchSize: 4096
}
```

**Benefícios:**
- Sincronização com o refresh rate do dispositivo (60Hz na maioria dos celulares)
- Eliminação do tearing visual
- Renderização mais suave e consistente

### 2. **index.html** - Otimizações CSS
Adicionado:
- `image-rendering: auto; image-rendering: crisp-edges;` no canvas
- `backface-visibility: hidden;` para melhor performance em 3D
- `will-change: transform;` para hint de otimização
- `image-rendering: -webkit-optimize-contrast;` no body

**Benefícios:**
- Renderização mais nítida em dispositivos mobile
- Melhor aceleração de hardware
- Redução de artefatos visuais

### 3. **vite.config.ts** - Otimização de Build
```typescript
// Adicionado:
minify: 'terser',
terserOptions: {
  compress: { passes: 2 }
},
optimizeDeps: {
  include: ['phaser']
}
```

**Benefícios:**
- Melhor compressão do código
- Bundle otimizado para dispositivos mobile
- Melhor cache do Phaser

## Como Testar

### Em Desktop (Chrome DevTools)
1. Abra o Chrome DevTools (F12)
2. Vá em Device Emulation (Ctrl+Shift+M)
3. Escolha um dispositivo Android (ex: Galaxy S21)
4. Abra o jogo e verifique se os assets não piscam

### Em Android Real
1. Build o jogo: `npm run build`
2. Abra em um navegador Android moderno (Chrome, Samsung Internet)
3. Verifique se o piscamento dos assets desapareceu
4. Observe a suavidade geral da renderização

## Performance

Com essas mudanças, você deve observar:
- ✅ Eliminação completa do flickering
- ✅ Renderização consistente a 60fps
- ✅ Menor jitter (variação entre frames)
- ✅ Melhor experiência em telas de alta taxa de refresh (90Hz, 120Hz)

## Referências Técnicas

- **Phaser Render Config**: https://newdocs.phaser.io/docs/3.52.0/Phaser.Types.Core.RenderConfig
- **VSync (Vertical Sync)**: Sincronização da renderização com o refresh rate do monitor/tela
- **Image Rendering CSS**: https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering
- **Will-change CSS**: https://developer.mozilla.org/en-US/docs/Web/CSS/will-change

## Notas Importantes

Se o jogo ainda apresentar flickering após essas mudanças:
1. Verifique se há excesso de chamadas `setVisible()` em assets estáticos
2. Confirme que o depth sorting está correto
3. Verifique a taxa de frames no DevTools (deve estar estável a 60fps)
4. Teste em diferentes navegadores/dispositivos Android
