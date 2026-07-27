export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: Partial<T>): Promise<T>;
  remove(entity: T): Promise<T>;
}