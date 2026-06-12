import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SendGridClient } from '@/lib/marketing/email/sendgrid-client';
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit';

// Public lead intake — anonymous form submissions from marketing pages.
// No auth wrapper because legitimate users aren't logged in. Rate-limit
// protects against spam-bot list-bombing of the SendGrid integration and
// (when the TODO below lands) the Supabase leads table. 10/min/IP is
// generous for a real prospect (typical form-fill is one submission per
// visit) and tight enough that an attacker can't generate meaningful
// volume per IP.

// Basic lead validation schema
const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  message: z.string().optional(),
  interests: z.string().optional(),
  referralSource: z.string().optional(),
  marketingConsent: z.boolean().optional(),
  emailListId: z.string().optional(),
  additionalData: z.record(z.any()).optional(),
});

/**
 * API handler for lead submissions
 * Handles form submissions, email list subscriptions, and lead tracking
 */
export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimit(request, { key: 'marketing-leads', ...RATE_LIMITS.marketingLeads });
    if (!rate.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retry_after_ms: rate.retryAfterMs },
        { status: 429 },
      );
    }

    // Parse request data
    const data = await request.json();
    
    // Validate the data
    const validationResult = leadSchema.safeParse(data);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid form data',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }
    
    const leadData = validationResult.data;
    
    // Track IP and timestamp for analytics
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();
    
    // Add subscriber to email list if consent was given
    if (leadData.marketingConsent && leadData.emailListId) {
      try {
        const sendGridClient = new SendGridClient({
          apiKey: process.env.SENDGRID_API_KEY || '',
        });
        
        // Add to the specified list
        await sendGridClient.addSubscriber({
          email: leadData.email,
          firstName: leadData.firstName,
          lastName: leadData.lastName || undefined,
          listIds: [leadData.emailListId],
          customFields: {
            company: leadData.company || '',
            job_title: leadData.jobTitle || '',
            interests: leadData.interests || '',
            referral_source: leadData.referralSource || '',
            lead_source: 'website_form',
            ip_address: ipAddress,
            signup_date: timestamp,
          },
        });
      } catch (error) {
        console.error('Error adding subscriber to email list:', error);
        // Continue processing even if email subscription fails
      }
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'crm_not_configured' }, { status: 503 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );

    const { data: leadRecord, error: leadError } = await supabase
      .from('crm_leads')
      .insert({
        first_name: leadData.firstName,
        last_name: leadData.lastName || null,
        email: leadData.email,
        phone: leadData.phone || null,
        company: leadData.company || null,
        job_title: leadData.jobTitle || null,
        message: leadData.message || null,
        interests: leadData.interests || null,
        referral_source: leadData.referralSource || null,
        marketing_consent: leadData.marketingConsent || false,
        email_list_id: leadData.emailListId || null,
        source: 'website_form',
        status: 'new',
        assigned_owner: 'Margot',
        ip_address: ipAddress,
        user_agent: userAgent,
        additional_data: leadData.additionalData || {},
        captured_at: timestamp,
      })
      .select('id')
      .single();

    if (leadError || !leadRecord?.id) {
      console.error('Error persisting CRM lead:', leadError);
      return NextResponse.json({ error: 'lead_persistence_failed' }, { status: 500 });
    }
    
    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Lead successfully captured',
        lead_id: leadRecord.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing lead:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process lead',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
