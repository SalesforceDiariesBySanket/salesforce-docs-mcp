/**
 * Type declarations for sql.js
 * sql.js is a JavaScript implementation of SQLite
 */

declare module "sql.js" {
    export interface SqlJsStatic {
        Database: typeof Database;
    }

    export interface QueryExecResult {
        columns: string[];
        values: any[][];
    }

    export interface Statement {
        bind(params?: any[]): boolean;
        step(): boolean;
        get(): any[];
        getColumnNames(): string[];
        free(): void;
        reset(): void;
    }

    export class Database {
        constructor(data?: ArrayLike<number> | Buffer | null);
        run(sql: string, params?: any[]): Database;
        exec(sql: string): QueryExecResult[];
        prepare(sql: string): Statement;
        export(): Uint8Array;
        close(): void;
    }

    export default function initSqlJs(config?: {
        locateFile?: (file: string) => string;
    }): Promise<SqlJsStatic>;
}
