// The Spine data-access layer — the single sanctioned path to the canonical store.
export { db, withRls, asService } from './client.js';
export { trace } from './observability.js';
export * as spine from './spine.js';
export type * from '../types/database.js';
