import type { BankManifest, DisciplineId, PublishedQuestion, PublishedSource, Taxonomy } from '../types';
import taxonomyJson from '../../content/taxonomy.json';
import manifestJson from '../data/published/manifest.json';
import sourcesJson from '../data/published/sources.json';

export interface Bank {
  manifest: BankManifest;
  taxonomy: Taxonomy;
  questions: PublishedQuestion[];
  byId: Map<string, PublishedQuestion>;
  sources: Map<string, PublishedSource>;
}

export const taxonomy = taxonomyJson as Taxonomy;

export function makeBank(questions: PublishedQuestion[], manifest: BankManifest, tax: Taxonomy = taxonomy, sources: PublishedSource[] = sourcesJson as PublishedSource[]): Bank {
  return { manifest, taxonomy: tax, questions, byId: new Map(questions.map((q) => [q.id, q])), sources: new Map(sources.map((s) => [s.id, s])) };
}

/** Carrega o banco publicado (JSON versionado, só questões aprovadas). Divide em chunks por disciplina. */
export async function loadBank(): Promise<Bank> {
  const [c2, fs] = await Promise.all([import('../data/published/calculo2.json'), import('../data/published/fullstack.json')]);
  return makeBank([...(c2.default as unknown as PublishedQuestion[]), ...(fs.default as unknown as PublishedQuestion[])], manifestJson as BankManifest);
}

export function disciplineOf(bank: Bank, id: DisciplineId) {
  return bank.taxonomy.disciplines.find((d) => d.id === id)!;
}
export function topicName(bank: Bank, disciplineId: DisciplineId, topicId: string): string {
  return disciplineOf(bank, disciplineId).topics.find((t) => t.id === topicId)?.name ?? topicId;
}
