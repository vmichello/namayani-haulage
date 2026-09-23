# Namayani Haulage operating model

This model separates accountability, execution, control, and automation so the
business can scale without allowing a bot to approve its own work.

## Leadership and accountability

| Function | Accountable owner | Primary outcomes | Bot support |
| --- | --- | --- | --- |
| Managing director / commercial owner | Victor | Strategy, pricing exceptions, customer commitments, final escalations | Reports, exception summaries |
| Sales and customer success | Sales lead | Qualified pipeline, accurate customer/job records, approved estimates | Intake and data-quality checks |
| Operations and dispatch | Operations lead | Safe, on-time, tracked delivery | Dispatch readiness and risk holds |
| Compliance and trade documentation | Compliance owner | VOC, border, permits, and evidence completeness | VOC Intake, VOC Compliance, Remote Inspection |
| Finance and controls | Finance/CFO owner | Deposits, billing controls, cash visibility, close | Weekly and monthly audit bots |
| Security and insurance | Risk owner | GIT, carrier, route, escort, tracking, incident response | Dispatch/Risk checks |
| Systems and automation | Systems owner | Vercel MCP service, Actions, knowledge access, reliability | MCP health workflow and runbooks |

Every job has one accountable human owner per function. Bots may prepare,
compare, remind, and escalate; they may not sign, certify, release, invoice,
or override a hold.

## Job lifecycle and handoffs

1. **Capture:** Sales records the enquiry and creates one job identity across
   CRM, Books, operations, and the restricted document record.
2. **Qualify:** Sales confirms scope, route, cargo, dates, customer,
   commercial assumptions, and whether VOC or enhanced risk controls apply.
3. **Approve commercially:** Finance confirms the estimate and deposit
   conditions. Estimates and invoices remain human-approved.
4. **Prepare compliance:** Compliance assembles the evidence packet. VOC bots
   report gaps; the compliance owner submits to Bureau Veritas and records the
   response.
5. **Prepare operations:** Operations confirms carrier, GIT, tracking, border
   documents, escort, and recovery plan.
6. **Release:** Dispatch releases only when commercial, compliance, and risk
   gates are clear. Any unresolved hard stop remains visible in the job.
7. **Monitor and close:** Operations records milestones and incidents.
   Finance confirms billing, payment, evidence retention, and month-end close.

## Control rhythm

| Cadence | Owner | Required review |
| --- | --- | --- |
| Per job | Functional owner | Evidence, commercial, compliance, risk, and release gates |
| Daily while in transit | Operations | Tracking, exceptions, delays, security events |
| Weekly | Finance + leadership | Open estimates, deposits, cash, aged exceptions, blocked jobs |
| Monthly | Finance/CFO | Reconciliation, close, control failures, incidents, VOC/NCR ageing |
| Quarterly | Leadership | Customer profitability, carrier performance, loss events, process improvements, access review |

## Automation and escalation policy

- GitHub Actions runs deterministic VOC and finance checks against sanitized
  case data and the private knowledge index.
- The Vercel MCP endpoint is an authenticated integration surface for approved
  agent clients. Its bearer token is stored only in Vercel and GitHub secrets.
- The MCP health workflow checks the production endpoint hourly and on demand.
- A failed bot or health check creates an operational exception, not a silent
  success. The responsible human resolves the issue and records evidence.
- Sensitive documents, signatures, banking data, and Gmail OAuth tokens remain
  outside the public repository.
- Production changes require review, a successful deployment, and a health
  check before being treated as live.

## Performance measures

Track these measures weekly:

- quote response time and quote-to-deposit conversion;
- percentage of jobs with complete evidence before planned loading;
- dispatches released without a hard-stop exception;
- on-time pickup and delivery rate;
- tracking coverage and incident response time;
- gross margin by job and aged receivables;
- VOC turnaround time and open NCR ageing;
- bot findings resolved within the agreed service level; and
- production MCP availability and failed health checks.

The leadership review should use reported values and calculated measures
separately from assumptions or AI interpretations.
