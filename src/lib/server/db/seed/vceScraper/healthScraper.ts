import fs from 'fs';
import path from 'path';

// Types for Health and Human Development
export interface HealthLearningActivity {
  unit: string;
  areaOfStudy: string;
  outcome: string;
  title: string;
  description: string;
}

export interface HealthDetailedExample {
  unit: string;
  areaOfStudy: string;
  name: string;
  description: string;
}

export interface HealthSubjectData {
  subject: string;
  learningActivities: HealthLearningActivity[];
  detailedExamples: HealthDetailedExample[];
}

// Function to clean HTML and extract text
function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&') // Replace &amp;
    .replace(/&lt;/g, '<') // Replace &lt;
    .replace(/&gt;/g, '>') // Replace &gt;
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Trim whitespace
}

// Function to extract unit and area of study from title
function parseUnitAreaTitle(title: string): { unit: string; areaOfStudy: string } {
  // Pattern: "Unit X Area of Study Y: Title"
  const match = title.match(/Unit (\d+) Area of Study (\d+):\s*(.+)/);
  if (match) {
    return {
      unit: `Unit ${match[1]}`,
      areaOfStudy: `Area of Study ${match[2]}`
    };
  }
  
  // Fallback patterns
  if (title.includes('Unit 1')) return { unit: 'Unit 1', areaOfStudy: 'Unknown' };
  if (title.includes('Unit 2')) return { unit: 'Unit 2', areaOfStudy: 'Unknown' };
  if (title.includes('Unit 3')) return { unit: 'Unit 3', areaOfStudy: 'Unknown' };
  if (title.includes('Unit 4')) return { unit: 'Unit 4', areaOfStudy: 'Unknown' };
  
  return { unit: 'Unknown', areaOfStudy: 'Unknown' };
}

// Function to extract learning activities from HTML
function extractLearningActivities(htmlContent: string, unit: string, areaOfStudy: string, outcome: string): HealthLearningActivity[] {
    const activities: HealthLearningActivity[] = [];
    
    // Extract all learning activities from ul elements that might contain them
    const activityContainerRegex = /<ul(?:[^>]*class="[^"]*example[^"]*"[^>]*|[^>]*)>(.*?)<\/ul>/gs;
    const containerMatches = htmlContent.match(activityContainerRegex);
    
    if (containerMatches) {
        containerMatches.forEach((containerHtml) => {
            // Extract activities recursively to handle nested structures
            const extractActivitiesRecursively = (html: string): void => {
                const liRegex = /<li[^>]*>(.*?)<\/li>/gs;
                let match;
                
                while ((match = liRegex.exec(html)) !== null) {
                    const liContent = match[1];
                    
                    // Check if this li contains nested ul elements
                    const nestedUlMatches = liContent.match(/<ul[^>]*>(.*?)<\/ul>/gs);
                    
                    if (nestedUlMatches) {
                        // Extract main text before any nested content
                        const mainTextMatch = liContent.match(/^(.*?)(?=<ul)/s);
                        if (mainTextMatch) {
                            const mainText = cleanHtml(mainTextMatch[1]);
                            
                            if (mainText && mainText.length > 15) {
                                const sentences = mainText.split(/(?<=[.!?])\s+/);
                                const firstSentence = sentences[0]?.trim() || mainText;
                                const title = firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence;
                                
                                activities.push({
                                    unit,
                                    areaOfStudy,
                                    outcome,
                                    title,
                                    description: mainText
                                });
                            }
                        }
                        
                        // Process nested ul elements recursively
                        nestedUlMatches.forEach(nestedUl => {
                            extractActivitiesRecursively(nestedUl);
                        });
                    } else {
                        // Simple li without nested content
                        const cleanedText = cleanHtml(liContent);
                        
                        if (cleanedText && cleanedText.length > 10) {
                            const sentences = cleanedText.split(/(?<=[.!?])\s+/);
                            const firstSentence = sentences[0]?.trim() || cleanedText;
                            const title = firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence;
                            
                            activities.push({
                                unit,
                                areaOfStudy,
                                outcome,
                                title,
                                description: cleanedText
                            });
                        }
                    }
                }
            };
            
            extractActivitiesRecursively(containerHtml);
        });
    }
    
    // Fallback: Extract all li elements from the entire HTML if we didn't find enough activities
    if (activities.length < 10) {
        const allLiMatches = htmlContent.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
        
        allLiMatches.forEach((liHtml) => {
            const liContent = liHtml.replace(/<li[^>]*>|<\/li>/g, '');
            const cleanedText = cleanHtml(liContent);
            
            // Only add if it's substantial content and we haven't seen it before
            if (cleanedText && cleanedText.length > 20) {
                const exists = activities.some(activity => 
                    activity.description.substring(0, 100) === cleanedText.substring(0, 100)
                );
                
                if (!exists) {
                    const sentences = cleanedText.split(/(?<=[.!?])\s+/);
                    const firstSentence = sentences[0]?.trim() || cleanedText;
                    const title = firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence;
                    
                    activities.push({
                        unit,
                        areaOfStudy,
                        outcome,
                        title,
                        description: cleanedText
                    });
                }
            }
        });
    }
    
    return activities;
}

