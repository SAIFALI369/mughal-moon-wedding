export declare const SONG_BUCKET: "invitation-songs";
export declare const SONG_SWEEP_MIN_AGE_MS: number;
export declare const songPathPattern: RegExp;

export type SongObject = { path: string; createdAt: string | number | Date | null };
export type SweepStorage = {
  post(path: string, body: unknown): Promise<unknown>;
  remove(path: string, body: { prefixes: string[] }): Promise<unknown>;
};

export declare function findOrphanSongObjects(
  objects: SongObject[],
  referencedPaths: Iterable<string>,
  nowMs: number,
  minAgeMs?: number,
): string[];
export declare function listSongObjects(storage: SweepStorage, pageSize?: number): Promise<SongObject[]>;
export declare function deleteSongObjects(
  storage: SweepStorage,
  paths: string[],
  batchSize?: number,
): Promise<number>;
