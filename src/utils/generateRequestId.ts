// Shared human-readable reference-code generator. CarRequestModal,
// PrivateJetRequestModal, and MovingRequestModal each hardcode their own
// copy of this exact logic with a fixed prefix (EB-CAR-####, EB-JET-####,
// EB-MOVE-####) — Trip is the 4th consumer, and the point to stop
// duplicating it rather than adding a 4th copy.
export function generateRequestId(prefix: string): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `EB-${prefix}-${digits}`;
}
