import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PsychologyLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: number;
  outcome: number;
}

interface PsychologyDetailedExample {
  title: string;
  content: string;
  unit: number;
  areaOfStudy: number;
  outcome: number;
}

interface PsychologyAssessmentTask {
  title: string;
  unit: number;
  task: string;
  outcome: number;
}

interface PsychologyData {
  learningActivities: PsychologyLearningActivity[];
  detailedExamples: PsychologyDetailedExample[];
  assessmentTasks: PsychologyAssessmentTask[];
}

interface AccordionComponent {
  type: string;
  field_accordion_body?: {
    processed?: string;
  };
  field_accordion_title?: string;
}

interface PageComponent {
  type: string;
  field_accordion_title?: string;
  field_title?: string;
  field_heading?: {
    value?: string;
  };
  field_text?: {
    processed?: string;
  };
  field_accordion_body?: {
    processed?: string;
  };
}

// Function to clean HTML content
function cleanHtmlContent(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/&ldquo;/g, '"') // Replace &ldquo; with "
    .replace(/&rdquo;/g, '"') // Replace &rdquo; with "
    .replace(/&lsquo;/g, "'") // Replace &lsquo; with '
    .replace(/&rsquo;/g, "'") // Replace &rsquo; with '
    .replace(/&hellip;/g, '...') // Replace &hellip; with ...
    .replace(/&ndash;/g, '–') // Replace &ndash; with –
    .replace(/&mdash;/g, '—') // Replace &mdash; with —
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim();
}

