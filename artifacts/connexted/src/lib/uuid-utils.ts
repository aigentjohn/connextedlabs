/**
 * Validates if a string is a valid UUID
 * @param id - The ID to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(id: string | undefined): boolean {
  if (!id) return false;
  if (id === 'undefined' || id === 'null') return false;
  
  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates UUID and returns it, or throws an error
 * @param id - The ID to validate
 * @param resourceName - Name of the resource for error message (e.g., "circle", "document")
 * @returns The validated UUID
 * @throws Error if invalid
 */
export function validateUUID(id: string | undefined, resourceName: string = 'resource'): string {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid ${resourceName} ID`);
  }
  return id!;
}
