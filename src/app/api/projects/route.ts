// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// Get all projects (with filtering and pagination)
export async function GET(request: Request) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    // Determine if user is admin
    const isAdmin = profile?.role === 'admin';
    
    // Query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // Build query — no FK embed: projects.client_id has no FK to auth.users
    // in this schema, so PostgREST cannot resolve the join.
    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' });
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Filter by client_id if provided
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    
    // If not admin, only show user's own projects
    if (!isAdmin) {
      query = query.or(`client_id.eq.${session.user.id},assigned_to.eq.${session.user.id},created_by.eq.${session.user.id}`);
    }
    
    // Add pagination
    query = query.range(offset, offset + limit - 1);
    
    // Order by created_at
    query = query.order('created_at', { ascending: false });
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        page,
        limit,
        pages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Create a new project
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      title, // backwards-compat: older clients may still send `title`
      description,
      client_id,
      status,
      start_date,
      end_date,
      target_completion_date, // backwards-compat alias for end_date
      budget,
      priority,
      org_id,
      workspace_id,
    } = body;

    const projectName = name ?? title;
    const projectEndDate = end_date ?? target_completion_date;

    // Validate required fields against the actual table schema (name + org_id + workspace_id are NOT NULL)
    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }
    if (!org_id || !workspace_id) {
      return NextResponse.json(
        { error: 'org_id and workspace_id are required' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    // Only admins can create projects
    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can create projects' },
        { status: 403 }
      );
    }
    
    // Parse dates (start_date / end_date columns are DATE type in this schema)
    let parsedStartDate: string | null = null;
    let parsedEndDate: string | null = null;

    if (start_date) {
      try {
        parsedStartDate = new Date(start_date).toISOString().slice(0, 10);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid start date format' },
          { status: 400 }
        );
      }
    }

    if (projectEndDate) {
      try {
        parsedEndDate = new Date(projectEndDate).toISOString().slice(0, 10);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid end date format' },
          { status: 400 }
        );
      }
    }

    // Insert project into database — columns must match the existing schema
    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name: projectName,
          description: description || null,
          client_id: client_id || null,
          status: status || 'active',
          start_date: parsedStartDate,
          end_date: parsedEndDate,
          budget: budget || null,
          created_by: session.user.id,
          priority: priority || 'medium',
          org_id,
          workspace_id,
        }
      ])
      .select();
      
    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
