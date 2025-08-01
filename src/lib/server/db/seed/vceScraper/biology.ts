import fs from 'fs';
import path from 'path';

// Types for Biology curriculum data
interface BiologyLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface BiologyDetailedExample {
  title: string;
  content: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface BiologyAssessmentTask {
  unit: string;
  title: string;
  description: string;
}

// Combined interface
interface BiologyCombinedData {
  learningActivities: BiologyLearningActivity[];
  detailedExamples: BiologyDetailedExample[];
  assessmentTasks: BiologyAssessmentTask[];
}

// Interface for the field components from the JSON
interface FieldComponent {
  type: string;
  field_accordion_title?: string;
  field_accordion_body?: {
    processed?: string;
    value?: string;
  };
}

// Function to clean HTML content
function cleanHtml(htmlContent: string): string {
  return htmlContent
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&rsquo;/g, "'") // Replace &rsquo; with apostrophe
    .replace(/&lsquo;/g, "'") // Replace &lsquo; with apostrophe
    .replace(/&rdquo;/g, '"') // Replace &rdquo; with quote
    .replace(/&ldquo;/g, '"') // Replace &ldquo; with quote
    .replace(/&ndash;/g, '–') // Replace &ndash; with en dash
    .replace(/&mdash;/g, '—') // Replace &mdash; with em dash
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Function to parse unit and area information from accordion title
function parseUnitAreaTitle(title: string): { unit: number; areaOfStudy: string; outcome: string } | null {
  // Unit 1 patterns
  if (title.includes('Unit 1') && title.includes('Area of Study 1')) {
    return {
      unit: 1,
      areaOfStudy: 'How do cells function?',
      outcome: 'Outcome 1'
    };
  }
  if (title.includes('Unit 1') && title.includes('Area of Study 2')) {
    return {
      unit: 1,
      areaOfStudy: 'How do plant and animal systems function?',
      outcome: 'Outcome 2'
    };
  }
  if (title.includes('Unit 1') && title.includes('Area of Study 3')) {
    return {
      unit: 1,
      areaOfStudy: 'How do scientific investigations develop understanding of how organisms regulate their functions?',
      outcome: 'Outcome 3'
    };
  }

  // Unit 2 patterns
  if (title.includes('Unit 2') && title.includes('Area of Study 1')) {
    return {
      unit: 2,
      areaOfStudy: 'How is inheritance explained?',
      outcome: 'Outcome 1'
    };
  }
  if (title.includes('Unit 2') && title.includes('Area of Study 2')) {
    return {
      unit: 2,
      areaOfStudy: 'How do inherited adaptations impact on survival?',
      outcome: 'Outcome 2'
    };
  }
  if (title.includes('Unit 2') && title.includes('Area of Study 3')) {
    return {
      unit: 2,
      areaOfStudy: 'How do humans use science to explore and communicate contemporary bioethical issues?',
      outcome: 'Outcome 3'
    };
  }

  // Unit 3 patterns
  if (title.includes('Unit 3') && title.includes('Area of Study 1')) {
    return {
      unit: 3,
      areaOfStudy: 'How do nucleic acids and proteins determine cell structure and function?',
      outcome: 'Outcome 1'
    };
  }
  if (title.includes('Unit 3') && title.includes('Area of Study 2')) {
    return {
      unit: 3,
      areaOfStudy: 'How are biochemical pathways regulated?',
      outcome: 'Outcome 2'
    };
  }

  // Unit 4 patterns
  if (title.includes('Unit 4') && title.includes('Area of Study 1')) {
    return {
      unit: 4,
      areaOfStudy: 'How do organisms respond to pathogens?',
      outcome: 'Outcome 1'
    };
  }
  if (title.includes('Unit 4') && title.includes('Area of Study 2')) {
    return {
      unit: 4,
      areaOfStudy: 'How are species related over time?',
      outcome: 'Outcome 2'
    };
  }
  if (title.includes('Unit 4') && title.includes('Area of Study 3')) {
    return {
      unit: 4,
      areaOfStudy: 'How is scientific inquiry used to investigate cellular processes and/or biological change?',
      outcome: 'Outcome 3'
    };
  }

  return null;
}

// Function to extract learning activities from HTML content
function extractLearningActivities(htmlContent: string, unit: number, areaOfStudy: string, outcome: string): BiologyLearningActivity[] {
  const activities: BiologyLearningActivity[] = [];
  
  // Extract activities from HTML using regex to find list items in example boxes
  const activityRegex = /<li[^>]*>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>[^<]*)*)<\/li>/g;
  let match;
  
  while ((match = activityRegex.exec(htmlContent)) !== null) {
    const activityText = cleanHtml(match[1]);
    
    // Skip if it's a detailed example (contains exampleno-border class or is within notebox)
    if (activityText && !match[0].includes('exampleno-border') && !match[0].includes('examplesAnchor')) {
      activities.push({
        activity: activityText,
        unit,
        areaOfStudy,
        outcome
      });
    }
  }
  
  return activities;
}

