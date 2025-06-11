export function getAuthToken(): string | null {
  return localStorage.getItem('authToken'); // Change key if your token uses a different name
} 