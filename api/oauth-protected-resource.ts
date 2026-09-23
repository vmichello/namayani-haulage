import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { sendWebResponse, toWebRequest } from "../lib/vercel-http";

const authServerIssuer = process.env.MCP_AUTH_SERVER_ISSUER;
const resourceUrl =
  process.env.MCP_RESOURCE_URL ??
  "https://namayani-haulage.vercel.app/api/mcp";

export default async function metadata(
  req: Parameters<typeof toWebRequest>[0],
  res: Parameters<typeof sendWebResponse>[1],
) {
  if (req.method?.toUpperCase() === "OPTIONS") {
    await sendWebResponse(metadataCorsOptionsRequestHandler()(), res);
    return;
  }

  if (!authServerIssuer) {
    res.status(503).send("MCP_AUTH_SERVER_ISSUER is not configured");
    return;
  }

  const handler = protectedResourceHandler({
    authServerUrls: [authServerIssuer],
    resourceUrl,
  });
  await sendWebResponse(handler(await toWebRequest(req)), res);
}
