// Barramento simples de eventos de domínio entre interface, áudio e simulação.

export function createEventBus() {
  const handlers = new Map();
  return {
    on(type, handler) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(handler);
      return () => handlers.get(type)?.delete(handler);
    },
    emit(type, payload) {
      const set = handlers.get(type);
      if (!set) return;
      for (const handler of [...set]) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[eventos] falha ao tratar "${type}"`, error);
        }
      }
    },
  };
}
