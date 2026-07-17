# AFI Pipeline Template Contract (v1)

**Family:** `afi.pipeline-template.v1` — parameterized pipeline topology (authoring artifact).
**Status:** `governed-contract` (FACTORY-CONTRACT slot of the AFI Factory analyst-configurable pipelines V1 program).
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1`.

A template is the `afi.pipeline.v1` shape **plus**:

- `templateId` (`^[a-z0-9-]+$`) + `templateVersion` (`^v\d+\.\d+\.\d+$`);
- `parameters[]` — each `{ name, schema (inline JSON-schema fragment), required, default?, description? }`;
- substitution points expressed as `{"$param":"<name>"}` **value slots** anywhere a concrete tunable value is legal (`pluginVersion`, `timeoutMs`, `maxRetries`, `retryDelayMs`, `backoff`, `critical`, `failurePolicy`, condition operands, whole conditions, and anywhere inside `config`/`resourceLimits`).

**Topology is concrete.** Node ids, categories, `pluginId`s, edge endpoints, `entry`, identity fields, and `join` declarations are never slots: parameters tune values, never graph structure — so a template's graph invariants are inspectable before instantiation.

## Instantiation contract (what the Factory does)

`instantiate(template, suppliedParams) -> afi.pipeline.v1`:

1. **Validate** each supplied value against its parameter's `schema` fragment (AJV draft-07, strict). Unknown supplied names fail closed.
2. **Default** absent optional parameters from `default` (a `default` must itself satisfy the fragment).
3. **Fail closed** if a `required:true` parameter with no `default` is absent.
4. **Deep-replace** every `{"$param":"<name>"}` slot with its resolved value (recursively, including inside `config` and predicate trees).
5. **Emit** the concrete manifest: drop `templateId`/`templateVersion`/`parameters`, set `schema` to `afi.pipeline.v1`, carry `pipelineId`/`pipelineVersion`/`description`/`entry`/`nodes`/`edges`/`metadata` through.
6. The result MUST validate against the **full** pipeline contract — schema *and* graph constraints (single non-bypassable scorer sink, acyclicity, join rules, `degrade`⇒`critical:false`) — or instantiation fails closed.

The instantiation contract is executable: `tests/pipeline-schema-validation.test.ts` instantiates the canonical template example and proves the output is an admissible `afi.pipeline.v1`.

## Tooling constraints

- Parameter names unique; every slot references a declared parameter (drift-guarded by the test suite).
- Canonical hashing per [`../../hashing/canonical-json-hashing.v1.md`](../../hashing/canonical-json-hashing.v1.md), domain tag `afi.factory.pipeline-template`, excluding `description`/`metadata`.

## Validation

```
npm run test:run   # includes tests/pipeline-schema-validation.test.ts
```

Canonical example + governed vectors: [`../../../examples/pipeline-template/v1/`](../../../examples/pipeline-template/v1/).

## Change control

Versioned contract — shape changes require a new decision + `.v2`. Individual templates version through `templateVersion` (immutable per version).
