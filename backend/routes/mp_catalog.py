"""Health & Beauty at Home catalogue: main categories → subcategories → services (single central tree)."""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, UploadFile, File
from pydantic import BaseModel

from services import mp_common as mp
from routes.mp_core import _check_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mp", tags=["marketplace-catalog"])

IMG = "https://static.prod-images.emergentagent.com/jobs/2f1766f3-e034-4bae-a3c4-387aba77ef3d/images/"
HB_TREE = [
    ("Threading & Face Waxing", IMG + "5bfa6f6252acb776095f195a29a27e2a757103b9a3278eeb08778449d21f4000.jpeg",
     [("Eyebrow Threading", 79, 15, "women"), ("Upper Lip Threading", 49, 10, "women"),
      ("Full Face Threading", 249, 30, "women"), ("Face Waxing", 349, 30, "women")]),
    ("Massage & Body Care", IMG + "8863d1a408ef0e2bfe255f2793b3dd15e337f4b3b8394ebf18e5e431ee25c181.jpeg",
     [("Body Massage", 1299, 60, "unisex"), ("Head Massage", 399, 30, "unisex"),
      ("Foot Massage", 499, 30, "unisex"), ("Body Scrub", 999, 45, "unisex")]),
    ("Hair", IMG + "67f9881f3820516f03e98dfd4530bb78a959bd8b961d9edcc9ec682ff7fb5c57.jpeg",
     [("Haircut", 399, 45, "unisex"), ("Hair Styling", 699, 45, "women"), ("Hair Coloring", 1799, 90, "unisex"),
      ("Hair Spa", 999, 60, "unisex"), ("Hair Wash & Blow-Dry", 499, 40, "women")]),
    ("Waxing", IMG + "33924922da68b17d997f4f723513d51775355e1bbbfc553e9b6f9e42cdf1bf6b.jpeg",
     [("Full Arms", 349, 25, "women"), ("Half Arms", 199, 15, "women"), ("Full Legs", 499, 35, "women"),
      ("Half Legs", 299, 20, "women"), ("Underarms", 99, 10, "women"), ("Full Body Waxing", 1999, 120, "women")]),
    ("Cleanup", IMG + "cfd921843117e4f86fb6d4f58ce97c2f8b29f5ab64d5da141eac2181d024c89c.jpeg",
     [("Basic Cleanup", 499, 30, "unisex"), ("Deep Cleansing Cleanup", 799, 45, "unisex"),
      ("Hydrating Cleanup", 899, 45, "unisex")]),
    ("Facial", IMG + "5d3ca58249f3f3d9ac5d527c2950137b8e8e7700c4ca72fde5aa594a7058f84c.jpeg",
     [("Basic Facial", 799, 45, "unisex"), ("Hydrating Facial", 1199, 60, "unisex"),
      ("Anti-Aging Facial", 1699, 75, "unisex"), ("Gold Facial", 1499, 60, "women"), ("Premium Facial", 2299, 90, "unisex")]),
    ("Detan & Bleach", IMG + "e43ce57519f943b45648811663930b7228979e23880ff33cab768b6b07e77582.jpeg",
     [("Face Detan", 399, 25, "unisex"), ("Full Body Detan", 1499, 75, "unisex"), ("Face Bleach", 299, 20, "women")]),
    ("Manicure & Pedicure", IMG + "d1c2044b370d2339e4b5910ee5a9d5efdd73e0a3c62b6c9d9ad8a96d91c1f121.jpeg",
     [("Basic Manicure", 449, 30, "unisex"), ("Premium Manicure", 799, 45, "unisex"),
      ("Basic Pedicure", 549, 40, "unisex"), ("Premium Pedicure", 999, 55, "unisex")]),
    ("Styling & Gel Nails", IMG + "d0d0e125ba35560170e8c7efccd0720c6d14ae4cda6c1d2edffc8ef4b804374d.jpeg",
     [("Nail Art", 599, 45, "women"), ("Gel Polish", 699, 45, "women"),
      ("Gel Nail Extensions", 1499, 90, "women"), ("Nail Removal", 299, 20, "women")]),
]


