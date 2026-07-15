import MarkdownIt from 'markdown-it';

declare const safeProjectionBrand: unique symbol;
export type SafeProjectionHtml = string & { readonly [safeProjectionBrand]: true };

const renderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
});

const defaultLinkOpen = renderer.renderer.rules.link_open ?? ((tokens, index, options, _environment, self) => self.renderToken(tokens, index, options));
renderer.renderer.rules.link_open = (tokens, index, options, environment, self) => {
  const token = tokens[index];
  const href = token?.attrGet('href') ?? '';
  if (/^(?:https?:|mailto:|tel:)/i.test(href)) {
    token?.attrSet('rel', 'noreferrer noopener');
    token?.attrSet('target', '_blank');
  }
  return defaultLinkOpen(tokens, index, options, environment, self);
};

export function renderMarkdown(source: string): SafeProjectionHtml {
  return renderer.render(source) as SafeProjectionHtml;
}
