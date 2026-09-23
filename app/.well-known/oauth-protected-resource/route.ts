import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

const authServerIssuer = process.env.MCP_AUTH_SERVER_ISSUER;
const resourceUrl =
  process.env.MCP_RESOURCE_URL ??
  "https://my-mcp-server.vercel.app/api/mcp";

if (!authServerIssuer) {
  throw new Error(
    "MCP_AUTH_SERVER_ISSUER must be configured for the protected-resource metadata route",
  );
}

const handler = protectedResourceHandler({
  authServerUrls: [authServerIssuer],
  resourceUrl,
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
