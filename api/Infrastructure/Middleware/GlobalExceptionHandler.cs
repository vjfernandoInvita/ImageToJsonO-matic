using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ImageToJsonOmatic.Api.Infrastructure.Middleware;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken ct)
    {
        logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);

        var (statusCode, title, detail) = exception switch
        {
            HttpRequestException { InnerException: TaskCanceledException } =>
                (504, "Gateway Timeout", "The agent did not respond within the allowed time."),
            HttpRequestException httpEx =>
                (502, "Bad Gateway", $"Could not reach the agent service: {httpEx.Message}"),
            ValidationException validationEx =>
                (400, "Validation Failed", validationEx.Message),
            _ =>
                (500, "Internal Server Error", "An unexpected error occurred.")
        };

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Extensions = { ["traceId"] = context.TraceIdentifier }
        };

        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(problemDetails, ct);
        return true;
    }
}
