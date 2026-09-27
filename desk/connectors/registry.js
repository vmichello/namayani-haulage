(function (root) {
  const define = root.NamayaniDesk.defineConnector;

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
    resolve(ctx) {
      const count = (ctx.cases || []).filter((item) => item.source === "github").length;
      return {
        status: "ready",
        detail: count + " job file" + (count === 1 ? "" : "s") + " in ops/cases. Workflows: voc-compliance.yml and finance-audit.yml.",
      };
    },
  });

  define({
    id: "local-files",
    name: "Local files",
    purpose: "Phone and desktop copies of a job, plus JSON you import from this device.",
    fields: [],
    actions: ["Import a sanitized case JSON", "Keep edits on this device", "Download JSON for the GitHub case folder"],
    resolve() {
      return {
        status: "ready",
        detail: "Import and device edits work in this browser. Customer documents stay out of the repository.",
      };
    },
  });

  define({
    id: "maps",
    name: "Maps",
    purpose: "Corridor view for collection, Beitbridge, and delivery.",
    fields: [],
    actions: ["Draw Johannesburg → Beitbridge → Harare", "Match a known city in the job origin or destination"],
    resolve() {
      return {
        status: "ready",
        detail: "OpenStreetMap is live. Unknown towns stay on the main corridor until a geocoder is added in this connector.",
      };
    },
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
    resolve(ctx) {
      const ready = ctx.env.GMAIL_CLIENT_ID && ctx.env.GMAIL_CLIENT_SECRET && ctx.env.GMAIL_REFRESH_TOKEN;
      if (!ready) {
        return {
          status: "needs_setup",
          detail: "The public quote form still sends inquiries. Mailbox access waits on the Gmail fields above.",
        };
      }
      return { status: "paused", detail: "Gmail credentials are present. This template does not read the mailbox yet." };
    },
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
    resolve(ctx) {
      const ready = ["ZOHO_BOOKS_ORG_ID", "ZOHO_BOOKS_CLIENT_ID", "ZOHO_BOOKS_CLIENT_SECRET", "ZOHO_BOOKS_REFRESH_TOKEN"].every(
        (key) => ctx.env[key],
      );
      if (!ready) {
        return { status: "needs_setup", detail: "Set the Zoho Books fields on the server. No Books call is made from the desk." };
      }
      return { status: "paused", detail: "Zoho credentials are present. Sync stays off until resolve() calls Books." };
    },
  });

  define({
    id: "google-ads",
    name: "Google Ads",
    purpose: "Read campaign results for haulage inquiries. Budgets are not changed here.",
    fields: [{ key: "GOOGLE_ADS_CUSTOMER_ID", label: "Google Ads customer id" }],
    actions: ["Read campaign summary", "Show inquiry traffic cost"],
    resolve(ctx) {
      if (!ctx.env.GOOGLE_ADS_CUSTOMER_ID) {
        return {
          status: "needs_setup",
          detail: "Add the customer id when you want a read-only ads panel. Budgets are not changed here. Conversion primary/secondary is manual in Google Ads UI.",
        };
      }
      return {
        status: "paused",
        detail: "Customer id is present. Budgets are not changed here. Conversion primary/secondary is manual in Google Ads UI.",
      };
    },
  });

  define({
    id: "google-analytics",
    name: "Google Analytics",
    purpose: "Quote-page visits and inquiry clicks from GA4.",
    fields: [{ key: "GA4_PROPERTY_ID", label: "GA4 property id" }],
    actions: ["Quote page sessions", "Inquiry button events"],
    resolve(ctx) {
      if (!ctx.env.GA4_PROPERTY_ID) {
        return { status: "needs_setup", detail: "Set GA4_PROPERTY_ID to open an analytics panel. No Analytics call is made yet." };
      }
      return { status: "paused", detail: "GA4 property id is present. Reporting stays off until this connector calls Analytics." };
    },
  });
})(globalThis);
