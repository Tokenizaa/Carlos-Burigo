export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push('A senha deve ter pelo menos 8 caracteres.');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
