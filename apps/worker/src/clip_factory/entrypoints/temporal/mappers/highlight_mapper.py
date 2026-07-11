from clip_factory.domain.highlight import HighlightCandidate


def highlight_to_dict(candidate: HighlightCandidate) -> dict[str, object]:
    return {
        "startMs": candidate.start_ms,
        "endMs": candidate.end_ms,
        "title": candidate.title,
        "rationale": candidate.rationale,
        "rank": candidate.rank,
        "overallScore": candidate.overall_score,
        "scores": {
            "hook": candidate.scores.hook,
            "coherence": candidate.scores.coherence,
            "payoff": candidate.scores.payoff,
            "novelty": candidate.scores.novelty,
            "energy": candidate.scores.energy,
            "instructionFit": candidate.scores.instruction_fit,
            "boundaryQuality": candidate.scores.boundary_quality,
        },
    }
