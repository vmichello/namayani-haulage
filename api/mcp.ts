import { authHandler } from "../lib/mcp-handler";
import { sendWebResponse, toWebRequest } from "../lib/vercel-http";

export default async function mcp(req: Parameters<typeof toWebRequest>[0], res: Parameters<typeof sendWebResponse>[1]) {
  const response = await authHandler(await toWebRequest(req));
  await sendWebResponse(response, res);
}
