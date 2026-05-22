using FluentValidation;

namespace ImageToJsonOmatic.Api.Features.ConvertImage;

public class ConvertImageValidator : AbstractValidator<ConvertImageCommand>
{
    private static readonly string[] AllowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxFileSizeBytes = 20L * 1024 * 1024;

    public ConvertImageValidator()
    {
        RuleFor(x => x.Image)
            .NotNull().WithMessage("An image file is required.");

        RuleFor(x => x.Image.Length)
            .GreaterThan(0).WithMessage("The image file cannot be empty.")
            .LessThanOrEqualTo(MaxFileSizeBytes).WithMessage("The image file must be 20 MB or smaller.");

        RuleFor(x => x.Image.ContentType)
            .Must(ct => AllowedMimeTypes.Contains(ct))
            .WithMessage("Only JPEG, PNG, and WebP images are supported.");

        RuleFor(x => x.JobId)
            .NotEqual(Guid.Empty).WithMessage("JobId must be a valid GUID.");
    }
}
