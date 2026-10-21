// Executor de cenas de diálogo, sem DOM. A interface pede o próximo passo e
// informa a escolha; os testes usam o mesmo cursor para simular decisões.
import { DIALOGUES } from '../data/dialogues.js';

// ctx: { flags: [], clues: [], bonds: {}, stats: {} }
export function evalCondition(cond, ctx) {
  if (!cond) return true;
  if (cond.flag) return (ctx.flags || []).includes(cond.flag);
  if (cond.notFlag) return !(ctx.flags || []).includes(cond.notFlag);
  if (cond.clue) return (ctx.clues || []).includes(cond.clue);
  if (cond.bondMin) return ((ctx.bonds || {})[cond.bondMin[0]] || 0) >= cond.bondMin[1];
  if (cond.statMin) return ((ctx.stats || {})[cond.statMin[0]] || 0) >= cond.statMin[1];
  return false;
}

export function createDialogueCursor(id, ctx = {}) {
  const steps = DIALOGUES[id];
  if (!steps) throw new Error(`Diálogo desconhecido: ${id}`);
  const stack = [{ steps, i: 0 }];
  let waitingChoice = null;
  return {
    id,
    // Próximo passo exibível: { type: 'line' | 'choice' | 'ending', ... } ou null no fim.
    next() {
      if (waitingChoice) return waitingChoice;
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.i >= top.steps.length) { stack.pop(); continue; }
        const step = top.steps[top.i++];
        if (step.if) {
          if (evalCondition(step.if, ctx)) stack.push({ steps: step.then, i: 0 });
          continue;
        }
        if (step.choice) {
          waitingChoice = { type: 'choice', options: step.choice.map((o, index) => ({ index, text: o.text })), raw: step.choice };
          return waitingChoice;
        }
        if (step.endingChoice) return { type: 'ending' };
        return { type: 'line', who: step.who, text: step.text, mood: step.mood || 'neutral' };
      }
      return null;
    },
    // Aplica a opção escolhida e devolve os efeitos.
    choose(index) {
      if (!waitingChoice) throw new Error('Nenhuma escolha pendente');
      const option = waitingChoice.raw[index];
      if (!option) throw new Error(`Opção inválida: ${index}`);
      waitingChoice = null;
      if (option.then && option.then.length) stack.push({ steps: option.then, i: 0 });
      return option.effects || {};
    },
  };
}

// Percorre a cena inteira escolhendo com `chooser(options) -> index`.
// Retorna a lista de efeitos aplicados e se há escolha de final.
export function playThrough(id, ctx, chooser = () => 0) {
  const cursor = createDialogueCursor(id, ctx);
  const effects = [];
  const lines = [];
  let ending = false;
  for (let guard = 0; guard < 200; guard++) {
    const step = cursor.next();
    if (!step) break;
    if (step.type === 'line') lines.push(step);
    else if (step.type === 'choice') effects.push(cursor.choose(chooser(step.options)));
    else if (step.type === 'ending') { ending = true; break; }
  }
  return { effects, lines, ending };
}
