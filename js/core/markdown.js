export function parseMarkdown(content) {

  const frontMatterMatch =
    content.match(/^---\s*([\s\S]*?)\s*---/);

  const frontMatter =
    frontMatterMatch
      ? frontMatterMatch[1]
      : content;

  const idMatch =
    frontMatter.match(/^id:\s*(.*)$/im);

  const parentMatch =
    frontMatter.match(/^parent:\s*(.*)$/im);

  const orderMatch =
    frontMatter.match(/^order:\s*(.*)$/im);

  const tagsMatch =
    frontMatter.match(/^tags:\s*\[(.*?)\]/im);

  const templateMatch =
  frontMatter.match(/^template:\s*(.*)$/im);

  const typeMatch =
  frontMatter.match(/^type:\s*(.*)$/im);

  const aliasesMatch =
  frontMatter.match(/^aliases:\s*\[(.*?)\]/im);

  const template =
  templateMatch
    ? templateMatch[1].trim()
    : null;

  const type =
  typeMatch
    ? typeMatch[1].trim()
    : null;

  const id =
    idMatch
      ? idMatch[1].trim()
      : crypto.randomUUID();


  let parent = null;

  if (parentMatch) {

    const value =
      parentMatch[1].trim();

    parent =
      value === 'null'
        ? null
        : value;
  }

  let order = null;

if (orderMatch) {

  const value =
    Number(orderMatch[1].trim());

  order =
    Number.isFinite(value)
      ? value
      : null;
}

  let tags = [];

  if (tagsMatch && tagsMatch[1]) {

    tags = tagsMatch[1]
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
  }

  let aliases = [];

if (
  aliasesMatch &&
  aliasesMatch[1]
) {

  aliases = aliasesMatch[1]
    .split(',')
    .map(alias => alias.trim())
    .filter(Boolean);
}

  const body =
    content
      .replace(/^---[\s\S]*?---/, '')
      .trim();


  const titleMatch =
    body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);


  const title =
    titleMatch
      ? titleMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      : 'Без названия';


  return {
  id,
  parent,
  order,
  title,
  tags,
  aliases,
  template,
  type,
  body,
};
}
