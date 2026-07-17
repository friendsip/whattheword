import { describe, it, expect } from 'vitest';
import { getWords } from './words.js';
import { WORD_PACKS, GENRES } from './wordpacks.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

describe('word packs', () => {
  it('every genre has all three difficulties with at least 20 unique words', () => {
    for (const genre of GENRES) {
      for (const diff of DIFFICULTIES) {
        const list = WORD_PACKS[genre][diff];
        expect(list, `${genre}/${diff}`).toBeDefined();
        expect(list.length, `${genre}/${diff} count`).toBeGreaterThanOrEqual(20);
        expect(new Set(list).size, `${genre}/${diff} dupes`).toBe(list.length);
      }
    }
  });

  it('words are uppercase, trimmed and printable', () => {
    for (const genre of GENRES) {
      for (const diff of DIFFICULTIES) {
        for (const word of WORD_PACKS[genre][diff]) {
          expect(word).toBe(word.toUpperCase());
          expect(word).toBe(word.trim());
          expect(word.length).toBeGreaterThan(1);
        }
      }
    }
  });

  it('the party/politics genres are gone (classroom-safe set only)', () => {
    for (const dropped of ['US Politics', 'UK Politics', 'Friends TV Show', 'Pop Music', 'The Bible', 'Movies']) {
      expect(GENRES).not.toContain(dropped);
    }
  });
});

describe('getWords', () => {
  it('returns a shuffled copy of the right pack', async () => {
    const words = await getWords('Animals', 'easy');
    expect([...words].sort()).toEqual([...WORD_PACKS['Animals'].easy].sort());
    // and does not mutate the source pack
    expect(WORD_PACKS['Animals'].easy).toContain('DOG');
  });

  it('falls back to General / medium for unknown inputs', async () => {
    const unknownGenre = await getWords('Quantum Knitting', 'medium');
    expect([...unknownGenre].sort()).toEqual([...WORD_PACKS['General'].medium].sort());

    const unknownDiff = await getWords('Space', 'impossible');
    expect([...unknownDiff].sort()).toEqual([...WORD_PACKS['Space'].medium].sort());
  });

  it('defaults to General medium with no arguments', async () => {
    const words = await getWords();
    expect([...words].sort()).toEqual([...WORD_PACKS['General'].medium].sort());
  });
});
