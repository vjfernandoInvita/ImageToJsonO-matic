using MediatR;
using Microsoft.AspNetCore.Http;

namespace ImageToJsonOmatic.Api.Features.ConvertImage;

public record ConvertImageCommand(IFormFile Image, Guid JobId) : IRequest<ConvertImageResponse>;
