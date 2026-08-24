import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const MAX_TEXT_FILE_BYTES = 1024 * 1024;
const POLICY_TEST_PATH = "tests/security/credential-leak.test.mjs";

function normalizeValue(value) {
  return value.trim().replace(/^([`'"])(.*)\1$/, "$2").trim();
}

function isPlaceholder(value) {
  const normalized = normalizeValue(value);
  return (
    normalized === "" ||
    /^[-:]+$/.test(normalized) ||
    /^(?:n\/?a|none|removed|redacted|not committed)$/i.test(normalized) ||
    /^(?:<[^>]+>|\[[^\]]+\]|\$\{[^}]+\})$/.test(normalized) ||
    /^(?:process\.env\.|stored (?:outside|in)|managed (?:outside|in))/i.test(normalized)
  );
}

function detectCredentialLeaks(content) {
  const findings = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const markdownRow = line.match(/^\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (markdownRow) {
      const [, label, value] = markdownRow;
      if (/\b(?:admin\s+)?(?:password|passphrase)\b/i.test(label) && !isPlaceholder(value)) {
        findings.push({ line: index + 1, rule: "plaintext-password-table" });
      }
    }

    const databaseUrl = line.match(/\bpostgres(?:ql)?:\/\/[^:\s/]+:([^@\s/]+)@/i);
    if (databaseUrl && !isPlaceholder(databaseUrl[1])) {
      findings.push({ line: index + 1, rule: "database-password" });
    }

    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)) {
      findings.push({ line: index + 1, rule: "private-key" });
    }

    if (/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|sk_(?:live|test)_[A-Za-z0-9]{16,})\b/.test(line)) {
      findings.push({ line: index + 1, rule: "provider-token" });
    }

  });

  return findings;
}

function trackedTextFiles() {
  const gitExecutable = process.env.GIT_EXECUTABLE ?? "git";
  return execFileSync(gitExecutable, ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

test("flags a concrete password in an operational Markdown table", () => {
  const findings = detectCredentialLeaks("| Admin password | `synthetic-secret-value` |");
  assert.deepEqual(findings, [{ line: 1, rule: "plaintext-password-table" }]);
});

test("allows operational documentation to point to an external secret store", () => {
  const content = [
    "| Admin password | `[redacted]` |",
    "| Admin password | `stored outside the repository` |",
  ].join("\n");
  assert.deepEqual(detectCredentialLeaks(content), []);
});

test("flags a password embedded in a PostgreSQL connection string", () => {
  const content = "DATABASE_URL=postgresql://service-account:synthetic-secret@db.example/app";
  assert.deepEqual(detectCredentialLeaks(content), [
    { line: 1, rule: "database-password" },
  ]);
});

test("flags a committed private-key header", () => {
  const content = "-----BEGIN PRIVATE KEY-----";
  assert.deepEqual(detectCredentialLeaks(content), [
    { line: 1, rule: "private-key" },
  ]);
});

test("flags a provider-shaped access token", () => {
  const content = "GITHUB_TOKEN=ghp_syntheticTokenValue123456";
  assert.deepEqual(detectCredentialLeaks(content), [
    { line: 1, rule: "provider-token" },
  ]);
});

test("tracked repository text contains no high-confidence credential material", () => {
  const findings = [];

  for (const file of trackedTextFiles()) {
    if (file.replaceAll("\\", "/") === POLICY_TEST_PATH) continue;
    if (!existsSync(file)) continue;
    const stats = statSync(file);
    if (!stats.isFile() || stats.size > MAX_TEXT_FILE_BYTES) continue;

    const content = readFileSync(file);
    if (content.includes(0)) continue;

    for (const finding of detectCredentialLeaks(content.toString("utf8"))) {
      findings.push(`${file}:${finding.line}:${finding.rule}`);
    }
  }

  assert.deepEqual(findings, []);
});