// Function to extract area of study number from accordion title
function extractAreaOfStudy(title: string): number {
  const match = title.match(/Area of Study\s+(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

// Function to extract outcome number from content or title
function extractOutcome(content: string, title: string = ''): number {
  // First try to extract from title
  const titleMatch = title.match(/Outcome\s+(\d+)/i);
  if (titleMatch) return parseInt(titleMatch[1]);
  
  // Then try to extract from content
  const contentMatch = content.match(/Outcome\s+(\d+)/i);
  return contentMatch ? parseInt(contentMatch[1]) : 1;
}

// Function to extract learning activities from accordion content
function extractLearningActivities(accordionData: AccordionComponent[], allComponents: PageComponent[]): PsychologyLearningActivity[] {
  const activities: PsychologyLearningActivity[] = [];

  // Filter for area of study accordion components (Psychology uses Area of Study, not Unit in titles)
  const areaOfStudyAccordions = accordionData.filter((comp: AccordionComponent) => 
    comp.type === 'paragraph--accordion' && 
    comp.field_accordion_title &&
    comp.field_accordion_title.match(/Area of Study\s+\d+/i)
  );

  console.log(`Found ${areaOfStudyAccordions.length} area of study accordion sections for learning activities`);

  areaOfStudyAccordions.forEach((accordion, index) => {
    if (accordion.field_accordion_body?.processed) {
      const content = accordion.field_accordion_body.processed;
      const title = accordion.field_accordion_title || '';
      
      console.log(`Processing: ${title}`);
      
      // Psychology uses a different structure - derive unit from component position
      const areaOfStudy = extractAreaOfStudy(title);
      const unit = deriveUnitFromComponentIndex(allComponents, index);
      const outcome = extractOutcome(content, title);

      // Extract activities from list items
      const activityMatches = content.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
      
      console.log(`Found ${activityMatches.length} list items in ${title}`);
      
      activityMatches.forEach((match: string) => {
        const activityText = cleanHtmlContent(match);
        
        // Skip empty activities, detailed examples, and notes
        if (activityText.length > 20 && 
            !activityText.toLowerCase().includes('detailed example') &&
            !activityText.toLowerCase().includes('teaching notes') &&
            !activityText.toLowerCase().includes('teacher notes') &&
            !activityText.toLowerCase().includes('health and safety')) {
          
          activities.push({
            activity: activityText,
            unit,
            areaOfStudy,
            outcome
          });
        }
      });
    }
  });

  return activities;
}

// Function to derive unit number from accordion index using component separators
function deriveUnitFromComponentIndex(allComponents: PageComponent[], accordionIndex: number): number {
  // Find the actual accordion component in the full component list
  const accordionComponents = allComponents.filter(comp => comp.type === 'paragraph--accordion');
  const targetAccordion = accordionComponents[accordionIndex];
  
  // Find the index of this accordion in the full component list
  const fullIndex = allComponents.findIndex(comp => comp === targetAccordion);
  
  // Psychology curriculum structure based on component positions:
  // Components 2-4: Unit 1 (Area of Study 1, 2, 3)
  // Component 5: Unit separator (paragraph--body_content)
  // Components 6-8: Unit 2 (Area of Study 1, 2, 3) 
  // Component 9: Unit separator (paragraph--body_content)
  // Components 10-11: Unit 3 (Area of Study 1, 2)
  // Component 12: Unit separator (paragraph--body_content)
  // Components 13-15: Unit 4 (Area of Study 1, 2, 3)
  
  if (fullIndex <= 4) return 1;      // Components 2-4 (Unit 1)
  if (fullIndex <= 8) return 2;      // Components 6-8 (Unit 2)  
  if (fullIndex <= 11) return 3;     // Components 10-11 (Unit 3)
  return 4;                         // Components 13-15 (Unit 4)
}

// Function to extract detailed examples
function extractDetailedExamples(accordionData: AccordionComponent[], allComponents: PageComponent[]): PsychologyDetailedExample[] {
  const examples: PsychologyDetailedExample[] = [];

  // Filter for area of study accordion components (Psychology uses Area of Study, not Unit in titles)
  const areaOfStudyAccordions = accordionData.filter((comp: AccordionComponent) => 
    comp.type === 'paragraph--accordion' && 
    comp.field_accordion_title &&
    comp.field_accordion_title.match(/Area of Study\s+\d+/i)
  );

  console.log(`Found ${areaOfStudyAccordions.length} area of study accordion sections for detailed examples`);

  areaOfStudyAccordions.forEach((accordion, index) => {
    if (accordion.field_accordion_body?.processed) {
      const content = accordion.field_accordion_body.processed;
      const title = accordion.field_accordion_title || '';
      
      const areaOfStudy = extractAreaOfStudy(title);
      const unit = deriveUnitFromComponentIndex(allComponents, index);
      const outcome = extractOutcome(content, title);

      // Extract detailed examples from div elements with class notebox or similar
      const exampleMatches = content.match(/<div[^>]*class="[^"]*notebox[^"]*"[^>]*>[\s\S]*?<\/div>/g) || 
                           content.match(/<div[^>]*class="[^"]*example[^"]*"[^>]*>[\s\S]*?<\/div>/g) ||
                           content.match(/<div[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<\/div>/g) || [];
      
      exampleMatches.forEach((match: string) => {
        // Extract title from h3 tag or use a default
        const titleMatch = match.match(/<h3[^>]*>([^<]+)<\/h3>/);
        const exampleTitle = titleMatch ? cleanHtmlContent(titleMatch[1]) : 'Psychology Example';
        const exampleContent = cleanHtmlContent(match);

        if (exampleContent.length > 100 && exampleTitle !== 'Psychology Example') {
          examples.push({
            title: exampleTitle,
            content: exampleContent,
            unit,
            areaOfStudy,
            outcome
          });
        }
      });

      // Also look for content that contains "detailed example" in text
      const detailedExampleMatches = content.match(/<p[^>]*>[\s\S]*?detailed example[\s\S]*?<\/p>/gi) || [];
      
      detailedExampleMatches.forEach((match: string) => {
        const fullText = cleanHtmlContent(match);
        if (fullText.length > 200) {
          // Try to extract a title from the beginning of the text
          const titleMatch = fullText.match(/^([A-Z][^.!?]*[.!?])/);
          const exampleTitle = titleMatch ? titleMatch[1].replace(/detailed example:?\s*/i, '').trim() : 'Psychology Learning Example';
          
          examples.push({
            title: exampleTitle,
            content: fullText,
            unit,
            areaOfStudy,
            outcome
          });
        }
      });
    }
  });

  return examples;
}

// Function to extract assessment tasks from Units 1 and 2
async function extractAssessmentTasks(): Promise<PsychologyAssessmentTask[]> {
  const assessmentUrl = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/psychology/assessment.json';
  
  try {
    console.log('Fetching psychology assessment data...');
    const response = await fetch(assessmentUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const assessmentTasks: PsychologyAssessmentTask[] = [];
    
    // Extract accordion components
    const accordionComponents = data.pageProps?.node?.field_components?.filter(
      (component: AccordionComponent) => component.type === 'paragraph--accordion'
    ) || [];
    
    // Look for the scope accordion that contains Units 1 and 2 assessment tasks
    const scopeAccordion = accordionComponents.find((accordion: AccordionComponent) => 
      accordion.field_accordion_title?.includes('Scope of Units 1 and 2')
    );
    
    if (scopeAccordion?.field_accordion_body?.processed) {
      const content = scopeAccordion.field_accordion_body.processed;
      
      // Extract table rows that contain assessment task types and descriptions
      const tableRowMatches = content.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
      
      tableRowMatches.forEach((match: string) => {
        // Skip header row
        if (match.includes('<th') || match.includes('VCE Psychology task type')) {
          return;
        }
        
        // Extract task name from the first column (strong tag)
        const taskNameMatch = match.match(/<strong[^>]*>(.*?)<\/strong>/);
        if (taskNameMatch) {
          const taskName = cleanHtmlContent(taskNameMatch[1]);
          
          // Extract description from the second column
          const descriptionMatch = match.match(/<td[^>]*>.*?<\/td>\s*<td[^>]*>(.*?)<\/td>/s);
          const taskDescription = descriptionMatch ? cleanHtmlContent(descriptionMatch[1]) : '';
          
          if (taskName.length > 5) {
            // These tasks apply to both Units 1 and 2 based on the table header
            assessmentTasks.push({
              title: taskName,
              unit: 1,
              task: taskDescription.substring(0, 500) + (taskDescription.length > 500 ? '...' : ''),
              outcome: 1
            });
            
            assessmentTasks.push({
              title: taskName,
              unit: 2,
              task: taskDescription.substring(0, 500) + (taskDescription.length > 500 ? '...' : ''),
              outcome: 1
            });
          }
        }
      });
    }
    
    return assessmentTasks;
    
  } catch (error) {
    console.error('Error extracting assessment tasks:', error);
    return [];
  }
}

// Main scraping function
export async function scrapePsychologyCurriculumData(): Promise<PsychologyData> {
  const url = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/psychology/teaching-and-learning.json';
  
  try {
    console.log('Fetching psychology curriculum data...');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract all components to properly map units
    const allComponents = data.pageProps?.node?.field_components || [];
    
    console.log(`Found ${allComponents.length} total components`);
    
    // Extract accordion components
    const accordionComponents = allComponents.filter(
      (component: AccordionComponent) => component.type === 'paragraph--accordion'
    );
    
    console.log(`Found ${accordionComponents.length} accordion sections`);
    
    // Extract learning activities and detailed examples
    const learningActivities = extractLearningActivities(accordionComponents, allComponents);
    const detailedExamples = extractDetailedExamples(accordionComponents, allComponents);
    const assessmentTasks = await extractAssessmentTasks();
    
    console.log(`Learning Activities: ${learningActivities.length}`);
    console.log(`Detailed Examples: ${detailedExamples.length}`);
    console.log(`Assessment Tasks: ${assessmentTasks.length}`);
    
    return {
      learningActivities,
      detailedExamples,
      assessmentTasks
    };
    
  } catch (error) {
    console.error('Error scraping psychology curriculum data:', error);
    throw error;
  }
}

// Function to save data to file
function saveToFile(data: PsychologyData, filename: string) {
  const filePath = join(__dirname, 'data', filename);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Data saved to ${filePath}`);
}

// Main execution
async function main() {
  try {
    const data = await scrapePsychologyCurriculumData();
    saveToFile(data, 'psychology_curriculum_data.json');
    console.log('Psychology curriculum scraping completed successfully!');
  } catch (error) {
    console.error('Psychology curriculum scraping failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
