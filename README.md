# Dynamic Elemental Clash — Text Battle

Versão 2.0 baseada no layout da referência: entrada de texto como mecânica principal, resultado textual no topo, arte ilustrada no centro, avatares, vidas e visual cartoon.

## Regras

São 15 elementos. A matriz usa um ciclo de 15 posições: cada elemento vence os próximos 7, perde para os 7 anteriores e empata consigo mesmo. Portanto, todos têm exatamente 7 vitórias e 7 derrotas.

## Elementos

Pedra, Martelo, Água, Fogo, Vento, Gelo, Planta, Raio, Sombra, Luz, Aço, Plasma, Vórtice, Galáxia e Cristal.

## Entrada fuzzy

`public/app.js` normaliza acentos e usa distância de Levenshtein. Exemplos como `agua`, `áuga` ou pequenas variações podem ser reconhecidos. As sugestões aparecem enquanto o jogador digita.

## Dados

- `data/elements.json`: elementos, temas, aliases, vitórias e derrotas.
- `data/interactions.json`: 105 justificativas, uma para cada par vencedor.
- `data/aliases.json`: palavras aceitas pelo campo de texto.
- `public/assets/elements/*.svg`: ilustrações dos 15 elementos.
- `public/assets/avatars/*.svg`: 20 avatares ilustrados.
- `public/assets/themes/*.svg`: 8 fundos temáticos.

## Rodar

Node.js 18+:

```bash
npm install
npm start
```

Depois abra `http://localhost:3000`.

## Multiplayer

O servidor usa Socket.IO. A escolha é guardada no servidor e só é revelada quando todos os jogadores da sala enviam suas escolhas. A resolução da rodada também ocorre no servidor, evitando que o cliente decida quem venceu.

Para produção:
1. Adicionar autenticação.
2. Persistir perfil, ranking e histórico em PostgreSQL.
3. Usar Redis para presença/matchmaking em múltiplas instâncias.
4. Colocar rate limiting e validação de payload.
5. Servir assets por CDN.
6. Adicionar reconexão/resume de partidas.
7. Não confiar em dados enviados pelo navegador para vidas, resultado ou ranking.
