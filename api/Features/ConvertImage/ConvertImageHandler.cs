using ImageToJsonOmatic.Api.Infrastructure.AgentClient;
using MediatR;

namespace ImageToJsonOmatic.Api.Features.ConvertImage;

public class ConvertImageHandler(IAgentClient agentClient) : IRequestHandler<ConvertImageCommand, ConvertImageResponse>
{
    public async Task<ConvertImageResponse> Handle(ConvertImageCommand request, CancellationToken ct)
    {
        var ext = Path.GetExtension(request.Image.FileName);
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";
        var tempPath = Path.Combine(Path.GetTempPath(), $"{request.JobId}{ext}");

        try
        {
            await using var fs = File.Create(tempPath);
            await request.Image.OpenReadStream().CopyToAsync(fs, ct);
        }
        catch
        {
            if (File.Exists(tempPath)) File.Delete(tempPath);
            throw;
        }

        try
        {
            var agentResponse = await agentClient.RunAsync(tempPath, request.JobId.ToString(), ct);

            if (agentResponse.Error is not null)
                return new ConvertImageResponse(request.JobId, "failed", null, agentResponse.Error);

            return new ConvertImageResponse(request.JobId, "completed", agentResponse.Result, null);
        }
        finally
        {
            if (File.Exists(tempPath)) File.Delete(tempPath);
        }
    }
}
