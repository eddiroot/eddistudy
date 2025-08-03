import fs from 'fs';
import path from 'path';

// Types for Legal Studies
export interface LegalStudiesLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: number;
  outcome: number;
}

export interface LegalStudiesDetailedExample {
  title: string;
  unit: number;
  areaOfStudy: number;
  outcome: number;
  content: string;
}

export interface LegalStudiesSubjectData {
  subject: string;
  learningActivities: LegalStudiesLearningActivity[];
  detailedExamples: LegalStudiesDetailedExample[];
}

// Function to clean HTML and extract text
function cleanHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&') // Replace &amp;
    .replace(/&lt;/g, '<') // Replace &lt;
    .replace(/&gt;/g, '>') // Replace &gt;
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s+/g, '\n')
    .replace(/\n+/g, '\n')
    .trim(); // Trim whitespace
}

// Function to extract unit and area of study numbers from title
function parseUnitAreaTitle(title: string): { unit: number; areaOfStudy: number } {
  // Pattern: "Unit X Area of Study Y: Title" or "Unit X – Area of Study Y: Title"
  const match = title.match(/Unit\s+(\d+)\s*[–-]\s*Area\s+of\s+Study\s+(\d+)/i);
  if (match) {
    return {
      unit: parseInt(match[1]),
      areaOfStudy: parseInt(match[2])
    };
  }
  
  // Fallback for different patterns
  const unitMatch = title.match(/Unit\s+(\d+)/i);
  const areaMatch = title.match(/Area\s+of\s+Study\s+(\d+)/i);
  
  return {
    unit: unitMatch ? parseInt(unitMatch[1]) : 1,
    areaOfStudy: areaMatch ? parseInt(areaMatch[1]) : 1
  };
}

// Function to extract outcome number from HTML content
function parseOutcome(html: string): number {
  const outcomeMatch = html.match(/Outcome\s+(\d+)/i);
  return outcomeMatch ? parseInt(outcomeMatch[1]) : 1;
}

// Function to extract learning activities from HTML content
function extractLearningActivities(html: string, unit: number, areaOfStudy: number, outcome: number): LegalStudiesLearningActivity[] {
  const activities: LegalStudiesLearningActivity[] = [];
  
  // Look for bullet points and other activity indicators
  const cleanedHtml = html.replace(/<br\s*\/?>/gi, '\n');
  
  // Split by common delimiters and filter meaningful content
  const lines = cleanedHtml
    .split(/\n|<\/li>|<\/p>/)
    .map(line => cleanHtml(line))
    .filter(line => line.length > 20) // Filter out very short lines
    .filter(line => {
      const lower = line.toLowerCase();
      return !lower.includes('outcome') && 
             !lower.includes('detailed example') && 
             !lower.includes('assessment') &&
             !lower.match(/^(unit|area of study)/i) &&
             line.trim().length > 0;
    });

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed.length > 20) {
      activities.push({
        activity: trimmed,
        unit,
        areaOfStudy,
        outcome
      });
    }
  }

  return activities;
}

// Function to extract detailed examples from HTML content
function extractDetailedExamples(html: string, unit: number, areaOfStudy: number): LegalStudiesDetailedExample[] {
  const examples: LegalStudiesDetailedExample[] = [];
  
  // Look for detailed examples in notebox divs
  const noteboxMatches = html.match(/<div class="notebox">([\s\S]*?)<\/div>/g);
  
  if (noteboxMatches) {
    for (const noteboxMatch of noteboxMatches) {
      // Check if this notebox contains a "Detailed example" header
      if (noteboxMatch.includes('<h2>Detailed example</h2>')) {
        // Extract title from h3 tag after the "Detailed example" header
        const titleMatch = noteboxMatch.match(/<h2>Detailed example<\/h2>\s*<h3>([^<]+)<\/h3>/);
        const title = titleMatch ? cleanHtml(titleMatch[1]).trim() : 'Detailed Example';
        
        // Extract content (everything after the title)
        let content = noteboxMatch;
        if (titleMatch) {
          content = content.replace(/<h2>Detailed example<\/h2>\s*<h3>[^<]+<\/h3>/, '');
        } else {
          content = content.replace(/<h2>Detailed example<\/h2>/, '');
        }
        
        // Clean the content
        const cleanedContent = cleanHtml(content.replace(/<div class="notebox">/, '').replace(/<\/div>$/, ''));
        
        if (cleanedContent.length > 20) {
          examples.push({
            title,
            unit,
            areaOfStudy,
            outcome: 1, // Default outcome for detailed examples
            content: cleanedContent
          });
        }
      }
    }
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
          const outcome = parseOutcome(bodyContent);
          
          // Extract learning activities
          const activities = extractLearningActivities(bodyContent, unit, areaOfStudy, outcome);
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
      detailedExamples
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
    const dataDir = path.join(process.cwd(), 'src/lib/server/db/seed/vceScraper/data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save to JSON file
    const outputPath = path.join(dataDir, 'legal_studies_curriculum_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(curriculumData, null, 2));
    
    console.log(`Legal Studies curriculum data saved to: ${outputPath}`);
    console.log(`Learning Activities: ${curriculumData.learningActivities.length}`);
    console.log(`Detailed Examples: ${curriculumData.detailedExamples.length}`);
    
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
if (import.meta.url === `file://${process.argv[1]}`) {
  saveLegalStudiesData().catch(console.error);
}
