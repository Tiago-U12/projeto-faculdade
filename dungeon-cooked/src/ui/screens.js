// Telas do jogo (menu, slots, briefing, pausa, resultados, loja, livro, opções,
// créditos, finais e Desafio). Todas montadas com DOM seguro (textContent).
import { el, clear } from './dom.js';
import { ingredientIcon, dishIcon, portraitIcon, chefIcon } from './icons.js';
import { RECIPES, COOK_STATIONS, TAGS, prefName } from '../data/recipes.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { CUSTOMERS, CUSTOMER_IDS, RIVALRIES } from '../data/customers.js';
import { NIGHTS, NIGHT_COUNT, nightDef } from '../data/nights.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ENDINGS, ENDING_HINTS, CLUES } from '../data/dialogues.js';
import { UPGRADE_BY_ID } from '../data/upgrades.js';
import { PACE } from '../systems/settings.js';
import {
  shopItems, journalLines, endingEligibility, averageTrust, reconciledPairs, reputation, RECONCILED_BOND,
} from '../sim/campaign.js';

const MODE_INFO = {
  historia: {
    name: 'História',
    desc: 'Sete noites com pressão de tempo: clientes perdem a paciência, pratos podem queimar e a tensão importa. Seu progresso é salvo ao fim de cada noite.',
  },
  tranquilo: {
    name: 'Tranquilo',
    desc: 'A mesma campanha, sem cronômetro: ninguém vai embora por demora, nada queima esperando e a tensão não sobe sozinha. Todos os finais continuam possíveis.',
  },
  desafio: {
    name: 'Desafio',
    desc: 'Turno único de 3 minutos com todas as estações. O cardápio cresce com o tempo, combos rendem pontos e a tensão sobe devagar. Recorde salvo no navegador.',
  },
};

export { MODE_INFO };

function btn(label, onClick, { primary = false, danger = false, small = false, sub = null, disabled = false, autofocus = false, aria = null } = {}) {
  const b = el('button', {
    type: 'button',
    class: `btn${primary ? ' btn-primary' : ''}${danger ? ' btn-danger' : ''}${small ? ' btn-small' : ''}`,
    disabled,
    'data-autofocus': autofocus || null,
    'aria-label': aria,
  }, [label]);
  if (sub) b.append(el('span', { class: 'sub', text: sub }));
  b.addEventListener('click', (e) => {
    e.currentTarget.blur?.();
    onClick?.(e);
  });
  return b;
}

// Copia para a área de transferência; se o navegador negar, seleciona o texto para copiar à mão.
function copyText(area, text, status) {
  const done = () => { status.textContent = 'Copiado para a área de transferência.'; };
  const fallback = () => { area.focus(); area.select(); status.textContent = 'Texto selecionado: use Ctrl+C (ou Copiar no celular).'; };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  } catch {
    fallback();
  }
}

// Resumo legível de um arquivo de save, para comparar antes de substituir.
function progressLines(file) {
  const lines = [];
  for (const mode of ['historia', 'tranquilo']) {
    const c = file.slots[mode];
    if (!c) continue;
    const where = c.completed ? `concluída · ${ENDINGS[c.ending].name}` : `próxima: Noite ${c.night} de ${NIGHT_COUNT}`;
    lines.push(`${MODE_INFO[mode].name}: ${where} · ${c.coins} moedas`);
  }
  if (file.meta.challengeBest > 0) lines.push(`Desafio: recorde de ${file.meta.challengeBest} pontos`);
  if (file.meta.achievements.length) lines.push(`${file.meta.achievements.length} conquista(s)`);
  return lines.length ? lines : ['Nenhum progresso'];
}

function hearts(value) {
  const full = Math.floor(value);
  const half = value - full >= 0.5 ? 1 : 0;
  return '♥'.repeat(full) + (half ? '♡' : '') + '·'.repeat(Math.max(0, 5 - full - half));
}

