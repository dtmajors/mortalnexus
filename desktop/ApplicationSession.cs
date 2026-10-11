namespace MortalNexusDesktop;

internal sealed record DesktopAuthenticationResult(AppSessionResult AppSession)
{
    internal static DesktopAuthenticationResult CreateLocal() => new(new AppSessionResult(
        true, false, null, string.Empty, DateTimeOffset.MaxValue,
        new AppAccount("local-user", string.Empty, "Community User", "local", false),
        null, new AppEntitlement("open-source", true, "community-release", null), string.Empty));
}

// Retain the UI payload shape; this is local application state, not authentication.
internal sealed record AppAccount(string Id, string Email, string DisplayName, string Role, bool CanEdit);
internal sealed record AppLicense(string Hint);
internal sealed record AppEntitlement(string Tier, bool Premium, string? Source, DateTimeOffset? TrialExpiresAt);
internal sealed record AppSessionResult(
    bool Success, bool Pending, string? Message, string SessionToken,
    DateTimeOffset ExpiresAt, AppAccount Account, AppLicense? License,
    AppEntitlement? Entitlement, string FirebaseToken)
{
    internal bool HasPremiumAccess => true;
}
