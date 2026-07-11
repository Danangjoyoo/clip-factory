import pytest
from clip_factory.domain.progress import Progress

def test_progress_validates_units() -> None:
    assert Progress(1, 2, 'ITEMS').total_units == 2
    with pytest.raises(ValueError, match='INVALID_WORK_UNITS'):
        Progress(3, 2, 'ITEMS')
