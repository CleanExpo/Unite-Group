/**
 * Stripe API Client
 *
 * Ported from apps/authority-legacy/src/lib/api/stripe/client.ts (P1 —
 * docs/convergence/migration-map.md).
 *
 * ADAPTATION: the legacy client wrapped a bespoke `@/lib/api` framework
 * (ApiClient / RetryStrategy / ApiKeyAuthStrategy) which does not exist in
 * apps/web. Rather than port that whole framework (out of scope, and the
 * official `stripe` SDK already provides retries + typing), this client is a
 * thin wrapper over the official Stripe Node SDK. The public surface used by
 * apps/web (`createPaymentIntent`) is preserved.
 */

import Stripe from 'stripe';

interface StripeApiConfig {
  apiKey: string;
  apiVersion?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Stripe API Client — thin wrapper over the official Stripe SDK.
 */
export class StripeApiClient {
  private readonly stripe: Stripe;

  constructor(config: StripeApiConfig) {
    if (!config.apiKey) {
      // Surfacing the missing key honestly (No-Invaders: no silent fallback).
      throw new Error('Stripe not configured: STRIPE_SECRET_KEY missing');
    }
    // The Stripe constructor's config type pins apiVersion to a literal; the
    // optional `config.apiVersion` override (a plain string) is applied via a
    // narrowed cast so callers can pin an explicit version when needed. When
    // omitted, the SDK applies its pinned default.
    type StripeConfig = NonNullable<ConstructorParameters<typeof Stripe>[1]>;
    const stripeConfig: StripeConfig = {
      maxNetworkRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000,
    };
    if (config.apiVersion) {
      stripeConfig.apiVersion = config.apiVersion as StripeConfig['apiVersion'];
    }
    this.stripe = new Stripe(config.apiKey, stripeConfig);
  }

  /** Direct access to the underlying SDK if needed. */
  public getClient(): Stripe {
    return this.stripe;
  }

  /**
   * Create a payment intent.
   * Mirrors the legacy camelCase param shape, mapping to SDK snake_case.
   */
  public async createPaymentIntent(params: {
    amount: number;
    currency: string;
    description?: string;
    customer?: string;
    paymentMethodTypes?: string[];
    metadata?: Record<string, string>;
    receiptEmail?: string;
    statementDescriptor?: string;
    captureMethod?: 'automatic' | 'manual';
  }): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      customer: params.customer,
      payment_method_types: params.paymentMethodTypes ?? ['card'],
      metadata: params.metadata,
      receipt_email: params.receiptEmail,
      statement_descriptor: params.statementDescriptor,
      capture_method: params.captureMethod,
    });
  }

  /** Retrieve a payment intent. */
  public async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(id);
  }
}
