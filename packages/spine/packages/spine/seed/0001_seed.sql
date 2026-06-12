-- Deterministic seed for GREEN tests: two member orgs (A,B), the operator org, and a full
-- single-identity chain for org A (campaign → lead → routing → customer → job → evidence;
-- membership, onboarding, CARSI enrolment + credential). Run as service role (RLS bypassed).
insert into core.party (party_id, kind, display_name) values
 ('0a000000-0000-0000-0000-000000000001','organization','Alpha Restoration'),
 ('0b000000-0000-0000-0000-000000000001','organization','Bravo Restoration'),
 ('00000000-0000-0000-0000-0000000000ee','organization','Unite-Group'),
 ('0a000000-0000-0000-0000-0000000000a1','person','Alice Alpha'),
 ('0b000000-0000-0000-0000-0000000000b1','person','Bob Bravo'),
 ('00000000-0000-0000-0000-0000000000ff','person','Phill Operator'),
 ('0c000000-0000-0000-0000-000000000001','person','Homeowner Helen');
insert into core.organization (party_id, legal_name, abn) values
 ('0a000000-0000-0000-0000-000000000001','Alpha Restoration','11111111111'),
 ('0b000000-0000-0000-0000-000000000001','Bravo Restoration','22222222222'),
 ('00000000-0000-0000-0000-0000000000ee','Unite-Group','99999999999');
insert into core.person (party_id, given_name, family_name, email) values
 ('0a000000-0000-0000-0000-0000000000a1','Alice','Alpha','alice@alpha.test'),
 ('0b000000-0000-0000-0000-0000000000b1','Bob','Bravo','bob@bravo.test'),
 ('00000000-0000-0000-0000-0000000000ff','Phill','Operator','phill@unite-group.test'),
 ('0c000000-0000-0000-0000-000000000001','Helen','Homeowner','helen@home.test');
insert into core.org_membership (person_party_id, org_party_id, role, status) values
 ('0a000000-0000-0000-0000-0000000000a1','0a000000-0000-0000-0000-000000000001','owner','active'),
 ('0b000000-0000-0000-0000-0000000000b1','0b000000-0000-0000-0000-000000000001','owner','active'),
 ('00000000-0000-0000-0000-0000000000ff','00000000-0000-0000-0000-0000000000ee','staff','active');
insert into core.party_identifier (party_id, scheme, value) values
 ('0a000000-0000-0000-0000-000000000001','abn','11111111111'),
 ('0b000000-0000-0000-0000-000000000001','abn','22222222222');
insert into marketing.campaign (id, name, channel, source_code) values
 ('0d000000-0000-0000-0000-000000000001','Storm Season SEO','seo','STORM2026');
insert into leadgen.lead (id, contact_person_id, suburb, state, hazard_type, campaign_id, source, status) values
 ('0e000000-0000-0000-0000-000000000001','0c000000-0000-0000-0000-000000000001','Brisbane','QLD','water','0d000000-0000-0000-0000-000000000001','disaster-recovery','new');
insert into leadgen.lead_routing (lead_id, org_id, status, lead_fee_cents) values
 ('0e000000-0000-0000-0000-000000000001','0a000000-0000-0000-0000-000000000001','accepted',5000);
insert into onboarding.application (org_id, applicant_person_id, status) values
 ('0a000000-0000-0000-0000-000000000001','0a000000-0000-0000-0000-0000000000a1','approved');
insert into nrpg.membership (org_id, tier, status) values ('0a000000-0000-0000-0000-000000000001','standard','active');
insert into carsi.course (id, title, iicrc_category, ce_credits) values ('0f000000-0000-0000-0000-000000000001','Water Damage Restoration S500','WRT',14);
insert into carsi.enrollment (person_party_id, course_id, org_id, status, completed_at) values ('0a000000-0000-0000-0000-0000000000a1','0f000000-0000-0000-0000-000000000001','0a000000-0000-0000-0000-000000000001','completed', now());
insert into carsi.training_credential (person_party_id, course_id, iicrc_credits) values ('0a000000-0000-0000-0000-0000000000a1','0f000000-0000-0000-0000-000000000001',14);
insert into field.customer (id, org_id, contact_person_id, name, source_lead_id) values ('10000000-0000-0000-0000-000000000001','0a000000-0000-0000-0000-000000000001','0c000000-0000-0000-0000-000000000001','Helen Homeowner','0e000000-0000-0000-0000-000000000001');
insert into field.job (id, org_id, customer_id, status, hazard_type, source_lead_id) values ('11000000-0000-0000-0000-000000000001','0a000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','open','water','0e000000-0000-0000-0000-000000000001');
insert into field.evidence (org_id, job_id, captured_by, sha256, evidence_class) values ('0a000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','0a000000-0000-0000-0000-0000000000a1','deadbeef','moisture_reading');
insert into sales.opportunity (target_org_id, stage, amount_cents) values ('0a000000-0000-0000-0000-000000000001','proposal',100000);
