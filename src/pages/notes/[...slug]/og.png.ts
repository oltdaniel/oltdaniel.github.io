import { prepareContentPosts } from '@/src/utils'
import { loadNotesCollection } from "@/src/content.config";
import fs from "fs/promises";
import satori from "satori";
import sharp from "sharp";
import type { APIRoute } from "astro";
import path from 'path';
import { html } from 'satori-html';
import { getEntry } from 'astro:content';

export async function getStaticPaths() {
  const notes = await loadNotesCollection()

  return prepareContentPosts(notes)
}

export const GET: APIRoute = async function get({ params, request }) {
  const interFontData = await fs.readFile(path.resolve("public/fonts/inter-4.1/Inter-Regular.ttf"));

  const note = await getEntry("notes", params.slug!)

  const svg = await satori(
    html(`<div
  style="display:flex;height:100%;width:100%;align-items:center;justify-content:center;letter-spacing:-.02em;font-weight:700;background:white">
  <div
    style="right:42px;bottom:42px;position:absolute;display:flex;align-items:center">
    <span style="width:24px;height:24px;background:black"></span
    ><span style="margin-left:8px;font-size:20px">oltdaniel.eu</span>
  </div>
  <div
    style="display:flex;flex-wrap:wrap;justify-content:center;padding:20px 50px;margin:0 42px;font-size:40px;width:auto;max-width:550px;text-align:center;background-color:black;color:white;line-height:1.4">
    ${note?.data.title}
  </div>
</div>`),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: interFontData,
          weight: 600,
          style: "normal",
        },
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const png = new Uint8Array(pngBuffer);

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
    },
  });
};