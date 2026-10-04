import { handleDiscoveryRequest } from "../../src/server/discoveryLogic";

// Netlify Functions classic handler signature — mirrors concierge.ts exactly.
// Both call the same handleDiscoveryRequest logic as the local Express route
// in server.ts, so there is only one implementation of Discovery to keep correct.
export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let requestBody: any;
  try {
    requestBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const result = await handleDiscoveryRequest(requestBody);

  return {
    statusCode: result.statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result.body),
  };
};
