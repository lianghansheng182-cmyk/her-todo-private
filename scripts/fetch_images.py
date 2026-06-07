from __future__ import annotations

import io
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "public" / "images"
USER_AGENT = "Mozilla/5.0 HerTodoImageFetcher/2.0"

TARGETS = [
    {
        "filename": "karry.jpg",
        "search_keywords": [
            "王俊凯 KarryWang工作室 高清 写真",
            "王俊凯 蓝色 写真 高清",
            "王俊凯 官方 写真 高清",
            "王俊凯 工作室 原图",
        ],
        "candidates": [
            {
                "url": "https://haowallpaper.com/link/common/file/previewFileImg/18093063849168256",
                "source_page": "https://haowallpaper.com/homeViewLook/18093070736543104",
                "title": "2k王俊凯壁纸｜蓝色衬衫",
            },
            {
                "url": "https://n.sinaimg.cn/sinakd10102/600/w1920h1080/20210106/5207-kherpxy0572613.jpg",
                "source_page": "https://k.sina.cn/article_7068101418_p1a54aab2a00100vra7.html?subch=star",
                "title": "王俊凯高清写真候选",
            },
        ],
        "placeholder_title": "Karry",
        "placeholder_subtitle": "今天也要闪闪发光",
        "palette": ("#061733", "#1769c9", "#d8ecff"),
    },
    {
        "filename": "lulu.jpg",
        "search_keywords": [
            "水豚噜噜 官方",
            "小水豚噜噜",
            "水豚噜噜 表情包",
            "水豚噜噜 头像",
            "水豚噜噜 生日",
            "水豚噜噜 高清",
        ],
        "candidates": [
            {
                "url": "https://cdn2.cdnstep.com/YZb6bGuOSWWK88UMIN5N/0.webp",
                "source_page": "https://www.sigstick.com/pack/YZb6bGuOSWWK88UMIN5N-%E6%B0%B4%E8%B1%9A%E5%99%9C%E5%99%9C%E8%A1%A8%E6%83%85%E5%8C%85-%40shuitunlulu999-%E2%9D%A4%EF%B8%8F",
                "title": "水豚噜噜表情包头像候选",
            },
            {
                "url": "https://cdn2.cdnstep.com/YZb6bGuOSWWK88UMIN5N/4.webp",
                "source_page": "https://www.sigstick.com/pack/YZb6bGuOSWWK88UMIN5N-%E6%B0%B4%E8%B1%9A%E5%99%9C%E5%99%9C%E8%A1%A8%E6%83%85%E5%8C%85-%40shuitunlulu999-%E2%9D%A4%EF%B8%8F",
                "title": "水豚噜噜表情包候选",
            },
        ],
        "placeholder_title": "Lulu",
        "placeholder_subtitle": "噜噜陪你慢慢完成",
        "palette": ("#fff7e8", "#ffc66d", "#5a3c2e"),
    },
    {
        "filename": "lulu-2.jpg",
        "search_keywords": [
            "水豚噜噜 表情包",
            "水豚噜噜 头像",
            "水豚噜噜 高清",
        ],
        "candidates": [
            {
                "url": "https://cdn2.cdnstep.com/YZb6bGuOSWWK88UMIN5N/4.webp",
                "source_page": "https://www.sigstick.com/pack/YZb6bGuOSWWK88UMIN5N-%E6%B0%B4%E8%B1%9A%E5%99%9C%E5%99%9C%E8%A1%A8%E6%83%85%E5%8C%85-%40shuitunlulu999-%E2%9D%A4%EF%B8%8F",
                "title": "水豚噜噜站立表情候选",
            },
            {
                "url": "https://cdn2.cdnstep.com/YZb6bGuOSWWK88UMIN5N/1.webp",
                "source_page": "https://www.sigstick.com/pack/YZb6bGuOSWWK88UMIN5N-%E6%B0%B4%E8%B1%9A%E5%99%9C%E5%99%9C%E8%A1%A8%E6%83%85%E5%8C%85-%40shuitunlulu999-%E2%9D%A4%EF%B8%8F",
                "title": "水豚噜噜街景表情候选",
            },
        ],
        "placeholder_title": "Lulu",
        "placeholder_subtitle": "先喝口水，再继续吧",
        "palette": ("#e9f7e8", "#ffc66d", "#5a3c2e"),
    },
]


def download_bytes(url: str, source_page: str | None = None) -> bytes:
    headers = {"User-Agent": USER_AGENT}
    if source_page:
        parsed = urllib.parse.urlparse(source_page)
        headers["Referer"] = f"{parsed.scheme}://{parsed.netloc}/"

    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=25) as response:
        content_type = response.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            raise ValueError(f"Not an image: {content_type}")
        return response.read()


