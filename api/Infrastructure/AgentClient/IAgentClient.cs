namespace ImageToJsonOmatic.Api.Infrastructure.AgentClient;

public interface IAgentClient
{
    Task<AgentRunResponse> RunAsync(string imagePath, string jobId, CancellationToken ct);
}
