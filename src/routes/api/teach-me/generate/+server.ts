import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AgentOrchestrator } from '$lib/server/agents/orchestrator';
import { AgentType, type AgentContext, type AgentResponse } from '$lib/server/agents/index';

/* eslint-disable @typescript-eslint/no-explicit-any */

const orchestrator = new AgentOrchestrator();

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { action, params } = await request.json();
        
        // Create base agent context
        const baseContext: AgentContext = {
            userId: params.userId || 1,
            sessionId: params.sessionId || `test-session-${Date.now()}`,
            moduleId: params.moduleId || 1,
            metadata: {
                action,
                moduleParams: {
                    // Default test values merged with provided params
                    title: params.title || 'Introduction to Cellular Respiration',
                    description: params.description || 'Understanding the process of cellular respiration in biology',
                    subjectId: params.subjectId || 1001, // Biology
                    subjectType: params.subjectType || 'science',
                    learningAreaIds: params.learningAreaIds || [1, 2],
                    keyKnowledgeIds: params.keyKnowledgeIds || [1, 2, 3],
                    keySkillIds: params.keySkillIds || [1, 2],
                    ...params
                }
            },
            memory: {
                sessionId: params.sessionId || `test-session-${Date.now()}`,
                userId: params.userId || 1,
                moduleId: params.moduleId || 1,
                context: {
                    recentResponses: [],
                    currentDifficulty: 'intermediate',
                    strugglingConcepts: [],
                    masteredConcepts: [],
                    hintsUsed: 0,
                    attemptHistory: []
                }
            }
        };

        // Handle complete module generation (all three actions in sequence)
        if (action === 'generate_complete_module') {
            const results = {
                scaffold: null as AgentResponse | null,
                sections: [] as Array<{
                    sectionInfo: any;
                    content: { blocks: any[]; metadata: any };
                    interactive: { blocks: any[]; metadata: any };
                    sources: { content: any[]; interactive: any[] };
                }>
            };

            // Step 1: Generate Scaffold
            console.log('🏗️  Step 1: Generating module scaffold...');
            const scaffoldContext = {
                ...baseContext,
                metadata: { ...baseContext.metadata, action: 'generate_scaffold' }
            };
            
            results.scaffold = await orchestrator.executeAgent(AgentType.TEACH_MODULE_GENERATOR, scaffoldContext);
            const scaffoldData = JSON.parse(results.scaffold.content);
            console.log(`✅ Scaffold generated with ${scaffoldData.sections.length} sections`);

            // Step 2 & 3: Generate Content and Interactive blocks for each section
            for (let i = 0; i < scaffoldData.sections.length; i++) {
                const section = scaffoldData.sections[i];
                console.log(`📖 Step 2.${i + 1}: Generating content for section "${section.title}"`);
                
                // Generate Content
                const contentContext = {
                    ...baseContext,
                    metadata: {
                        ...baseContext.metadata,
                        action: 'generate_content',
                        moduleParams: {
                            ...baseContext.metadata.moduleParams,
                            section: section
                        }
                    }
                };

                const contentResult = await orchestrator.executeAgent(AgentType.TEACH_MODULE_GENERATOR, contentContext);
                const contentData = JSON.parse(contentResult.content);

                console.log(`🧠 Step 3.${i + 1}: Generating interactive blocks for section "${section.title}"`);
                
                // Generate Interactive content (using the generated content as context)
                const sectionContent = contentData.blocks
                    .map((block: any) => {
                        if (block.type === 'heading') return `<h${block.config.size}>${block.config.text}</h${block.config.size}>`;
                        if (block.type === 'richText') return block.config.html;
                        return '';
                    })
                    .join('\n');

                const interactiveContext = {
                    ...baseContext,
                    metadata: {
                        ...baseContext.metadata,
                        action: 'generate_interactive',
                        moduleParams: {
                            ...baseContext.metadata.moduleParams,
                            section: section,
                            sectionContent: sectionContent
                        }
                    }
                };

                const interactiveResult = await orchestrator.executeAgent(AgentType.TEACH_MODULE_GENERATOR, interactiveContext);
                const interactiveData = JSON.parse(interactiveResult.content);

                // Combine section data
                results.sections.push({
                    sectionInfo: section,
                    content: {
                        blocks: contentData.blocks,
                        metadata: JSON.parse(contentResult.content)
                    },
                    interactive: {
                        blocks: interactiveData.interactiveBlocks,
                        metadata: JSON.parse(interactiveResult.content)
                    },
                    sources: {
                        content: contentResult.sources || [],
                        interactive: interactiveResult.sources || []
                    }
                });

                console.log(`✅ Section "${section.title}" completed`);
            }

            console.log(`🎉 Complete module generated with ${results.sections.length} sections`);

            return json({
                success: true,
                action: 'generate_complete_module',
                timestamp: new Date().toISOString(),
                result: {
                    module: {
                        scaffold: JSON.parse(results.scaffold.content),
                        sections: results.sections,
                        totalSections: results.sections.length,
                        totalContentBlocks: results.sections.reduce((sum, s) => sum + s.content.blocks.length, 0),
                        totalInteractiveBlocks: results.sections.reduce((sum, s) => sum + s.interactive.blocks.length, 0)
                    },
                    metadata: {
                        stage: 'complete_module',
                        sectionsGenerated: results.sections.length,
                        totalBlocks: results.sections.reduce((sum, s) => sum + s.content.blocks.length + s.interactive.blocks.length, 0)
                    },
                    sources: results.scaffold.sources || []
                },
                context: {
                    userId: baseContext.userId,
                    sessionId: baseContext.sessionId,
                    moduleId: baseContext.moduleId,
                    action: action
                }
            });
        }

        // Handle individual actions (existing functionality)
        const context = baseContext;

        // For content and interactive generation, add section data if not provided
        if (action === 'generate_content' || action === 'generate_interactive') {
            if (!context.metadata.moduleParams.section) {
                context.metadata.moduleParams.section = {
                    title: 'Glycolysis Process',
                    objective: 'Understand the steps of glycolysis and ATP production',
                    prerequisites: ['Basic chemistry knowledge', 'Cell structure understanding'],
                    concepts: ['ATP production', 'Glucose breakdown', 'Energy transfer', 'Cellular respiration'],
                    skills: ['Calculate ATP yield', 'Identify reaction steps', 'Analyze metabolic pathways'],
                    difficulty: 'intermediate'
                };
            }
        }

        if (action === 'generate_interactive' && !context.metadata.moduleParams.sectionContent) {
            context.metadata.moduleParams.sectionContent = `
            <h2>Understanding Glycolysis</h2>
            <p>Glycolysis is the metabolic pathway that converts glucose into pyruvate, generating ATP and NADH in the process.</p>
            <p>Key points covered:</p>
            <ul>
                <li>The 10-step process of glucose breakdown</li>
                <li>Energy investment and energy payoff phases</li>
                <li>Net ATP production calculation</li>
                <li>Role of enzymes in regulation</li>
            </ul>
            `;
        }

        // Execute the agent
        const result = await orchestrator.executeAgent(AgentType.TEACH_MODULE_GENERATOR, context);

        // Parse content if it's a JSON string
        let parsedContent = result.content;
        try {
            parsedContent = JSON.parse(result.content);
        } catch {
            // Content is already an object or not JSON
        }

        return json({
            success: true,
            action,
            timestamp: new Date().toISOString(),
            result: {
                content: parsedContent,
                metadata: result.metadata,
                sourcesCount: result.sources?.length || 0,
                sources: result.sources?.slice(0, 3) || [] // Return first 3 sources for reference
            },
            context: {
                userId: context.userId,
                sessionId: context.sessionId,
                moduleId: context.moduleId,
                action: context.metadata.action
            }
        });

    } catch (error) {
        console.error('Module generation error:', error);
        
        return json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'Unknown error',
                type: error instanceof Error ? error.constructor.name : 'UnknownError',
                stack: process.env.NODE_ENV === 'development' ? 
                    (error instanceof Error ? error.stack : undefined) : undefined
            },
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
};

