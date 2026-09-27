const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const runtime = require("./runtime.js");
const root = path.join(__dirname, "..", "..");
const casesDir = path.join(root, "ops", "cases");

const empty = {};
const present = {
  GH_TOKEN: "ghp_test_token",
  GMAIL_CLIENT_ID: "gmail-client",
  GMAIL_CLIENT_SECRET: "gmail-secret-value",
  GMAIL_REFRESH_TOKEN: "gmail-refresh-value",
  ZOHO_BOOKS_ORG_ID: "org",
  ZOHO_BOOKS_CLIENT_ID: "zoho-client",
  ZOHO_BOOKS_CLIENT_SECRET: "zoho-secret-value",
  ZOHO_BOOKS_REFRESH_TOKEN: "zoho-refresh-value",
  GOOGLE_ADS_CUSTOMER_ID: "123-456-7890",
  GA4_PROPERTY_ID: "properties/1",
};

const expectedEmpty = {
  github: "ready",
  "local-files": "ready",
  maps: "ready",
  email: "needs_setup",
  "zoho-books": "needs_setup",
  "google-ads": "needs_setup",
  "google-analytics": "needs_setup",
};
const expectedPresent = {
  github: "ready",
  "local-files": "ready",
  maps: "ready",
  email: "paused",
  "zoho-books": "paused",
  "google-ads": "paused",
  "google-analytics": "paused",
};

test("example ops case loads and VOC-EXAMPLE-001 is present", () => {
  const loaded = runtime.loadOpsCases(casesDir);
  const example = loaded.cases.find((item) => item.job && item.job.case_id === "VOC-EXAMPLE-001");
  assert.ok(example);
  assert.equal(example.source, "github");
  assert.equal(example.file, "example-voc-case.json");
  assert.equal(loaded.skipped.includes("example-voc-case.json"), false);
});

test("invalid ops case files are skipped", () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "namayani-cases-"));
  fs.writeFileSync(path.join(scratch, "good.json"), JSON.stringify({ case_id: "VOC-OK" }));
  fs.writeFileSync(path.join(scratch, "bad.json"), "{");
  fs.writeFileSync(path.join(scratch, "nocase.json"), JSON.stringify({ destination: "Zimbabwe" }));
  fs.writeFileSync(path.join(scratch, "array.json"), "[]");
  fs.writeFileSync(path.join(scratch, "empty-id.json"), JSON.stringify({ case_id: "" }));
  fs.writeFileSync(path.join(scratch, "note.txt"), "ignore me");
  const filtered = runtime.loadOpsCases(scratch);
  assert.deepEqual(filtered.cases.map((item) => item.job.case_id), ["VOC-OK"]);
  assert.deepEqual(filtered.skipped, ["array.json", "bad.json", "empty-id.json", "nocase.json"]);
});

