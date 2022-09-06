import yaml

with open("assets/image-rules.yaml", encoding="utf-8", errors="ignore") as rules_file:
    _ruleset = next(yaml.safe_load_all(rules_file.read()))

__all__ = [
    "GIF_RULES",
    "IMAGE_RULES",
]

# these are what should be imported by other scripts
IMAGE_RULES = _ruleset["image"]
GIF_RULES = _ruleset["gif"]
