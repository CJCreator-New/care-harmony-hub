export declare function productionSupabaseRefs(): string[];
export declare function productionAppHosts(): string[];
export declare function isProductionTarget(target: string | undefined | null): boolean;
export declare function assertNotProductionTarget(target: string | undefined | null, label: string, context?: string): void;
export declare function exitIfProductionTarget(target: string | undefined | null, label: string, context?: string): void;
