# Namayani Haulage

**Reliable cross-border haulage. On time, every time.**

Namayani Haulage specialises in the safe and efficient movement of high-value and project cargo across Southern Africa, with a core focus on the South Africa – Zimbabwe corridor.

**Company:** Namayani Group (Pty) Ltd  
**Registration:** 2023/772319/07  
**Contact:** Victor Michelo · 079 996 2133 · victor@namayani.com

---

## What We Do

- Cross-border road freight (South Africa ↔ Zimbabwe and wider SADC)
- High-value and sensitive cargo (including Battery Energy Storage Systems, inverters, industrial equipment and project cargo)
- Full truckload (FTL) and dedicated loads
- Border clearing coordination and documentation support
- Real-time tracking, jamming mitigation and secure transit options
- Goods-in-Transit (GIT) insurance coordination for high-value and dangerous goods

---

## Core Corridor

**Primary route:**  
Randburg / Johannesburg → Beitbridge → Harare / Kadoma (and surrounds)

Additional SADC destinations available on request.

---

## Security & Risk Management

We take cargo security seriously, especially for high-value loads:

- Active GPS tracking on horse and trailer
- Jamming mitigation systems
- Portable concealed tracking devices (e.g. Global Defense Solutions)
- Professional independent armed escorts when required
- 24/7 tracking and recovery control room support
- Road carriers required to hold suitable cargo insurance up to the sum insured

---

## Insurance

We work with specialist underwriters for Goods-in-Transit cover on high-value and lithium/BESS cargo, including:

- Institute Cargo Clauses (A)
- Strikes and optional Sasria
- Cross-border SADC cover
- Clear excess structures for general claims and hijacking/theft

Freight costs can be included in the sum insured.

---

## Why Namayani Haulage

- Experience with high-value and specialised energy/project cargo
- Strong focus on security, tracking and deadline discipline
- Clear communication and proactive updates throughout the journey
- Partnership approach with clients, insurers and clearing agents
- We treat every shipping deadline as non-negotiable

---

## Getting a Quote

To request a quotation, please provide:

- Origin and destination
- Cargo description and value
- Approximate weight / volume
- Preferred collection and delivery dates
- Any special requirements (escorts, tracking, dangerous goods notes, etc.)

**Email:** victor@namayani.com  
**Phone / WhatsApp:** 079 996 2133

---

## Internal Operations

This repository holds operational documentation, processes and tools used by the Namayani Haulage team.

### MCP endpoint

The MCP route source is at [`app/api/mcp/route.ts`](./app/api/mcp/route.ts) and exposes the authenticated `roll_dice` tool over `GET` and `POST` at `/api/mcp` when deployed in a Next.js-compatible runtime. Set the Vercel environment variables `MCP_DEMO_TOKEN` to the bearer token expected by clients, `MCP_AUTH_SERVER_ISSUER` to the actual OAuth authorization-server issuer, and optionally `MCP_RESOURCE_URL` to the deployed MCP resource URL. Requests must include `Authorization: Bearer <token>` and receive the `read:dice` scope. The protected-resource metadata is served at `/.well-known/oauth-protected-resource`. The current public page is still a standalone static `index.html`; deploying these routes requires the Vercel project to use a Next.js build/runtime rather than static-only hosting.

### Workflow oversight

Operating documents (quote-to-invoice automation, control points, finance audit cadence, VOC inspection, and the operating model) are kept off this public site. Requests to `/docs` return HTTP 410.

Planned structure for private records only:

- `/insurance` – questionnaires, policy notes and claim procedures
- `/tracking` – tracking and security requirements
- `/slack-ops` – Slack control-plane channel structure and workflows (building, bots, prospecting, signups)
- VOC source documents – retain the supplied Form 6.6, completed RFC, and signed consent in the restricted customer/job record; do not commit them to this public repository

---

## Operations desk

Victor's command centre is at [/desk](/desk). It reads sanitized jobs from `ops/cases` through `GET /api/desk` and keeps device-only jobs and edits in the browser. `desk/shell.html` is the portable shell another program can open in a browser and extend. Customer personal data stays out of the desk. Lanes come from `desk/gates.js`: intake, compliance, inspection, dispatch, finance, and clear.

Dragging a card between lanes stores that placement on the device and still shows the gate status. Discard device edits returns the card to the gate lane.

### Add a connector

Copy [`desk/connectors/template.js`](desk/connectors/template.js), register one connector with `NamayaniDesk.defineConnector`, and add its script tag in `desk/index.html` before `app.js`. `resolve()` may read true/false flags on `ctx.env` only. Leave the connector paused until a live call is deliberate.

---

## License

Proprietary – Namayani Group (Pty) Ltd. All rights reserved.
