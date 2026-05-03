// Swap this function body when a paid rego API (e.g. Redbook) becomes available.
// Should return { vin: string } on success, null on miss.
export async function brokerLookup(
  _rego: string,
  _state: string,
): Promise<{ vin: string } | null> {
  return null;
}
