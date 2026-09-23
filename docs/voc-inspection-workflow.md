# VOC certificate and inspection workflow

This workflow adds Bureau Veritas VOC Africa documentation to the quote-to-load process for consignments that require a certificate of conformity before export or import. It is a controlled compliance workflow, not an automatic certification process.

## Source documents

The source files supplied for this workflow must remain in the restricted customer/job record, not in this public repository:

| Document | Purpose | Workflow stage |
| --- | --- | --- |
| `VOC AFRICA - REQUEST FOR CERTIFICATE FORM 6.6 (1).docx` | Blank RFC template and required evidence checklist | Intake |
| `Doc1.pdf` | Completed RFC for the Herholdts Group → Charles Stewart Day Old Chicks consignment | Compliance review |
| `REMOTE INSPECTION Consent Letter TISA SIGNED 24072020.pdf` | Exporter consent for an eligible remote inspection | Inspection approval |

These files contain personal, commercial, and signed information. They are internal working records and must not be committed to this public repository, linked from the public quote page, or emailed automatically.

## When this workflow applies

Start a VOC case when the destination program or importer requires a Bureau Veritas certificate of conformity. The Form 6.6 request captures:

- destination, UCR/consignment references, and Bureau Veritas registration/licensing numbers;
- exporter, importer, applicant/forwarding agent, and payer details;
- proforma invoice, purchase order, currency, freight, total, insurance, and Incoterm values;
- transport mode, truck/load details, inspection location, shipment dates, and destination port;
- goods description, HS-code list, condition, standards, test reports, and supporting certificates; and
- whether a remote inspection is requested and whether the site has suitable internet connectivity.

The completed request states that the certificate or Non-Conformity Report is issued from the information communicated and that a draft is not sent before issuance unless separately arranged. The case must therefore be checked by a person before submission.

## Bot assignment matrix

| Bot | Owns | Inputs | Outputs | Must not do |
| --- | --- | --- | --- | --- |
| **VOC Intake Bot** | Opens the compliance case and checks completeness | CRM lead, quote, destination, Form 6.6 template | Case ID, missing-field list, evidence checklist | Submit forms, certify goods, or invent values |
| **VOC Compliance Bot** | Reconciles the completed RFC against the commercial file | Completed Form 6.6, proforma invoice, PO, product list, HS codes, test/certification evidence | Field reconciliation, discrepancy report, submission-ready packet | Change declared values, select standards, or approve conformity |
| **Remote Inspection Coordinator Bot** | Manages the remote-inspection option | Signed consent letter, site contact, inspection address, connectivity confirmation, BV reference | Consent record, eligibility checklist, proposed inspection slot, escalation list | Treat consent as proof of eligibility or issue an inspection result |
| **Dispatch and Risk Bot** | Prevents dispatch until compliance and risk gates are clear | BV status, certificate/NCR, GIT, tracking, carrier, route and escort checks | Dispatch readiness status and exception alerts | Release a load on an assumption or override a compliance hold |
| **CFO Weekly Audit Bot** | Reviews the financial side of the case | Books estimate, payment, freight, insurance value, VOC fees and evidence links | Exception review and data-gap report | Create/send invoices or approve certification |
| **CFO Monthly Close Bot** | Includes VOC cases in month-end control testing | Closed cases, invoices, payments, outstanding certificates/NCRs | Month-end control exceptions and evidence requests | Treat an inspection report as statutory assurance |

Bots may extract, compare, remind, and escalate. Victor or the designated compliance owner remains accountable for declarations, signatures, submission to Bureau Veritas, acceptance of fees, and final release decisions.

## Handoff sequence

1. **VOC Intake Bot** creates a case linked to the CRM lead, Books estimate, and Linear job.
2. It uses the Form 6.6 template to request the destination, parties, commercial documents, product/HS-code list, inspection site, dates, and conformity evidence.
3. **VOC Compliance Bot** compares the completed request with the proforma invoice and purchase order. Any mismatch in total value, freight, insurance value, Incoterm, destination, dates, or parties becomes a blocking exception.
4. If remote inspection is requested, **Remote Inspection Coordinator Bot** verifies that the signed consent is present, the site representative is identified, and connectivity and eligibility are confirmed. Consent alone is not approval.
5. A human compliance owner submits the packet to the nearest Bureau Veritas office or agreed Verigates channel and records the BV reference and status.
6. The bot records the resulting certificate or Non-Conformity Report. A missing certificate, open NCR, or unverified status keeps the case on compliance hold.
7. **Dispatch and Risk Bot** checks the VOC gate alongside carrier insurance, GIT cover, tracking, escort, and border-document checks.
8. Only after the compliance and operational gates are cleared may the job proceed to dispatch. Billing remains governed by the Zoho Books deposit and invoice controls.

