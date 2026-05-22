using System.Net.Http.Json;

namespace ImageToJsonOmatic.Api.Infrastructure.AgentClient;

public class AgentClient(HttpClient httpClient) : IAgentClient
{
    public async Task<AgentRunResponse> RunAsync(string imagePath, string jobId, CancellationToken ct)
    {
        var payload = new { image_path = imagePath, job_id = jobId };
        var response = await httpClient.PostAsJsonAsync("/run", payload, ct);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<AgentRunResponse>(ct);
        return result ?? throw new InvalidOperationException("Agent returned an empty response.");
    }
}
