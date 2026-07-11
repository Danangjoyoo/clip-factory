from clip_factory.adapters.media.encoder_probe import EncoderProbe


def test_encoder_probe_prefers_videotoolbox_only_when_capable():
    probe = EncoderProbe(lambda _: True)
    assert probe.select() == "VIDEOTOOLBOX"


def test_encoder_probe_falls_back_to_software():
    assert EncoderProbe(lambda _: False).select() == "SOFTWARE"
