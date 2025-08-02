import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LiteratureLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface LiteratureDetailedExample {
  title: string;
  content: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface LiteratureData {
  learningActivities: LiteratureLearningActivity[];
  detailedExamples: LiteratureDetailedExample[];
}

// API URL
const API_URL = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/literature/teaching-and-learning.json';

// Function to clean HTML and extract text content
function cleanHtmlContent(html: string): string {
  if (!html) return '';
  
  // Remove HTML tags but preserve line breaks
  const cleaned = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

// API response interfaces
interface AccordionComponent {
  type: string;
  field_accordion_title?: string;
  field_accordion_body?: {
    processed?: string;
  };
}

interface ApiResponse {
  pageProps?: {
    node?: {
      field_components?: AccordionComponent[];
    };
  };
}

// Function to extract learning activities from accordion components
function extractLearningActivities(data: ApiResponse): LiteratureLearningActivity[] {
  const activities: LiteratureLearningActivity[] = [];
  
  try {
    // Find the main page components
    const components = data?.pageProps?.node?.field_components;
    if (!components || !Array.isArray(components)) {
      console.log('No components found');
      return activities;
    }

    console.log(`Found ${components.length} components`);

    // Find accordion components - look for Unit sections
    console.log('Available accordion titles:');
    components.forEach((comp: AccordionComponent, index) => {
      if (comp.type === 'paragraph--accordion' && comp.field_accordion_title) {
        console.log(`${index}: ${comp.field_accordion_title}`);
      }
    });

    // Filter for unit-specific accordion components (similar to PE structure)
    const accordionComponents = components.filter((comp: AccordionComponent) => 
      comp.type === 'paragraph--accordion' && 
      comp.field_accordion_title &&
      comp.field_accordion_title.match(/Unit\s+\d+/) &&
      comp.field_accordion_title.toLowerCase().includes('area of study')
    );

    console.log(`\nFound ${accordionComponents.length} Literature unit sections:`);
    accordionComponents.forEach(comp => console.log(`- ${comp.field_accordion_title}`));

    for (const accordion of accordionComponents) {
      const title = accordion.field_accordion_title || '';
      const bodyContent = accordion.field_accordion_body?.processed || '';
      
      console.log(`\nProcessing accordion: ${title}`);

      if (!bodyContent) continue;

      // Extract unit number from title (e.g., "Unit 1 – Area of Study 1: Reading and exploring texts")
      const unitMatch = title.match(/Unit\s+(\d+)/i);
      const unitNumber = unitMatch ? parseInt(unitMatch[1]) : 1;

      // Extract area of study from title
      const areaOfStudyMatch = title.match(/Area of Study \d+[:\s]*([^:]+?)(?:\s*$)/i);
      const areaOfStudy = areaOfStudyMatch ? areaOfStudyMatch[1].trim() : title.replace(/Unit\s+\d+[^\w]*/, '').trim();

      // Parse the HTML content to extract activities
      const cleanContent = cleanHtmlContent(bodyContent);
      
      console.log(`Clean content preview: ${cleanContent.substring(0, 300)}...`);
      
      // Extract all activities directly - look for "Examples of learning activities" section
      const examplesMatch = cleanContent.match(/Examples of learning activities([^]*?)$/i);
      if (examplesMatch) {
        const activitiesContent = examplesMatch[1];
        console.log(`Found activities section with ${activitiesContent.length} characters`);
        
        // Split activities by paragraph breaks or clear sentence endings
        const activityTexts = activitiesContent
          .split(/\n\s*\n/) // Split by double line breaks (paragraphs)
          .map(text => text.trim())
          .filter(text => text.length > 50) // Only substantial text
          .flatMap(paragraph => {
            // Skip detailed examples entirely - they'll be extracted separately
            if (paragraph.match(/^Detailed example/i)) {
              return []; // Don't include detailed examples in learning activities
            }
            
            // For regular paragraphs, split by sentence endings followed by capital letters
            return paragraph.split(/\.\s+(?=[A-Z])/)
              .map(sentence => sentence.trim())
              .filter(sentence => sentence.length > 30);
          });

        console.log(`Extracted ${activityTexts.length} potential activities (excluding detailed examples)`);

        for (let activityText of activityTexts) {
          // Clean up the text
          activityText = activityText.replace(/\s+/g, ' ').trim();
          
          // Add period if missing
          if (activityText && !activityText.endsWith('.') && !activityText.endsWith('?') && !activityText.endsWith('!')) {
            activityText += '.';
          }

          // Skip very short texts
          if (activityText.length < 40) {
            continue;
          }
          
          // Reasonable limit for regular activities
          if (activityText.length > 800) continue;

          // Skip obvious headers, metadata, or detailed example references
          if (activityText.match(/^(Examples of learning activities|Outcome|Unit|Area of Study|The following|These activities|Detailed example)$/i)) {
            continue;
          }

          const activity: LiteratureLearningActivity = {
            activity: activityText,
            unit: unitNumber,
            areaOfStudy,
            outcome: `Outcome ${unitNumber}` // Simple outcome assignment
          };

          activities.push(activity);
        }
      } else {
        console.log('No "Examples of learning activities" section found');
      }
    }

    console.log(`Extracted ${activities.length} learning activities (excluding detailed examples)`);
    return activities;

  } catch (error) {
    console.error('Error extracting learning activities:', error);
    return activities;
  }
}

// Function to extract detailed examples from content
function extractDetailedExamples(data: ApiResponse): LiteratureDetailedExample[] {
  const examples: LiteratureDetailedExample[] = [];

  try {
    const components = data?.pageProps?.node?.field_components;
    if (!components || !Array.isArray(components)) {
      console.log('No components found for detailed examples');
      return examples;
    }

    // Filter for unit-specific accordion components
    const accordionComponents = components.filter((comp: AccordionComponent) => 
      comp.type === 'paragraph--accordion' && 
      comp.field_accordion_title &&
      comp.field_accordion_title.match(/Unit\s+\d+/) &&
      comp.field_accordion_title.toLowerCase().includes('area of study')
    );

    for (const accordion of accordionComponents) {
      const title = accordion.field_accordion_title || '';
      const bodyContent = accordion.field_accordion_body?.processed || '';
      
      if (!bodyContent) continue;

      // Extract unit number from title
      const unitMatch = title.match(/Unit\s+(\d+)/i);
      const unitNumber = unitMatch ? parseInt(unitMatch[1]) : 1;

      // Extract area of study from title
      const areaOfStudyMatch = title.match(/Area of Study \d+[:\s]*([^:]+?)(?:\s*$)/i);
      const areaOfStudy = areaOfStudyMatch ? areaOfStudyMatch[1].trim() : title.replace(/Unit\s+\d+[^\w]*/, '').trim();

      // Parse the HTML content to find detailed examples
      const cleanContent = cleanHtmlContent(bodyContent);
      
      // Look for "Examples of learning activities" section
      const examplesMatch = cleanContent.match(/Examples of learning activities([^]*?)$/i);
      if (examplesMatch) {
        const activitiesContent = examplesMatch[1];
        
        // Find detailed example sections
        const detailedExampleRegex = /Detailed example[^]*?(?=(?:Detailed example|\n\s*\n\s*[A-Z])|$)/gi;
        let match;
        
        while ((match = detailedExampleRegex.exec(activitiesContent)) !== null) {
          const exampleText = match[0].trim();
          
          if (exampleText.length > 100) { // Ensure it's substantial content
            // Extract title from the first line or use default
            const firstLine = exampleText.split('\n')[0] || '';
            const exampleTitle = firstLine.replace(/^Detailed example\s*\d*\s*/i, '').trim() || 'Detailed Example';
            
            const detailedExample: LiteratureDetailedExample = {
              title: exampleTitle,
              content: exampleText,
              unit: unitNumber,
              areaOfStudy,
              outcome: `Outcome ${unitNumber}`
            };

            examples.push(detailedExample);
          }
        }
      }
    }

    console.log(`Extracted ${examples.length} detailed examples`);
    return examples;

  } catch (error) {
    console.error('Error extracting detailed examples:', error);
    return examples;
  }
}


// Main data scraping function that returns both learning activities and detailed examples
async function scrapeLiteratureData(): Promise<LiteratureData> {
  try {
    console.log('Fetching Literature curriculum data...');
    
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ApiResponse = await response.json();
    console.log('Data fetched successfully');

    // Extract both learning activities and detailed examples
    const learningActivities = extractLearningActivities(data);
    const detailedExamples = extractDetailedExamples(data);
    
    return { learningActivities, detailedExamples };

  } catch (error) {
    console.error('Error scraping Literature data:', error);
    throw error;
  }
}

// Run the scraper if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeLiteratureData()
    .then((data) => {
      console.log('\n=== LITERATURE CURRICULUM SCRAPING RESULTS ===');
      console.log(`Learning Activities: ${data.learningActivities.length}`);
      console.log(`Detailed Examples: ${data.detailedExamples.length}`);
      
      // Save the data
      const outputPath = path.join(__dirname, 'data', 'literature_curriculum_data.json');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`Data saved to: ${outputPath}`);

      // Show sample data
      if (data.learningActivities.length > 0) {
        console.log('\n=== SAMPLE LEARNING ACTIVITIES ===');
        const samples = data.learningActivities.slice(0, 5);
        samples.forEach((activity, index) => {
          console.log(`\n${index + 1}. Activity: ${activity.activity.substring(0, 100)}...`);
          console.log(`   Unit: ${activity.unit}`);
          console.log(`   Area of Study: ${activity.areaOfStudy}`);
          console.log(`   Outcome: ${activity.outcome}`);
        });

        // Show distribution by unit
        const byUnit = data.learningActivities.reduce((acc, activity) => {
          if (!acc[activity.unit]) acc[activity.unit] = [];
          acc[activity.unit].push(activity);
          return acc;
        }, {} as Record<number, LiteratureLearningActivity[]>);

        console.log('\n=== DISTRIBUTION BY UNIT ===');
        Object.keys(byUnit).forEach(unit => {
          console.log(`Unit ${unit}: ${byUnit[parseInt(unit)].length} activities`);
        });
      }

      // Show sample detailed examples
      if (data.detailedExamples.length > 0) {
        console.log('\n=== SAMPLE DETAILED EXAMPLES ===');
        const sampleExamples = data.detailedExamples.slice(0, 3);
        sampleExamples.forEach((example, index) => {
          console.log(`\n${index + 1}. Title: ${example.title}`);
          console.log(`   Unit: ${example.unit}`);
          console.log(`   Area of Study: ${example.areaOfStudy}`);
          console.log(`   Content: ${example.content.substring(0, 200)}...`);
        });
      }
    })
    .catch((error) => {
      console.error('Failed to scrape Literature data:', error);
      process.exit(1);
    });
}

export { scrapeLiteratureData, type LiteratureLearningActivity, type LiteratureDetailedExample, type LiteratureData };
