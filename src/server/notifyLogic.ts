// Sends booking/request notification emails via Resend, server-side.
//
// Why this exists: the site used to have every customer's own browser call
// FormSubmit/Web3Forms directly. That made delivery depend on that specific
// device's network, privacy settings, and carrier — proven unreliable in
// practice (FormSubmit returns a hard 500 for this business's address no
// matter what; Web3Forms explicitly refuses server-side calls on the free
// plan and isn't consistently reachable from some mobile browsers/carriers).
// Routing through this one server-side endpoint means every notification
// goes out from the same reliable connection every time, regardless of
// which customer device submitted the form.
//
// Sandbox limitation: on Resend's free/unverified-domain tier, mail can only
// be sent to the address that owns the Resend account. That address happens
// to already be the business's real notification inbox, so this isn't a
// practical limitation today — but it does mean this endpoint always sends
// to ELITE_NOTIFICATION_EMAIL below, not a per-browser custom address.
// Verifying a domain on resend.com/domains would lift that restriction.

const ELITE_NOTIFICATION_EMAIL = "elitebooking.ng@gmail.com";
const RESEND_FROM = "Elite Booking <onboarding@resend.dev>";

export interface NotifyHandlerResult {
  statusCode: number;
  body: Record<string, unknown>;
}

export async function handleNotifyRequest(requestBody: any): Promise<NotifyHandlerResult> {
  try {
    const { subject, text } = requestBody || {};
    if (!subject || typeof subject !== "string" || !text || typeof text !== "string") {
      return { statusCode: 400, body: { error: "subject and text are required." } };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not configured — notification not sent.");
      return { statusCode: 200, body: { sent: false, reason: "not_configured" } };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [ELITE_NOTIFICATION_EMAIL],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("Resend notification send failed:", res.status, errBody);
      return { statusCode: 200, body: { sent: false, reason: "provider_error", status: res.status } };
    }

    return { statusCode: 200, body: { sent: true } };
  } catch (error: any) {
    // A notification failure must never surface as a booking failure —
    // the booking itself is already saved by the time this is called.
    console.error("Error in notify endpoint:", error);
    return { statusCode: 200, body: { sent: false, reason: "exception" } };
  }
}
