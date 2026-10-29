// Tipos mínimos do sql.js 1.14 usados pelo SQL Lab (conferidos no código da versão instalada).
declare module 'sql.js' {
  export type SqlJsValue = number | string | Uint8Array | null;
  export interface Statement {
    step(): boolean;
    get(): SqlJsValue[];
    getColumnNames(): string[];
    free(): boolean;
  }
  export interface Database {
    run(sql: string): Database;
    exec(sql: string): { columns: string[]; values: SqlJsValue[][] }[];
    iterateStatements(sql: string): IterableIterator<Statement>;
    getRowsModified(): number;
    close(): void;
  }
  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }
  export interface InitConfig {
    locateFile?: (file: string) => string;
  }
  export default function initSqlJs(config?: InitConfig): Promise<SqlJsStatic>;
}
