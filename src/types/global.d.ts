import type { Statement } from "@/services/local-db";

declare global {
  interface Window {
    localDb?: {
      select<T = unknown>(sql: string, params?: Array<string | number | boolean | null>): Promise<T[]>;
      run(
        sql: string,
        params?: Array<string | number | boolean | null>
      ): Promise<{ changes: number; lastInsertRowid?: number }>;
      transaction(statements: Statement[]): Promise<void>;
    };
  }
}

export {};
