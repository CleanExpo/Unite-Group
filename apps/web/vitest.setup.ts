import '@testing-library/jest-dom';

// Voice mission provenance is an HMAC keyed on a server-side secret, and
// verification fails closed when the key is absent — a mission that cannot be
// proved authentic is never admitted to an execution lane. Tests therefore need
// a key present, or every voice mission would be refused for the wrong reason
// and the suites would stop testing what they claim to test.
//
// A fixed, obviously-fake test key. It must never match a real one: the whole
// point of the secret is that only the application environment holds it.
// mission-provenance-forgery.test.ts deliberately unsets it to prove the closed
// direction still holds.
process.env.MISSION_PROVENANCE_SECRET ??= 'test-mission-provenance-key-not-a-real-secret';
