import { handleConciergeRequest } from "../../src/server/conciergeLogic";

// Netlify Functions classic handler signature — event.body is the raw JSON
// string from the POST request. This is the production equivalent of the
// Express route in server.ts; both call the exact same handleConciergeRequest
// logic so there is only one implementation of the concierge to keep correct.
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

  const result = await handleConciergeRequest(requestBody);

  return {
    statusCode: result.statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result.body),
  };
};
