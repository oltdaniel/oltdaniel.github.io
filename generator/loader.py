import re
from datetime import datetime
from pathlib import Path
import frontmatter
from utils import slugify, apply_permalink, extract_date_from_filename, normalize_output_path_to_url

def load_collection(name, settings):
    path = Path(settings["path"])
    file_type = settings["type"]
    items = []

    glob_pattern = "*"
    if "allow_subdirectory" in settings and settings["allow_subdirectory"]:
        glob_pattern = "**/*"

    for file in path.glob(glob_pattern):
        if file.suffix not in [".md", ".html"]:
            continue

        is_md = file.suffix == ".md"
        if file_type == "markdown" and not is_md:
            continue

        matter = frontmatter.load(file)

        date = None
        slug = slugify(file.stem)

        # Match filenames like: 2024-05-10-my-title.md
        match = re.match(r"(\d{4}-\d{2}-\d{2})-(.+)", file.stem)
        if match:
            date_str, slug = match.groups()
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                pass

        title = matter.get("title", slug.replace("-", " ").title())
        if "date" in matter.keys():
            date = datetime.fromisoformat(matter.get("date"))
        if "slug" in matter.keys():
            slug = datetime.fromisoformat(matter.get("slug"))
        content = matter.content
        template = matter.get("template", settings.get("template"))

        # Build output path based on permalink config
        permalink_meta = {
            "title": title,
            "slug": slug,
            "date": date,
            "output_ext": ".html",
        }
        permalink_tpl = settings.get("permalink", f"{settings.get('output_dir', '')}/{slug}/index.html")
        
        # Adjust output path for files in subdirectories
        relative_path = file.relative_to(path).parent
        output_path = apply_permalink(permalink_tpl, permalink_meta).strip("/")
        if relative_path != Path("."):
            output_path = f"{relative_path}/{output_path}".replace("\\", "/")

        # When flat_output is set, overwrite output path
        flat_output = matter.get("flat_output", False)
        if flat_output:
            output_path = f"{slug}.html"

        items.append({
            "title": title,
            "slug": slug,
            "description": matter.get("description"),
            "content": content,
            "template": template,
            "output_path": output_path,
            "url": normalize_output_path_to_url(output_path),
            "collection": name,
            "date": date,
            "is_markdown": is_md,
            "is_template": not is_md,
            "flat_output": flat_output,
        })

    return sorted(items, key=lambda x: x["date"] or datetime.now(), reverse=True)