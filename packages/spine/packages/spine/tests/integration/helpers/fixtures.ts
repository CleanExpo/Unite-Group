// Fixture builders for the RA-7753 rule suites. Owner role; always inside inTx (helpers/tx.ts).
import { randomUUID } from 'node:crypto';
import type { Tx } from './tx.js';

export async function mkPerson(tx: Tx, label: string): Promise<string> {
  const id = randomUUID();
  await tx`insert into core.party (party_id, kind, display_name) values (${id}, 'person', ${label})`;
  await tx`insert into core.person (party_id, given_name, email) values (${id}, ${label}, ${`${label}-${id}@rules.test`})`;
  return id;
}
export async function mkOrg(tx: Tx, label: string): Promise<string> {
  const id = randomUUID();
  await tx`insert into core.party (party_id, kind, display_name) values (${id}, 'organization', ${label})`;
  await tx`insert into core.organization (party_id, legal_name) values (${id}, ${label})`;
  return id;
}
export async function mkMember(tx: Tx, person: string, org: string, role = 'member'): Promise<void> {
  await tx`insert into core.org_membership (person_party_id, org_party_id, role, status) values (${person}, ${org}, ${role}, 'active')`;
}
export async function mkEmployment(tx: Tx, person: string, org: string, startedAgo = '1 year'): Promise<string> {
  const [r] = await tx<{ id: string }[]>`
    insert into core.employment (person_party_id, org_party_id, role, started_at)
    values (${person}, ${org}, 'technician', now() - ${startedAgo}::interval) returning id`;
  return r!.id;
}
export async function mkCredential(tx: Tx, holder: string, issuedAgo: string, number: string | null = null): Promise<string> {
  const [r] = await tx<{ id: string }[]>`
    insert into core.credential (holder_party_id, credential_type, issuer, number, issued_at, verification_class)
    values (${holder}, 'WRT', 'IICRC', ${number}, now() - ${issuedAgo}::interval, 'SELF_REPORTED') returning id`;
  return r!.id;
}

/** A small employer: owner E and worker W (both active members), W employed for a year. */
export async function mkEmployer(tx: Tx): Promise<{ org: string; owner: string; worker: string }> {
  const org = await mkOrg(tx, 'Employer');
  const owner = await mkPerson(tx, 'owner');
  const worker = await mkPerson(tx, 'worker');
  await mkMember(tx, owner, org, 'owner');
  await mkMember(tx, worker, org);
  await mkEmployment(tx, worker, org);
  return { org, owner, worker };
}
