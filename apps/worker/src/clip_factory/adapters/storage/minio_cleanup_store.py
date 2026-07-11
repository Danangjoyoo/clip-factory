class MinioCleanupStore:
    def __init__(self, client: object, bucket: str) -> None:
        self.client, self.bucket = client, bucket

    async def abort_multipart(self, upload_id: str) -> None:
        return None

    async def delete_project_temporary(self, project_id: str, keys: list[str]) -> None:
        for key in keys:
            if key.startswith(f"projects/{project_id}/tmp/"):
                self.client.remove_object(self.bucket, key)
