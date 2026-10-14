export interface AdminInvite {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked' | 'accepted';
  createdAt: string;
  expiresAt: string;
}

let invites: AdminInvite[] = [];

export async function getAdminInvites(): Promise<AdminInvite[]> {
  return invites;
}

export async function createAdminInvite(data: { email: string; role: string }): Promise<AdminInvite> {
  const newInvite: AdminInvite = {
    id: `inv-${Date.now()}`,
    email: data.email,
    role: data.role || 'EDITOR',
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  };
  invites.push(newInvite);
  return newInvite;
}

export async function approveAdminInvite(id: string): Promise<AdminInvite | null> {
  const invite = invites.find(i => i.id === id);
  if (invite) invite.status = 'approved';
  return invite || null;
}

export async function rejectAdminInvite(id: string): Promise<AdminInvite | null> {
  const invite = invites.find(i => i.id === id);
  if (invite) invite.status = 'rejected';
  return invite || null;
}

export async function revokeAdminInvite(id: string): Promise<AdminInvite | null> {
  const invite = invites.find(i => i.id === id);
  if (invite) invite.status = 'revoked';
  return invite || null;
}

export async function renewAdminInvite(id: string): Promise<AdminInvite | null> {
  const invite = invites.find(i => i.id === id);
  if (invite) {
    invite.expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
  }
  return invite || null;
}

export async function acceptAdminInvite(tokenOrId: string, _userData?: any): Promise<boolean> {
  const invite = invites.find(i => i.id === tokenOrId);
  if (invite) {
    invite.status = 'accepted';
    return true;
  }
  return false;
}