// Function to extract detailed examples from HTML content
function extractDetailedExamples(htmlContent: string, unit: number, areaOfStudy: string, outcome: string): BiologyDetailedExample[] {
  const examples: BiologyDetailedExample[] = [];
  
  // Extract detailed examples using regex to find notebox divs
  const noteboxRegex = /<div class="notebox">(.*?)<\/div>/gs;
  const matches = htmlContent.match(noteboxRegex);
  
  if (matches) {
    matches.forEach((match: string) => {
      // Extract title from h2 or h3 tags within the notebox
      let title = 'Detailed Example';
      
      const titleMatch = match.match(/<h[23][^>]*>(.*?)<\/h[23]>/);
      if (titleMatch) {
        title = cleanHtml(titleMatch[1]);
      }
      
      // Extract content by removing HTML tags but preserving structure
      const content = cleanHtml(match);
      
      if (content && content.length > 50) { // Only include substantial content
        examples.push({
          title,
          content,
          unit,
          areaOfStudy,
          outcome
        });
      }
    });
  }
  
  return examples;
}

// Main scraping function for Biology curriculum
async function scrapeBiologyCurriculumData(): Promise<{ learningActivities: BiologyLearningActivity[], detailedExamples: BiologyDetailedExample[] }> {
  const url = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/biology/teaching-and-learning.json';
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('JSON structure keys:', Object.keys(data));
    console.log('pageProps keys:', Object.keys(data.pageProps || {}));
    
    // Navigate to the page content
    const pageContent = data?.pageProps?.node || data?.pageProps?.page;
    
    if (!pageContent?.field_components) {
      console.log('Available pageContent keys:', Object.keys(pageContent || {}));
      throw new Error('Could not find page components in the data structure');
    }
    
    console.log('Found field_components:', pageContent.field_components.length);
    
    const allActivities: BiologyLearningActivity[] = [];
    const allDetailedExamples: BiologyDetailedExample[] = [];
    
    // Process each component
    for (const component of pageContent.field_components as FieldComponent[]) {
      if (component.type === 'paragraph--accordion') {
        const title = component.field_accordion_title;
        const htmlContent = component.field_accordion_body?.processed || component.field_accordion_body?.value || '';
        
        console.log('Processing accordion:', title);
        
        if (title && htmlContent) {
          // Parse unit and area information from title
          const unitInfo = parseUnitAreaTitle(title);
          
          if (unitInfo) {
            const { unit, areaOfStudy, outcome } = unitInfo;
            console.log(`  Unit ${unit}, Area: ${areaOfStudy.substring(0, 50)}...`);
            
            // Extract activities and examples for this section
            const activities = extractLearningActivities(htmlContent, unit, areaOfStudy, outcome);
            const examples = extractDetailedExamples(htmlContent, unit, areaOfStudy, outcome);
            
            console.log(`  Found ${activities.length} activities, ${examples.length} examples`);
            
            allActivities.push(...activities);
            allDetailedExamples.push(...examples);
          }
        }
      }
    }
    
    return {
      learningActivities: allActivities,
      detailedExamples: allDetailedExamples
    };
    
  } catch (error) {
    console.error('Error scraping Biology curriculum data:', error);
    throw error;
  }
}

// Placeholder for assessment scraping function
async function scrapeBiologyAssessmentData(): Promise<BiologyAssessmentTask[]> {
  // TODO: Implement assessment scraping
  // This would require accessing the assessment endpoint
  return [];
}

// Main combined scraping function
async function scrapeBiologyCombinedData(): Promise<void> {
  try {
    console.log('Starting Biology curriculum and assessment scraping...');
    
    // Scrape curriculum data (learning activities and detailed examples)
    const { learningActivities, detailedExamples } = await scrapeBiologyCurriculumData();
    
    // Scrape assessment data (placeholder for now)
    const assessmentTasks = await scrapeBiologyAssessmentData();
    
    // Create the combined data object
    const combinedData: BiologyCombinedData = {
      learningActivities,
      detailedExamples,
      assessmentTasks
    };
    
    // Write combined data to JSON file
    const outputPath = path.join(process.cwd(), 'data', 'biology_curriculum_data.json');
    
    // Ensure the data directory exists
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));
    
    console.log(`\n=== Biology Scraping Complete ===`);
    console.log(`Learning Activities: ${learningActivities.length}`);
    console.log(`Detailed Examples: ${detailedExamples.length}`);
    console.log(`Assessment Tasks: ${assessmentTasks.length}`);
    console.log(`Data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error scraping Biology combined data:', error);
    throw error;
  }
}

// Run the scraper if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeBiologyCombinedData().catch(console.error);
}

export { scrapeBiologyCombinedData };
