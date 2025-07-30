import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EconomicsLearningActivity {
    activity: string;
    unit: number;
    areaOfStudy: string;
    outcome: string;
}

interface EconomicsDetailedExample {
    title: string;
    content: string;
    unit: number;
    areaOfStudy: string;
    outcome: string;
}

interface EconomicsAssessmentTask {
    unit: number;
    areaOfStudy: string;
    outcome: string;
    task: string;
}

interface EconomicsCurriculumData {
    learningActivities: EconomicsLearningActivity[];
    detailedExamples: EconomicsDetailedExample[];
    assessmentTasks: EconomicsAssessmentTask[];
}

interface FieldComponent {
    type: string;
    field_accordion_title?: string;
    field_accordion_body?: {
        processed?: string;
    };
}

function cleanHtml(htmlString: string): string {
    return htmlString
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

function parseUnitAreaTitle(title: string): { unit: number; areaOfStudy: string } {
    console.log(`Parsing title: "${title}"`);
    
    // Handle different title formats for Economics
    if (title.includes('Unit 1 Area of Study 1')) {
        return { unit: 1, areaOfStudy: 'Thinking like an economist' };
    } else if (title.includes('Unit 1 Area of Study 2')) {
        return { unit: 1, areaOfStudy: 'Decision-making in markets' };
    } else if (title.includes('Unit 1 Area of Study 3')) {
        return { unit: 1, areaOfStudy: 'Behavioural economics' };
    } else if (title.includes('Unit 2 Area of Study 1')) {
        return { unit: 2, areaOfStudy: 'Economic activity' };
    } else if (title.includes('Unit 2 Area of Study 2')) {
        return { unit: 2, areaOfStudy: 'Applied economic analysis of local, national and international economic issues' };
    } else if (title.includes('Unit 3 Area of Study 1')) {
        return { unit: 3, areaOfStudy: 'An introduction to microeconomics: the market system, resource allocation and government intervention' };
    } else if (title.includes('Unit 3 Area of Study 2')) {
        return { unit: 3, areaOfStudy: 'Domestic macroeconomic goals' };
    } else if (title.includes('Unit 3 Area of Study 3')) {
        return { unit: 3, areaOfStudy: 'Australia and the international economy' };
    } else if (title.includes('Unit 4 Area of Study 1')) {
        return { unit: 4, areaOfStudy: 'Aggregate demand policies and domestic economic stability' };
    } else if (title.includes('Unit 4 Area of Study 2')) {
        return { unit: 4, areaOfStudy: 'Aggregate supply policies' };
    }
    
    console.warn(`Could not parse unit and area from title: ${title}`);
    return { unit: 0, areaOfStudy: 'Unknown' };
}

function extractOutcome(htmlContent: string): string {
    // Look for outcome patterns in Economics content
    const outcomeMatch = htmlContent.match(/<h3>Outcome (\d+)/i);
    if (outcomeMatch) {
        return `Outcome ${outcomeMatch[1]}`;
    }
    return 'Outcome 1'; // Default fallback
}

function extractLearningActivities(fieldComponents: FieldComponent[]): EconomicsLearningActivity[] {
    const activities: EconomicsLearningActivity[] = [];
    
    console.log(`Processing ${fieldComponents.length} field components for learning activities`);
    
    for (const component of fieldComponents) {
        if (component.type === 'paragraph--accordion' && component.field_accordion_body?.processed) {
            const content = component.field_accordion_body.processed;
            const title = component.field_accordion_title || '';
            
            console.log(`Processing accordion: ${title}`);
            
            // Parse unit and area of study from title
            const { unit, areaOfStudy } = parseUnitAreaTitle(title);
            
            if (unit === 0) continue; // Skip if we couldn't parse
            
            // Extract outcome from content
            const outcome = extractOutcome(content);
            
            // Look for learning activities section
            const activitiesMatch = content.match(/<h3>Examples of learning activities<\/h3>[\s\S]*?<ul[^>]*class="examplebox"[^>]*>([\s\S]*?)<\/ul>/i);
            
            if (activitiesMatch) {
                const activitiesHtml = activitiesMatch[1];
                
                // Extract individual activities from list items
                const activityMatches = activitiesHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/g);
                
                if (activityMatches) {
                    console.log(`Found ${activityMatches.length} activities in ${title}`);
                    
                    for (const activityMatch of activityMatches) {
                        const activityText = cleanHtml(activityMatch);
                        
                        if (activityText && activityText.length > 10) {
                            activities.push({
                                activity: activityText,
                                unit,
                                areaOfStudy,
                                outcome
                            });
                        }
                    }
                }
            }
        }
    }
    
    return activities;
}

