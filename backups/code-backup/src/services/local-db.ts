type QueryParam = string | number | boolean | null;

export type Statement = {
  sql: string;
  params?: QueryParam[];
};

type RunResult = {
  changes: number;
  lastInsertRowid?: number;
};

const getClient = () => {
  if (typeof window === "undefined" || !window.localDb) {
    throw new Error(
      "Bridge do banco local indisponível. Execute o app via Electron (npm run electron:dev) para acessar o SQLite."
    );
  }

  return window.localDb;
};

export const localDb = {
  async select<T = unknown>(sql: string, params: QueryParam[] = []): Promise<T[]> {
    const client = getClient();
    return client.select<T>(sql, params);
  },
  async run(sql: string, params: QueryParam[] = []): Promise<RunResult> {
    const client = getClient();
    return client.run(sql, params);
  },
  async transaction(statements: Statement[]): Promise<void> {
    const client = getClient();
    await client.transaction(statements);
  },
};
