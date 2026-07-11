import asyncio
from clip_factory.entrypoints.temporal.activities.transcription_activities import build_transcription_activity

def test_activity_maps_to_application_service():
    class Service:
        async def execute(self, command): return command
    activity = build_transcription_activity(Service())
    value = object()
    assert asyncio.run(activity(value)) is value
