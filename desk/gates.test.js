const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");

function load(filename, context) {
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

const gateContext = { globalThis: {} };
gateContext.globalThis = gateContext;
vm.createContext(gateContext);
load(path.join(__dirname, "gates.js"), gateContext);
const { assess, intakeReview, financeReview } = gateContext.NamayaniGates;

const example = JSON.parse(fs.readFileSync(path.join(root, "ops/cases/example-voc-case.json"), "utf8"));
const review = assess(example);
assert.equal(review.lane, "compliance");
assert.equal(review.intake.status, "Compliance review");
assert.equal(review.intake.issues.length, 0);
assert.equal(review.compliance.status, "Compliance hold");
assert.equal(financeReview(example).issues.length, 2);

const compliance = spawnSync("python3", ["scripts/run_bots.py", "--bot", "voc-compliance", "--case", "ops/cases/example-voc-case.json"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(compliance.status, 1);
for (const issue of review.compliance.issues) {
  assert.ok(compliance.stdout.includes(issue), issue);
}

const intake = spawnSync("python3", ["scripts/run_bots.py", "--bot", "voc-intake", "--case", "ops/cases/example-voc-case.json"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(intake.status, 0);
assert.equal(intakeReview(example).status, "Compliance review");

const clear = structuredClone(example);
clear.bv_reference = "BV-100";
clear.status = "Compliance cleared";
clear.remote_inspection = { requested: false };
clear.evidence = {
  form_6_6: true,
  proforma_invoice: true,
  purchase_order: true,
  goods_list_hs_codes: true,
  conformity_documents: true,
  signed_remote_consent: true,
  certificate_or_ncr: true,
};
clear.commercial = {
  declared_total: "1000",
  freight: "200",
  insurance_value: "1000",
  incoterm: "CIP",
};
clear.carrier_confirmed = true;
clear.git_confirmed = true;
clear.tracking_confirmed = true;
clear.border_documents_confirmed = true;
assert.equal(assess(clear).lane, "clear");

const deskContext = { globalThis: {} };
deskContext.globalThis = deskContext;
vm.createContext(deskContext);
load(path.join(__dirname, "connectors/runtime.js"), deskContext);
load(path.join(__dirname, "connectors/template.js"), deskContext);
assert.throws(() => deskContext.NamayaniDesk.defineConnector({ id: "broken" }), /missing/);
load(path.join(__dirname, "connectors/registry.js"), deskContext);
const ids = deskContext.NamayaniDesk.connectors.map((item) => item.id);
assert.deepEqual(Array.from(ids), ["github", "local-files", "maps", "email", "zoho-books", "google-ads", "google-analytics"]);
const maps = deskContext.NamayaniDesk.connectors.find((item) => item.id === "maps").resolve({ env: {}, cases: [] });
assert.equal(maps.status, "ready");
const books = deskContext.NamayaniDesk.connectors.find((item) => item.id === "zoho-books").resolve({ env: {}, cases: [] });
assert.equal(books.status, "needs_setup");

console.log("desk gates and connectors ok");
