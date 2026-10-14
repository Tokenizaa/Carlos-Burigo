import { db } from './db.js';

export async function getAdminPages() {
  return db.getPages();
}

export async function getAdminPage(idOrSlug: string) {
  return db.getPageBySlug(idOrSlug) || db.getPages().find((p: any) => p.id === idOrSlug) || null;
}

export async function createAdminPage(data: any, author: any) {
  return db.createPage(data, author);
}

export async function updateAdminPage(id: string, data: any, author: any) {
  return db.updatePage(id, data, author);
}

export async function rollbackAdminPage(pageId: string, versionId: string, _author?: any) {
  return db.rollbackPage(pageId, versionId);
}
