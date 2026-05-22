using FluentValidation;
using AgentClientService = ImageToJsonOmatic.Api.Infrastructure.AgentClient.AgentClient;
using ImageToJsonOmatic.Api.Infrastructure.AgentClient;
using ImageToJsonOmatic.Api.Infrastructure.Middleware;
using ImageToJsonOmatic.Api.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;

namespace ImageToJsonOmatic.Api.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssemblyContaining<Program>());

        services.AddValidatorsFromAssemblyContaining<Program>();

        // ValidationBehavior must run before other pipeline behaviors
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(
                configuration["DB_CONNECTION_STRING"] ?? "Data Source=conversions.db"));

        var agentBaseUrl = configuration["AGENT_BASE_URL"]
            ?? throw new InvalidOperationException(
                "AGENT_BASE_URL is required. Set it in environment variables or appsettings.");

        services.AddHttpClient<IAgentClient, AgentClientService>(client =>
        {
            client.BaseAddress = new Uri(agentBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(85);
        });

        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();

        services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = 20L * 1024 * 1024 + 1024;
        });

        return services;
    }
}
