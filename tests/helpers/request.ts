export async function jsonBody(response: Response): Promise<any> {
  return response.json();
}

export function jsonRequest(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
