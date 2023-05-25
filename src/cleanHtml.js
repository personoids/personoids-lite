import { convert } from 'html-to-text';

export function cleanHtml(html) {
  const rawText = convert(html, {
    // wordwrap: 130,
    selectors: [
      { selector: 'a', format: "skip" },
      { selector: 'img', format: "skip" },
    ]
  });
  return rawText;
  // remove links
}
