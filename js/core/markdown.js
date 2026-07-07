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

  const relationshipsJsonMatch =
  frontMatter.match(/^relationshipsJson:\s*(.*)$/im);

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

  const relationships =
    parseRelationshipsJson(
      relationshipsJsonMatch
        ? relationshipsJsonMatch[1]
        : ''
    );

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
  relationships,
  template,
  type,
  body,
};
}


export function formatRelationshipsFrontMatter(
  relationships
) {

  const normalized =
    normalizeRelationships(
      relationships
    );

  if (normalized.length === 0) return '';

  return `relationshipsJson: ${JSON.stringify(normalized)}\n`;
}


function parseRelationshipsJson(
  value
) {

  if (!value) return [];

  try {

    return normalizeRelationships(
      JSON.parse(
        value
      )
    );
  } catch (error) {

    console.warn(
      'Invalid relationshipsJson front matter skipped.',
      error
    );

    return [];
  }
}


function normalizeRelationships(
  relationships
) {

  if (!Array.isArray(relationships)) return [];

  return relationships
    .map(relationship =>
      normalizeRelationship(
        relationship
      )
    )
    .filter(relationship =>
      relationship.targetId ||
      relationship.targetTitle
    );
}


function normalizeRelationship(
  relationship
) {

  const normalized = {
    type:
      String(relationship?.type || 'related').trim() || 'related'
  };

  const targetId =
    String(relationship?.targetId || relationship?.pageId || '').trim();

  const targetTitle =
    String(relationship?.targetTitle || relationship?.target || '').trim();

  const label =
    String(relationship?.label || '').trim();

  if (targetId) {

    normalized.targetId =
      targetId;
  }

  if (targetTitle) {

    normalized.targetTitle =
      targetTitle;
  }

  if (label) {

    normalized.label =
      label;
  }

  return normalized;
}
