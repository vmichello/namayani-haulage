# Zoho Books and CRM — quote-to-invoice automation

Namayani Group (Pty) Ltd · Victor Michelo · victor@namayani.com

- **Zoho CRM** owns leads and deals (who is in the pipeline).
- **Zoho Books** owns customers, estimates, invoices, and payments.
- **Linear** tracks operational work.
- Grok cannot connect to Zoho.

Linear: [NAM-14](https://linear.app/namayani-group/issue/NAM-14/zoho-books-quote-to-invoice-workflow) · [NAM-15](https://linear.app/namayani-group/issue/NAM-15/zoho-crm-integration-with-books-and-quote-form) · first job [NAM-5](https://linear.app/namayani-group/issue/NAM-5/close-first-randburg-kadoma-bess-load)

## Hard rules

- Create **estimates** from website quotes, not invoices.
- Never auto-send an estimate or invoice to the customer.
- Never auto-convert estimate → invoice.
- Never auto-invoice when a CRM Deal is marked Won.
- Convert only after deposit is received **and** carrier + tracking are confirmed (NAM-7).
- Do not auto-bill freight ZAR 69,000 — indication only until Victor firms it.
- Do not let Hunter / Runner create invoices.
- GIT and escort lines only after NAM-6 / NAM-7 are firm.
- Do **not** use Zoho CRM native Quotes or Invoices modules — they do not sync to Books. Use the **Zoho Finance** tab in CRM or create in Books.

## 1. One-time Zoho Books setup

- Organisation: Namayani Group (Pty) Ltd, registration 2023/772319/07
- Base currency: ZAR
- Items: Arrangement fee (2500); Dedicated FTL; GIT on-charge; Escort on-charge
- Estimate custom fields: Origin, Destination, Cargo value, Corridor, GIT Y/N
- Payment terms: arrangement fee or deposit before the truck is locked
- Confirm VAT treatment (registered or not)

## 2. Native Zoho CRM ↔ Zoho Books

In Zoho Books: Settings → Integrations & Marketplace → Zoho Apps → Zoho CRM → Connect.

1. Select the Namayani CRM organisation.
2. Contacts: **Accounts & their Contacts**, include contacts with no account.
3. Sync extent: two-way unless you only want CRM → Books.
4. Products/Items: same four items as Books.
5. Enable **Sync Transaction Modules** so Books estimates and invoices appear under CRM **Zoho Finance**.
6. Map email, phone, company, billing address.
7. Click instant sync once (accounts/contacts otherwise lag about two hours; transactions sync immediately).
8. Leave **off** any option that creates a Books invoice when a CRM deal is Won.

## 3. Workflow rules (inside Books)

Settings → Automation → Workflow Rules.

| Name | Module | When | Criteria | Action |
| --- | --- | --- | --- | --- |
| High-value estimate | Estimates | Created | Total ≥ 50,000 | Email victor@namayani.com — review, do not send |
| Estimate accepted | Estimates | Edited | Status = Accepted | Email + in-app: invoice only after deposit + NAM-7 |
| Payment received | Customer Payments | Created | — | Email Victor (customer, amount, invoice no.) |

## 4. Zapier — Formspree → CRM + Books

One Catch Hook. Formspree Plugins → Zapier / Webhooks → paste hook URL.

Zap name: `Namayani quote → CRM lead + Books estimate`

1. Trigger: Webhooks by Zapier → Catch Hook.
2. Zoho CRM → Create/Update Lead
   - Name, Company, Email, Phone from the form
   - Description: origin → destination + cargo
   - Lead Source: Website quote
   - Do not auto-create a Deal unless you add a filter later.
3. Zoho Books → Find Customer by email; if missing, Create Customer.
4. Zoho Books → Create Estimate, **Send off**
   - Line: Arrangement fee, 2500 × 1
   - Freight in notes only
   - Notes: `Website quote. Do not invoice until deposit + NAM-7.`

If Books Create Customer duplicates a record the CRM sync already created, remove that step and Find Customer only.

Week-one fallback if sync timing fights you: create Lead + Estimate in parallel and match on email by hand.

### Field map

| Formspree | Zoho CRM | Zoho Books |
| --- | --- | --- |
| name | Lead last/first | Contact Name |
| company | Company / Account | Company Name |
| email | Email | Email |
| phone | Phone | Mobile |
| origin / destination | Description | Custom fields + notes |
| message | Description | Line description |

## 5. CRM pipeline

New quote → Qualified → Estimate sent → Deposit → In transit → Won / Lost

Mark Won only after deposit + NAM-7. Hunter names stay Leads until there is a form submit or a real reply.

## 6. Per-job

1. CRM Lead URL and Books Estimate URL pasted into Linear
2. Customer acceptance on file
3. Deposit recorded in Books
4. NAM-7 confirmed
5. Convert estimate → invoice in **Books** (or Zoho Finance tab), not CRM Invoices
6. Record payment; then close the Linear issue

## References

- Books ↔ CRM: https://www.zoho.com/books/help/integrations/crm-integration.html
- Do not sync CRM native invoices: https://www.zoho.com/books/kb/integrations/sync-invoices-crm.html
- Zapier + Books: https://www.zoho.com/za/books/help/integrations/zapier-books-integration.html
- Formspree → Zapier: https://help.formspree.io/articles/plugins/connecting-a-form-to-zapier/
