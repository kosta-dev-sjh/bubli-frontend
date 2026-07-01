export function withWidgetDevAuthHeaders(headers?: HeadersInit): HeadersInit {
  const next = new Headers(headers);
  const token = process.env.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN;

  if (token && !next.has("Authorization")) {
    next.set("Authorization", `Bearer ${token}`);
  }

  return next;
}