// Function to extract detailed examples from HTML
function extractDetailedExamples(html: string, unit: string, areaOfStudy: string): HealthDetailedExample[] {
  const examples: HealthDetailedExample[] = [];
  
  // Look for detailed example sections
  const exampleMatches = html.match(/<div class="notebox"><h2>Detailed example<\/h2><p><strong>([^<]+)<\/strong><\/p>(.*?)<\/div>/gs);
  
  if (!exampleMatches) return examples;
  
  for (const match of exampleMatches) {
    const titleMatch = match.match(/<p><strong>([^<]+)<\/strong><\/p>/);
    const contentMatch = match.match(/<p><strong>[^<]+<\/strong><\/p>(.*?)$/s);
    
    if (titleMatch && contentMatch) {
      const name = titleMatch[1].trim();
      const description = cleanHtml(contentMatch[1]);
      
      examples.push({
        unit,
        areaOfStudy,
        name,
        description
      });
    }
  }
  
  return examples;
}

// Main scraper function for Health and Human Development
async function scrapeHealthAndHumanDevelopment(jsonUrl: string): Promise<HealthSubjectData> {
  try {
    console.log(`Fetching Health and Human Development data from: ${jsonUrl}`);
    
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const learningActivities: HealthLearningActivity[] = [];
    const detailedExamples: HealthDetailedExample[] = [];
    
    // Navigate through the JSON structure to find accordion components
    let components = null;
    
    // Try different possible paths for components
    if (data.pageProps?.page?.field_components) {
      components = data.pageProps.page.field_components;
    } else if (data.props?.pageProps?.page?.field_components) {
      components = data.props.pageProps.page.field_components;
    } else if (data.page?.field_components) {
      components = data.page.field_components;
    } else if (data.field_components) {
      components = data.field_components;
    } else {
      // Look for any field_components anywhere in the structure
      const findComponents = (obj: unknown, path = ''): unknown => {
        if (obj && typeof obj === 'object' && obj !== null) {
          const objRecord = obj as Record<string, unknown>;
          if (objRecord.field_components) {
            return objRecord.field_components;
          }
          for (const [key, value] of Object.entries(objRecord)) {
            const result = findComponents(value, path ? `${path}.${key}` : key);
            if (result) return result;
          }
        }
        return null;
      };
      
      components = findComponents(data);
    }
    
    if (!components) {
      console.log('No field_components found in the data structure');
      return {
        subject: 'Health and Human Development',
        learningActivities,
        detailedExamples
      };
    }
    
    console.log(`Found ${components.length} components`);
    
    // Process each component looking for accordion sections
    for (const component of components) {
      if (component.type === 'paragraph--accordion') {
        const accordionTitle = component.field_accordion_title || '';
        const accordionHtml = component.field_accordion_body?.processed || '';
        
        console.log(`Processing accordion: ${accordionTitle}`);
        
        // Check if this is a unit/area of study section
        if (accordionTitle.includes('Unit') && accordionTitle.includes('Area of Study')) {
          const { unit, areaOfStudy } = parseUnitAreaTitle(accordionTitle);
          
          console.log(`  Extracted: ${unit}, ${areaOfStudy}`);
          
          // Extract outcome information from the HTML content
          const outcomeMatch = accordionHtml.match(/<h3>Outcome\s+(\d+):<br>&nbsp;<\/h3><p>(.*?)<\/p>/s);
          const outcome = outcomeMatch ? `Outcome ${outcomeMatch[1]}` : `${unit} ${areaOfStudy}`;
          
          // Extract learning activities
          const activities = extractLearningActivities(accordionHtml, unit, areaOfStudy, outcome);
          learningActivities.push(...activities);
          console.log(`  Found ${activities.length} learning activities`);
          
          // Extract detailed examples
          const examples = extractDetailedExamples(accordionHtml, unit, areaOfStudy);
          detailedExamples.push(...examples);
          console.log(`  Found ${examples.length} detailed examples`);
        }
      }
    }
    
    console.log(`Total learning activities extracted: ${learningActivities.length}`);
    console.log(`Total detailed examples extracted: ${detailedExamples.length}`);
    
    return {
      subject: 'Health and Human Development',
      learningActivities,
      detailedExamples
    };
    
  } catch (error) {
    console.error('Error scraping Health and Human Development:', error);
    throw error;
  }
}

