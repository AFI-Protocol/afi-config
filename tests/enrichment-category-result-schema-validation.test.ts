import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * PBF-GOV — canonical category-result contracts (afi.enrichment.*.v1).
 *
 * The per-category output contract a provider/plugin must satisfy BEFORE its
 * result reaches scoring (D-PBF-8). v0.1 ships the two lanes the mission proves
 * (technical keyless, news BYOK). These are runtime payload contracts (no schema
 * const; the 'category' marker is the discriminator), referenced by the
 * analysis-plugin outputSchemaRef.
 */

function createAjv(): Ajv {
  const ajv = new Ajv({
    strict: true,
    allowUnionTypes: true,
    strictRequired: false,
    allErrors: true,
    verbose: true,
  });
  addFormats(ajv);
  ajv.addVocabulary([
    'x-afiStatus',
    'x-afiPartOf',
    'x-afiDoctrineRefs',
    'x-afiOpenItems',
    'x-afiProposedNotAccepted',
    'x-afiConstraints',
  ]);
  return ajv;
}
function loadJSON(rel: string): any {
  return JSON.parse(readFileSync(join(rootDir, rel), 'utf-8'));
}
function listJSON(dir: string): string[] {
  return readdirSync(join(rootDir, dir))
    .filter((f) => f.endsWith('.json'))
    .sort();
}

const FAMILIES = [
  {
    lane: 'technical',
    schema: 'schemas/enrichment/technical/v1/enrichment-technical.schema.json',
    example: 'examples/enrichment/technical/v1/enrichment-technical.example.json',
    validDir: 'examples/enrichment/technical/v1/vectors/valid',
    invalidDir: 'examples/enrichment/technical/v1/vectors/invalid',
    valid: ['technical-result-no-indicators.json', 'technical-result.json'],
    invalid: ['leaked-extra-field.json', 'missing-price-source.json', 'wrong-category.json'],
  },
  {
    lane: 'news',
    schema: 'schemas/enrichment/news/v1/enrichment-news.schema.json',
    example: 'examples/enrichment/news/v1/enrichment-news.example.json',
    validDir: 'examples/enrichment/news/v1/vectors/valid',
    invalidDir: 'examples/enrichment/news/v1/vectors/invalid',
    valid: ['news-result-default-summary.json', 'news-result.json'],
    invalid: ['leaked-url-field.json', 'missing-news-features.json', 'wrong-category.json'],
  },
  // Mission 4 (enrichment contracts + local pattern proof v0.1): the three
  // previously-missing category-result contracts. 'pattern' additionally gets a
  // live deterministic local implementation (afi-tiny-brains kernel + afi-reactor
  // adapter); 'sentiment' and 'aiMl' ship as contracts + fixtures only. The
  // 'aiMl' schema path/ref is lowercase ('aiml'); its runtime category MARKER is
  // camelCase 'aiMl' (matching AnalysisCategory) — so lane === the category const.
  {
    lane: 'pattern',
    schema: 'schemas/enrichment/pattern/v1/enrichment-pattern.schema.json',
    example: 'examples/enrichment/pattern/v1/enrichment-pattern.example.json',
    validDir: 'examples/enrichment/pattern/v1/vectors/valid',
    invalidDir: 'examples/enrichment/pattern/v1/vectors/invalid',
    valid: ['pattern-result.json', 'pattern-result-candlestick.json', 'pattern-result-empty.json'],
    invalid: [
      'candlestick-confidence-out-of-range.json',
      'candlestick-extra-property.json',
      'candlestick-unknown-pattern-name.json',
      'credential-like-field.json',
      'invalid-pivot-kind.json',
      'malformed-index.json',
      'missing-series.json',
      'non-finite-anomaly-score.json',
      'out-of-range-similarity.json',
      'oversized-motifs.json',
      'provider-payload-injection.json',
      'unknown-top-level-field.json',
      'wrong-category.json',
    ],
  },
  {
    lane: 'sentiment',
    schema: 'schemas/enrichment/sentiment/v1/enrichment-sentiment.schema.json',
    example: 'examples/enrichment/sentiment/v1/enrichment-sentiment.example.json',
    validDir: 'examples/enrichment/sentiment/v1/vectors/valid',
    invalidDir: 'examples/enrichment/sentiment/v1/vectors/invalid',
    valid: ['sentiment-result.json', 'sentiment-result-empty.json'],
    invalid: [
      'credential-like-field.json',
      'invalid-axis-enum.json',
      'missing-axes.json',
      'non-finite-confidence.json',
      'out-of-range-score.json',
      'oversized-axes.json',
      'unknown-top-level-field.json',
      'wrong-category.json',
    ],
  },
  {
    lane: 'aiMl',
    schema: 'schemas/enrichment/aiml/v1/enrichment-aiml.schema.json',
    example: 'examples/enrichment/aiml/v1/enrichment-aiml.example.json',
    validDir: 'examples/enrichment/aiml/v1/vectors/valid',
    invalidDir: 'examples/enrichment/aiml/v1/vectors/invalid',
    valid: ['aiml-result.json', 'aiml-result-forecast-only.json'],
    invalid: [
      'credential-like-field.json',
      'invalid-direction-enum.json',
      'missing-forecast.json',
      'non-finite-conviction.json',
      'out-of-range-conviction.json',
      'prose-notes-field.json',
      'regime-label-prose.json',
      'unknown-top-level-field.json',
      'wrong-category.json',
    ],
  },
];

describe('PBF-GOV — afi.enrichment.*.v1 category-result contracts', () => {
  for (const fam of FAMILIES) {
    describe(`afi.enrichment.${fam.lane}.v1`, () => {
      const compile = () => createAjv().compile(loadJSON(fam.schema));

      it('compiles and closes the top-level shape with a category const discriminator', () => {
        const schema = loadJSON(fam.schema);
        expect(() => compile()).not.toThrow();
        expect(schema['x-afiStatus']).toBe('governed-contract');
        expect(schema.additionalProperties).toBe(false);
        expect(schema.properties.category.const).toBe(fam.lane);
        expect(schema.required).toContain('category');
        expect(JSON.stringify(schema['x-afiDoctrineRefs'])).toContain(
          'provider-byok-foundations-v0.1',
        );
      });

      it('the canonical example and every valid vector validate (drift-guarded)', () => {
        const validate = compile();
        expect(validate(loadJSON(fam.example))).toBe(true);
        expect(listJSON(fam.validDir)).toEqual([...fam.valid].sort());
        fam.valid.forEach((f) => {
          const ok = validate(loadJSON(`${fam.validDir}/${f}`));
          if (!ok) console.error(`${fam.lane}/${f}:`, validate.errors);
          expect(ok, `${fam.lane} valid ${f}`).toBe(true);
        });
      });

      it('every invalid vector is rejected — including a leaked credentialed-URL field (drift-guarded)', () => {
        const validate = compile();
        expect(listJSON(fam.invalidDir)).toEqual([...fam.invalid].sort());
        fam.invalid.forEach((f) => {
          expect(
            validate(loadJSON(`${fam.invalidDir}/${f}`)),
            `${fam.lane} invalid ${f} must be rejected`,
          ).toBe(false);
        });
      });

      it('rejects a wrong category marker (protects the one-per-category join)', () => {
        const validate = compile();
        const other = fam.lane === 'technical' ? 'news' : 'technical';
        expect(validate({ ...loadJSON(fam.example), category: other })).toBe(false);
      });
    });
  }
});
