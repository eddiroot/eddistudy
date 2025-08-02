import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EnglishLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: number;
  outcome: number;
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
      (comp.field_accordion_title.match(/Unit\s+\d+/) || comp.field_accordion_title.match(/Units\s+\d+\s+and\s+\d+/)) &&
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
      // Handle both "Unit X" and "Units X and Y" formats
      const unitMatch = title.match(/Units?\s+(\d+)(?:\s+and\s+(\d+))?/i);
      let unitNumber = 1;  // default
      
      if (unitMatch) {
        if (unitMatch[2]) {
          // "Units 3 and 4" - we'll create separate entries for both units
          // For now, let's use the first unit number and handle both later
          unitNumber = parseInt(unitMatch[1]);
        } else {
          // "Unit X"
          unitNumber = parseInt(unitMatch[1]);
        }
      }

      // Extract area of study number from title
      const areaOfStudyMatch = title.match(/Area of Study (\d+)/i);
      const areaOfStudyNumber = areaOfStudyMatch ? parseInt(areaOfStudyMatch[1]) : 1;

      // Parse the HTML content to extract activities
      const cleanContent = cleanHtmlContent(bodyContent);
      
      console.log(`Clean content preview: ${cleanContent.substring(0, 300)}...`);
      
      // Extract all activities directly - look for "Examples of learning activities" section
      const examplesMatch = cleanContent.match(/Examples of learning activities([^]*?)$/i);
      if (examplesMatch) {
        const activitiesContent = examplesMatch[1];
        console.log(`Found activities section with ${activitiesContent.length} characters`);
        
        // Parse HTML to find actual bullet points
        const htmlContent = accordion.field_accordion_body?.processed || '';
        
        // Find the Examples of learning activities section in HTML
        const examplesHtmlMatch = htmlContent.match(/Examples of learning activities(.*?)$/is);
        if (examplesHtmlMatch) {
          const activitiesHtml = examplesHtmlMatch[1];
          
          // Extract bullet points from nested HTML structure
          const bulletPoints: string[] = [];
          
          // Look for the main examplebox ul and extract nested li elements
          const exampleboxMatch = activitiesHtml.match(/<ul class="examplebox"[^>]*>(.*?)<\/ul>/s);
          if (exampleboxMatch) {
            const exampleboxContent = exampleboxMatch[1];
            
            // Find all category sections (top-level li elements)
            const categoryMatches = exampleboxContent.match(/<li[^>]*>([^<]*)<ul[^>]*>(.*?)<\/ul><\/li>/gs);
            
            if (categoryMatches) {
              console.log(`Found ${categoryMatches.length} category sections`);
              
              categoryMatches.forEach((categorySection: string) => {
                // Extract nested li elements (actual activities)
                const nestedLiMatches = categorySection.match(/<li class="examplenoborder"[^>]*>(.*?)<\/li>/gs);
                
                if (nestedLiMatches) {
                  nestedLiMatches.forEach((li: string) => {
                    const cleanText = cleanHtmlContent(li).trim();
                    if (cleanText.length > 30) {
                      bulletPoints.push(cleanText);
                    }
                  });
                }
              });
            } else {
              console.log('No category sections found, trying alternative extraction');
              
              // Fallback: extract all li elements with examplenoborder class
              const allLiMatches = activitiesHtml.match(/<li class="examplenoborder"[^>]*>(.*?)<\/li>/gs);
              if (allLiMatches) {
                allLiMatches.forEach((li: string) => {
                  const cleanText = cleanHtmlContent(li).trim();
                  if (cleanText.length > 30) {
                    bulletPoints.push(cleanText);
                  }
                });
              }
            }
          } else {
            console.log('No examplebox found, trying generic extraction');
            
            // Final fallback: extract any li elements
            const liMatches = activitiesHtml.match(/<li[^>]*>(.*?)<\/li>/gs);
            if (liMatches) {
              liMatches.forEach((li: string) => {
                const cleanText = cleanHtmlContent(li).trim();
                // Skip category headers (they usually don't end with punctuation)
                if (cleanText.length > 30 && !cleanText.match(/^[A-Z][^.!?]*$/)) {
                  bulletPoints.push(cleanText);
                }
              });
            }
          }

          console.log(`Extracted ${bulletPoints.length} bullet points`);

          for (let bulletText of bulletPoints) {
            // Clean up the text
            bulletText = bulletText.replace(/\s+/g, ' ').trim();
            
            // Skip very short or very long texts
            if (bulletText.length < 40 || bulletText.length > 1000) {
              continue;
            }

            // Skip obvious headers or metadata
            if (bulletText.match(/^(Examples of learning activities|Outcome|Unit|Area of Study|The following|These activities)/i)) {
              continue;
            }

            // Handle "Units 3 and 4" case - create activities for both units
            const unitsMatch = title.match(/Units?\s+(\d+)(?:\s+and\s+(\d+))?/i);
            if (unitsMatch && unitsMatch[2]) {
              // "Units 3 and 4" - create for both units
              const unit1 = parseInt(unitsMatch[1]);
              const unit2 = parseInt(unitsMatch[2]);
              
              [unit1, unit2].forEach(unit => {
                const activity: EnglishLearningActivity = {
                  activity: bulletText,
                  unit: unit,
                  areaOfStudy: areaOfStudyNumber,
                  outcome: unit // Map outcome to unit number
                };
                activities.push(activity);
              });
            } else {
              // Single unit
              const activity: EnglishLearningActivity = {
                activity: bulletText,
                unit: unitNumber,
                areaOfStudy: areaOfStudyNumber,
                outcome: unitNumber // Map outcome to unit number
              };
              activities.push(activity);
            }
          }
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

        // Show distribution by area of study
        const byAreaOfStudy = data.learningActivities.reduce((acc, activity) => {
          const key = `Unit ${activity.unit} Area ${activity.areaOfStudy}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(activity);
          return acc;
        }, {} as Record<string, EnglishLearningActivity[]>);

        console.log('\n=== DISTRIBUTION BY AREA OF STUDY ===');
        Object.keys(byAreaOfStudy).forEach(key => {
          console.log(`${key}: ${byAreaOfStudy[key].length} activities`);
        });
      }
    })
    .catch((error) => {
      console.error('Failed to scrape English data:', error);
      process.exit(1);
    });
}

export { scrapeEnglishData, type EnglishLearningActivity, type EnglishData };
