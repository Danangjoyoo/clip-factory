"""Small CLI probe assertion used by the synthetic media suite."""
import json
import subprocess
import sys
from pathlib import Path


def probe(path: Path) -> dict[str, object]:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    )
    return json.loads(result.stdout)


if __name__ == "__main__":
    payload = probe(Path(sys.argv[1]))
    print(json.dumps(payload, indent=2))