export function createScreens(modal) {
  return {
    // ---------- Menu principal ----------
    menu(o) {
      const card = el('div', { class: 'menu-card' });
      card.append(el('h1', { class: 'logo' }, [
        el('span', { class: 'title', text: 'Dungeon Cooked' }),
        el('span', { class: 'subtitle', text: 'A Cozinha dos Impossíveis' }),
      ]));
      card.append(el('p', { class: 'tagline', text: 'A cozinha abre, o chef é um fantasma e ninguém avisou à vigilância sanitária.' }));
      const list = el('div', { class: 'menu-buttons' });
      if (o.continueInfo) list.append(btn('Continuar', o.onContinue, { primary: true, sub: o.continueInfo, autofocus: true }));
      list.append(btn('História', o.onHistoria, { primary: !o.continueInfo, sub: o.slots.historia ? `Noite ${o.slots.historia.night}${o.slots.historia.completed ? ' · concluída' : ''}` : 'Sete noites e três finais', autofocus: !o.continueInfo }));
      list.append(btn('Tranquilo', o.onTranquilo, { sub: o.slots.tranquilo ? `Noite ${o.slots.tranquilo.night}${o.slots.tranquilo.completed ? ' · concluída' : ''}` : 'Sem cronômetro nem pressa' }));
      list.append(btn('Desafio', o.onDesafio, { sub: o.best ? `Recorde: ${o.best} pontos` : 'Três minutos de caos' }));
      const row = el('div', { class: 'btn-row', style: { justifyContent: 'center', marginTop: '4px' } }, [
        btn('Livro & Diário', o.onBook, { small: true }),
        btn('Como jogar', o.onHowTo, { small: true }),
        btn('Opções', o.onOptions, { small: true }),
        btn('Créditos', o.onCredits, { small: true }),
      ]);
      card.append(list, row);
      if (!o.storageOk) card.append(el('div', { class: 'storage-warning', role: 'note', text: 'Este navegador não permite salvar agora. Dá para jogar normalmente, mas o progresso some ao fechar a página.' }));
      card.append(el('p', { class: 'menu-foot', text: 'Offline · sem conta · sem anúncios · nenhum dado sai do seu navegador.' }));
      return modal.open(card, { label: 'Menu principal', className: 'menu-screen', name: 'menu' });
    },

    // ---------- Seleção de campanha (slot) ----------
    slot(o) {
      const info = MODE_INFO[o.mode];
      const panel = el('div', { class: 'panel' });
      panel.append(el('span', { class: 'eyebrow', text: 'Campanha' }), el('h2', { text: info.name }), el('p', { text: info.desc }));
      const c = o.campaign;
      if (c) {
        const rep = reputation(c);
        panel.append(el('div', { class: 'cards' }, [
          el('div', { class: 'card' }, [
            el('img', { src: chefIcon(c.completed ? 'happy' : 'neutral', 64), alt: '' }),
            el('div', { class: 'grow' }, [
              el('b', { text: c.completed ? `Campanha concluída · ${ENDINGS[c.ending].name}` : `Próxima: Noite ${c.night} · ${nightDef(c.night).title}` }),
              el('small', { text: `${c.coins} moedas · ${c.upgrades.length} melhorias · avaliação média ${rep.stars || '—'}★ · confiança média ${averageTrust(c).toFixed(1)}` }),
            ]),
          ]),
        ]));
      } else {
        panel.append(el('p', { text: 'Nenhum progresso salvo neste modo ainda.' }));
      }
      const row = el('div', { class: 'btn-col' });
      if (c && !c.completed) row.append(btn('Continuar campanha', o.onContinue, { primary: true, autofocus: true, sub: 'Recomeça do início da noite salva' }));
      if (c && c.completed && c.finalCheckpoint) row.append(btn('Revisitar a Noite 7', o.onRevisit, { primary: true, autofocus: true, sub: 'Escolha outro final sem apagar nada do diário' }));
      row.append(btn(c ? 'Novo jogo' : 'Começar', o.onNew, { primary: !c, autofocus: !c, sub: c ? 'Apaga o progresso deste modo (pede confirmação)' : null }));
      row.append(btn('Voltar', o.onBack));
      panel.append(row);
      return modal.open(panel, { label: `Campanha ${info.name}`, dismissible: true, onEscape: o.onBack, name: 'slot' });
    },

    // ---------- Briefing da noite ----------
    briefing(o) {
      const def = o.def;
      const panel = el('div', { class: 'panel' });
      panel.append(el('span', { class: 'eyebrow', text: `${MODE_INFO[o.mode].name} · Noite ${def.night} de ${NIGHT_COUNT}` }));
      panel.append(el('h2', { text: def.title }));
      panel.append(el('p', { text: `Novidade: ${def.mechanic}.` }));
      panel.append(el('h3', { text: 'Objetivo da noite' }));
      panel.append(el('div', { class: 'objective-result ok', style: { background: '#2c2240', borderColor: '#ffd182' }, text: `◎ ${def.objective.text}` }));
      if (def.bonus?.length) {
        panel.append(el('h3', { text: 'Bônus opcionais' }));
        panel.append(el('ul', { class: 'list-plain' }, def.bonus.map((b) => el('li', { text: `${b.text} (+${b.reward} moedas)` }))));
      }
      const unlocks = el('div', { class: 'unlocks' });
      for (const r of RECIPES.filter((x) => x.unlockNight === def.night)) unlocks.append(el('span', { class: 'unlock' }, [el('img', { src: dishIcon(r.id), alt: '' }), r.name]));
      for (const id of Object.keys(INGREDIENTS).filter((x) => INGREDIENTS[x].unlockNight === def.night)) unlocks.append(el('span', { class: 'unlock' }, [el('img', { src: ingredientIcon(id), alt: '' }), INGREDIENTS[id].name]));
      if (unlocks.children.length) panel.append(el('h3', { text: 'Novo no cardápio' }), unlocks);
      panel.append(el('h3', { text: 'Quem pode aparecer' }));
      panel.append(el('div', { class: 'cast' }, def.cast.map((id) => el('img', { src: portraitIcon(id, 'neutral', 64), alt: CUSTOMERS[id].name, title: CUSTOMERS[id].title }))));
      if (o.mode === 'tranquilo') panel.append(el('p', { text: 'Modo Tranquilo: sem cronômetro, sem queimar por espera e sem tensão passiva.' }));
      if (o.paceLabel && o.mode === 'historia') panel.append(el('p', { text: `Ritmo do serviço: ${o.paceLabel}. Dá para mudar em Opções.` }));
      panel.append(el('div', { class: 'btn-row' }, [
        btn('Começar o serviço', o.onStart, { primary: true, autofocus: true }),
        btn('Livro de receitas', o.onBook),
        btn('Menu', o.onMenu),
      ]));
      return modal.open(panel, { label: `Noite ${def.night}: ${def.title}`, name: 'briefing', onEscape: () => {} });
    },

    // ---------- Pausa ----------
    pause(o) {
      const panel = el('div', { class: 'panel', style: { textAlign: 'center' } });
      panel.append(el('span', { class: 'eyebrow', text: 'Pausa' }));
      panel.append(el('h2', { text: 'Intervalo sindical do além' }));
      panel.append(el('p', { text: 'O tempo está congelado: paciência, cozimento, sino e tensão não andam.' }));
      if (o.saveNote) panel.append(el('p', { style: { fontSize: '0.86em', color: '#cdbfd6' }, text: o.saveNote }));
      panel.append(el('div', { class: 'btn-col' }, [
        btn('Continuar', o.onResume, { primary: true, autofocus: true }),
        btn('Livro de receitas', o.onBook),
        btn('Como jogar', o.onHowTo),
        btn('Opções', o.onOptions),
        btn(o.abandonLabel || 'Abandonar e voltar ao menu', o.onAbandon, { danger: true }),
      ]));
      return modal.open(panel, { label: 'Jogo pausado', name: 'pause', onEscape: o.onResume });
    },

    // ---------- Resultado da noite ----------
    results(o) {
      const s = o.summary.stats;
      const panel = el('div', { class: 'panel wide' });
      panel.append(el('span', { class: 'eyebrow', text: `Fim da Noite ${o.def.night}` }));
      panel.append(el('h2', { text: o.success ? (o.isFinal ? 'Uma mesa a mais, uma história a menos esquecida.' : 'Noite concluída!') : 'A noite não saiu como planejado' }));
      panel.append(el('div', { class: `objective-result ${o.success ? 'ok' : 'fail'}`, text: `${o.success ? '✓' : '✖'} ${o.def.objective.text}${o.success ? '' : ` — ${o.failReason}`}` }));
      const avg = s.served ? (s.starsTotal / s.served).toFixed(1) : '—';
      panel.append(el('div', { class: 'stats-grid' }, [
        statBox(String(s.served), 'pratos servidos'),
        statBox(`${avg}★`, 'avaliação média'),
        statBox(String(s.good), 'boas avaliações'),
        statBox(String(s.expired), 'saíram com fome'),
        statBox(String(s.burntCreated), 'pratos queimados'),
        statBox(String(s.conflictsResolved), 'conflitos resolvidos'),
        statBox(String(s.crises), 'crises'),
        statBox(String(s.bestStreak), 'melhor sequência'),
      ]));
      if (o.success) {
        panel.append(el('h3', { text: 'Moedas' }));
        const lines = [el('li', { text: `Pratos e gorjetas: +${s.coins}` })];
        for (const b of o.summary.bonus) lines.push(el('li', { text: `${b.done ? '✓' : '✖'} ${b.text}: ${b.done ? `+${b.reward}` : '0'}` }));
        lines.push(el('li', { style: { fontWeight: '900', color: '#ffd182' }, text: `Total da noite: +${o.earned} · Caixa: ${o.coinsAfter} moedas` }));
        panel.append(el('ul', { class: 'list-plain' }, lines));
      } else {
        panel.append(el('p', { text: 'Nada é perdido: moedas, confiança e escolhas desta tentativa não foram salvas, e a noite recomeça do início. Dica: o Livro tem as receitas, e no modo Tranquilo não há pressa.' }));
      }
      const trust = Object.entries(o.summary.trustDelta).filter(([, d]) => Math.abs(d) >= 0.05);
      if (o.success && trust.length) {
        panel.append(el('h3', { text: 'Confiança dos clientes' }));
        panel.append(el('ul', { class: 'list-plain' }, trust.map(([npc, d]) => el('li', { class: 'trust-row' }, [
          el('img', { src: portraitIcon(npc, d >= 0 ? 'happy' : 'sad', 64), alt: '' }),
          el('span', { text: `${CUSTOMERS[npc].name}: ` }),
          el('span', { class: 'hearts', text: hearts(o.trustAfter[npc] ?? 0) }),
          el('span', { class: d >= 0 ? 'delta-up' : 'delta-down', text: `${d >= 0 ? '+' : ''}${d.toFixed(1)}` }),
        ]))));
      }
      if (o.summary.newPrefs.length) {
        panel.append(el('h3', { text: 'Gostos descobertos' }));
        panel.append(el('ul', { class: 'list-plain' }, o.summary.newPrefs.map((p) => {
          const like = CUSTOMERS[p.npc].likes.includes(p.tag);
          return el('li', { text: `${CUSTOMERS[p.npc].name} ${like ? 'adora' : 'evita'} ${prefName(p.tag)}` });
        })));
      }
      if (o.achievements.length) {
        panel.append(el('h3', { text: 'Conquistas' }));
        panel.append(el('ul', { class: 'list-plain' }, o.achievements.map((a) => el('li', { text: `★ ${a.name} — ${a.desc}` }))));
      }
      if (o.saveError) panel.append(el('div', { class: 'storage-warning', text: o.saveError }));
      if (o.success) {
        panel.append(el('div', { class: 'backup-note' }, [
          el('p', { text: o.saveError
            ? 'Este navegador não guardou a noite. Para não perder o progresso, guarde o link de continuar agora.'
            : 'Progresso salvo neste navegador. Para não perder se limpar o navegador ou trocar de aparelho, guarde o link de continuar.' }),
          btn('Guardar link de continuar', o.onBackup, { small: true }),
        ]));
      }
      const row = el('div', { class: 'btn-row sticky' });
      if (o.success) {
        row.append(btn(o.isFinal ? 'Ver o epílogo' : 'Ir à loja da taberna', o.onNext, { primary: true, autofocus: true }));
      } else {
        row.append(btn('Tentar a noite de novo', o.onRetry, { primary: true, autofocus: true }));
        row.append(btn('Voltar ao menu', o.onMenu));
      }
      panel.append(row);
      return modal.open(panel, { label: 'Resultado da noite', name: 'results', onEscape: () => {} });
    },

    // ---------- Loja ----------
    shop(o) {
      const panel = el('div', { class: 'panel wide' });
      const coins = el('div', { class: 'coins-line' });
      const list = el('div', { class: 'cards' });
      panel.append(el('span', { class: 'eyebrow', text: 'Reformas e melhorias' }), el('h2', { text: 'Loja da taberna' }), coins);
      panel.append(el('p', { text: 'Toda compra muda o jogo de verdade e é salva na hora. Dá para terminar a campanha sem comprar nada.' }));
      panel.append(list);
      const render = () => {
        const c = o.getCampaign();
        clear(coins).append(el('span', { class: 'stat-icon coin', 'aria-hidden': 'true' }), `${c.coins} moedas`);
        clear(list);
        for (const item of shopItems(c)) {
          const status = item.owned ? 'Comprado' : !item.unlocked ? `Após a Noite ${item.availableAfter}` : `${item.cost} moedas`;
          const action = item.owned || !item.unlocked
            ? el('span', { class: 'price', text: item.owned ? '✓' : '🔒' })
            : btn('Comprar', () => o.onBuy(item, render), { small: true, primary: item.affordable, disabled: !item.affordable, aria: `Comprar ${item.name} por ${item.cost} moedas` });
          list.append(el('div', { class: `card${item.owned ? ' owned' : ''}${!item.unlocked ? ' locked' : ''}` }, [
            el('div', { class: 'grow' }, [
              el('b', { text: `${item.name}${item.group === 'decor' ? ' (decoração)' : ''}` }),
              el('small', { text: `${item.effect}. ${item.desc}` }),
              el('small', { class: 'price', text: status }),
            ]),
            action,
          ]));
        }
      };
      render();
      panel.append(el('div', { class: 'btn-row sticky' }, [btn(o.nextLabel || 'Próxima noite', o.onDone, { primary: true, autofocus: true })]));
      return modal.open(panel, { label: 'Loja da taberna', name: 'shop', onEscape: () => {} });
    },

    // ---------- Livro de receitas, clientes, diário e conquistas ----------
    book(o) {
      const panel = el('div', { class: 'panel wide' });
      const tabs = el('div', { class: 'tabs', role: 'tablist' });
      const body = el('div', { role: 'tabpanel' });
      panel.append(el('span', { class: 'eyebrow', text: 'Consulte sem perder tempo: o jogo fica pausado' }), el('h2', { text: 'Livro do chef' }), tabs, body);
      const names = { recipes: 'Receitas', customers: 'Clientes', journal: 'Diário', achievements: 'Conquistas' };
      let current = o.tab || 'recipes';
      const show = (tab) => {
        current = tab;
        for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
        clear(body);
        if (tab === 'recipes') body.append(recipeTab(o));
        else if (tab === 'customers') body.append(customerTab(o));
        else if (tab === 'journal') body.append(journalTab(o));
        else body.append(achievementTab(o));
      };
      for (const [tab, label] of Object.entries(names)) {
        const b = el('button', { type: 'button', class: 'tab', role: 'tab', dataset: { tab }, text: label });
        b.addEventListener('click', () => show(tab));
        tabs.append(b);
      }
      show(current);
      panel.append(el('div', { class: 'btn-row sticky' }, [btn('Fechar', () => modal.close(entry), { primary: true, autofocus: true })]));
      const entry = modal.open(panel, { label: 'Livro do chef', dismissible: true, onClose: o.onClose, name: 'book' });
      return entry;
    },

    // ---------- Opções ----------
    options(o) {
      const s = o.settings;
      const panel = el('div', { class: 'panel' });
      panel.append(el('span', { class: 'eyebrow', text: 'Ajustes salvos neste navegador' }), el('h2', { text: 'Opções' }));
      const range = (key, label) => {
        const input = el('input', { type: 'range', min: '0', max: '100', value: String(Math.round(s[key] * 100)), 'aria-label': label });
        input.addEventListener('input', () => o.onChange(key, Number(input.value) / 100));
        return el('div', { class: 'setting' }, [el('label', { text: label }), input]);
      };
      const check = (key, label, help) => {
        const id = `opt-${key}`;
        const input = el('input', { type: 'checkbox', id, checked: s[key] });
        input.addEventListener('change', () => o.onChange(key, input.checked));
        return el('div', { class: 'setting' }, [el('label', { for: id }, [label, help ? el('small', { text: help }) : null]), input]);
      };
      const select = (key, label, options, help) => {
        const id = `opt-${key}`;
        const input = el('select', { id }, Object.entries(options).map(([value, text]) => el('option', { value, selected: s[key] === value, text })));
        input.addEventListener('change', () => o.onChange(key, input.value));
        return el('div', { class: 'setting' }, [el('label', { for: id }, [label, help ? el('small', { text: help }) : null]), input]);
      };
      panel.append(el('h3', { text: 'Som' }), range('musicVolume', 'Música'), range('sfxVolume', 'Efeitos'), check('mute', 'Silenciar tudo'));
      if (!o.audioOk) panel.append(el('p', { style: { fontSize: '0.8em' }, text: 'Áudio indisponível neste navegador: o jogo segue em silêncio.' }));
      panel.append(el('h3', { text: 'Visual e acessibilidade' }),
        check('highContrast', 'Alto contraste', 'Painéis pretos e bordas brancas'),
        check('largeText', 'Texto maior'),
        check('reducedMotion', 'Reduzir movimento', 'Sem tremor de tela, menos partículas'),
        check('stationLabels', 'Nomes das estações no mapa'),
        check('speech', 'Falas dos clientes em balões'),
        check('typewriter', 'Efeito de escrita nos diálogos'),
        select('touchControls', 'Controles de toque', { auto: 'Automático', sempre: 'Sempre mostrar', nunca: 'Nunca mostrar' }));
      panel.append(el('h3', { text: 'Jogo' }),
        check('hints', 'Dicas de próximo passo', 'Seta e texto indicando a próxima ação'),
        select('pace', 'Ritmo do serviço (História)', Object.fromEntries(Object.entries(PACE).map(([k, v]) => [k, v.label])), 'Vale a partir da próxima noite'));
      panel.append(el('h3', { text: 'Dados salvos' }));
      if (!o.storageOk) panel.append(el('div', { class: 'storage-warning', text: 'Este navegador não permite salvar agora.' }));
      panel.append(el('p', { class: 'setting-help', text: 'O progresso fica neste navegador. O link de continuar leva tudo para outro aparelho, sem conta.' }));
      panel.append(el('div', { class: 'btn-row' }, [
        btn('Link de continuar', o.onLink, { small: true }),
        btn('Exportar save', o.onExport, { small: true }),
        btn('Importar save', o.onImport, { small: true }),
        btn('Apagar todo o progresso', o.onReset, { small: true, danger: true }),
      ]));
      panel.append(el('div', { class: 'btn-row sticky' }, [btn('Fechar', () => modal.close(entry), { primary: true, autofocus: true })]));
      const entry = modal.open(panel, { label: 'Opções', dismissible: true, onClose: o.onClose, name: 'options' });
      return entry;
    },

    // Exportar: JSON visível para copiar (e baixar, onde o navegador permitir).
    exportData(o) {
      const panel = el('div', { class: 'panel' });
      const area = el('textarea', { id: 'export-json', class: 'json-box', readonly: true, rows: '8', 'aria-label': 'Save em JSON' });
      area.value = o.json;
      const status = el('p', { class: 'json-status', role: 'status' });
      panel.append(el('span', { class: 'eyebrow', text: 'Cópia de segurança' }), el('h2', { text: 'Exportar save' }));
      panel.append(el('p', { text: 'Guarde este texto num arquivo ou numa nota. Para recuperar, use Importar save e cole o texto.' }), area, status);
      panel.append(el('div', { class: 'btn-row' }, [
        btn('Copiar texto', () => copyText(area, o.json, status), { primary: true, autofocus: true }),
        o.canDownload ? btn('Baixar arquivo .json', o.onDownload) : null,
        btn('Fechar', () => modal.close(entry)),
      ]));
      const entry = modal.open(panel, { label: 'Exportar save', dismissible: true, name: 'export' });
      return entry;
    },

    // Link de continuar: o progresso inteiro dentro de um endereço para guardar ou mandar.
    continueLink(o) {
      const panel = el('div', { class: 'panel' });
      const area = el('textarea', { id: 'continue-link', class: 'json-box link-box', readonly: true, rows: '4', 'aria-label': 'Link de continuar' });
      area.value = o.link;
      const status = el('p', { class: 'json-status', role: 'status' });
      panel.append(el('span', { class: 'eyebrow', text: 'Guardar fora do navegador' }), el('h2', { text: 'Link de continuar' }));
      panel.append(el('p', { text: 'Este link leva todo o seu progresso: campanhas, recorde e conquistas. Mande para você mesmo (WhatsApp, e-mail ou uma nota) e abra em qualquer aparelho para continuar de onde parou.' }));
      if (o.online) panel.append(el('p', { class: 'setting-help', text: 'O link abre a versão online do jogo.' }));
      panel.append(area, status);
      panel.append(el('p', { class: 'setting-help', text: 'Ele guarda o progresso de agora: depois de jogar mais, gere um novo. Não tem senha nem dados pessoais; quem abrir o link carrega este progresso.' }));
      const canShare = typeof navigator.share === 'function';
      const share = async () => {
        try {
          await navigator.share({ title: 'Dungeon Cooked', text: 'Meu progresso no Dungeon Cooked', url: o.link });
          status.textContent = 'Link enviado.';
        } catch (error) {
          if (error && error.name === 'AbortError') return;
          copyText(area, o.link, status);
        }
      };
      panel.append(el('div', { class: 'btn-row' }, [
        btn('Copiar link', () => copyText(area, o.link, status), { primary: true, autofocus: true }),
        canShare ? btn('Compartilhar…', share) : null,
        btn('Fechar', () => modal.close(entry)),
      ]));
      const entry = modal.open(panel, { label: 'Link de continuar', dismissible: true, name: 'continueLink' });
      return entry;
    },

    // Antes de trocar o progresso deste navegador pelo de um link ou save importado.
    loadSave(o) {
      const fromLink = o.source === 'link';
      const panel = el('div', { class: 'panel', style: { maxWidth: '480px' } });
      panel.append(el('span', { class: 'eyebrow', text: fromLink ? 'Link de continuar' : 'Importar save' }));
      panel.append(el('h2', { text: o.replaces ? 'Substituir o progresso?' : 'Carregar este progresso?' }));
      const list = (title, file) => [el('h3', { text: title }), el('ul', { class: 'list-plain' }, progressLines(file).map((t) => el('li', { text: t })))];
      panel.append(...list(fromLink ? 'No link' : 'No save importado', o.incoming));
      if (o.replaces) {
        panel.append(...list('Neste navegador agora', o.current));
        panel.append(el('p', { text: 'Carregar substitui o progresso deste navegador. Uma cópia de segurança do atual fica guardada.' }));
      }
      const close = () => modal.close(entry);
      panel.append(el('div', { class: 'btn-row' }, [
        btn('Carregar progresso', () => { close(); o.onConfirm(); }, { primary: !o.replaces, danger: o.replaces }),
        btn(o.replaces ? 'Manter o deste navegador' : 'Agora não', close, { autofocus: true }),
      ]));
      const entry = modal.open(panel, { label: 'Carregar progresso', dismissible: true, name: 'loadSave' });
      return entry;
    },

    // Importar: arquivo .json ou texto colado. A validação acontece antes de qualquer troca.
    importData(o) {
      const panel = el('div', { class: 'panel' });
      const file = el('input', { type: 'file', id: 'import-file', accept: 'application/json,.json', hidden: true });
      const area = el('textarea', { id: 'import-json', class: 'json-box', rows: '6', placeholder: 'Cole aqui o link de continuar ou o texto exportado…', 'aria-label': 'Link de continuar ou texto do save para importar' });
      file.addEventListener('change', () => {
        const f = file.files && file.files[0];
        file.value = '';
        if (f) { modal.close(entry); o.onFile(f); }
      });
      panel.append(el('span', { class: 'eyebrow', text: 'Recuperar progresso' }), el('h2', { text: 'Importar save' }));
      panel.append(el('p', { text: 'Escolha um arquivo exportado, ou cole o link de continuar ou o texto. Nada muda antes da sua confirmação, e o save atual ganha uma cópia de segurança.' }));
      panel.append(file, el('div', { class: 'btn-row' }, [btn('Escolher arquivo .json', () => file.click())]), area);
      panel.append(el('div', { class: 'btn-row' }, [
        btn('Importar texto colado', () => {
          const text = area.value.trim();
          if (!text) { area.focus(); return; }
          modal.close(entry);
          o.onText(text);
        }, { primary: true }),
        btn('Cancelar', () => modal.close(entry), { autofocus: true }),
      ]));
      const entry = modal.open(panel, { label: 'Importar save', dismissible: true, name: 'import' });
      return entry;
    },

    howto(o = {}) {
      const panel = el('div', { class: 'panel wide' });
      panel.append(el('span', { class: 'eyebrow', text: 'Manual de sobrevivência gastronômica' }), el('h2', { text: 'Como jogar' }));
      panel.append(el('ol', { class: 'list-plain' }, [
        'Leia o pedido no topo: prato, ingredientes e estação (caldeirão, forno, grelha ou bancada fria).',
        'Pegue o ingrediente na despensa (Horta, Despensa Rústica ou Armário Arcano).',
        'Ingrediente cru vai à tábua: aperte duas vezes para cortar. Água do Luar, Brasa e Gelatina não precisam.',
        'Coloque na estação certa. A receita começa sozinha quando estiver completa; na bancada fria fica pronta na hora.',
        'Espere ficar no ponto (não dá para tirar cru) e pegue antes de queimar.',
        'Entregue no balcão, em frente ao cliente. Prato errado é recusado e continua com você.',
        'Conflitos: toque o sino, converse de mãos vazias ou sirva um prato da paz.',
      ].map((t) => el('li', { text: t }))));
      const rows = [
        ['Andar', 'WASD ou setas', 'Joystick, ou toque no chão/estação'],
        ['Interagir', 'E ou Espaço', 'Botão grande (verbo muda conforme a estação)'],
        ['Descartar / limpar estação', 'Q (pede confirmação para pratos)', 'Botão Descartar'],
        ['Escolher ingrediente', '1 a 4, ou clique', 'Toque no ingrediente'],
        ['Pausar', 'P ou Esc', 'Botão de pausa'],
        ['Livro de receitas', 'R', 'Botão do livro'],
        ['Silenciar', 'M', 'Botão de som'],
        ['Avançar diálogo', 'Enter, Espaço ou clique', 'Toque na caixa'],
      ];
      const table = el('table', { class: 'controls-table' }, [
        el('thead', {}, [el('tr', {}, [el('th', { text: 'Ação' }), el('th', { text: 'Teclado e mouse' }), el('th', { text: 'Toque' })])]),
        el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', { text: c }))))),
      ]);
      panel.append(el('h3', { text: 'Controles' }), table);
      panel.append(el('p', { text: 'Salvamento: automático ao fim de cada noite e após cada compra. Se sair no meio da noite, ela recomeça do início.' }));
      panel.append(el('div', { class: 'btn-row' }, [btn('Entendi', () => modal.close(entry), { primary: true, autofocus: true })]));
      const entry = modal.open(panel, { label: 'Como jogar', dismissible: true, onClose: o.onClose, name: 'howto' });
      return entry;
    },

    credits(o = {}) {
      const panel = el('div', { class: 'panel credits' });
      panel.append(el('span', { class: 'eyebrow', text: 'Créditos' }), el('h2', { text: 'Dungeon Cooked' }));
      for (const line of [
        'Conceito original: equipe do projeto Dungeon Cooked (2026-1-NCC1/Projeto2) e protótipo HTML "Cozinha do Desespero".',
        'Versão web 2D: código, arte procedural em Canvas, música e efeitos sintetizados com Web Audio, roteiro e textos produzidos para este projeto.',
        'Nenhuma imagem, fonte, áudio ou código de terceiros é distribuído. Fontes de texto são as do seu sistema.',
        'Inspirações declaradas pela equipe: Coffee Talk, Dungeon Meshi, Doodle God e Dave the Diver — sem uso de artes, personagens ou áudio desses jogos.',
        'Feito para funcionar offline, sem conta, sem anúncios e sem coleta de dados.',
        'Que a última esperança nunca seja uma sopa de carvão.',
      ]) panel.append(el('p', { text: line }));
      panel.append(el('div', { class: 'btn-row', style: { justifyContent: 'center' } }, [btn('Fechar', () => { modal.close(entry); o.onClose?.(); }, { primary: true, autofocus: true })]));
      const entry = modal.open(panel, { label: 'Créditos', dismissible: true, name: 'credits' });
      return entry;
    },

    // ---------- Final ----------
    ending(o) {
      const ending = ENDINGS[o.ending];
      const c = o.campaign;
      const panel = el('div', { class: 'panel wide ending-panel' });
      panel.append(el('span', { class: 'eyebrow', text: 'Epílogo' }), el('h2', { text: ending.name }));
      if (o.art) panel.append(o.art);
      for (const p of ending.text) panel.append(el('p', { text: p }));
      panel.append(el('h3', { text: 'Suas escolhas' }));
      const pairs = reconciledPairs(c).map((id) => RIVALRIES.find((r) => r.id === id).journal);
      panel.append(el('ul', { class: 'list-plain' }, [
        el('li', { text: `Confiança média dos clientes: ${averageTrust(c).toFixed(1)} de 5` }),
        el('li', { text: pairs.length ? pairs.join(' ') : 'Nenhuma reconciliação completa — algumas cadeiras ainda esperam.' }),
        el('li', { text: `Pistas sobre o passado: ${c.clues.length} de ${Object.keys(CLUES).length}` }),
        el('li', { text: `Pratos servidos na campanha: ${c.stats.served} · moedas ganhas: ${c.stats.coinsEarned}` }),
        el('li', { text: `Finais vistos neste navegador: ${o.endingsSeen.length} de 3` }),
      ]));
      panel.append(el('div', { class: 'btn-row' }, [
        btn('Créditos', o.onCredits, { primary: true, autofocus: true }),
        c.finalCheckpoint ? btn('Revisitar a Noite 7', o.onRevisit) : null,
        btn('Menu principal', o.onMenu),
      ]));
      return modal.open(panel, { label: `Final: ${ending.name}`, name: 'ending', onEscape: () => {} });
    },

    // Escolha do final dentro do diálogo da Noite 7.
    endingChoice(o) {
      const panel = el('div', { class: 'panel wide' });
      panel.append(el('span', { class: 'eyebrow', text: 'A escolha do chef' }), el('h2', { text: 'E agora, chef?' }));
      panel.append(el('p', { text: 'Escolha um destino entre os que você tornou possíveis. Os indisponíveis mostram o que faltou.' }));
      const list = el('div', { class: 'btn-col' });
      for (const id of ['mesa', 'lenda', 'segredo']) {
        const e = ENDINGS[id];
        const st = o.eligibility[id];
        list.append(btn(e.choice, () => o.onChoose(id), { primary: st.eligible, disabled: !st.eligible, sub: `${e.name} — ${st.eligible ? 'disponível' : `falta: ${e.condition}`} (${st.progress.join(' · ')})` }));
      }
      panel.append(list);
      return modal.open(panel, { label: 'Escolha do final', name: 'endingChoice', onEscape: () => {} });
    },

    // ---------- Desafio ----------
    challengeIntro(o) {
      const panel = el('div', { class: 'panel' });
      panel.append(el('span', { class: 'eyebrow', text: 'Modo Desafio' }), el('h2', { text: 'Três minutos de caos' }));
      panel.append(el('p', { text: MODE_INFO.desafio.desc }));
      panel.append(el('ul', { class: 'list-plain' }, [
        el('li', { text: 'Combo: entregas certas seguidas somam bônus. Erro, expiração ou crise zeram.' }),
        el('li', { text: 'Pedido que expira tira 20 pontos; crise tira 30. A tensão sobe devagar o tempo todo.' }),
        el('li', { text: 'Sem melhorias da campanha: todos começam iguais.' }),
      ]));
      panel.append(el('p', { text: o.best ? `Seu recorde: ${o.best} pontos (${o.bestServed} pratos).` : 'Ainda sem recorde neste navegador.' }));
      panel.append(el('div', { class: 'btn-row' }, [btn('Começar', o.onStart, { primary: true, autofocus: true }), btn('Voltar', o.onBack)]));
      return modal.open(panel, { label: 'Desafio', name: 'challengeIntro', dismissible: true, onEscape: o.onBack });
    },

    challengeEnd(o) {
      const panel = el('div', { class: 'panel', style: { textAlign: 'center' } });
      panel.append(el('span', { class: 'eyebrow', text: 'Fim do turno' }), el('h2', { text: o.rank.title }));
      panel.append(el('p', { text: o.rank.text }));
      panel.append(el('div', { class: 'stats-grid' }, [
        statBox(String(o.score), 'pontos'),
        statBox(String(o.best), o.record ? 'novo recorde!' : 'recorde'),
        statBox(String(o.stats.served), 'pratos'),
        statBox(String(o.stats.maxCombo), 'maior combo'),
        statBox(String(o.stats.expired), 'saíram com fome'),
        statBox(String(o.stats.crises), 'crises'),
      ]));
      panel.append(el('p', { text: 'A voz misteriosa sussurra: “Toda receita começa com uma segunda chance.”' }));
      panel.append(el('div', { class: 'btn-row', style: { justifyContent: 'center' } }, [btn('Jogar de novo', o.onRetry, { primary: true, autofocus: true }), btn('Menu', o.onMenu)]));
      return modal.open(panel, { label: 'Resultado do Desafio', name: 'challengeEnd', onEscape: () => {} });
    },

    confirm(o) {
      const panel = el('div', { class: 'panel', style: { maxWidth: '440px' } });
      panel.append(el('h2', { text: o.title }), el('p', { text: o.text }));
      const close = () => modal.close(entry);
      panel.append(el('div', { class: 'btn-row' }, [
        btn(o.confirmLabel || 'Confirmar', () => { close(); o.onConfirm(); }, { primary: !o.danger, danger: o.danger }),
        btn(o.cancelLabel || 'Cancelar', () => { close(); o.onCancel?.(); }, { autofocus: true }),
      ]));
      const entry = modal.open(panel, { label: o.title, dismissible: true, name: 'confirm', onClose: null });
      return entry;
    },

    notice(o) {
      const panel = el('div', { class: 'panel', style: { maxWidth: '460px' } });
      panel.append(el('h2', { text: o.title }), el('p', { text: o.text }));
      panel.append(el('div', { class: 'btn-row' }, [btn('Ok', () => { modal.close(entry); o.onClose?.(); }, { primary: true, autofocus: true })]));
      const entry = modal.open(panel, { label: o.title, dismissible: true, name: 'notice' });
      return entry;
    },
  };
}