async def seed_hb(db):
    """One-time migration to the 9-category Health & Beauty tree (admin-editable afterwards)."""
    cfg = await db.mp_config.find_one({"_id": "main"}) or {}
    if not cfg.get("doctor_all_first"):
        await db.mp_categories.update_many({"module": "doctor", "title": {"$in": ["View All", "All Dermatologists"]}},
                                           {"$set": {"order": -1, "title": "All Dermatologists"}})
        await db.mp_config.update_one({"_id": "main"}, {"$set": {"doctor_all_first": True}}, upsert=True)
    if cfg.get("hb_v1"):
        return
    await db.mp_categories.update_many({"module": "service"}, {"$set": {"active": False, "legacy": True}})
    await db.mp_services.update_many({"created_by": {"$exists": False}, "hb": {"$ne": True}}, {"$set": {"status": "archived"}})
    new_svcs = []
    for ci, (title, img, subs) in enumerate(HB_TREE):
        cat_id = mp.uid("cat")
        await db.mp_categories.insert_one({"cat_id": cat_id, "module": "service", "title": title, "image": img,
                                           "description": "", "order": ci, "active": True, "show_on_home": True,
                                           "show_in_onboarding": True, "created_at": mp.now()})
        for si, (name, price, dur, gender) in enumerate(subs):
            sub_id = mp.uid("sub")
            await db.mp_subcategories.insert_one({"sub_id": sub_id, "cat_id": cat_id, "title": name, "image": img,
                                                  "description": "", "order": si, "active": True, "created_at": mp.now()})
            sid = mp.uid("svc")
            doc = {"service_id": sid, "name": name, "category_id": cat_id, "category_title": title,
                   "subcategory_id": sub_id, "subcategory_title": name, "gender": gender, "hb": True,
                   "short_desc": f"Professional {name.lower()} at home by verified experts.",
                   "full_desc": f"{name} done at your home with hygienic, single-use kits by a verified Celesta Glow professional.",
                   "includes": ["Verified professional", "Sanitised single-use kit"], "excludes": [],
                   "duration_min": dur, "mode": "home", "price": price,
                   "price_range": {"min": int(price * 0.8), "max": int(price * 1.5)}, "commission_pct": 15.0,
                   "tax_pct": 18.0, "offer_eligible": True, "cancellation_policy": "Free cancellation up to 4 hours before the slot.",
                   "qualifications": [], "equipment": "", "prep": "", "aftercare": "", "warnings": "", "patch_test": False,
                   "materials_included": True, "locations": [], "age_restriction": "", "images": [img], "thumbnail": img,
                   "show_in_onboarding": True, "status": "active", "order": 0, "created_at": mp.now(), "updated_at": mp.now()}
            await db.mp_services.insert_one(doc)
            new_svcs.append(doc)
    await db.mp_partners.update_one({"applicant.email": "partner@sample.celestaglow.com"}, {"$push": {"services": {"$each": [
        {"service_id": s["service_id"], "service_name": s["name"], "mode": "home", "price": s["price"], "coverage": "",
         "qualifications": "", "approval_status": "approved"} for s in new_svcs]}}})
    await db.mp_config.update_one({"_id": "main"}, {"$set": {"hb_v1": True}}, upsert=True)
    logger.info(f"[mp] seeded Health & Beauty tree: {len(HB_TREE)} categories, {len(new_svcs)} services")


def Db():
    return mp.db()


