// Shared Composio client. The API key travels in the x-api-key header; in environments where a
// proxy injects that header (API credentials), COMPOSIO_API_KEY can stay unset and a placeholder
// satisfies the SDK's local check — the proxy overwrites it before the request leaves.
import { Composio } from '@composio/core';

export const userId = process.env.COMPOSIO_USER_ID ?? 'default';
export const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY || 'injected-by-proxy',
});