function statBox(value, label) {
  return el('div', { class: 'stat-box' }, [el('b', { text: value }), el('small', { text: label })]);
}

// ---------- Abas do livro ----------
function recipeTab(o) {
  const night = o.campaign ? (o.campaign.completed ? NIGHT_COUNT : o.campaign.night) : NIGHT_COUNT;
  const cooked = o.campaign ? o.campaign.cooked : o.cooked || [];
  const wrap = el('div');
  wrap.append(el('p', { text: o.campaign ? `Receitas desbloqueadas até a Noite ${night}. ✓ marca as que você já preparou (${cooked.length}/12).` : 'Catálogo completo. O Desafio usa 8 receitas das Noites 1 a 4, liberadas ao longo do turno.' }));
  const grid = el('div', { class: 'recipe-grid' });
  for (const r of RECIPES) {
    const unlocked = r.unlockNight <= night;
    const card = el('div', { class: `recipe-card${unlocked ? '' : ' locked'}` });
    if (!unlocked) {
      card.append(el('b', { text: '???' }), el('p', { text: `Desbloqueia na Noite ${r.unlockNight}.` }));
      grid.append(card);
      continue;
    }
    card.append(el('div', { class: 'row' }, [el('img', { class: 'dish', src: dishIcon(r.id), alt: '' }), el('b', { text: r.name })]));
    const ings = el('div', { class: 'row' });
    r.ingredients.forEach((id, i) => {
      if (i) ings.append('+');
      ings.append(el('img', { class: 'ing', src: ingredientIcon(id), alt: INGREDIENTS[id].name, title: INGREDIENTS[id].name }));
    });
    ings.append(` → ${COOK_STATIONS[r.station].name}`);
    card.append(ings);
    card.append(el('p', { text: r.ingredients.map((id) => `${INGREDIENTS[id].name}${INGREDIENTS[id].prep === 'chop' ? ' (cortar)' : ''}`).join(' + ') }));
    card.append(el('p', { text: r.desc }));
    card.append(el('div', {}, r.tags.map((t) => el('span', { class: 'tag-chip', text: TAGS[t].name }))));
    card.append(el('small', { class: 'recipe-meta', text: `Valor-base ${r.baseValue} · ${r.cookSeconds ? `${r.cookSeconds}s no fogo` : 'montagem a frio, não queima'}` }));
    if (cooked.includes(r.id)) card.append(el('span', { class: 'cooked', text: '✓ preparado' }));
    grid.append(card);
  }
  wrap.append(grid);
  return wrap;
}