## Required evidence checklist

- Completed and signed Form 6.6 request
- Proforma invoice and purchase order/contract
- Detailed goods list with HS codes and technical characteristics
- Applicable test reports, conformity marks, approvals, and certificates
- Quality-management or laboratory evidence where applicable
- Health, hygienic, phytosanitary, or fumigation certificates where applicable
- Exporter/importer/applicant/payer contact details
- Inspection location, site contact, availability dates, and shipment date
- Signed remote-inspection consent if remote inspection is requested
- BV reference, submission receipt, certificate or NCR, and final status

## Statuses and controls

Use these Linear statuses or equivalent labels:

`VOC intake` → `Evidence requested` → `Compliance review` → `BV submitted` → `Inspection scheduled` → `Certificate/NCR received` → `Compliance cleared` / `Compliance hold`

The following are hard stops:

- missing signed consent when remote inspection is selected;
- inconsistent commercial values or parties across the RFC, invoice, and PO;
- missing goods description or HS-code evidence;
- an open Non-Conformity Report;
- no verifiable BV submission or certificate status; and
- dispatch requested while the certificate gate is unresolved.

## Privacy and retention

Keep signed forms and completed commercial documents in the restricted job record. Do not put personal data, signatures, invoice values, or document URLs into public HTML, customer-facing logs, or bot prompts beyond what is required for the active case. Store only the minimum evidence links needed for auditability.

## Executable GitHub integrations

The first executable implementation is GitHub-only and deliberately deterministic:

- `.github/workflows/voc-compliance.yml` runs the VOC Compliance Bot manually against a sanitized JSON case.
- `.github/workflows/finance-audit.yml` runs weekly and monthly CFO checks against sanitized case records.
- `scripts/run_bots.py` validates evidence, applies the hard-stop rules above, prints a Markdown report, and can create a GitHub issue when `create_issue` is enabled.
- `ops/cases/example-voc-case.json` is a safe schema example. Copy it for a real case, replacing values with IDs, booleans, and restricted evidence references only.

These workflows do not submit to Bureau Veritas, call Zoho or Linear, send invoices, or approve a certificate. They use the built-in GitHub Actions token only for optional issue creation. A failing bot means that a human must resolve the listed data gap or compliance hold.

### GitHub Actions access setup

Actions downloads `bot-knowledge.sqlite3` from the private `vmichello/namayani-haulage-knowledge` repository at job start. Configure a repository secret named `KNOWLEDGE_REPO_TOKEN` in this repository. The credential should be a dedicated fine-grained token or GitHub App installation token with:

- access limited to `vmichello/namayani-haulage-knowledge`;
- **Contents: Read-only** permission; and
- no access to issues, workflows, administration, or other repositories.

The token is passed only through the runner environment, the database is downloaded into the ephemeral runner temporary directory, and the runner is destroyed after the job. Rotate or revoke the credential if it is exposed. The workflow currently pins the knowledge source to the `master` ref; replace `KNOWLEDGE_REPO_REF` with a reviewed commit SHA after each approved knowledge update.

The secret itself is not created by the repository code. Add it with GitHub repository settings or `gh secret set KNOWLEDGE_REPO_TOKEN`; never place the token in a workflow file, case JSON, issue body, or commit.

### Gmail reference import

`scripts/import_gmail.py` imports only messages matching `from:(victor@namayani.com)` through Gmail's read-only API scope. It stores sender, subject, date, message ID, and text body in the private database table `gmail_messages`; attachment parts are ignored. The OAuth refresh token remains local under `.private/` and is not uploaded to GitHub. Re-run the local OAuth flow if the token is revoked, then rerun the importer and publish the updated private database.
