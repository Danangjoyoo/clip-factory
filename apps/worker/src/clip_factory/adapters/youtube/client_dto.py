from pydantic import BaseModel, ConfigDict, Field, SecretStr


class GoogleTokenClientDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_token: SecretStr
    expires_in: int
    refresh_token: SecretStr | None = None
    refresh_token_expires_in: int | None = None
    scope: str
    token_type: str


class GoogleChannelSnippetClientDto(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    title: str
    custom_url: str | None = Field(default=None, alias="customUrl")
    thumbnails: dict[str, dict[str, str | int]]


class GoogleChannelClientDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    snippet: GoogleChannelSnippetClientDto


class GoogleChannelsListClientDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[GoogleChannelClientDto]
