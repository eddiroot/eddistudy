import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EnglishLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface EnglishData {
  learningActivities: EnglishLearningActivity[];
}

// API URL
const API_URL = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/english-and-english-additional-language/teaching-and-learning.json';

// Function to clean HTML and extract text content
function cleanHtmlContent(html: string): string {
  if (!html) return '';
  
  // Remove HTML tags but preserve line breaks
  let cleaned = html
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
    .replace(/&#39;/g, "'");
  
  // Clean up whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
  
  return cleaned;
}

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
function extractLearningActivities(data: ApiResponse): EnglishLearningActivity[] {
  const activities: EnglishLearningActivity[] = [];
  
  try {
    // Find the main page components
    const components = data?.pageProps?.node?.field_components;
    if (!components || !Array.isArray(components)) {
      console.log('No components found');
      return activities;
    }

    console.log(`Found ${components.length} components`);

    // Find accordion components - get all English unit sections before EAL sections
    console.log('Available accordion titles:');
    components.forEach((comp: AccordionComponent, index) => {
      if (comp.type === 'paragraph--accordion' && comp.field_accordion_title) {
        console.log(`${index}: ${comp.field_accordion_title}`);
      }
    });

    // Find where the EAL sections start (they are duplicate unit titles but for EAL)
    // The EAL sections appear to start around index 15 based on the output
    const englishUnitSections = components.filter((comp: AccordionComponent, index) => 
      comp.type === 'paragraph--accordion' && 
      comp.field_accordion_title &&
      comp.field_accordion_title.match(/Unit\s+\d+/) &&
      index >= 7 && index <= 13 // English units are in indexes 7-13, EAL starts at 15
    );

    console.log(`\nFound ${englishUnitSections.length} English unit sections:`);
    englishUnitSections.forEach(comp => console.log(`- ${comp.field_accordion_title}`));

    const accordionComponents = englishUnitSections;

    console.log(`Found ${accordionComponents.length} English accordion components`);

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
            // Further split long paragraphs by sentence endings followed by capital letters
            return paragraph.split(/\.\s+(?=[A-Z])/)
              .map(sentence => sentence.trim())
              .filter(sentence => sentence.length > 30);
          });

        console.log(`Extracted ${activityTexts.length} potential activities`);

        for (let activityText of activityTexts) {
          // Clean up the text
          activityText = activityText.replace(/\s+/g, ' ').trim();
          
          // Add period if missing
          if (activityText && !activityText.endsWith('.') && !activityText.endsWith('?') && !activityText.endsWith('!')) {
            activityText += '.';
          }

          // Skip very short or very long texts
          if (activityText.length < 40 || activityText.length > 800) {
            continue;
          }

          // Skip obvious headers or metadata
          if (activityText.match(/^(Examples of learning activities|Outcome|Unit|Area of Study|The following|These activities)/i)) {
            continue;
          }

          const activity: EnglishLearningActivity = {
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

    console.log(`Extracted ${activities.length} learning activities`);
    return activities;

  } catch (error) {
    console.error('Error extracting learning activities:', error);
    return activities;
  }
}

// Main scraping function
async function scrapeEnglishLearningActivities(): Promise<EnglishLearningActivity[]> {
  try {
    console.log('Fetching English curriculum data...');
    
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ApiResponse = await response.json();
    console.log('Data fetched successfully');

    const activities = extractLearningActivities(data);
    return activities;

  } catch (error) {
    console.error('Error scraping English learning activities:', error);
    throw error;
  }
}

// Wrapper function for compatibility
async function scrapeEnglishData(): Promise<EnglishData> {
  const learningActivities = await scrapeEnglishLearningActivities();
  return { learningActivities };
}

// Run the scraper if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeEnglishData()
    .then((data) => {
      console.log('\n=== ENGLISH CURRICULUM SCRAPING RESULTS ===');
      console.log(`Learning Activities: ${data.learningActivities.length}`);
      
      // Save the data
      const outputPath = path.join(__dirname, 'data', 'english_curriculum_data.json');
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
        }, {} as Record<number, EnglishLearningActivity[]>);

        console.log('\n=== DISTRIBUTION BY UNIT ===');
        Object.keys(byUnit).forEach(unit => {
          console.log(`Unit ${unit}: ${byUnit[parseInt(unit)].length} activities`);
        });
      }
    })
    .catch((error) => {
      console.error('Failed to scrape English data:', error);
      process.exit(1);
    });
}

export { scrapeEnglishData, type EnglishLearningActivity, type EnglishData };
