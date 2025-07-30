import fs from 'fs';
import path from 'path';

// Types for Accounting curriculum data
interface AccountingLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface AccountingDetailedExample {
  title: string;
  content: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface AccountingAssessmentTask {
  unit: string;
  title: string;
  description: string;
}

// Combined interface
interface AccountingCombinedData {
  learningActivities: AccountingLearningActivity[];
  detailedExamples: AccountingDetailedExample[];
  assessmentTasks: AccountingAssessmentTask[];
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
      areaOfStudy: 'The role of accounting',
      outcome: 'Outcome 1'
    };
  }
  if (title.includes('Unit 1') && title.includes('Area of Study 2')) {
    return {
      unit: 1,
      areaOfStudy: 'Recording financial data and reporting accounting information for a service business',
      outcome: 'Outcome 2'
    };
  }

  // Unit 2 patterns
  if (title.includes('Unit 2') && title.includes('Area of Study 1')) {
    return {
      unit: 2,
      areaOfStudy: 'Accounting for and managing inventory',
      outcome: 'Outcome 1'
    };
  }
  if (title.includes('Unit 2') && title.includes('Area of Study 2')) {
    return {
      unit: 2,
      areaOfStudy: 'Accounting for and managing accounts receivable and accounts payable',
      outcome: 'Outcome 2'
    };
  }
  if (title.includes('Unit 2') && title.includes('Area of Study 3')) {
    return {
      unit: 2,
      areaOfStudy: 'Accounting for and managing non-current assets',
      outcome: 'Outcome 3'
    };
  }

  // Unit 3 patterns
  if (title.includes('Unit 3') && title.includes('Area of Study 1')) {
    return {
      unit: 3,
      areaOfStudy: 'Recording and analysing financial data',
      outcome: 'Outcome 1'
    };
  }
  if (title.includes('Unit 3') && title.includes('Area of Study 2')) {
    return {
      unit: 3,
      areaOfStudy: 'Preparing and interpreting accounting reports',
      outcome: 'Outcome 2'
    };
  }

  // Unit 4 patterns
  if (title.includes('Unit 4') && title.includes('Area of Study 1')) {
    return {
      unit: 4,
      areaOfStudy: 'Extension of recording and reporting',
      outcome: 'Outcome 1'
    };
  }
  if (title.includes('Unit 4') && title.includes('Area of Study 2')) {
    return {
      unit: 4,
      areaOfStudy: 'Budgeting and decision-making',
      outcome: 'Outcome 1'
    };
  }

  return null;
}

// Function to extract learning activities from HTML content
function extractLearningActivities(htmlContent: string, unit: number, areaOfStudy: string, outcome: string): AccountingLearningActivity[] {
  const activities: AccountingLearningActivity[] = [];
  
  // Extract activities from HTML using regex to find list items
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
function extractDetailedExamples(htmlContent: string, unit: number, areaOfStudy: string, outcome: string): AccountingDetailedExample[] {
  const examples: AccountingDetailedExample[] = [];
  
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

// Main scraping function for Accounting curriculum
async function scrapeAccountingCurriculumData(): Promise<{ learningActivities: AccountingLearningActivity[], detailedExamples: AccountingDetailedExample[] }> {
  const url = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/accounting/teaching-and-learning.json';
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Navigate to the page content
    const pageContent = data?.pageProps?.node || data?.pageProps?.page;
    
    if (!pageContent?.field_components) {
      throw new Error('Could not find page components in the data structure');
    }
    
    const allActivities: AccountingLearningActivity[] = [];
    const allDetailedExamples: AccountingDetailedExample[] = [];
    
    // Process each component
    for (const component of pageContent.field_components) {
      if (component.type === 'paragraph--accordion') {
        const title = component.field_accordion_title;
        const htmlContent = component.field_accordion_body?.processed || component.field_accordion_body?.value || '';
        
        if (title && htmlContent) {
          // Parse unit and area information from title
          const unitInfo = parseUnitAreaTitle(title);
          
          if (unitInfo) {
            const { unit, areaOfStudy, outcome } = unitInfo;
            
            // Extract activities and examples for this section
            const activities = extractLearningActivities(htmlContent, unit, areaOfStudy, outcome);
            const examples = extractDetailedExamples(htmlContent, unit, areaOfStudy, outcome);
            
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
    console.error('Error scraping Accounting curriculum data:', error);
    throw error;
  }
}

// Placeholder for assessment scraping function
async function scrapeAccountingAssessmentData(): Promise<AccountingAssessmentTask[]> {
  // TODO: Implement assessment scraping
  // This would require accessing the assessment endpoint
  return [];
}

// Main combined scraping function
async function scrapeAccountingCombinedData(): Promise<void> {
  try {
    console.log('Starting Accounting curriculum and assessment scraping...');
    
    // Scrape curriculum data (learning activities and detailed examples)
    const { learningActivities, detailedExamples } = await scrapeAccountingCurriculumData();
    
    // Scrape assessment data (placeholder for now)
    const assessmentTasks = await scrapeAccountingAssessmentData();
    
    // Create the combined data object
    const combinedData: AccountingCombinedData = {
      learningActivities,
      detailedExamples,
      assessmentTasks
    };
    
    // Write combined data to JSON file
    const outputPath = path.join(process.cwd(), 'data', 'accounting_curriculum_data.json');
    
    // Ensure the data directory exists
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));
    
    console.log(`\n=== Accounting Scraping Complete ===`);
    console.log(`Learning Activities: ${learningActivities.length}`);
    console.log(`Detailed Examples: ${detailedExamples.length}`);
    console.log(`Assessment Tasks: ${assessmentTasks.length}`);
    console.log(`Data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error scraping Accounting combined data:', error);
    throw error;
  }
}

// Run the scraper if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAccountingCombinedData().catch(console.error);
}

export { scrapeAccountingCombinedData };
