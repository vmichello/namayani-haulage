/*
  Namayani Desk connector template.

  Copy this file, rename it, and register one connector. Then add a script
  tag in desk/index.html before app.js. Keep secrets on the server. The desk
  only receives true/false flags in ctx.env — never token values.

  NamayaniDesk.defineConnector({
    id: "example",
    name: "Example",
    purpose: "What this system does for a haulage job.",
    fields: [
      { key: "EXAMPLE_TOKEN", label: "Example token", secret: true },
    ],
    actions: ["Read something", "Never spend or delete without a separate confirm step"],
    resolve(ctx) {
      if (!ctx.env.EXAMPLE_TOKEN) {
        return { status: "needs_setup", detail: "Set EXAMPLE_TOKEN on the server." };
      }
      return { status: "paused", detail: "Token is present. Turn on the live call in resolve()." };
    },
  });
*/
(function (root) {
  const desk = (root.NamayaniDesk = root.NamayaniDesk || {});
  desk.connectors = desk.connectors || [];

  desk.defineConnector = function defineConnector(connector) {
    const required = ["id", "name", "purpose", "fields", "actions", "resolve"];
    for (const key of required) {
      if (connector == null || connector[key] == null) {
        throw new Error("Connector is missing " + key);
      }
    }
    if (typeof connector.resolve !== "function") {
      throw new Error("Connector " + connector.id + " resolve must be a function");
    }
    const existing = desk.connectors.findIndex((item) => item.id === connector.id);
    if (existing >= 0) desk.connectors.splice(existing, 1);
    desk.connectors.push(connector);
    return connector;
  };
})(globalThis);
