import fs from 'fs';
import path from 'path';

// Types for Legal Studies
export interface LegalStudiesLearningActivity {
  unit: string;
  areaOfStudy: string;
  outcome: string;
  title: string;
  description: string;
}

export interface LegalStudiesDetailedExample {
  unit: string;
  areaOfStudy: string;
  name: string;
  description: string;
}

export interface LegalStudiesAssessmentTask {
  unit: string;
  title: string;
  description: string;
}

export interface LegalStudiesSubjectData {
  subject: string;
  learningActivities: LegalStudiesLearningActivity[];
  detailedExamples: LegalStudiesDetailedExample[];
  assessmentTasks: LegalStudiesAssessmentTask[];
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
      areaOfStudy: `Area of Study ${match[2]}: ${match[3]}`
    };
  }
  
  // Fallback for different patterns
  const unitMatch = title.match(/Unit (\d+)/);
  if (unitMatch) {
    return {
      unit: `Unit ${unitMatch[1]}`,
      areaOfStudy: title.replace(/Unit \d+\s*/, '').trim()
    };
  }
  
  return {
    unit: 'Unknown Unit',
    areaOfStudy: title
  };
}

// Function to extract outcome number and description
function parseOutcome(html: string): { outcomeNumber: string; outcomeDescription: string } {
  const outcomeMatch = html.match(/<h3>Outcome (\d+)<\/h3><p>([^<]+)/);
  if (outcomeMatch) {
    return {
      outcomeNumber: `Outcome ${outcomeMatch[1]}`,
      outcomeDescription: cleanHtml(outcomeMatch[2])
    };
  }
  return {
    outcomeNumber: 'Unknown Outcome',
    outcomeDescription: ''
  };
}

// Function to extract learning activities from HTML content
function extractLearningActivities(html: string, unit: string, areaOfStudy: string, outcome: string): LegalStudiesLearningActivity[] {
  const activities: LegalStudiesLearningActivity[] = [];
  
  // Extract activities from <li> elements within examplebox class
  const activityBoxMatch = html.match(/<ul class="examplebox">([\s\S]*?)<\/ul>/);
  if (activityBoxMatch) {
    const activityContent = activityBoxMatch[1];
    const activityMatches = activityContent.match(/<li[^>]*>([\s\S]*?)<\/li>/g);
    
    if (activityMatches) {
      activityMatches.forEach((activityMatch, index) => {
        const cleanActivity = cleanHtml(activityMatch);
        if (cleanActivity && !activityMatch.includes('exampleno-border')) {
          // Extract first sentence or significant part as title
          const sentences = cleanActivity.split(/[.!?]/);
          const title = sentences[0]?.trim() || `Activity ${index + 1}`;
          
          activities.push({
            unit,
            areaOfStudy,
            outcome,
            title: title.length > 100 ? title.substring(0, 100) + '...' : title,
            description: cleanActivity
          });
        }
      });
    }
  }
  
  return activities;
}

// Function to extract detailed examples from HTML content
function extractDetailedExamples(html: string, unit: string, areaOfStudy: string): LegalStudiesDetailedExample[] {
  const examples: LegalStudiesDetailedExample[] = [];
  
  // Look for detailed example sections in notebox class
  const exampleMatches = html.match(/<div class="notebox">([\s\S]*?)<\/div>/g);
  
  if (exampleMatches) {
    exampleMatches.forEach(exampleMatch => {
      const titleMatch = exampleMatch.match(/<h[23]>([^<]+)</);
      const contentMatch = exampleMatch.match(/<div class="notebox">([\s\S]*?)<\/div>/);
      
      if (titleMatch && contentMatch) {
        const name = cleanHtml(titleMatch[1]);
        const description = cleanHtml(contentMatch[1]);
        
        examples.push({
          unit,
          areaOfStudy,
          name,
          description
        });
      }
    });
  }
  
  return examples;
}

// Main function to extract Legal Studies curriculum data
async function extractLegalStudiesCurriculumData(): Promise<LegalStudiesSubjectData> {
  try {
    console.log('Fetching Legal Studies teaching and learning data...');
    
    const url = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/legal-studies/teaching-and-learning.json';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const learningActivities: LegalStudiesLearningActivity[] = [];
    const detailedExamples: LegalStudiesDetailedExample[] = [];
    
    // Extract data from field_components array
    const components = data.pageProps?.node?.field_components || [];
    
    for (const component of components) {
      if (component.type === 'paragraph--accordion') {
        const title = component.field_accordion_title;
        const bodyContent = component.field_accordion_body?.processed || '';
        
        if (title && bodyContent) {
          console.log(`Processing: ${title}`);
          
          const { unit, areaOfStudy } = parseUnitAreaTitle(title);
          const { outcomeNumber } = parseOutcome(bodyContent);
          
          // Extract learning activities
          const activities = extractLearningActivities(bodyContent, unit, areaOfStudy, outcomeNumber);
          learningActivities.push(...activities);
          
          // Extract detailed examples
          const examples = extractDetailedExamples(bodyContent, unit, areaOfStudy);
          detailedExamples.push(...examples);
        }
      }
    }
    
    console.log(`Extracted ${learningActivities.length} learning activities`);
    console.log(`Extracted ${detailedExamples.length} detailed examples`);
    
    return {
      subject: 'Legal Studies',
      learningActivities,
      detailedExamples,
      assessmentTasks: [] // Will be populated when we create assessment scraper
    };
    
  } catch (error) {
    console.error('Error extracting Legal Studies curriculum data:', error);
    throw error;
  }
}

// Function to save data to JSON file
async function saveLegalStudiesData(): Promise<void> {
  try {
    const curriculumData = await extractLegalStudiesCurriculumData();
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save to JSON file
    const outputPath = path.join(dataDir, 'legal_studies_curriculum_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(curriculumData, null, 2));
    
    console.log(`Legal Studies curriculum data saved to: ${outputPath}`);
    console.log(`Learning Activities: ${curriculumData.learningActivities.length}`);
    console.log(`Detailed Examples: ${curriculumData.detailedExamples.length}`);
    console.log(`Assessment Tasks: ${curriculumData.assessmentTasks.length}`);
    
  } catch (error) {
    console.error('Error saving Legal Studies data:', error);
    throw error;
  }
}

// Export the main function
export { extractLegalStudiesCurriculumData, saveLegalStudiesData };

// Run the scraper if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  saveLegalStudiesData().catch(console.error);
}
