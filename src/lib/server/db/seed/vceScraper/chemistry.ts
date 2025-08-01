import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface ChemistryLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
  topic: string;
}

interface ChemistryDetailedExample {
  title: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
  description: string;
}

interface ChemistryAssessmentTask {
  task: string;
  unit: number;
  description: string;
}

interface ChemistryCurriculumData {
  learningActivities: ChemistryLearningActivity[];
  detailedExamples: ChemistryDetailedExample[];
  assessmentTasks: ChemistryAssessmentTask[];
}

function cleanHtml(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseUnitAreaTitle(title: string): { unit: number; areaOfStudy: string } {
  const match = title.match(/Unit (\d+) – Area of Study \d+: (.+)/);
  if (match) {
    return {
      unit: parseInt(match[1]),
      areaOfStudy: match[2].trim()
    };
  }
  
  // Fallback for different formats
  const unitMatch = title.match(/Unit (\d+)/);
  const unit = unitMatch ? parseInt(unitMatch[1]) : 1;
  
  return {
    unit,
    areaOfStudy: title.replace(/Unit \d+ – Area of Study \d+:\s*/, '').trim()
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLearningActivities(data: any): ChemistryLearningActivity[] {
  const activities: ChemistryLearningActivity[] = [];
  
  // Try different possible paths for Chemistry data
  let components = null;
  
  if (data.pageProps?.page?.field_components) {
    components = data.pageProps.page.field_components;
  } else if (data.pageProps?.node?.field_components) {
    components = data.pageProps.node.field_components;
  } else {
    console.log('Searching for components in data structure...');
    console.log('Available keys in data:', Object.keys(data));
    console.log('Available keys in pageProps:', data.pageProps ? Object.keys(data.pageProps) : 'No pageProps');
    
    if (data.pageProps) {
      for (const key of Object.keys(data.pageProps)) {
        const item = data.pageProps[key];
        if (item && typeof item === 'object' && item.field_components) {
          console.log(`Found field_components in pageProps.${key}`);
          components = item.field_components;
          break;
        }
      }
    }
  }
  
  if (!components) {
    console.log('No field_components found in Chemistry data');
    return activities;
  }
  
  console.log(`Found ${components.length} components`);
  
  for (const component of components) {  
    if (component.type === 'paragraph--accordion' && component.field_accordion_body?.processed) {
      const processed = component.field_accordion_body.processed;
      const title = component.field_accordion_title || '';
      
      console.log(`Processing section: ${title}`);
      
      const { unit, areaOfStudy } = parseUnitAreaTitle(title);
      
      // Extract outcome from the processed content
      const outcomeMatch = processed.match(/<h3>Outcome (\d+)/);
      const outcome = outcomeMatch ? `Outcome ${outcomeMatch[1]}` : 'Outcome 1';
      
      // Look for activity sections with topics
      const topicSections = processed.split(/<p>\s*<strong>Key knowledge:/);
      
      for (let i = 1; i < topicSections.length; i++) {
        const section = topicSections[i];
        
        // Extract topic name
        const topicMatch = section.match(/^([^<]+)/);
        const topic = topicMatch ? cleanHtml(topicMatch[1].trim()) : 'General';
        
        console.log(`  Found topic: ${topic}`);
        
        // Find activity lists
        const listMatches = section.match(/<ul class="examplebox">(.*?)<\/ul>/gs);
        
        if (listMatches) {
          for (const listMatch of listMatches) {
            const activityMatches = listMatch.match(/<li[^>]*>(.*?)<\/li>/gs);
            
            if (activityMatches) {
              for (const activityMatch of activityMatches) {
                const activityText = cleanHtml(activityMatch.replace(/<li[^>]*>/, '').replace(/<\/li>$/, ''));
                
                if (activityText && 
                    activityText.length > 10 && 
                    !activityText.startsWith('Investigation topic') &&
                    !activityText.includes('examplesAnchor') &&
                    !activityText.includes('exampleno-border')) {
                  
                  activities.push({
                    activity: activityText,
                    unit,
                    areaOfStudy,
                    outcome,
                    topic
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  
  return activities;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDetailedExamples(data: any): ChemistryDetailedExample[] {
  const examples: ChemistryDetailedExample[] = [];
  
  // Try different possible paths for Chemistry data
  let components = null;
  
  if (data.pageProps?.page?.field_components) {
    components = data.pageProps.page.field_components;
  } else if (data.pageProps?.node?.field_components) {
    components = data.pageProps.node.field_components;
  } else {
    if (data.pageProps) {
      for (const key of Object.keys(data.pageProps)) {
        const item = data.pageProps[key];
        if (item && typeof item === 'object' && item.field_components) {
          components = item.field_components;
          break;
        }
      }
    }
  }
  
  if (!components) {
    return examples;
  }
  
  for (const component of components) {
    if (component.type === 'paragraph--accordion' && component.field_accordion_body?.processed) {
      const processed = component.field_accordion_body.processed;
      const title = component.field_accordion_title || '';
      
      const { unit, areaOfStudy } = parseUnitAreaTitle(title);
      
      const outcomeMatch = processed.match(/<h3>Outcome (\d+)/);
      const outcome = outcomeMatch ? `Outcome ${outcomeMatch[1]}` : 'Outcome 1';
      
      // Look for detailed examples
      const exampleMatches = processed.match(/<div class="notebox">.*?<h2>Detailed example<\/h2>.*?<h3>([^<]+).*?<\/div>/gs);
      
      if (exampleMatches) {
        for (const exampleMatch of exampleMatches) {
          const titleMatch = exampleMatch.match(/<h3>([^<]+)/);
          const exampleTitle = titleMatch ? cleanHtml(titleMatch[1]) : 'Chemistry Example';
          
          const description = cleanHtml(exampleMatch);
          
          if (exampleTitle && description.length > 50) {
            examples.push({
              title: exampleTitle,
              unit,
              areaOfStudy,
              outcome,
              description
            });
          }
        }
      }
    }
  }
  
  return examples;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAssessmentTasks(assessmentData: any): ChemistryAssessmentTask[] {
  const tasks: ChemistryAssessmentTask[] = [];
  
  if (!assessmentData || !assessmentData.pageProps?.node?.field_components) {
    console.log('No assessment components found');
    return tasks;
  }
  
  const components = assessmentData.pageProps.node.field_components;
  console.log(`Found ${components.length} assessment components`);
  
  for (const component of components) {
    if (component.type === 'paragraph--accordion' && component.field_accordion_body?.processed) {
      const title = component.field_accordion_title || '';
      const processed = component.field_accordion_body.processed;
      
      // Look for Units 1 and 2 assessment task sections
      if (title.includes('Units 1 and 2') && title.toLowerCase().includes('assessment task')) {
        console.log(`Processing assessment section: ${title}`);
        
        // Extract table data from the processed HTML
        const tableMatches = processed.match(/<table[^>]*class="tablestyle3"[^>]*>(.*?)<\/table>/gs);
        
        if (tableMatches) {
          for (const tableMatch of tableMatches) {
            // Extract rows from table
            const rowMatches = tableMatch.match(/<tr[^>]*>(.*?)<\/tr>/gs);
            
            if (rowMatches) {
              for (let i = 1; i < rowMatches.length; i++) { // Skip header row
                const row = rowMatches[i];
                const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gs);
                
                if (cellMatches && cellMatches.length >= 2) {
                  const taskName = cleanHtml(cellMatches[0].replace(/<td[^>]*>/, '').replace(/<\/td>$/, ''));
                  const description = cleanHtml(cellMatches[1].replace(/<td[^>]*>/, '').replace(/<\/td>$/, ''));
                  
                  if (taskName && description && taskName.length > 10) {
                    // Create task for Unit 1
                    tasks.push({
                      task: taskName,
                      unit: 1,
                      description
                    });
                    
                    // Create task for Unit 2
                    tasks.push({
                      task: taskName,
                      unit: 2,
                      description
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  return tasks;
}

async function scrapeChemistryCurriculumData(): Promise<ChemistryCurriculumData> {
  console.log('Fetching Chemistry curriculum data...');
  
  const curriculumUrl = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/chemistry/teaching-and-learning.json';
  const assessmentUrl = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/chemistry/assessment.json';
  
  try {
    // Fetch curriculum data
    console.log('Fetching curriculum data...');
    const curriculumResponse = await fetch(curriculumUrl);
    if (!curriculumResponse.ok) {
      throw new Error(`HTTP error! status: ${curriculumResponse.status}`);
    }
    const curriculumData = await curriculumResponse.json();
    
    // Fetch assessment data
    console.log('Fetching assessment data...');
    const assessmentResponse = await fetch(assessmentUrl);
    if (!assessmentResponse.ok) {
      throw new Error(`HTTP error! status: ${assessmentResponse.status}`);
    }
    const assessmentData = await assessmentResponse.json();
    
    console.log('Extracting learning activities...');
    const learningActivities = extractLearningActivities(curriculumData);
    
    console.log('Extracting detailed examples...');
    const detailedExamples = extractDetailedExamples(curriculumData);
    
    console.log('Extracting assessment tasks...');
    const assessmentTasks = extractAssessmentTasks(assessmentData);
    
    const data: ChemistryCurriculumData = {
      learningActivities,
      detailedExamples,
      assessmentTasks
    };
    
    // Save to file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outputPath = path.join(__dirname, 'data', 'chemistry_curriculum_data.json');
    
    // Ensure the data directory exists
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`Chemistry curriculum data saved to: ${outputPath}`);
    console.log(`Learning Activities: ${learningActivities.length}`);
    console.log(`Detailed Examples: ${detailedExamples.length}`);
    console.log(`Assessment Tasks: ${assessmentTasks.length}`);
    
    return data;
    
  } catch (error) {
    console.error('Error scraping Chemistry curriculum data:', error);
    throw error;
  }
}

// Run the scraper if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeChemistryCurriculumData().catch(console.error);
}

export { scrapeChemistryCurriculumData, type ChemistryCurriculumData };
