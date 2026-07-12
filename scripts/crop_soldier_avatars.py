from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "soldier-avatar-sheet.png"
OUTPUTS = {
    "soldier-boy-hat.png": (0, 0),
    "soldier-boy-hair.png": (1, 0),
    "soldier-girl-hat.png": (0, 1),
    "soldier-girl-hair.png": (1, 1),
}


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    cell_width = image.width // 2
    cell_height = image.height // 2

    for filename, (column, row) in OUTPUTS.items():
        crop = image.crop(
            (
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            )
        )
        alpha_box = crop.getchannel("A").getbbox()
        if alpha_box:
            crop = crop.crop(alpha_box)
        canvas = Image.new("RGBA", (640, 640), (0, 0, 0, 0))
        crop.thumbnail((590, 590), Image.Resampling.LANCZOS)
        canvas.alpha_composite(
            crop,
            ((canvas.width - crop.width) // 2, (canvas.height - crop.height) // 2),
        )
        canvas.save(ROOT / "assets" / filename, optimize=True)


if __name__ == "__main__":
    main()
