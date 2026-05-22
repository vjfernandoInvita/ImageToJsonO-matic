using System.Text.Json;
using System.Text.Json.Serialization;

namespace ImageToJsonOmatic.Api.Infrastructure.AgentClient;

public record AgentRunResponse(
    [property: JsonPropertyName("job_id")] string JobId,
    [property: JsonPropertyName("result")] JsonElement? Result,
    [property: JsonPropertyName("error")] string? Error
);
