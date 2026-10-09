# GEX do EWZ → WIN

Site estático (GitHub Pages) que mostra o **Gamma Exposure do EWZ** — Gamma Flip, Call Wall, Put Wall — e converte os níveis para **pontos do WIN**. Um workflow do GitHub Actions coleta os dados do CBOE (grátis, ~15 min de atraso) em horário de pregão, salva tudo no repositório e republica o site.

```
collector/        coleta e cálculo (Python, só precisa de "requests")
docs/             o site (index.html, app.js, style.css) + docs/data/*.json
data/raw/         respostas ORIGINAIS do CBOE (.json.gz), sem alteração
.github/workflows/collect-and-deploy.yml
CALCULO.md        explicação detalhada do cálculo
```

## Publicar (uma vez)

1. Crie um repositório no GitHub (pode ser público ou privado*) e envie esta pasta:
   ```
   git init -b main
   git add .
   git commit -m "GEX EWZ"
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Aba **Actions → "Coletar GEX e publicar no Pages" → Run workflow** (deixe "Guardar a resposta original" marcado).
4. Ao terminar, o endereço aparece no job e em Settings → Pages: `https://SEU_USUARIO.github.io/SEU_REPO/`.

\* GitHub Pages em repositório privado exige plano pago; no plano gratuito o repositório precisa ser público.

Enquanto a primeira coleta real não rodar, o site mostra **dados de demonstração** (sintéticos, com aviso na tela).

## Usar o site

Informe o **preço do WIN** no campo do topo (no mesmo horário do dado do EWZ) e clique em *Converter*. O valor fica salvo só no seu navegador. Cada nível em EWZ é convertido por `nível × (WIN ÷ EWZ)` e arredondado a 5 pontos.

## Agenda e variáveis

- Agenda: segunda a sexta, de hora em hora, 13:05–21:05 UTC (veja o `cron` no workflow). O GitHub pode atrasar execuções agendadas.
- A resposta original do CBOE é guardada às 15h e 20h UTC e nas execuções manuais (para o repositório não crescer demais: ~100 KB comprimido por arquivo).
- Em **Settings → Secrets and variables → Actions → Variables**, opcional: `GEX_SYMBOL` (padrão `EWZ`) e `GEX_MAX_DTE` (só vencimentos até N dias).

## Rodar localmente

```
pip install -r collector/requirements.txt
python collector/collect.py --save-raw          # coleta de verdade (precisa de acesso ao CBOE)
python collector/make_demo.py                   # regenera os dados de demonstração
python -m http.server 8000 --directory docs     # abra http://localhost:8000
```

Para recalcular a partir de uma resposta guardada: `python collector/collect.py --from-raw data/raw/EWZ_AAAAMMDD_HHMMSS.json.gz`.

## Pontos de atenção

- **Não testei contra o CBOE real** (o ambiente onde o projeto foi escrito não alcança o domínio). Se a coleta falhar no Actions, o log mostra o motivo e o site continua publicado com os últimos dados. Há relatos de que opções de ETF podem não estar no endpoint gratuito; se for o caso, troque `GEX_SYMBOL` para um índice (ex.: `SPX`) ou me peça o plano B.
- O open interest atualiza uma vez por dia; os níveis intradiários mudam por causa do preço, não de novas posições.
- GEX assume calls (+) e puts (−) — é um modelo, não a posição real dos dealers. Informação de mercado, não recomendação.
