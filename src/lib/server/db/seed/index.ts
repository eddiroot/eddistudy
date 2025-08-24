import * as table from '../schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { reset } from 'drizzle-seed';
import { seedVCECurriculumData } from './vce-curriculum-data-seeder'

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema: table });

async function seed() {
    await reset(db, table);
    try {
        console.log('🌱 Starting database seeding...');

        // Create basic school structure
        const [schoolRecord] = await db
            .insert(table.school)
            .values({
                name: 'School of eddi'
            })
            .returning();

        const [campusRecord] = await db
            .insert(table.campus)
            .values({
                schoolId: schoolRecord.id,
                name: 'Main Campus',
                address: '123 Education Street, Melbourne VIC 3000',
                description: 'Primary campus of School of eddi',
                isArchived: false
            })
            .returning();

        console.log('✅ Basic school structure created!');
        
        // Seed VCE curriculum data
        console.log('🌱 Now seeding VCE curriculum data...');
        await seedVCECurriculumData();
        
        console.log(`
📊 Summary:
-- School: ${schoolRecord.name}
-- Campus: ${campusRecord.name}

✅ All seeding completed successfully!
        `);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}

seed()
    .then(() => {
        console.log('Seeding completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });