using Microsoft.EntityFrameworkCore;

namespace ImageToJsonOmatic.Api.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // No entities in Cycle 3 — shell ready for Cycle 4
}