// Function to save Health and Human Development data to JSON file
function saveHealthDataToFile(healthData: HealthSubjectData): void {
  const filename = 'health_and_human_development_curriculum_data.json';
  const outputPath = path.join(process.cwd(), 'data', filename);
  
  // Ensure data directory exists
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(healthData, null, 2));
  console.log(`Health and Human Development curriculum data saved to: ${outputPath}`);
}

// Main execution function
async function main() {
  try {
    console.log('Starting Health and Human Development curriculum scraping...');
    
    const teachingUrl = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/health-and-human-development/teaching-and-learning.json';
    
    // Scrape Health and Human Development data
    const healthData = await scrapeHealthAndHumanDevelopment(teachingUrl);
    
    // Save to file
    saveHealthDataToFile(healthData);
    
    // Display summary
    console.log('\n=== HEALTH AND HUMAN DEVELOPMENT SUMMARY ===');
    console.log(`Subject: ${healthData.subject}`);
    console.log(`Learning Activities: ${healthData.learningActivities.length}`);
    console.log(`Detailed Examples: ${healthData.detailedExamples.length}`);
    
    console.log('\n=== LEARNING ACTIVITIES BY UNIT AND AREA ===');
    const groupedActivities = healthData.learningActivities.reduce((acc, activity) => {
      const key = `${activity.unit} - ${activity.areaOfStudy}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    }, {} as Record<string, HealthLearningActivity[]>);
    
    Object.entries(groupedActivities).forEach(([key, activities]) => {
      console.log(`\n${key}: ${activities.length} activities`);
    });
    
    console.log('\n=== DETAILED EXAMPLES BY UNIT AND AREA ===');
    const groupedExamples = healthData.detailedExamples.reduce((acc, example) => {
      const key = `${example.unit} - ${example.areaOfStudy}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(example);
      return acc;
    }, {} as Record<string, HealthDetailedExample[]>);
    
    Object.entries(groupedExamples).forEach(([key, examples]) => {
      console.log(`${key}: ${examples.length} examples`);
    });
    
  } catch (error) {
    console.error('Health and Human Development scraping failed:', error);
    process.exit(1);
  }
}

// Export for module use or run directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}

export { scrapeHealthAndHumanDevelopment };
