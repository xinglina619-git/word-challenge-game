from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "word-spirit-sheet-v2-clean.png"
FRAME = 256
GUTTER = 8
ROWS = {"fly": 0, "surprise": 1, "cheer": 2, "victory": 3}

def clean_components(frame):
    rgba = frame.load()
    for y in range(FRAME):
        for x in range(FRAME):
            red, green, blue, alpha_value = rgba[x, y]
            if alpha_value and green > 45 and green > red * 1.05 and green > blue * 1.35:
                rgba[x, y] = (0, 0, 0, 0)
    alpha = frame.getchannel("A")
    pixels = alpha.load()
    visited = set()
    components = []
    for y in range(FRAME):
        for x in range(FRAME):
            if pixels[x, y] < 18 or (x, y) in visited:
                continue
            stack = [(x, y)]
            visited.add((x, y))
            points = []
            while stack:
                px, py = stack.pop()
                points.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < FRAME and 0 <= ny < FRAME and pixels[nx, ny] >= 18 and (nx, ny) not in visited:
                        visited.add((nx, ny))
                        stack.append((nx, ny))
            components.append(points)
    if not components:
        return frame
    components.sort(key=len, reverse=True)
    keep = set(components[0])
    for points in components[1:]:
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        center_x = (min(xs) + max(xs)) / 2
        center_y = (min(ys) + max(ys)) / 2
        if len(points) >= 300 and FRAME * .18 <= center_x <= FRAME * .82 and FRAME * .05 <= center_y <= FRAME * .95:
            keep.update(points)
    cleaned = frame.copy()
    cleaned_alpha = cleaned.getchannel("A")
    cleaned_pixels = cleaned_alpha.load()
    for y in range(FRAME):
        for x in range(FRAME):
            if (x, y) not in keep:
                cleaned_pixels[x, y] = 0
    cleaned.putalpha(cleaned_alpha)
    return cleaned

sheet = Image.open(SOURCE).convert("RGBA")
for name, row in ROWS.items():
    strip = Image.new("RGBA", ((FRAME + GUTTER) * 6, FRAME + GUTTER), (0, 0, 0, 0))
    for column in range(6):
        frame = sheet.crop((column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME))
        frame = clean_components(frame)
        strip.alpha_composite(frame, (column * (FRAME + GUTTER) + GUTTER // 2, GUTTER // 2))
    strip.save(ROOT / "assets" / f"word-spirit-{name}-strip-v3.png")

print("WORD_SPIRIT_STRIPS=PASS")
