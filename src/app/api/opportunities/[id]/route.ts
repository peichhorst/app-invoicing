import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { OpportunityService } from '@/services/OpportunityService';
import { OpportunityStage } from '@/types/opportunity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const opportunity = await OpportunityService.getById(id, user.id);

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json(opportunity);
  } catch (error: any) {
    console.error('Error fetching opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunity', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const opportunity = await OpportunityService.update(id, user.id, body);

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json(opportunity);
  } catch (error: any) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to update opportunity', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Handle special operations like stage movement
    if (body.operation === 'move_stage' && body.newStage) {
      const opportunity = await OpportunityService.moveStage(id, user.id, body.newStage as OpportunityStage);
      return NextResponse.json(opportunity);
    }

    // Handle probability update
    if (body.operation === 'update_probability' && body.probability !== undefined) {
      const opportunity = await OpportunityService.updateProbability(id, user.id, body.probability);
      return NextResponse.json(opportunity);
    }

    // Regular update
    const opportunity = await OpportunityService.update(id, user.id, body);

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json(opportunity);
  } catch (error: any) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to update opportunity', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await OpportunityService.delete(id, user.id);

    if (!result) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to delete opportunity', details: error.message },
      { status: 500 }
    );
  }
}