function extractDetailedExamples(fieldComponents: FieldComponent[]): EconomicsDetailedExample[] {
    const examples: EconomicsDetailedExample[] = [];
    
    console.log(`Processing ${fieldComponents.length} field components for detailed examples`);
    
    for (const component of fieldComponents) {
        if (component.type === 'paragraph--accordion' && component.field_accordion_body?.processed) {
            const content = component.field_accordion_body.processed;
            const title = component.field_accordion_title || '';
            
            // Parse unit and area of study from title
            const { unit, areaOfStudy } = parseUnitAreaTitle(title);
            
            if (unit === 0) continue; // Skip if we couldn't parse
            
            // Extract outcome from content
            const outcome = extractOutcome(content);
            
            // Look for detailed examples in notebox divs
            const exampleMatches = content.match(/<div[^>]*class="notebox"[^>]*>([\s\S]*?)<\/div>/g);
            
            if (exampleMatches) {
                console.log(`Found ${exampleMatches.length} detailed examples in ${title}`);
                
                for (const exampleMatch of exampleMatches) {
                    // Extract title from h2 or h3 tag
                    const titleMatch = exampleMatch.match(/<h[23]>([^<]*)<\/h[23]>/);
                    const exampleTitle = titleMatch ? cleanHtml(titleMatch[1]) : 'Detailed example';
                    
                    const exampleContent = cleanHtml(exampleMatch);
                    
                    if (exampleContent && exampleContent.length > 50) {
                        examples.push({
                            title: exampleTitle,
                            content: exampleContent,
                            unit,
                            areaOfStudy,
                            outcome
                        });
                    }
                }
            }
        }
    }
    
    return examples;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractAssessmentTasks(_fieldComponents: FieldComponent[]): EconomicsAssessmentTask[] {
    // Economics doesn't seem to have assessment tasks in the teaching/learning endpoint
    // This would likely be in a separate assessment endpoint
    return [];
}

async function scrapeEconomicsCurriculumData(): Promise<EconomicsCurriculumData> {
    try {
        console.log('Fetching Economics curriculum data...');
        
        const response = await fetch('https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/economics/teaching-and-learning.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data fetched successfully');
        
        // Debug: log the structure to understand the JSON format
        console.log('Available data keys:', Object.keys(data));
        if (data.pageProps) {
            console.log('pageProps keys:', Object.keys(data.pageProps));
            if (data.pageProps.node) {
                console.log('node keys:', Object.keys(data.pageProps.node));
                if (data.pageProps.node.field_components) {
                    console.log('field_components found in node, length:', data.pageProps.node.field_components.length);
                }
            }
        }
        
        // Try different navigation paths
        let fieldComponents = data?.pageProps?.node?.field_components || [];
        
        console.log(`Found ${fieldComponents.length} field components in node`);
        
        // If still not found, try other paths
        if (fieldComponents.length === 0) {
            fieldComponents = data?.pageProps?.page?.field_components || [];
            console.log(`Found ${fieldComponents.length} field components in page`);
        }
        
        console.log(`Found ${fieldComponents.length} field components`);
        
        // Extract different types of content
        const learningActivities = extractLearningActivities(fieldComponents);
        const detailedExamples = extractDetailedExamples(fieldComponents);
        const assessmentTasks = extractAssessmentTasks(fieldComponents);
        
        console.log(`Extracted:`);
        console.log(`- Learning Activities: ${learningActivities.length}`);
        console.log(`- Detailed Examples: ${detailedExamples.length}`);
        console.log(`- Assessment Tasks: ${assessmentTasks.length}`);
        
        return {
            learningActivities,
            detailedExamples,
            assessmentTasks
        };
        
    } catch (error) {
        console.error('Error scraping Economics curriculum data:', error);
        throw error;
    }
}

// Main execution
async function main() {
    try {
        const curriculumData = await scrapeEconomicsCurriculumData();
        
        // Write to file
        const outputPath = path.join(__dirname, 'data', 'economics_curriculum_data.json');
        
        // Ensure data directory exists
        const dataDir = path.dirname(outputPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, JSON.stringify(curriculumData, null, 2));
        
        console.log(`\nData written to: ${outputPath}`);
        console.log(`\nSummary:`);
        console.log(`- Learning Activities: ${curriculumData.learningActivities.length}`);
        console.log(`- Detailed Examples: ${curriculumData.detailedExamples.length}`);
        console.log(`- Assessment Tasks: ${curriculumData.assessmentTasks.length}`);
        
    } catch (error) {
        console.error('Failed to scrape Economics curriculum data:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default main;
