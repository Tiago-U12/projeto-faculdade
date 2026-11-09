# O Mesmo Rosto

- `src/obra.txt`: o texto da obra (edite aqui)
- `build.py`: gera `web/index.html` (livro digital) e `print/print.html`
- `make_paper.py`: gera as texturas de papel do PDF
- `pdf.py`: gera `O-Mesmo-Rosto.pdf`

## Como gerar de novo
    cd fontpkg && npm ci && cd ..
    pip install playwright pillow && playwright install chromium
    python3 make_paper.py && python3 build.py && python3 pdf.py

As fontes são lidas de `fontpkg/node_modules`, dentro desta pasta. Os scripts usam o Chrome em `/usr/bin/google-chrome`; para usar outro navegador, defina a variável `CHROME`, por exemplo `CHROME=/caminho/do/chromium python3 pdf.py`.

## Marcações de `src/obra.txt`

- `@intro`, `@guia`, `@final`: nota de abertura, guia "Para noites difíceis" e nota final do copista
- `@achado`: nota do copista que abre as folhas encontradas depois do final
- `@cap ROMANO|chuva|Título|subtítulo`: capítulo. A chuva vai de 0 a 1 e controla a intensidade da chuva e das manchas. Os numerais vão até XV; o romano vazio é o "Último fragmento"
- `@frag N|Título`: fragmento. Os números continuam de onde pararam e são os mesmos que aparecem no guia
- `@margem texto`: anotação à margem do fragmento anterior
- `@mao texto`: linha manuscrita dentro de uma nota
- `*texto*` vira itálico; linhas que começam com `— ` são falas; `(texto)` é rubrica

## Estado da obra

- Capítulos I a IX, "Último fragmento" (fragmentos 1 a 37) e a nota final do copista: texto original.
- "Folhas achadas depois" e capítulo X, "Quando volta a chover" (fragmentos 38 a 42): continuação, sobre a tristeza que volta depois de a gente achar que tinha passado. O guia ganhou a entrada "Quando volta depois de ter melhorado" e o fragmento 41 em "Quando você cuida de todos".