async def _tree(context: str = "", admin: bool = False) -> List[Dict[str, Any]]:
    cq: Dict[str, Any] = {"module": "service"}
    if not admin:
        cq.update({"active": True, "legacy": {"$ne": True}})
        if context == "home":
            cq["show_on_home"] = {"$ne": False}
        if context == "onboarding":
            cq["show_in_onboarding"] = {"$ne": False}
    cats = await Db().mp_categories.find(cq, {"_id": 0}).sort("order", 1).to_list(100)
    subs = await Db().mp_subcategories.find({} if admin else {"active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    sq: Dict[str, Any] = {} if admin else {"status": "active"}
    if context == "onboarding":
        sq["show_in_onboarding"] = {"$ne": False}
    svcs = await Db().mp_services.find({**sq, "subcategory_id": {"$exists": True}},
                                       {"_id": 0, "commission_pct": 0}).sort("order", 1).to_list(2000)
    c = await mp.cfg()
    for s in svcs:
        if not admin and context != "onboarding":
            pv = mp.price_view(s.get("price"), c, s["service_id"])
            s.update({"price": pv["price"], "mrp": pv["mrp"], "discount_pct": pv["discount_pct"]})
    for cat in cats:
        cat["subcategories"] = [dict(sb, services=[s for s in svcs if s.get("subcategory_id") == sb["sub_id"]])
                                for sb in subs if sb["cat_id"] == cat["cat_id"]]
    return cats


@router.get("/catalog/tree")
async def catalog_tree(context: str = "home"):
    return await _tree(context)


@router.get("/admin/catalog/tree")
async def admin_catalog_tree(x_admin_token: str = Header(None)):
    await _check_admin(x_admin_token)
    return await _tree(admin=True)


class SubIn(BaseModel):
    cat_id: str
    title: str
    description: str = ""
    image: str = ""
    order: int = 0
    active: bool = True


@router.post("/admin/subcategories")
async def admin_create_sub(body: SubIn, x_admin_token: str = Header(None)):
    await _check_admin(x_admin_token)
    if not await Db().mp_categories.find_one({"cat_id": body.cat_id}):
        raise HTTPException(404, "Main category not found")
    doc = {"sub_id": mp.uid("sub"), **body.dict(), "created_at": mp.now()}
    await Db().mp_subcategories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/admin/subcategories/{sub_id}")
async def admin_update_sub(sub_id: str, body: Dict[str, Any], x_admin_token: str = Header(None)):
    await _check_admin(x_admin_token)
    upd = {k: v for k, v in body.items() if k in ("title", "description", "order", "active", "cat_id", "image")}
    res = await Db().mp_subcategories.update_one({"sub_id": sub_id}, {"$set": upd})
    if not res.matched_count:
        raise HTTPException(404, "Subcategory not found")
    if "title" in upd:
        await Db().mp_services.update_many({"subcategory_id": sub_id}, {"$set": {"subcategory_title": upd["title"]}})
    return {"success": True}


@router.delete("/admin/subcategories/{sub_id}")
async def admin_delete_sub(sub_id: str, x_admin_token: str = Header(None)):
    await _check_admin(x_admin_token)
    await Db().mp_subcategories.delete_one({"sub_id": sub_id})
    await Db().mp_services.update_many({"subcategory_id": sub_id}, {"$set": {"status": "archived"}})
    return {"success": True}


@router.post("/admin/subcategories/{sub_id}/image")
async def admin_sub_image(sub_id: str, file: UploadFile = File(...), x_admin_token: str = Header(None)):
    await _check_admin(x_admin_token)
    data = await file.read()
    if len(data) > 8 * 1024 * 1024 or not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Upload an image under 8MB")
    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    url = await mp.store_image(data, f"sub-{sub_id}-{mp.uid('i')[-4:]}", ext)
    await Db().mp_subcategories.update_one({"sub_id": sub_id}, {"$set": {"image": url}})
    return {"success": True, "url": url}


class HbServiceIn(BaseModel):
    subcategory_id: str
    name: str
    price: float
    duration_min: int = 60
    gender: str = "unisex"
    short_desc: str = ""
    status: str = "active"
    order: int = 0
    show_in_onboarding: bool = True


@router.post("/admin/hb/services")
async def admin_hb_create_service(body: HbServiceIn, x_admin_token: str = Header(None)):
    await _check_admin(x_admin_token)
    sub = await Db().mp_subcategories.find_one({"sub_id": body.subcategory_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Subcategory not found")
    cat = await Db().mp_categories.find_one({"cat_id": sub["cat_id"]}, {"_id": 0}) or {}
    img = sub.get("image") or cat.get("image") or ""
    doc = {"service_id": mp.uid("svc"), **body.dict(), "category_id": sub["cat_id"], "category_title": cat.get("title", ""),
           "subcategory_title": sub["title"], "hb": True, "full_desc": body.short_desc, "includes": [], "excludes": [],
           "mode": "home", "price_range": {"min": int(body.price * 0.8), "max": int(body.price * 1.5)},
           "images": [img] if img else [], "thumbnail": img, "created_at": mp.now(), "updated_at": mp.now()}
    await Db().mp_services.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/admin/hb/services/{service_id}")
async def admin_hb_update_service(service_id: str, body: Dict[str, Any], x_admin_token: str = Header(None)):
    await _check_admin(x_admin_token)
    allowed = ("name", "price", "duration_min", "gender", "short_desc", "full_desc", "status", "order",
               "show_in_onboarding", "subcategory_id")
    upd = {k: v for k, v in body.items() if k in allowed}
    if upd.get("status") and upd["status"] not in ("active", "inactive", "archived", "draft"):
        raise HTTPException(400, "Invalid status")
    if upd.get("gender") and upd["gender"] not in ("women", "men", "unisex"):
        raise HTTPException(400, "Invalid gender")
    if "subcategory_id" in upd:
        sub = await Db().mp_subcategories.find_one({"sub_id": upd["subcategory_id"]}, {"_id": 0})
        if not sub:
            raise HTTPException(404, "Subcategory not found")
        upd.update({"subcategory_title": sub["title"], "category_id": sub["cat_id"]})
    upd["updated_at"] = mp.now()
    res = await Db().mp_services.update_one({"service_id": service_id}, {"$set": upd})
    if not res.matched_count:
        raise HTTPException(404, "Service not found")
    if "name" in upd:
        await Db().mp_partners.update_many({"services.service_id": service_id},
                                           {"$set": {"services.$[s].service_name": upd["name"]}},
                                           array_filters=[{"s.service_id": service_id}])
    return {"success": True}


@router.delete("/admin/hb/services/{service_id}")
async def admin_hb_delete_service(service_id: str, x_admin_token: str = Header(None)):
    await _check_admin(x_admin_token)
    await Db().mp_services.update_one({"service_id": service_id}, {"$set": {"status": "archived", "updated_at": mp.now()}})
    return {"success": True}


@router.get("/admin/hb/partner-selections")
async def admin_partner_selections(x_admin_token: str = Header(None)):
    await _check_admin(x_admin_token)
    partners = await Db().mp_partners.find({}, {"_id": 0, "partner_id": 1, "applicant.name": 1, "applicant.business_name": 1,
                                                "application_status": 1, "services": 1, "staff": 1}).to_list(500)
    svc = {s["service_id"]: s for s in await Db().mp_services.find({}, {"_id": 0, "service_id": 1, "category_title": 1,
                                                                     "subcategory_title": 1, "gender": 1}).to_list(3000)}
    for p in partners:
        for s in p.get("services", []):
            meta = svc.get(s["service_id"], {})
            s.update({"category_title": meta.get("category_title", ""), "gender": meta.get("gender", "")})
    return partners
