import {
  formatRelationshipsFrontMatter,
  parsePageRecordContent
} from './pageRecord.js';


export function parseMarkdown(
  content
) {

  const record =
    parsePageRecordContent(
      content
    );

  return {
    id:
      record.id,
    schemaVersion:
      record.schemaVersion,
    updatedAt:
      record.updatedAt,
    contentHash:
      record.contentHash,
    pageRecordStatus:
      record.pageRecordStatus,
    parent:
      record.parent,
    order:
      record.order,
    title:
      record.title,
    tags:
      record.tags,
    aliases:
      record.aliases,
    relationships:
      record.relationships,
    template:
      record.template,
    type:
      record.type,
    body:
      record.body
  };
}


export {
  formatRelationshipsFrontMatter
};
