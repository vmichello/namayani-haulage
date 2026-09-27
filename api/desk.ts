import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
};

const ENV_FLAGS = [
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
] as const;

function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.status(status).send(JSON.stringify(body));
}

export default async function desk(req: { method?: string }, res: VercelResponse) {
  if ((req.method ?? "GET").toUpperCase() !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const dir = path.join(process.cwd(), "ops", "cases");
  const cases: { file: string; source: "github"; job: unknown }[] = [];
  const skipped: string[] = [];

  try {
    const files = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
    for (const name of files) {
      try {
        const job = JSON.parse(await readFile(path.join(dir, name), "utf8")) as { case_id?: unknown };
        if (job == null || typeof job !== "object" || Array.isArray(job) || typeof job.case_id !== "string" || !job.case_id) {
          skipped.push(name);
          continue;
        }
        cases.push({ file: name, source: "github", job });
      } catch {
        skipped.push(name);
      }
    }
  } catch {
    sendJson(res, 500, { error: "Could not read ops/cases" });
    return;
  }

  const env: Record<string, boolean> = {};
  for (const key of ENV_FLAGS) env[key] = Boolean(process.env[key]);

  sendJson(res, 200, {
    cases,
    skipped,
    env,
    workflows: [
      { name: "VOC compliance bot", path: ".github/workflows/voc-compliance.yml" },
      { name: "Finance audit bot", path: ".github/workflows/finance-audit.yml" },
    ],
  });
}
