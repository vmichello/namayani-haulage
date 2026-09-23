# Namayani Haulage workflow overview

This page is the operating control view for the business. It summarises the main workstreams that keep quote requests, cross-border loads, security controls, and finance governance moving without missed handoffs.

The [organizational operating model](./organizational-operating-model.md) defines
accountable owners, escalation rules, control cadence, and the performance
measures used across these workstreams.

## 1. Quote-to-load workflow

Owner: Victor / sales ops

1. Website inquiry is received from the logistics form.
2. Lead is created and enriched in Zoho CRM.
3. A customer record is created or matched in Zoho Books.
4. An estimate is generated in Books, not sent automatically.
5. Deposit or arrangement fee is collected before the truck is locked.
6. Carrier, route, GIT cover and tracking setup are confirmed.
7. Estimate is converted to an invoice only after deposit and operational confirmation are complete.
8. Dispatch and border checks proceed, then the job reaches delivered / closed status.

Key control points:
- Never issue invoices before deposit and confirmed operational readiness.
- Never auto-send estimates or invoices to customers.
- All routing and security decisions must be confirmed before final billing.

## 2. Dispatch and transit control

Owner: operations lead / dispatch

1. Job is approved with origin, destination, cargo value and expected load dates.
2. Carrier selection is confirmed with insurance and cargo suitability checks.
3. GPS, tracking, escort and recovery plans are set for the route.
4. Clearing documentation and border approach are coordinated.
5. Transit is monitored with live tracking and escalation triggers.
6. Arrival, delivery confirmation and closure are recorded.

Key control points:
- High-value and lithium/BESS loads require enhanced tracking and risk review.
- Escort/GIT lines are only finalised once route and risk review are firm.
- Any disruption or security issue triggers immediate escalation.

### VOC certificate and inspection control

Where the destination program requires a certificate of conformity, the job also follows the [VOC certificate and inspection workflow](./voc-inspection-workflow.md). The Form 6.6 request, supporting conformity evidence, and any signed remote-inspection consent are checked before dispatch. VOC Intake and VOC Compliance bots may prepare and reconcile the packet, while a human compliance owner submits it and confirms the certificate or Non-Conformity Report status.

## 3. Risk and insurance workflow

Owner: operations + insurance coordination

1. Identify cargo value, cargo class and route exposure.
2. Confirm whether GIT cover is required or customer-provided.
3. Review security measures: GPS, jamming mitigation, escorts and recovery support.
4. Check insurance limits and any dangerous goods / lithium restrictions.
5. Confirm coverage before departure.
6. Close out any incident or claim with documentation and evidence.

Key control points:
- Goods-in-transit and escort only become live after route and risk conditions are confirmed.
- High-value loads trigger a manual review before dispatch.
- Claims and incident responses should never be based on assumptions.

## 4. Finance, control and audit workflow

Owner: Victor + CFO automation

1. Weekly audit reviews open estimates, payments and cash position.
2. Monthly close checks AR/AP, bank reconciliation and overall operations controls.
3. Variances and unusual movement are reviewed before escalation.
4. Linear issues are raised only for validated exceptions.
5. Management reporting stays evidence-based and labelled as Reported / Calculated / Assumption / AI interpretation.

Key control points:
- Do not create or send invoices from AI automation.
- If Zoho Books data is missing, raise a data gap with evidence rather than guessing.
- Keep issue creation tight and non-duplicative.

## 5. Governance map

| Workflow | Primary system | Owner | Key output |
| --- | --- | --- | --- |
| Quote intake | Formspree / website | Sales | Lead and initial customer enquiry |
| CRM pipeline | Zoho CRM | Sales ops | Qualified lead, deal progression |
| Estimate and billing | Zoho Books | Finance / Victor | Approved estimate, invoice after deposit |
| Dispatch | Operations | Operations lead | Safe and tracked movement |
| Security and insurance | Risk controls | Safety / insurance | GIT, escort and tracking readiness |
| VOC compliance | Bureau Veritas / Verigates case | Compliance owner | Form 6.6 packet, inspection status, certificate or NCR |
| CFO review | AI-assisted audit | Finance oversight | Weekly and monthly exception review |

## 6. Operational policy summary

- Quotes are estimates, not automatic invoices.
- Payment confirmation must exist before a final invoice is raised.
- Sensitive cargo requires a documented risk and tracking plan.
- A required VOC certificate, inspection result, or signed remote-inspection consent must be traceable before dispatch.
- Weekly and monthly oversight is mandatory for the finance and control rhythm.
- All operational decisions should be traceable to the relevant customer job, route and supporting evidence.

## Related documents

- [Zoho Books automation](./zoho-books-automation.md)
- [CFO audits](./cfo-audits.md)
- [VOC certificate and inspection workflow](./voc-inspection-workflow.md)
- [README](../README.md)
