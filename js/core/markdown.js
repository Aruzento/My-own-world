export function parseMarkdown(content) {

  const idMatch =
    content.match(/id:\s*(.*)/i);

  const parentMatch =
    content.match(/parent:\s*(.*)/i);

  const orderMatch =
    content.match(/order:\s*(.*)/i);

  const tagsMatch =
    content.match(/tags:\s*\[(.*?)\]/i);

  const templateMatch =
  content.match(/template:\s*(.*)/i);

  const typeMatch =
  content.match(/type:\s*(.*)/i);

  const aliasesMatch =
  content.match(/aliases:\s*\[(.*?)\]/i);

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
      .replace(/---[\s\S]*?---/, '')
      .trim();


  const titleMatch =
    body.match(/<h1[^>]*>(.*?)<\/h1>/i);


  const title =
    titleMatch
      ? titleMatch[1]
          .replace(/<[^>]*>/g, '')
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