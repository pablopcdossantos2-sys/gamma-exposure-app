# Microestrutura nativa do WINFUT

## Escopo futuro

Adicionar uma camada própria do WINFUT sem alterar o fato de que o GEX é calculado a partir das opções do EWZ.

Possíveis dados licenciados:
- Times & Trades/ticks;
- bid/ask;
- volume por negócio;
- agressor;
- Market by Price;
- Market by Order / DOM histórico, quando disponível.

## Usos

- confirmar se níveis EWZ→WIN atraem/rejeitam preço;
- medir agressão ao chegar em Call Wall/Put Wall projetadas;
- absorção e exaustão;
- liquidez passiva ao redor de níveis de GEX;
- latência entre mudança estrutural no EWZ e reação do WIN;
- validação histórica das projeções.

## Separação de responsabilidades

```text
EWZ options engine → níveis estruturais
WINFUT microstructure engine → reação/fluxo local
                         ↓
              confluence / validation layer
```

Nunca recalcular GEX a partir do WINFUT sem uma cadeia de opções apropriada. O WIN continua sendo o ativo onde projetamos e validamos os níveis.