test("connector status with empty env and with credentials, and no network", () => {
  let networkCalls = 0;
  const originalFetch = global.fetch;
  global.fetch = function () {
    networkCalls += 1;
    return Promise.reject(new Error("connectors must not use the network"));
  };
  try {
    const loaded = runtime.loadOpsCases(casesDir);
    for (const id of runtime.IDS) {
      const idle = runtime.run(id, { env: empty, cases: loaded.cases });
      const live = runtime.run(id, { env: present, cases: loaded.cases, action: "open-issue" });
      assert.equal(idle.status, expectedEmpty[id], id + " empty env");
      assert.equal(live.status, expectedPresent[id], id + " credentials present");
      assert.equal(idle.network, false, id);
      assert.equal(live.network, false, id);
      const leaked = JSON.stringify(live);
      assert.equal(leaked.includes("gmail-secret-value"), false);
      assert.equal(leaked.includes("gmail-refresh-value"), false);
      assert.equal(leaked.includes("zoho-secret-value"), false);
      assert.equal(leaked.includes("zoho-refresh-value"), false);
      assert.equal(leaked.includes("ghp_test_token"), false);
    }
    assert.equal(runtime.run("email", { env: { GMAIL_CLIENT_ID: "only-one" } }).status, "needs_setup");
    assert.equal(runtime.run("email", { env: present }).mailboxRead, false);
    assert.equal(runtime.run("zoho-books", { env: present }).calledBooks, false);
    assert.equal(runtime.run("zoho-books", { env: { ZOHO_BOOKS_ORG_ID: "org" } }).status, "needs_setup");
    assert.equal(runtime.run("google-analytics", { env: present }).calledAnalytics, false);
    assert.equal(runtime.run("github", { env: present, action: "open-issue" }).issuesOpened, false);
    assert.deepEqual(
      runtime.run("github", { env: empty }).workflows.map((item) => item.path),
      [".github/workflows/voc-compliance.yml", ".github/workflows/finance-audit.yml"],
    );
    const files = runtime.run("local-files", { env: empty, dir: casesDir });
    assert.ok(files.cases.some((item) => item.job.case_id === "VOC-EXAMPLE-001"));
    assert.equal(networkCalls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("boolean env flags flip needs setup to paused and name only the missing fields", () => {
  const flags = {};
  for (const key of runtime.ENV_FLAGS) flags[key] = false;
  const idle = runtime.configure({ env: flags });
  const idleById = Object.fromEntries(idle.map((row) => [row.id, row]));
  assert.equal(idleById.email.status, "needs_setup");
  assert.deepEqual(idleById.email.missing, ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"]);
  assert.deepEqual(idleById["zoho-books"].missing, [
    "ZOHO_BOOKS_ORG_ID",
    "ZOHO_BOOKS_CLIENT_ID",
    "ZOHO_BOOKS_CLIENT_SECRET",
    "ZOHO_BOOKS_REFRESH_TOKEN",
  ]);
  assert.deepEqual(idleById["google-ads"].missing, ["GOOGLE_ADS_CUSTOMER_ID"]);
  assert.deepEqual(idleById["google-analytics"].missing, ["GA4_PROPERTY_ID"]);
  assert.equal(idleById.github.status, "ready");
  assert.deepEqual(idleById.github.fields, []);
  assert.equal(idleById.maps.status, "ready");
  assert.equal(idleById["local-files"].status, "ready");

  const on = {};
  for (const key of runtime.ENV_FLAGS) on[key] = true;
  const live = runtime.configure({ env: on });
  for (const row of live) {
    if (row.fields.length) {
      assert.equal(row.status, "paused", row.id);
      assert.deepEqual(row.missing, [], row.id);
    } else {
      assert.equal(row.status, "ready", row.id);
    }
    assert.equal(JSON.stringify(row).includes("gmail-secret-value"), false);
    assert.equal(JSON.stringify(row).includes("zoho-secret-value"), false);
  }

  const partial = runtime.configure({
    env: Object.assign({}, on, { GMAIL_REFRESH_TOKEN: false, ZOHO_BOOKS_CLIENT_SECRET: false }),
  });
  const partialById = Object.fromEntries(partial.map((row) => [row.id, row]));
  assert.equal(partialById.email.status, "needs_setup");
  assert.deepEqual(partialById.email.missing, ["GMAIL_REFRESH_TOKEN"]);
  assert.equal(partialById["zoho-books"].status, "needs_setup");
  assert.deepEqual(partialById["zoho-books"].missing, ["ZOHO_BOOKS_CLIENT_SECRET"]);
  assert.equal(partialById["google-ads"].status, "paused");
  assert.equal(partialById["google-analytics"].status, "paused");

  const books = runtime.run("zoho-books", { env: on });
  assert.equal(books.status, "paused");
  assert.equal(books.calledBooks, false);
  const route = runtime.run("maps", { env: on, quote: books.quote }).route;
  assert.equal(route.quoteId, "EST-0142");
  assert.deepEqual(route.stops.map((stop) => stop.label), ["Johannesburg", "Beitbridge", "Harare"]);
});

test("routeFromQuote(EST-0142) is the three stops in order and carries the quote id", () => {
  const route = runtime.routeFromQuote("EST-0142");
  assert.equal(route.quoteId, "EST-0142");
  assert.equal(route.jobId, "VOC-EXAMPLE-001");
  assert.deepEqual(route.stops, [
    { label: "Johannesburg", lat: -26.2041, lng: 28.0473 },
    { label: "Beitbridge", lat: -22.2167, lng: 30 },
    { label: "Harare", lat: -17.8252, lng: 31.0335 },
  ]);
  assert.deepEqual(runtime.routeFromQuote(runtime.sampleQuote("EST-0142")).stops, route.stops);
  const books = runtime.run("zoho-books", { env: empty });
  assert.equal(books.calledBooks, false);
  assert.equal(runtime.routeFromQuote(books.quote).quoteId, "EST-0142");
  assert.deepEqual(runtime.routeFromQuote(books.quote).stops, route.stops);
});

test("a quote with empty delivery lines yields no route", () => {
  assert.equal(runtime.routeFromQuote({ id: "EST-0000", job_id: "VOC-EMPTY", delivery_lines: [] }), null);
  assert.equal(runtime.routeFromQuote({ id: "EST-0000", delivery_lines: [{ label: "Nowhere" }] }), null);
  assert.equal(runtime.run("maps", { quote: { id: "EST-0000", delivery_lines: [] } }).route, null);
  assert.equal(runtime.run("maps", { quote: { id: "EST-0000", delivery_lines: [] } }).status, "ready");
});

test("google ads result text does not include a mutate or spend action", () => {
  for (const env of [empty, present]) {
    const ads = runtime.run("google-ads", { env: env });
    const text = JSON.stringify(ads);
    assert.doesNotMatch(text, /mutate/i);
    assert.doesNotMatch(text, /\bspend\b/i);
    assert.equal(ads.changedBudget, false);
    assert.equal(ads.changedBids, false);
    assert.equal(ads.network, false);
    assert.match(ads.detail, /Conversion primary\/secondary stays in the Google Ads UI/);
  }
});

test("runtime source does not call live accounts", () => {
  const source = fs.readFileSync(path.join(__dirname, "runtime.js"), "utf8");
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("zohoapis"), false);
  assert.equal(source.includes("googleapis"), false);
  assert.equal(source.includes("formspree"), false);
});

test("registry status matches the runtime", () => {
  const deskContext = { globalThis: {} };
  deskContext.globalThis = deskContext;
  vm.createContext(deskContext);
  function load(filename) {
    vm.runInContext(fs.readFileSync(filename, "utf8"), deskContext, { filename });
  }
  load(path.join(__dirname, "runtime.js"));
  load(path.join(__dirname, "template.js"));
  load(path.join(__dirname, "registry.js"));
  const registry = deskContext.NamayaniDesk.connectors;
  const registryIds = [];
  for (const item of registry) registryIds.push(item.id);
  assert.deepEqual(registryIds, runtime.IDS.slice());
  const loaded = runtime.loadOpsCases(casesDir);
  for (const id of runtime.IDS) {
    let connector = null;
    for (const item of registry) {
      if (item.id === id) connector = item;
    }
    for (const env of [empty, present]) {
      const fromRegistry = connector.resolve({ env: env, cases: loaded.cases });
      const fromRuntime = runtime.resolveConnector(id, { env: env, cases: loaded.cases });
      assert.equal(JSON.stringify(fromRegistry), JSON.stringify(fromRuntime), id + " drifted");
    }
  }
});

test("desk shell and index call the runtime", () => {
  const shell = fs.readFileSync(path.join(__dirname, "..", "shell.html"), "utf8");
  assert.match(shell, /\/desk\/connectors\/runtime\.js/);
  assert.match(shell, /routeFromQuote/);
  assert.match(shell, /id="configure"/);
  assert.match(shell, /fetch\("\/api\/desk"/);
  assert.match(shell, /runtime\.configure/);
  assert.match(shell, /GMAIL_CLIENT_ID/);
  assert.match(shell, /ZOHO_BOOKS_REFRESH_TOKEN/);
  assert.match(shell, /GOOGLE_ADS_CUSTOMER_ID/);
  assert.match(shell, /GA4_PROPERTY_ID/);
  assert.equal(shell.includes("gmail-secret"), false);
  assert.equal(shell.includes("zoho-secret"), false);
  const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(index.indexOf("/desk/connectors/runtime.js") < index.indexOf("/desk/connectors/registry.js"));
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /fetch\("\/api\/desk"/);
  assert.match(app, /runtime\.configure/);
  assert.match(app, /envFlags/);
  const api = fs.readFileSync(path.join(root, "api", "desk.ts"), "utf8");
  assert.match(api, /env\[key\] = Boolean\(process\.env\[key\]\)/);
});
