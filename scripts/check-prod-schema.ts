// Check production database schema and show missing columns
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Try to query Message table structure
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Message'
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Message table columns:');
    console.table(result);
    
    // Check for participants column specifically
    const hasParticipants = Array.isArray(result) && 
      result.some((col: any) => col.column_name === 'participants');
    
    if (!hasParticipants) {
      console.log('\n❌ MISSING: participants column');
      console.log('\n🔧 Run this SQL in Supabase SQL Editor:');
      console.log(`ALTER TABLE "Message" ADD COLUMN "participants" TEXT NOT NULL DEFAULT '';`);
    } else {
      console.log('\n✅ participants column exists');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    console.log('\n💡 This might mean the Message table does not exist at all.');
    console.log('You need to run: npx prisma migrate deploy');
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