function customerTab(o) {
  const wrap = el('div', { class: 'cards' });
  const c = o.campaign;
  const known = (npc) => (o.prefsKnown && o.prefsKnown[npc]) || (c ? c.prefsKnown[npc] || [] : []);
  const met = (npc) => !c || c.met.includes(npc) || (o.metNow || []).includes(npc);
  for (const id of CUSTOMER_IDS) {
    const npc = CUSTOMERS[id];
    if (!met(id)) {
      wrap.append(el('div', { class: 'card locked' }, [el('div', { class: 'grow' }, [el('b', { text: '??? ' }), el('small', { text: `Ainda não apareceu na taberna (a partir da Noite ${npc.firstNight}).` })])]));
      continue;
    }
    const k = known(id);
    const chips = el('div');
    for (const t of npc.likes) chips.append(el('span', { class: `tag-chip${k.includes(t) ? ' like' : ''}`, text: k.includes(t) ? `♥ ${prefName(t)}` : '♥ ???' }));
    for (const t of npc.dislikes) chips.append(el('span', { class: `tag-chip${k.includes(t) ? ' dislike' : ''}`, text: k.includes(t) ? `✖ ${prefName(t)}` : '✖ ???' }));
    const trust = c ? c.trust[id] ?? npc.baseTrust : null;
    wrap.append(el('div', { class: 'card' }, [
      el('img', { src: portraitIcon(id, 'neutral', 64), alt: '' }),
      el('div', { class: 'grow' }, [
        el('b', { text: npc.title }),
        el('small', { text: npc.trait }),
        el('small', { text: `Gancho: ${npc.hook}` }),
        chips,
        trust != null ? el('small', { class: 'hearts', text: `Confiança ${hearts(trust)} (${trust.toFixed(1)})` }) : null,
      ]),
    ]));
  }
  if (c) wrap.append(el('p', { text: 'Dica: conversar com um cliente sentado, de mãos vazias, revela gostos e aversões.' }));
  return wrap;
}

