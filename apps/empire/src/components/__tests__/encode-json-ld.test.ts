// Regression test for the JSON-LD `</script>` breakout vector flagged by
// UNI-1958 (Pi-SEO security scan). Plain JSON.stringify is unsafe inside a
// `<script type="application/ld+json">` tag because a string value with
// `</script>` would close the surrounding tag.

import { encodeJsonLd } from '../SchemaMarkup';

describe('encodeJsonLd', () => {
  it('escapes `<` so a string value cannot close the surrounding script tag', () => {
    const payload = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      name: 'hello </script><script>alert(1)</script>',
    };
    const encoded = encodeJsonLd(payload);
    // The load-bearing assertion: no raw `</script>` survives — otherwise
    // it would close the surrounding JSON-LD script tag at render time.
    expect(encoded).not.toMatch(/<\/script>/);
    // Opening `<script>` of the attacker's payload also gets neutered.
    expect(encoded).not.toMatch(/<script>/);
    // `<` becomes `<`; `>` is left alone (only `<` is dangerous in
    // a JSON-LD-in-HTML context — it cannot start a tag on its own).
    expect(encoded).toMatch(/\\u003c\/script>/);
  });

  it('round-trips back to the original object via JSON.parse', () => {
    const payload = { name: 'Acme', address: { region: '<NSW>' } };
    expect(JSON.parse(encodeJsonLd(payload))).toEqual(payload);
  });

  it('leaves payloads without `<` unchanged', () => {
    const payload = { name: 'Plain', value: 42 };
    expect(encodeJsonLd(payload)).toBe(JSON.stringify(payload));
  });
});
