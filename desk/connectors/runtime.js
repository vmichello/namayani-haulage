/*
  Namayani connector runtime.

  Plain JavaScript the desk shell and Node tests can call. Secrets stay on the
  server: callers pass true/false env flags, never token values, and results
  never echo those values back. This file does not call Zoho, Gmail, Google
  Ads, Analytics, or Formspree, and it does not spend.
*/
(function (root) {
  var SAMPLE_QUOTE = {
    id: "EST-0142",
    job_id: "VOC-EXAMPLE-001",
    delivery_lines: [
      { label: "Johannesburg", lat: -26.2041, lng: 28.0473 },
      { label: "Beitbridge", lat: -22.2167, lng: 30 },
      { label: "Harare", lat: -17.8252, lng: 31.0335 },
    ],
  };

  var WORKFLOWS = [
    { name: "VOC compliance bot", path: ".github/workflows/voc-compliance.yml" },
    { name: "Finance audit bot", path: ".github/workflows/finance-audit.yml" },
  ];

  var ENV_FLAGS = [
    "GH_TOKEN",
    "GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET",
    "GMAIL_REFRESH_TOKEN",
    "ZOHO_BOOKS_ORG_ID",
    "ZOHO_BOOKS_CLIENT_ID",
    "ZOHO_BOOKS_CLIENT_SECRET",
    "ZOHO_BOOKS_REFRESH_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID",
    "GA4_PROPERTY_ID",
  ];

  var IDS = ["github", "local-files", "maps", "email", "zoho-books", "google-ads", "google-analytics"];

  var CREDENTIALS = {
    github: [],
    "local-files": [],
    maps: [],
    email: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
    "zoho-books": ["ZOHO_BOOKS_ORG_ID", "ZOHO_BOOKS_CLIENT_ID", "ZOHO_BOOKS_CLIENT_SECRET", "ZOHO_BOOKS_REFRESH_TOKEN"],
    "google-ads": ["GOOGLE_ADS_CUSTOMER_ID"],
    "google-analytics": ["GA4_PROPERTY_ID"],
  };

  function isSet(value) {
    if (value === true) return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "string") return value.trim() !== "";
    return false;
  }

  function envOf(ctx) {
    var env = ctx && ctx.env;
    if (env == null || typeof env !== "object" || Array.isArray(env)) return {};
    return env;
  }

  function hasAll(env, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (!isSet(env[keys[i]])) return false;
    }
    return true;
  }

  function coord(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim() !== "") {
      var number = Number(value);
      return Number.isFinite(number) ? number : null;
    }
    return null;
  }

  function cloneQuote(quote) {
    return {
      id: quote.id,
      job_id: quote.job_id,
      delivery_lines: quote.delivery_lines.map(function (line) {
        return { label: line.label, lat: line.lat, lng: line.lng };
      }),
    };
  }

  function sampleQuote(id) {
    if (id != null && id !== SAMPLE_QUOTE.id) return null;
    return cloneQuote(SAMPLE_QUOTE);
  }

  function routeFromQuote(quote) {
    if (typeof quote === "string") quote = sampleQuote(quote);
    if (quote == null || typeof quote !== "object" || Array.isArray(quote)) return null;
    var lines = quote.delivery_lines;
    if (!Array.isArray(lines) || lines.length === 0) return null;
    var stops = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line == null || typeof line !== "object" || Array.isArray(line)) continue;
      var lat = coord(line.lat);
      var lng = coord(line.lng);
      var label = line.label || line.place || line.name || "";
      if (typeof label !== "string" || label.trim() === "") continue;
      if (lat == null || lng == null) continue;
      stops.push({ label: label.trim(), lat: lat, lng: lng });
    }
    if (!stops.length) return null;
    var quoteId = typeof quote.id === "string" ? quote.id : typeof quote.quote_id === "string" ? quote.quote_id : "";
    var jobId = typeof quote.job_id === "string" ? quote.job_id : typeof quote.case_id === "string" ? quote.case_id : "";
    return { quoteId: quoteId, jobId: jobId, stops: stops };
  }

  function isCaseRecord(job) {
    return job != null && typeof job === "object" && !Array.isArray(job) && typeof job.case_id === "string" && job.case_id !== "";
  }

  function loadOpsCases(dir) {
    if (typeof require !== "function") {
      throw new Error("loadOpsCases reads ops/cases in Node only");
    }
    var fs = require("node:fs");
    var path = require("node:path");
    var cases = [];
    var skipped = [];
    var names;
    try {
      names = fs.readdirSync(dir).filter(function (name) {
        return name.endsWith(".json");
      }).sort();
    } catch (err) {
      var error = new Error("Could not read ops/cases");
      error.cause = err;
      throw error;
    }
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      try {
        var job = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
        if (!isCaseRecord(job)) {
          skipped.push(name);
          continue;
        }
        cases.push({ file: name, source: "github", job: job });
      } catch (err) {
        skipped.push(name);
      }
    }
    return { cases: cases, skipped: skipped };
  }

  function caseList(ctx) {
    if (ctx && Array.isArray(ctx.cases)) return ctx.cases;
    if (ctx && typeof ctx.dir === "string" && ctx.dir) return loadOpsCases(ctx.dir).cases;
    return [];
  }

  function skippedList(ctx) {
    if (ctx && Array.isArray(ctx.skipped)) return ctx.skipped;
    if (ctx && typeof ctx.dir === "string" && ctx.dir && !Array.isArray(ctx.cases)) return loadOpsCases(ctx.dir).skipped;
    return [];
  }

  function githubDetail(ctx) {
    var cases = caseList(ctx);
    var count = 0;
    for (var i = 0; i < cases.length; i++) {
      if (cases[i] && cases[i].source === "github") count++;
    }
    return count + " job file" + (count === 1 ? "" : "s") + " in ops/cases. Workflows: voc-compliance.yml and finance-audit.yml.";
  }

  function workflowsOf(ctx) {
    var list = ctx && Array.isArray(ctx.workflows) ? ctx.workflows : WORKFLOWS;
    return list.map(function (item) {
      return { name: item.name, path: item.path };
    });
  }

  function quoteFor(ctx) {
    if (ctx && Object.prototype.hasOwnProperty.call(ctx, "quote")) return ctx.quote;
    return sampleQuote(SAMPLE_QUOTE.id);
  }

  var RUNNERS = {
    github: function (ctx) {
      return {
        status: "ready",
        detail: githubDetail(ctx),
        workflows: workflowsOf(ctx),
        issuesOpened: false,
        network: false,
      };
    },
    "local-files": function (ctx) {
      return {
        status: "ready",
        detail: "Import and device edits work in this browser. Customer documents stay out of the repository.",
        cases: caseList(ctx),
        skipped: skippedList(ctx),
        network: false,
      };
    },
    maps: function (ctx) {
      return {
        status: "ready",
        detail: "OpenStreetMap is live. Unknown towns stay on the main corridor until a geocoder is added in this connector.",
        route: routeFromQuote(quoteFor(ctx)),
        network: false,
      };
    },
    email: function (ctx) {
      var ready = hasAll(envOf(ctx), CREDENTIALS.email);
      if (!ready) {
        return {
          status: "needs_setup",
          detail: "The public quote form still sends inquiries. Mailbox access waits on the Gmail fields above.",
          mailboxRead: false,
          network: false,
        };
      }
      return {
        status: "paused",
        detail: "Gmail credentials are present. This template does not read the mailbox yet.",
        mailboxRead: false,
        network: false,
      };
    },
    "zoho-books": function (ctx) {
      var ready = hasAll(envOf(ctx), CREDENTIALS["zoho-books"]);
      var quote = sampleQuote(SAMPLE_QUOTE.id);
      if (!ready) {
        return {
          status: "needs_setup",
          detail: "Set the Zoho Books fields on the server. No Books call is made from the desk.",
          quote: quote,
          calledBooks: false,
          network: false,
        };
      }
      return {
        status: "paused",
        detail: "Zoho credentials are present. Sync stays off until resolve() calls Books.",
        quote: quote,
        calledBooks: false,
        network: false,
      };
    },
    "google-ads": function (ctx) {
      var ready = hasAll(envOf(ctx), CREDENTIALS["google-ads"]);
      if (!ready) {
        return {
          status: "needs_setup",
          detail: "Add the customer id when you want a read-only ads panel. Budgets are not changed here. Conversion primary/secondary stays in the Google Ads UI.",
          changedBudget: false,
          changedBids: false,
          network: false,
        };
      }
      return {
        status: "paused",
        detail: "Customer id is present. Budgets are not changed here. Conversion primary/secondary stays in the Google Ads UI.",
        changedBudget: false,
        changedBids: false,
        network: false,
      };
    },
    "google-analytics": function (ctx) {
      var ready = hasAll(envOf(ctx), CREDENTIALS["google-analytics"]);
      if (!ready) {
        return {
          status: "needs_setup",
          detail: "Set GA4_PROPERTY_ID to open an analytics panel. No Analytics call is made yet.",
          calledAnalytics: false,
          network: false,
        };
      }
      return {
        status: "paused",
        detail: "GA4 property id is present. No Analytics call is made.",
        calledAnalytics: false,
        network: false,
      };
    },
  };

  function run(id, ctx) {
    var runner = RUNNERS[id];
    if (typeof runner !== "function") throw new Error("Unknown connector " + id);
    return runner(ctx || {});
  }

  function resolveConnector(id, ctx) {
    var result = run(id, ctx);
    return { status: result.status, detail: result.detail };
  }

  var api = {
    IDS: IDS,
    ENV_FLAGS: ENV_FLAGS,
    WORKFLOWS: WORKFLOWS.map(function (item) {
      return { name: item.name, path: item.path };
    }),
    sampleQuote: sampleQuote,
    routeFromQuote: routeFromQuote,
    isCaseRecord: isCaseRecord,
    loadOpsCases: loadOpsCases,
    run: run,
    resolveConnector: resolveConnector,
  };

  root.NamayaniConnectors = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
