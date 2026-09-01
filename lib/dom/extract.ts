import { cleanClone } from './denoise';
import { getPickedElement } from './picker';
import { collectImages, findMainElement, findNavElements, liveRootsFor } from './regions';
import type { ExtractResponse, ImageMeta, RegionType } from '../messages';

function cloneIntoDocument(nodes: Element[]): Document {
  const doc = document.implementation.createHTMLDocument(document.title);
  const frag = doc.createDocumentFragment();
  for (const node of nodes) {
    if (node.tagName === 'BODY') {
      for (const child of Array.from(node.childNodes)) {
        frag.append(doc.importNode(child.cloneNode(true), true));
      }
    } else {
      frag.append(doc.importNode(node.cloneNode(true), true));
    }
  }
  doc.body.replaceChildren(frag);
  return doc;
}

function extractMainHtml(baseUrl: string): { html: string; images: ImageMeta[] } {
  const liveMain = findMainElement(document);
  const clonedDoc = cloneIntoDocument([liveMain]);
  const html = cleanClone(clonedDoc.body, baseUrl, false);
  return { html, images: collectImages(liveMain, baseUrl) };
}

export function extractElement(el: Element, baseUrl: string): ExtractResponse {
  const cloned = cloneIntoDocument([el]);
  const html = cleanClone(cloned.body, baseUrl, false);
  return { ok: true, title: document.title, html, images: collectImages(el, baseUrl) };
}

export function extractRegion(type: RegionType, baseUrl: string): ExtractResponse {
  if (type === 'custom') {
    const el = getPickedElement();
    if (!el) throw new Error('指定区域已失效，请重新点选');
    return extractElement(el, baseUrl);
  }

  if (type === 'main') {
    const { html, images } = extractMainHtml(baseUrl);
    return { ok: true, title: document.title, html, images, useReadability: true };
  }

  const roots = liveRootsFor(document, type);
  if (roots.length === 0) {
    throw new Error('当前区域没有可用内容');
  }

  if (type === 'main_nav') {
    const main = extractMainHtml(baseUrl);
    const navDoc = cloneIntoDocument(findNavElements(document));
    const navHtml = cleanClone(navDoc.body, baseUrl, true);
    const images = [
      ...main.images,
      ...findNavElements(document).flatMap((el) => collectImages(el, baseUrl)),
    ];
    return {
      ok: true,
      title: document.title,
      html: main.html,
      navHtml,
      images,
      useReadability: true,
    };
  }

  const keepNav = type === 'nav';
  const cloned = cloneIntoDocument(roots);
  const html = cleanClone(cloned.body, baseUrl, keepNav);
  const images = roots.flatMap((el) => collectImages(el, baseUrl));
  return { ok: true, title: document.title, html, images };
}
