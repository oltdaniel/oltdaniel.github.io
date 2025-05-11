from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from markdown import markdown
from utils import ensure_dir, normalize_output_path_to_url

def format_date(value, fmt="%Y-%m-%d"):
    return value.strftime(fmt) if isinstance(value, datetime) else value

def render_site(config, all_items, template_dir, output_dir):
    env = Environment(loader=FileSystemLoader(template_dir))
    env.filters['format_date'] = format_date
    env.globals['now'] = lambda: datetime.now()
    env.globals['config'] = config
    env.globals['site'] = config.get("site", {})

    # Group items by collection
    by_collection = {}
    for item in all_items:
        by_collection.setdefault(item["collection"], []).append(item)

    # Render individual content
    for item in all_items:
        if item.get("is_template"):
            # The file *is* the template
            template = env.from_string(item["content"])
            content = template.render(
                title=item["title"],
                content=item["content"],
                item=item,
                items=all_items,
                collections=by_collection,
                config=config,
                site=config.get("site", {}),
            )
        else:
            content = markdown(
                item["content"],
                extensions=['fenced_code', 'footnotes', 'attr_list']
            ) if item["is_markdown"] else item["content"]
        
        # Use a template to wrap content
        template = env.get_template(item["template"])

        html = template.render(
            title=item["title"],
            content=content,
            item=item,
            items=all_items,
            collections=by_collection,
            config=config,
            site=config.get("site", {}),
        )

        output_file = f"{output_dir}/{item['output_path']}"
        ensure_dir("/".join(output_file.split("/")[:-1]))
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html)

    # Render collection indexes
    for collection_name, items in by_collection.items():
        settings = config["collections"].get(collection_name, {})
        tpl_name = settings.get("index_template", "")
        if not tpl_name:
            continue

        template = env.get_template(tpl_name)
        output_path = f"{collection_name}/index.html"
        output_file = f"{output_dir}/{output_path}"
        ensure_dir(f"{output_dir}/{collection_name}")

        url = normalize_output_path_to_url(output_path)
        
        html = template.render(
            title=settings.get("index_title", collection_name.title()),
            description=settings.get("index_description", ""),
            item={"url": url},
            items=items,
            collection=collection_name
        )
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html)

