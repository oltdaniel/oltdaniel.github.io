import re
import shutil
import os
from datetime import datetime
from pathlib import Path

def slugify(title):
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')

def ensure_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)

def format_date(date_obj):
    return date_obj.strftime('%Y-%m-%d')

def apply_permalink(template, meta):
    dt = meta.get("date") or datetime.now()

    replacements = {
        ":year": dt.strftime("%Y"),
        ":month": dt.strftime("%m"),
        ":day": dt.strftime("%d"),
        ":title": slugify(meta.get("title", "")),
        ":slug": slugify(meta.get("slug", "")),
        ":output_ext": meta.get("output_ext", ".html"),
    }

    for key, val in replacements.items():
        template = template.replace(key, val)

    return template

def normalize_output_path_to_url(path):
    if path.endswith("index.html"):
        url = "/" + path[:-10]  # strip 'index.html'
    else:
        url = "/" + path
    # Ensure trailing slash for directories
    if not url or url[-1] != "/" and not url.endswith(".html"):
       url += "/"
    return url


def copy_public_assets(src="public", dest="output"):
    if not os.path.exists(src):
        return
    for root, dirs, files in os.walk(src):
        for file in files:
            src_file = os.path.join(root, file)
            rel_path = os.path.relpath(src_file, src)
            dest_file = os.path.join(dest, rel_path)
            os.makedirs(os.path.dirname(dest_file), exist_ok=True)
            shutil.copy2(src_file, dest_file)

def extract_date_from_filename(filename):
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})-", filename)
    if match:
        return datetime(int(match[1]), int(match[2]), int(match[3]))
    return None

def clear_output_dir(output_dir="output"):
    output_path = Path(output_dir)

    if output_path.exists():
        shutil.rmtree(output_path)
    output_path.mkdir(parents=True, exist_ok=True)