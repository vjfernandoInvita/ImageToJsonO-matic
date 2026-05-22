using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ImageToJsonOmatic.Api.Features.ConvertImage;

public static class ConvertImageEndpoints
{
    public static IEndpointRouteBuilder MapConvertImageEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/conversions", async (
            [FromForm] IFormFile image,
            IMediator mediator,
            CancellationToken ct) =>
        {
            var command = new ConvertImageCommand(image, Guid.NewGuid());
            var result = await mediator.Send(command, ct);
            return Results.Ok(result);
        })
        .WithName("ConvertImage")
        .WithTags("Conversions")
        .DisableAntiforgery()
        .Accepts<IFormFile>("multipart/form-data")
        .Produces<ConvertImageResponse>(200)
        .ProducesValidationProblem(400)
        .ProducesProblem(502)
        .ProducesProblem(504);

        app.MapGet("/conversions/{id:guid}", (Guid id) =>
            Results.Problem(
                statusCode: 501,
                title: "Not Implemented",
                detail: "Job history polling will be available in Cycle 4."))
        .WithName("GetConversion")
        .WithTags("Conversions")
        .ProducesProblem(501);

        return app;
    }
}
