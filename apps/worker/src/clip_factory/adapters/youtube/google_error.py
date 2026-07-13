class GoogleOAuthError(RuntimeError):
    pass


class GoogleNetworkError(GoogleOAuthError):
    pass


class MissingOAuthScopeError(GoogleOAuthError):
    pass


class OAuthConsentDeniedError(GoogleOAuthError):
    pass


class ConnectedChannelNotFoundError(GoogleOAuthError):
    pass


class GoogleWorkspacePolicyError(GoogleOAuthError):
    pass


class ReauthRequiredError(GoogleOAuthError):
    pass