function journalTab(o) {
  const c = o.campaign;
  const wrap = el('div');
  if (!c) {
    wrap.append(el('p', { text: 'Comece uma campanha para preencher o diário.' }));
    return wrap;
  }
  const lines = journalLines(c);
  wrap.append(el('h3', { text: 'Acontecimentos' }));
  wrap.append(el('ul', { class: 'list-plain' }, lines.length ? lines.map((l) => el('li', { text: l })) : [el('li', { text: 'Ainda nada. A primeira noite espera.' })]));
  wrap.append(el('h3', { text: 'Pistas sobre a voz' }));
  wrap.append(el('ul', { class: 'list-plain' }, c.clues.length ? c.clues.map((id) => el('li', { text: `${CLUES[id].name}: ${CLUES[id].text}` })) : [el('li', { text: 'Nenhuma pista ainda. Converse com quem lembra do passado.' })]));
  wrap.append(el('h3', { text: 'Rivalidades' }));
  wrap.append(el('ul', { class: 'list-plain' }, RIVALRIES.map((r) => {
    const bond = c.bonds[r.id] || 0;
    return el('li', { text: `${r.name}: ${bond >= RECONCILED_BOND ? 'reconciliados ✓' : `aproximação ${bond.toFixed(1)} de ${RECONCILED_BOND}`}` });
  })));
  wrap.append(el('h3', { text: 'Caminhos para o final' }));
  const elig = endingEligibility(c);
  wrap.append(el('ul', { class: 'list-plain' }, Object.keys(ENDINGS).map((id) => el('li', { text: `${ENDINGS[id].name}: ${ENDING_HINTS[id]} (${elig[id].progress.join(' · ')})` }))));
  if (c.decor.length) wrap.append(el('p', { text: `Reformas: ${c.decor.map((d) => UPGRADE_BY_ID[d].name).join(', ')}.` }));
  wrap.append(el('h3', { text: 'Noites' }));
  wrap.append(el('ul', { class: 'list-plain' }, NIGHTS.map((n) => {
    const log = c.nightLog.filter((x) => x.night === n.night).pop();
    return el('li', { text: `Noite ${n.night} · ${n.title}: ${log ? `concluída (${log.served} pratos, ${log.stars}★, +${log.coins})` : n.night === c.night && !c.completed ? 'próxima' : '—'}` });
  })));
  return wrap;
}

function achievementTab(o) {
  const got = o.meta ? o.meta.achievements : [];
  return el('ul', { class: 'list-plain' }, ACHIEVEMENTS.map((a) => el('li', { text: `${got.includes(a.id) ? '★' : '☆'} ${a.name} — ${a.desc}` })));
}