def save_web_image(image_bytes: bytes, output_path: Path) -> tuple[int, int]:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    width, height = image.size

    if width < 480 or height < 480:
        raise ValueError(f"Image is too small: {width}x{height}")

    aspect_ratio = width / height
    if aspect_ratio < 0.55 or aspect_ratio > 2.25:
        raise ValueError(f"Image aspect ratio is not suitable: {width}x{height}")

    max_width = 800
    if image.width > max_width:
        next_height = round(image.height * (max_width / image.width))
        image = image.resize((max_width, next_height), Image.LANCZOS)

    image.save(output_path, "JPEG", quality=90, optimize=True, progressive=True)
    return image.size


def get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_candidates = [
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]

    for font_path in font_candidates:
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size)

    return ImageFont.load_default()


def draw_gradient(draw: ImageDraw.ImageDraw, width: int, height: int, start: str, end: str) -> None:
    start_rgb = tuple(int(start[index : index + 2], 16) for index in (1, 3, 5))
    end_rgb = tuple(int(end[index : index + 2], 16) for index in (1, 3, 5))

    for y in range(height):
        ratio = y / height
        color = tuple(
            round(start_rgb[index] * (1 - ratio) + end_rgb[index] * ratio)
            for index in range(3)
        )
        draw.line([(0, y), (width, y)], fill=color)


def create_placeholder(target: dict, output_path: Path) -> tuple[int, int]:
    width, height = 800, 800
    background, accent, text_color = target["palette"]
    image = Image.new("RGB", (width, height), background)
    draw = ImageDraw.Draw(image)
    draw_gradient(draw, width, height, background, accent)

    if target["filename"].startswith("lulu"):
        draw.ellipse((240, 190, 560, 545), fill="#ffd35b")
        draw.ellipse((285, 148, 360, 230), fill="#f0a93e")
        draw.ellipse((440, 148, 515, 230), fill="#f0a93e")
        draw.ellipse((318, 315, 342, 340), fill="#2f2018")
        draw.ellipse((458, 315, 482, 340), fill="#2f2018")
        draw.ellipse((355, 395, 445, 455), fill="#e88343")
        draw.ellipse((300, 560, 360, 625), fill="#ffd35b")
        draw.ellipse((440, 560, 500, 625), fill="#ffd35b")
    else:
        for point in [(590, 130), (680, 240), (545, 430), (690, 570)]:
            x, y = point
            draw.polygon(
                [(x, y - 22), (x + 22, y), (x, y + 22), (x - 22, y)],
                fill="#d8ecff",
            )
        draw.rounded_rectangle((500, 170, 700, 590), radius=44, outline="#d8ecff", width=5)

    draw.text((70, 92), target["placeholder_title"], fill=text_color, font=get_font(76))
    draw.text((74, 190), target["placeholder_subtitle"], fill=text_color, font=get_font(30))
    draw.text((74, 245), "请手动替换为更喜欢的本地图片", fill=text_color, font=get_font(22))
    image.save(output_path, "JPEG", quality=90, optimize=True, progressive=True)
    return image.size


def prepare_image(target: dict) -> dict:
    output_path = IMAGE_DIR / target["filename"]

    print(f"\nTarget: {target['filename']}")
    print("Search keywords:")
    for keyword in target["search_keywords"]:
        print(f"  - {keyword}")

    for candidate in target["candidates"]:
        try:
            print(f"Trying: {candidate['title']}")
            image_bytes = download_bytes(candidate["url"], candidate.get("source_page"))
            size = save_web_image(image_bytes, output_path)
            return {
                "file": target["filename"],
                "status": "downloaded",
                "size": size,
                "source": candidate["url"],
                "source_page": candidate.get("source_page"),
                "title": candidate["title"],
            }
        except Exception as error:
            print(f"Skipped: {error}")
            time.sleep(0.5)

    print(f"Using generated placeholder for {target['filename']}")
    size = create_placeholder(target, output_path)
    return {
        "file": target["filename"],
        "status": "placeholder",
        "size": size,
        "source": None,
        "source_page": None,
    }


def main() -> int:
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    for target in TARGETS:
        old_file = IMAGE_DIR / target["filename"]
        if old_file.exists():
            old_file.unlink()

    results = [prepare_image(target) for target in TARGETS]
    (IMAGE_DIR / "image-sources.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    missing_files = [
        target["filename"]
        for target in TARGETS
        if not (IMAGE_DIR / target["filename"]).exists()
    ]

    if missing_files:
        print(f"Missing files: {', '.join(missing_files)}")
        return 1

    print("\nDone. Files are ready in public/images/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
