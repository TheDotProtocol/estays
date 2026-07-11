/** Strip an existing E Stays prefix so partners only enter their property name. */
export function stripPropertyNamePrefix(name: string): string {
  return name.replace(/^E\s*Stays\s+/i, '').trim();
}

/** Apply the uniform E Stays brand prefix to a property name. */
export function brandPropertyName(name: string): string {
  const base = stripPropertyNamePrefix(name);
  if (!base) return '';
  return `E Stays ${base.replace(/^The /i, '')}`;
}
