using ImageToJsonOmatic.Api.Features.ConvertImage;

namespace ImageToJsonOmatic.Api.Infrastructure.Extensions;

public static class WebApplicationExtensions
{
    public static WebApplication MapApiEndpoints(this WebApplication app)
    {
        app.MapConvertImageEndpoints();
        return app;
    }
}
