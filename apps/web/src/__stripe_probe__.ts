import Stripe from 'stripe';
const s = new Stripe('sk_test_x', { apiVersion: '2026-04-22.dahlia' });
const ev: Stripe.Event = {} as any;
const inv: Stripe.Invoice = {} as any;
void s; void ev; void inv;
