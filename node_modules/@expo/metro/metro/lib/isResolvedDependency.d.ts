import type { ResolvedDependency, Dependency } from "../DeltaBundler/types.flow";
// NOTE(@kitten): Flow to TS cannot convert type assertions
export declare function isResolvedDependency(dep: Dependency): dep is ResolvedDependency;
