"""Import the 4 anti-aging products, kit, certificates and homepage banners from celestaglow.com.
Images are downloaded into backend/uploads/live and URLs rewritten to /api/uploads/live/..."""
import asyncio, hashlib, json, os, re
from pathlib import Path
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
LIVE = "https://celestaglow.com/api"
OUT = ROOT / "uploads" / "live"
OUT.mkdir(parents=True, exist_ok=True)
URL_RE = re.compile(r'https://(?:res\.cloudinary\.com|customer-assets\.emergentagent\.com)[^"\s]+')
SLUGS = ["anti-aging-serum", "sunscreen", "anti-aging-cream", "under-eye-cream"]


def localize(url: str) -> str:
    ext = os.path.splitext(url.split("?")[0])[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    name = hashlib.md5(url.encode()).hexdigest()[:16] + ext
    dest = OUT / name
    if not dest.exists():
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        dest.write_bytes(r.content)
    return f"/api/uploads/live/{name}"


def rewrite(obj):
    s = json.dumps(obj)
    for u in set(URL_RE.findall(s)):
        try:
            s = s.replace(u, localize(u))
        except Exception as e:
            print("skip", u, e)
    return json.loads(s)


def get(path):
    r = requests.get(f"{LIVE}/{path}", timeout=60)
    r.raise_for_status()
    return r.json()


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    products = [rewrite(get(f"products/{s}")) for s in SLUGS]
    for p in products:
        p.pop("days_to_launch", None)
        await db.products.replace_one({"slug": p["slug"]}, p, upsert=True)
    await db.products.delete_many({"slug": {"$nin": SLUGS}})

    for c in rewrite(get("combos")):
        c.pop("days_to_launch", None)
        await db.combos.replace_one({"combo_id": c["combo_id"]}, c, upsert=True)

    settings = rewrite(get("site-settings"))
    await db.site_settings.replace_one({"_id": "main"}, {"_id": "main", **settings}, upsert=True)

    tb = rewrite(get("top-banner"))
    await db.admin_settings.update_one({"type": "top_banner"}, {"$set": {"type": "top_banner", **tb}}, upsert=True)
    nm = get("niche-mode")
    await db.admin_settings.update_one({"type": "niche_mode"}, {"$set": {"type": "niche_mode", **nm}}, upsert=True)

    ba = rewrite(get("before-after"))
    await db.before_after_images.delete_many({})
    if ba:
        await db.before_after_images.insert_many(ba)
    print("imported", len(products), "products, files:", len(list(OUT.iterdir())))


if __name__ == "__main__":
    asyncio.run(main())
