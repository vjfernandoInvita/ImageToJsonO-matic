export type ConversionResponse = {
  jobId: string;
  status: 'completed' | 'failed';
  result: Record<string, unknown>;
  error: string | null;
};

export async function convertImage(formData: FormData): Promise<ConversionResponse> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/conversions`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Do NOT set Content-Type — browser/fetch must auto-generate multipart boundary
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      // Network-level failure
      throw new Error('Network error. Check your connection and try again.');
    }

    if (!response.ok) {
      let detail: string | undefined;
      let title: string | undefined;
      try {
        const problem = await response.json();
        detail = problem.detail as string | undefined;
        title = problem.title as string | undefined;
      } catch {
        // Response body was not valid JSON — fall through to generic message
      }
      throw new Error(detail ?? title ?? 'Request failed');
    }

    const data = (await response.json()) as ConversionResponse;
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}
