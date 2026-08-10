/**
 * Backward-compatible public contract barrel.
 *
 * Domain modules live under `lib/types/` so each feature owns a bounded set of
 * contracts while existing `@/lib/types` imports remain stable.
 */
export * from "@/lib/types/json";
export * from "@/lib/types/splitter";
export * from "@/lib/types/parser";
export * from "@/lib/types/vectorstore";
export * from "@/lib/types/evaluation";
