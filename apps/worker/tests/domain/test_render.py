from clip_factory.domain.render import RenderOutput, validate_render_output


def test_render_output_requires_vertical_h264_aac_mp4():
    output = RenderOutput(1080, 1920, "h264", "aac", "mp4", 1000)
    validate_render_output(output)
