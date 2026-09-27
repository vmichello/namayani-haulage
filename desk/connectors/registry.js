(function (root) {
  const runtime = root.NamayaniConnectors;
  if (!runtime || typeof runtime.resolveConnector !== "function") {
    throw new Error("Load desk/connectors/runtime.js before registry.js");
  }
  const define = root.NamayaniDesk.defineConnector;

  function resolve(id) {
    return function (ctx) {
      return runtime.resolveConnector(id, ctx);
    };
  }

  define({
    id: "github",
    name: "GitHub",
    purpose: "Shared haulage jobs and the VOC and finance bots live in this repository.",
    fields: [{ key: "GH_TOKEN", label: "GitHub token", secret: true, hint: "Only needed later if the desk opens issues itself." }],
    actions: [
      "Read ops/cases JSON",
      "Point at the VOC compliance and finance audit workflows",
      "Download a job JSON to commit back to ops/cases",
    ],
    resolve: resolve("github"),
  });

  define({
    id: "local-files",
    name: "Local files",
    purpose: "Phone and desktop copies of a job, plus JSON you import from this device.",
    fields: [],
    actions: ["Import a sanitized case JSON", "Keep edits on this device", "Download JSON for the GitHub case folder"],
    resolve: resolve("local-files"),
  });

  define({
    id: "maps",
    name: "Maps",
    purpose: "Corridor view for collection, Beitbridge, and delivery.",
    fields: [],
    actions: ["Draw Johannesburg → Beitbridge → Harare", "Match a known city in the job origin or destination"],
    resolve: resolve("maps"),
  });

  define({
    id: "email",
    name: "Email",
    purpose: "Read logistics inquiries that arrive for victor@namayani.com.",
    fields: [
      { key: "GMAIL_CLIENT_ID", label: "Gmail client id" },
      { key: "GMAIL_CLIENT_SECRET", label: "Gmail client secret", secret: true },
      { key: "GMAIL_REFRESH_TOKEN", label: "Gmail refresh token", secret: true },
    ],
    actions: ["List inbound inquiries", "Draft a reply"],
    resolve: resolve("email"),
  });

  define({
    id: "zoho-books",
    name: "Zoho Books",
    purpose: "Estimates and invoices from the job commercial block.",
    fields: [
      { key: "ZOHO_BOOKS_ORG_ID", label: "Zoho Books organisation id" },
      { key: "ZOHO_BOOKS_CLIENT_ID", label: "Zoho client id" },
      { key: "ZOHO_BOOKS_CLIENT_SECRET", label: "Zoho client secret", secret: true },
      { key: "ZOHO_BOOKS_REFRESH_TOKEN", label: "Zoho refresh token", secret: true },
    ],
    actions: ["Create an estimate from declared value, freight, and incoterm", "List open invoices for a job"],
    resolve: resolve("zoho-books"),
  });

  define({
    id: "google-ads",
    name: "Google Ads",
    purpose: "Read campaign results for haulage inquiries. Budgets are not changed here.",
    fields: [{ key: "GOOGLE_ADS_CUSTOMER_ID", label: "Google Ads customer id" }],
    actions: ["Read campaign summary", "Show inquiry traffic cost"],
    resolve: resolve("google-ads"),
  });

  define({
    id: "google-analytics",
    name: "Google Analytics",
    purpose: "Quote-page visits and inquiry clicks from GA4.",
    fields: [{ key: "GA4_PROPERTY_ID", label: "GA4 property id" }],
    actions: ["Quote page sessions", "Inquiry button events"],
    resolve: resolve("google-analytics"),
  });
})(globalThis);
