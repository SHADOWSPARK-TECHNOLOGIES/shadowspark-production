import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const schemaPath = `${repoRoot}/prisma/schema.prisma`;
const baselinePath = `${repoRoot}/prisma/recovery/baseline.sql`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function schemaTableNames(schema) {
  return [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map(
    ([, modelName, body]) => body.match(/@@map\("([^"]+)"\)/)?.[1] ?? modelName,
  );
}

test("recovery baseline is a complete, schema-only snapshot", () => {
  assert.ok(
    existsSync(baselinePath),
    "Generate prisma/recovery/baseline.sql from the current Prisma schema",
  );

  const schema = readFileSync(schemaPath, "utf8");
  const baseline = readFileSync(baselinePath, "utf8");

  assert.match(
    baseline,
    /CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+"?vector"?/i,
    "The recovery database requires pgvector",
  );

  for (const tableName of schemaTableNames(schema)) {
    assert.match(
      baseline,
      new RegExp(
        `CREATE\\s+TABLE\\s+(?:"public"\\.)?"${escapeRegExp(tableName)}"`,
        "i",
      ),
      `Missing table ${tableName}`,
    );
  }

  assert.doesNotMatch(
    baseline,
    /^\s*(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP)\b/im,
    "Recovery baseline must contain schema only and must not destroy data",
  );
  assert.doesNotMatch(
    baseline,
    /\$2[aby]\$\d{2}\$/,
    "Recovery baseline must not contain password hashes",
  );
});
