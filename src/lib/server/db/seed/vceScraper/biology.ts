import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types for Biology curriculum data
interface BiologyLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: number;
  outcome: number;
}

interface BiologyDetailedExample {
  title: string;
  content: string;
  unit: number;
  areaOfStudy: number;
  outcome: number;
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
function parseUnitAreaTitle(title: string): { unit: number; areaOfStudy: number; outcome: number } | null {
  // Unit 1 patterns
  if (title.includes('Unit 1') && title.includes('Area of Study 1')) {
    return {
      unit: 1,
      areaOfStudy: 1,
      outcome: 1
    };
  }
  if (title.includes('Unit 1') && title.includes('Area of Study 2')) {
    return {
      unit: 1,
      areaOfStudy: 2,
      outcome: 2
    };
  }
  if (title.includes('Unit 1') && title.includes('Area of Study 3')) {
    return {
      unit: 1,
      areaOfStudy: 3,
      outcome: 3
    };
  }

  // Unit 2 patterns
  if (title.includes('Unit 2') && title.includes('Area of Study 1')) {
    return {
      unit: 2,
      areaOfStudy: 1,
      outcome: 1
    };
  }
  if (title.includes('Unit 2') && title.includes('Area of Study 2')) {
    return {
      unit: 2,
      areaOfStudy: 2,
      outcome: 2
    };
  }
  if (title.includes('Unit 2') && title.includes('Area of Study 3')) {
    return {
      unit: 2,
      areaOfStudy: 3,
      outcome: 3
    };
  }

  // Unit 3 patterns
  if (title.includes('Unit 3') && title.includes('Area of Study 1')) {
    return {
      unit: 3,
      areaOfStudy: 1,
      outcome: 1
    };
  }
  if (title.includes('Unit 3') && title.includes('Area of Study 2')) {
    return {
      unit: 3,
      areaOfStudy: 2,
      outcome: 2
    };
  }

  // Unit 4 patterns
  if (title.includes('Unit 4') && title.includes('Area of Study 1')) {
    return {
      unit: 4,
      areaOfStudy: 1,
      outcome: 1
    };
  }
  if (title.includes('Unit 4') && title.includes('Area of Study 2')) {
    return {
      unit: 4,
      areaOfStudy: 2,
      outcome: 2
    };
  }
  if (title.includes('Unit 4') && title.includes('Area of Study 3')) {
    return {
      unit: 4,
      areaOfStudy: 3,
      outcome: 3
    };
  }

  return null;
}

// Function to extract learning activities from HTML content
function extractLearningActivities(htmlContent: string, unit: number, areaOfStudy: number, outcome: number): BiologyLearningActivity[] {
  const activities: BiologyLearningActivity[] = [];
  
  try {
    // Remove the detailed examples section first to avoid including them
    const contentWithoutDetailedExamples = htmlContent.replace(/<div class="notebox">.*?<\/div>/gs, '');
    
    // Find all examplebox sections using a more robust approach that handles nested <ul> tags
    const exampleboxStartRegex = /<ul class="examplebox">/g;
    let startMatch;
    
    while ((startMatch = exampleboxStartRegex.exec(contentWithoutDetailedExamples)) !== null) {
      const startIndex = startMatch.index + startMatch[0].length;
      
      // Find the matching closing </ul> tag by counting nested levels
      let depth = 1;
      let currentIndex = startIndex;
      let endIndex = -1;
      
      while (currentIndex < contentWithoutDetailedExamples.length && depth > 0) {
        const remaining = contentWithoutDetailedExamples.slice(currentIndex);
        
        const nextUlOpen = remaining.search(/<ul/);
        const nextUlClose = remaining.search(/<\/ul>/);
        
        if (nextUlClose === -1) break; // No more closing tags
        
        if (nextUlOpen !== -1 && nextUlOpen < nextUlClose) {
          // Found opening <ul> before closing </ul>
          depth++;
          currentIndex += nextUlOpen + 3; // Move past "<ul"
        } else {
          // Found closing </ul>
          depth--;
          currentIndex += nextUlClose + 5; // Move past "</ul>"
          if (depth === 0) {
            endIndex = currentIndex - 5; // Position at start of </ul>
            break;
          }
        }
      }
      
      if (endIndex !== -1) {
        const examplesContent = contentWithoutDetailedExamples.slice(startIndex, endIndex);
        
        // Split by <li> tags and process each item
        const listItems = examplesContent.split(/<li(?=[^>]*>)/);
        
        for (let i = 1; i < listItems.length; i++) { // Skip first empty element
          let itemContent = '<li' + listItems[i];
          
          // Skip detailed examples (exampleno-border or examplesAnchor)
          if (itemContent.includes('class="exampleno-border"') || itemContent.includes('examplesAnchor')) {
            continue;
          }
          
          // Skip nested examplenoborder items (these should be part of parent items)
          if (itemContent.includes('class="examplenoborder"')) {
            continue;
          }
          
          // Clean up the item content - remove the opening li tag
          itemContent = itemContent.replace(/^<li[^>]*>/, '');
          
          // Remove any trailing </li> tags
          itemContent = itemContent.replace(/<\/li>$/, '');
          
          // Check if this item has nested bullet points
          const hasNestedList = itemContent.includes('<ul>') && itemContent.includes('class="examplenoborder"');
          
          if (hasNestedList) {
            // Extract main text before nested list
            const mainTextMatch = itemContent.match(/^(.*?)(?=<ul>)/s);
            const mainText = mainTextMatch ? cleanHtml(mainTextMatch[1]).trim() : '';
            
            // Extract nested items
            const nestedItemRegex = /<li class="examplenoborder"[^>]*>(.*?)<\/li>/gs;
            const nestedItems = [];
            let nestedMatch;
            
            while ((nestedMatch = nestedItemRegex.exec(itemContent)) !== null) {
              const nestedText = cleanHtml(nestedMatch[1]).trim();
              if (nestedText && nestedText.length > 5) {
                nestedItems.push(nestedText);
              }
            }
            
            if (mainText && nestedItems.length > 0) {
              const combinedActivity = `${mainText} Including: ${nestedItems.join('; ')}.`;
              activities.push({
                activity: combinedActivity,
                unit,
                areaOfStudy,
                outcome
              });
            } else if (mainText) {
              let finalActivity = mainText;
              if (!finalActivity.endsWith('.') && !finalActivity.endsWith('?') && !finalActivity.endsWith('!')) {
                finalActivity += '.';
              }
              activities.push({
                activity: finalActivity,
                unit,
                areaOfStudy,
                outcome
              });
            }
          } else {
            // Simple list item without nesting
            const cleanedActivity = cleanHtml(itemContent).trim();
            
            if (cleanedActivity && cleanedActivity.length > 20) {
              let finalActivity = cleanedActivity;
              if (!finalActivity.endsWith('.') && !finalActivity.endsWith('?') && !finalActivity.endsWith('!')) {
                finalActivity += '.';
              }
              
              activities.push({
                activity: finalActivity,
                unit,
                areaOfStudy,
                outcome
              });
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error extracting learning activities:', error);
  }
  
  return activities;
}

// Function to extract detailed examples from HTML content  
function extractDetailedExamples(htmlContent: string, unit: number, areaOfStudy: number, outcome: number): BiologyDetailedExample[] {
  const examples: BiologyDetailedExample[] = [];
  
  try {
    // Extract detailed examples using regex to find notebox divs
    const noteboxRegex = /<div class="notebox">(.*?)<\/div>/gs;
    const matches = htmlContent.match(noteboxRegex);
    
    if (matches) {
      matches.forEach((match: string) => {
        // Extract title from h2 or h3 tags within the notebox
        let title = 'Detailed Example';
        
        // Look for h3 tag first (more specific), then h2
        const h3Match = match.match(/<h3[^>]*>(.*?)<\/h3>/);
        const h2Match = match.match(/<h2[^>]*>(.*?)<\/h2>/);
        
        if (h3Match) {
          title = cleanHtml(h3Match[1]);
        } else if (h2Match) {
          title = cleanHtml(h2Match[1]);
        }
        
        // Extract content by removing HTML tags but preserving structure
        const content = cleanHtml(match);
        
        if (content && content.length > 100) { // Only include substantial content
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
    
  } catch (error) {
    console.error('Error extracting detailed examples:', error);
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
            console.log(`  Unit ${unit}, Area: ${areaOfStudy}...`);
            
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
    const outputPath = path.join(__dirname, 'data', 'biology_curriculum_data.json');
    
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
