# Zoho Books — quote-to-invoice automation

Namayani Group (Pty) Ltd · Victor Michelo · victor@namayani.com

Zoho is the books system of record. Grok cannot connect to Zoho. Linear tracks work; Zoho holds customers, estimates, invoices, and payments.

Linear: [NAM-14](https://linear.app/namayani-group/issue/NAM-14/zoho-books-quote-to-invoice-workflow) · first job [NAM-5](https://linear.app/namayani-group/issue/NAM-5/close-first-randburg-kadoma-bess-load)

## Hard rules

- Create **estimates** from website quotes, not invoices.
- Never auto-send an estimate or invoice to the customer.
- Never auto-convert estimate → invoice.
- Convert only after deposit is received **and** carrier + tracking are confirmed (NAM-7).
- Do not auto-bill freight ZAR 69,000 — that figure is an indication until Victor firms it.
- Do not let Hunter / Runner create invoices.
- GIT and escort lines only after NAM-6 / NAM-7 are firm.

## 1. One-time Zoho setup

- Organisation: Namayani Group (Pty) Ltd, registration 2023/772319/07
- Base currency: ZAR
- Items: Arrangement fee (2500); Dedicated FTL; GIT on-charge; Escort on-charge
- Estimate custom fields: Origin, Destination, Cargo value, Corridor, GIT Y/N
- Payment terms: arrangement fee or deposit before the truck is locked
- Confirm VAT treatment (registered or not)

## 2. Workflow rules (inside Zoho)

Settings → Automation → Workflow Rules.

| Name | Module | When | Criteria | Action |
| --- | --- | --- | --- | --- |
| High-value estimate | Estimates | Created | Total ≥ 50,000 | Email victor@namayani.com — review, do not send |
| Estimate accepted | Estimates | Edited | Status = Accepted | Email + in-app: invoice only after deposit + NAM-7 |
| Payment received | Customer Payments | Created | — | Email Victor (customer, amount, invoice no.) |

Do **not** attach a Send Email / Send Invoice action to create events.

Webhooks (optional): Settings → Workflow Actions → Webhooks. Point Estimate Created and Payment Recorded at a Zapier Catch Hook if you want the estimate URL emailed for pasting into Linear.

Incoming webhooks (optional, no Zapier): Settings → Developer Space → Incoming Webhooks + Deluge. Prefer Zapier unless you want to maintain script.

## 3. Zapier / Zoho Flow — Formspree → draft estimate

Trigger: New Formspree submission (quote page).

Actions:

1. Find customer by email; if missing, Create Customer.
2. Create Estimate with **Send off**.
   - Line: Arrangement fee, rate 2500, qty 1
   - Freight: notes only (or rate 0) until firm
   - Notes: origin, destination, cargo, `Linear Quotes — do not invoice until deposit + NAM-7`

### Field map

| Formspree field | Zoho |
| --- | --- |
| name | Contact Name |
| company | Company Name |
| email | Email |
| phone | Mobile |
| origin | Custom field Origin + notes |
| destination | Custom field Destination + notes |
| message / cargo | Line description |

Test with one fake submit. Confirm a **draft** estimate exists and the customer was **not** emailed.

## 4. Per-job (every Quotes issue)

1. Customer exists in Zoho
2. Estimate created (manual or Zap)
3. Estimate URL pasted into the Linear issue
4. Customer acceptance on file
5. Deposit recorded
6. NAM-7 carrier + tracking confirmed
7. Convert estimate → invoice
8. Record payment; then mark the Linear issue done

## References

- Zoho workflow rules: https://www.zoho.com/books/help/settings/automation/workflow-rules.html
- Zoho webhooks: https://www.zoho.com/books/help/settings/using-webhook.html
- Incoming webhooks: https://www.zoho.com/us/books/help/settings/incoming-webhooks.html
- Zapier + Zoho Books: https://www.zoho.com/za/books/help/integrations/zapier-books-integration.html
