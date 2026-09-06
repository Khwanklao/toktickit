/**
 * Ticket Number Generator (BR-01, AC-01)
 * Official Ticket Number format: TKT-YYYY-XXXXXX
 * e.g., TKT-2026-000101
 */
export function generateTicketNumber(sequenceNumber: number, date: Date = new Date()): string {
  if (sequenceNumber < 1) {
    throw new Error('Sequence number must be a positive integer');
  }
  const year = date.getFullYear();
  const paddedSequence = String(sequenceNumber).padStart(6, '0');
  return `TKT-${year}-${paddedSequence}`;
}
