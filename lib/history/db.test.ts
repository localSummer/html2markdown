import 'fake-indexeddb/auto';
import {
  addRecord,
  canonicalUrl,
  clearRecords,
  expiredIds,
  findLatestByUrl,
  listRecords,
  matchesQuery,
  overflowIds,
  pruneOldRecords,
} from './db';

describe('overflowIds', () => {
  it('drops oldest when over limit', () => {
    const ids = overflowIds(
      [
        { id: 'a', createdAt: 1 },
        { id: 'b', createdAt: 2 },
        { id: 'c', createdAt: 3 },
      ],
      2,
    );
    expect(ids).toEqual(['a']);
  });
});

describe('canonicalUrl', () => {
  it('strips hash and trailing slash', () => {
    expect(canonicalUrl('https://ex.com/a/#frag')).toBe('https://ex.com/a');
    expect(canonicalUrl('https://ex.com/a/')).toBe('https://ex.com/a');
  });
});

describe('findLatestByUrl', () => {
  it('returns the newest matching record', async () => {
    await clearRecords();
    await addRecord(
      { title: 'old', url: 'https://ex.com/p', regionType: 'full', visionEnabled: false, markdown: '1', createdAt: 1 },
      10,
    );
    await addRecord(
      { title: 'new', url: 'https://ex.com/p/#x', regionType: 'main', visionEnabled: false, markdown: '2', createdAt: 2 },
      10,
    );
    const rec = await findLatestByUrl('https://ex.com/p/');
    expect(rec?.title).toBe('new');
    expect(rec?.markdown).toBe('2');
  });

  it('returns null when no match', async () => {
    await clearRecords();
    expect(await findLatestByUrl('https://ex.com/missing')).toBeNull();
  });
});

describe('matchesQuery', () => {
  const rec = {
    id: '1',
    title: 'Hello World',
    url: 'https://Example.com/x',
    createdAt: 1,
    regionType: 'main' as const,
    visionEnabled: false,
    markdown: 'Some UniquePhrase here',
  };

  it('matches title url and body case-insensitively', () => {
    expect(matchesQuery(rec, 'hello')).toBe(true);
    expect(matchesQuery(rec, 'EXAMPLE.com')).toBe(true);
    expect(matchesQuery(rec, 'uniquephrase')).toBe(true);
    expect(matchesQuery(rec, 'missing')).toBe(false);
  });
});

describe('addRecord fifo', () => {
  it('evicts oldest beyond limit', async () => {
    await clearRecords();
    await addRecord(
      { title: 'a', url: 'u', regionType: 'full', visionEnabled: false, markdown: '1', createdAt: 1 },
      2,
    );
    await addRecord(
      { title: 'b', url: 'u', regionType: 'full', visionEnabled: false, markdown: '2', createdAt: 2 },
      2,
    );
    await addRecord(
      { title: 'c', url: 'u', regionType: 'full', visionEnabled: false, markdown: '3', createdAt: 3 },
      2,
    );
    const rows = await listRecords();
    expect(rows.map((r) => r.title)).toEqual(['c', 'b']);
  });
});

describe('expiredIds', () => {
  const now = 10 * 86_400_000;

  it('returns empty when maxAgeDays is 0', () => {
    expect(expiredIds([{ id: 'a', createdAt: 1 }], 0, now)).toEqual([]);
  });

  it('marks records older than the cutoff', () => {
    const ids = expiredIds(
      [
        { id: 'old', createdAt: now - 8 * 86_400_000 },
        { id: 'new', createdAt: now - 2 * 86_400_000 },
      ],
      7,
      now,
    );
    expect(ids).toEqual(['old']);
  });
});

describe('pruneOldRecords', () => {
  it('deletes expired records and keeps fresh ones', async () => {
    await clearRecords();
    const now = Date.now();
    await addRecord(
      { title: 'old', url: 'u', regionType: 'full', visionEnabled: false, markdown: '1', createdAt: now - 10 * 86_400_000 },
      100,
    );
    await addRecord(
      { title: 'new', url: 'u', regionType: 'full', visionEnabled: false, markdown: '2', createdAt: now },
      100,
    );
    await pruneOldRecords(7);
    const rows = await listRecords();
    expect(rows.map((r) => r.title)).toEqual(['new']);
  });

  it('is a no-op when maxAgeDays is 0', async () => {
    await clearRecords();
    await addRecord(
      { title: 'ancient', url: 'u', regionType: 'full', visionEnabled: false, markdown: '1', createdAt: 1 },
      100,
    );
    await pruneOldRecords(0);
    const rows = await listRecords();
    expect(rows.map((r) => r.title)).toEqual(['ancient']);
  });
});
