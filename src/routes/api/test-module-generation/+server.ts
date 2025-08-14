import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateTeachMeModule } from '$lib/server/db/service/module';

export const POST: RequestHandler = async ({ request }) => {
    console.log('🎓 API: Testing generateTeachMeModule');
    console.log('=====================================');

    try {
        const body = await request.json();
        
        // Default test parameters if none provided
        const {
            curriculumSubjectId = 1161, // Chemistry Units 3 and 4
            title = "Chemical Reaction Rates",
            description = "Students will investigate the factors that influence how quickly chemical reactions occur, including temperature, concentration, surface area, gas pressure, and the presence of catalysts. The lesson will explore how these factors affect the frequency and success of particle collisions in both open and closed systems. Students will also examine the role of catalysts in providing alternative reaction pathways with lower activation energies, using energy profile diagrams to illustrate these effects. Practical examples and data analysis will reinforce understanding of how reaction rates can be controlled and applied in real-world contexts.",
            learningAreaIds = [1855],
            outcomeIds = [1658],
            keyKnowledgeIds = [9037, 9038],
            amount = 3
        } = body;

        console.log('📋 Module Configuration:');
        console.log(`   Subject ID: ${curriculumSubjectId}`);
        console.log(`   Title: "${title}"`);
        console.log(`   Description: "${description}"`);
        console.log(`   Learning Areas: [${learningAreaIds.join(', ')}]`);
        console.log(`   Outcomes: [${outcomeIds.join(', ')}]`);
        console.log(`   Key Knowledge: [${keyKnowledgeIds.join(', ')}]`);
        console.log(`   Amount: ${amount}`);
        console.log('');

        const startTime = Date.now();
        console.log('🚀 Starting module generation...');

        // Call the real service function
        const result = await generateTeachMeModule(
            curriculumSubjectId,
            title,
            description,
            learningAreaIds,
            outcomeIds,
            keyKnowledgeIds,
            amount
        );

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log('✅ Module generation completed!');
        console.log(`⏱️  Generation time: ${duration.toFixed(2)} seconds`);
        console.log(`📊 Module ID: ${result.id}`);

        return json({
            success: true,
            message: 'Module generated successfully',
            data: {
                moduleId: result.id,
                title: result.title,
                description: result.description,
                curriculumSubjectId: result.curriculumSubjectId,
                createdAt: result.createdAt,
                generationTime: duration
            },
            metadata: {
                learningAreaIds,
                outcomeIds,
                keyKnowledgeIds,
                amount
            }
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const errorType = error instanceof Error ? error.constructor.name : 'Error';
        
        console.error('❌ Error generating module:', error);
        
        return json({
            success: false,
            error: {
                message: errorMessage,
                type: errorType
            }
        }, { 
            status: 500 
        });
    }
};

export const GET: RequestHandler = async () => {
    // Provide API documentation
    return json({
        endpoint: '/api/test-module-generation',
        description: 'Test the generateTeachMeModule service function',
        methods: {
            POST: {
                description: 'Generate a test module',
                body: {
                    curriculumSubjectId: 'number (optional, default: 1161)',
                    title: 'string (optional, default: "Chemical Reaction Rates")',
                    description: 'string (optional, default: test description)',
                    learningAreaIds: 'number[] (optional, default: [1855])',
                    outcomeIds: 'number[] (optional, default: [1658])',
                    keyKnowledgeIds: 'number[] (optional, default: [9037, 9038])',
                    keySkillIds: 'number[] (optional, default: [3150, 3151])',
                    amount: 'number (optional, default: 3)'
                }
            },
            GET: {
                description: 'Get API documentation'
            }
        },
        examples: {
            defaultTest: {
                method: 'POST',
                url: '/api/test-module-generation',
                body: {}
            },
            customTest: {
                method: 'POST',
                url: '/api/test-module-generation',
                body: {
                    title: "Custom Module Title",
                    description: "Custom module description",
                    amount: 5
                }
            }
        }
    });
};
