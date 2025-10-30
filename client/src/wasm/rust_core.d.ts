/* tslint:disable */
/* eslint-disable */
export function greet(): void;
export function process_csv_data(csv_content: string): any;
export function process_simple_data(input: string): any;
export function calculate_fibonacci(n: number): any;
export function calculate_prime_numbers(limit: number): any;
export function monte_carlo_pi(iterations: number): any;
export function matrix_multiply_demo(): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly greet: () => void;
  readonly process_csv_data: (a: number, b: number) => any;
  readonly process_simple_data: (a: number, b: number) => any;
  readonly calculate_fibonacci: (a: number) => any;
  readonly calculate_prime_numbers: (a: number) => any;
  readonly monte_carlo_pi: (a: number) => any;
  readonly matrix_multiply_demo: () => any;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
