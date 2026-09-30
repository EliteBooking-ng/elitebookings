import { handleNotifyRequest } from "../../src/server/notifyLogic";

// Netlify Functions classic handler signature — mirrors concierge.ts/discovery.ts.
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

  const result = await handleNotifyRequest(requestBody);

  return {
    statusCode: result.statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result.body),
  };
};
