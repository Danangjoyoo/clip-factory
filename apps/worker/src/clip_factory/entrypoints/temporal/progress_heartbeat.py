from clip_factory.ports.progress import ActivityProgressReporter, ProgressReporter

def progress_reporter(activity: object) -> ProgressReporter:
    return ActivityProgressReporter(activity)