export const GET: RequestHandler = async () => {
    // Return API documentation and test examples
    return json({
        message: 'Teach Me Module Generator API',
        version: '1.0.0',
        availableActions: [
            {
                action: 'generate_complete_module',
                description: 'Generates a complete learning module with scaffold, content, and interactive blocks for all sections',
                requiredParams: ['title', 'description', 'subjectId', 'subjectType'],
                optionalParams: ['learningAreaIds', 'keyKnowledgeIds', 'keySkillIds'],
                note: 'This executes scaffold → content → interactive generation for each section automatically'
            },
            {
                action: 'generate_scaffold',
                description: 'Creates the overall module structure and learning objectives',
                requiredParams: ['title', 'description', 'subjectId', 'subjectType'],
                optionalParams: ['learningAreaIds', 'keyKnowledgeIds', 'keySkillIds']
            },
            {
                action: 'generate_content',
                description: 'Generates explanatory content blocks for a section',
                requiredParams: ['subjectId', 'section'],
                optionalParams: ['examples', 'prerequisites']
            },
            {
                action: 'generate_interactive',
                description: 'Creates interactive learning blocks with questions and activities',
                requiredParams: ['subjectId', 'subjectType', 'section', 'sectionContent'],
                optionalParams: ['difficulty', 'numberOfBlocks']
            }
        ],
        subjects: [
            { id: 1000, name: 'Accounting', type: 'default' },
            { id: 1001, name: 'Biology', type: 'science' },
            { id: 1002, name: 'Business Management', type: 'default' },
            { id: 1003, name: 'Chemistry', type: 'science' },
            { id: 1004, name: 'Economics', type: 'default' },
            { id: 1005, name: 'English', type: 'english' },
            { id: 1011, name: 'Mathematical Methods', type: 'mathematics' },
            { id: 1013, name: 'Physics', type: 'science' },
            { id: 1014, name: 'Psychology', type: 'science' }
        ],
        examples: {
            completeModule: {
                method: 'POST',
                url: '/api/teach-me/generate',
                body: {
                    action: 'generate_complete_module',
                    params: {
                        title: 'Understanding Photosynthesis',
                        description: 'Complete learning module covering light-dependent and independent reactions',
                        subjectId: 1001,
                        subjectType: 'science'
                    }
                }
            },
            scaffold: {
                method: 'POST',
                url: '/api/teach-me/generate',
                body: {
                    action: 'generate_scaffold',
                    params: {
                        title: 'Understanding Cellular Respiration',
                        description: 'Learn how cells convert glucose into ATP energy',
                        subjectId: 1001,
                        subjectType: 'science'
                    }
                }
            },
            content: {
                method: 'POST',
                url: '/api/teach-me/generate',
                body: {
                    action: 'generate_content',
                    params: {
                        subjectId: 1001,
                        section: {
                            title: 'Glycolysis Process',
                            objective: 'Understand glucose breakdown',
                            concepts: ['ATP', 'glucose', 'enzymes'],
                            prerequisites: ['basic chemistry']
                        }
                    }
                }
            },
            interactive: {
                method: 'POST',
                url: '/api/teach-me/generate',
                body: {
                    action: 'generate_interactive',
                    params: {
                        subjectId: 1001,
                        subjectType: 'science',
                        section: {
                            title: 'Photosynthesis',
                            concepts: ['chloroplasts', 'light reactions'],
                            difficulty: 'intermediate'
                        },
                        sectionContent: 'Content about photosynthesis process...'
                    }
                }
            }
        }
    });
};