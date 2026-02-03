import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { OpportunityService } from '@/services/OpportunityService';
import { OpportunitySearchParams } from '@/types/opportunity';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = new URL(request.url).searchParams;
    const params: OpportunitySearchParams = {};

    // Text search
    const query = searchParams.get('q');
    if (query) params.query = query;

    // Stage filter
    const stageParam = searchParams.get('stage');
    if (stageParam) params.stage = stageParam.split(',') as any[];

    // Source filter
    const sourceParam = searchParams.get('source');
    if (sourceParam) params.source = sourceParam.split(',') as any[];

    // Priority filter
    const priorityParam = searchParams.get('priority');
    if (priorityParam) params.priority = priorityParam.split(',') as any[];

    // Value range
    const minValue = searchParams.get('min_value');
    if (minValue) params.min_value = parseFloat(minValue);
    const maxValue = searchParams.get('max_value');
    if (maxValue) params.max_value = parseFloat(maxValue);

    // Probability range
    const probMin = searchParams.get('probability_min');
    if (probMin) params.probability_min = parseInt(probMin);
    const probMax = searchParams.get('probability_max');
    if (probMax) params.probability_max = parseInt(probMax);

    // Assigned to filter
    const assignedTo = searchParams.get('assigned_to');
    if (assignedTo) params.assigned_to = assignedTo;

    // Date filters
    const createdAfter = searchParams.get('created_after');
    if (createdAfter) params.created_after = new Date(createdAfter);
    const createdBefore = searchParams.get('created_before');
    if (createdBefore) params.created_before = new Date(createdBefore);

    // Tags filter
    const tagsParam = searchParams.get('tags');
    if (tagsParam) params.tags = tagsParam.split(',');

    // Sort and pagination
    const sortBy = searchParams.get('sort_by');
    if (sortBy) params.sortBy = sortBy as any;
    const sortOrder = searchParams.get('sort_order');
    if (sortOrder) params.sortOrder = sortOrder as 'asc' | 'desc';
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    params.page = page;
    params.limit = limit;

    const result = await OpportunityService.search(user.id, params);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error searching opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to search opportunities', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, ...opportunityData } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Verify client belongs to user
    const client = await import('@prisma/client').then(({ prisma }) => 
      prisma.client.findFirst({
        where: { id: clientId, userId: user.id }
      })
    );

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const opportunity = await OpportunityService.create(
      user.id,
      clientId,
      opportunityData
    );

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error: any) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to create opportunity', details: error.message },
      { status: 500 }
    );
  }
}