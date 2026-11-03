export const API = import.meta.env.VITE_API_URL || "http://localhost:5001";
export async function api(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
) {
  const token = sessionStorage.getItem("inmobiliaria.token");
  const response = await fetch(`${API}/api${path}`, {
    method,
    signal,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    if (response.status === 401 && token)
      window.dispatchEvent(new Event("sesion-expirada"));
    const datos = await response.json().catch(() => null);
    throw new Error(
      datos?.error?.message || "No se pudo completar la solicitud",
    );
  }
  return {
    data: response.status === 204 ? null : await response.json(),
    total: Number(response.headers.get("X-Total-Count") || 0),
    more: response.headers.get("X-Has-More") === "true",
  };
}
