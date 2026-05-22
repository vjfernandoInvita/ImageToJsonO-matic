using System.Text.Json;
using System.Text.Json.Serialization;

namespace ImageToJsonOmatic.Api.Features.ConvertImage;

public record ConvertImageResponse(
    [property: JsonPropertyName("jobId")] Guid JobId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("result")] JsonElement? Result,
    [property: JsonPropertyName("error")] string? Error
);
