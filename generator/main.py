from config import load_config
from loader import load_collection
from renderer import render_site
from utils import copy_public_assets, clear_output_dir

def main():
    config = load_config()

    clear_output_dir('output')

    items = []
    for name, settings in config.get("collections", {}).items():
        items.extend(load_collection(name, settings))
        
    render_site(config, items, template_dir="templates", output_dir="output")
    copy_public_assets("public", "output")

if __name__ == "__main__":
    main()
