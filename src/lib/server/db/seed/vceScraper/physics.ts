import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PhysicsLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
  topic: string;
}

interface PhysicsExample {
  title: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
  content: string;
}

interface PhysicsAssessmentTask {
  task: string;
  unit: number;
  description: string;
}

interface PhysicsData {
  learningActivities: PhysicsLearningActivity[];
  examples: PhysicsExample[];
  assessmentTasks: PhysicsAssessmentTask[];
}

interface AccordionComponent {
  type: string;
  field_accordion_body?: {
    processed?: string;
  };
  field_accordion_title?: string;
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

// Function to extract unit number from accordion title
function extractUnitNumber(title: string): number {
  const match = title.match(/Unit (\d+)/);
  return match ? parseInt(match[1]) : 1;
}

// Function to extract area of study from accordion title
function extractAreaOfStudy(title: string): string {
  const match = title.match(/Area of Study \d+:\s*(.+)/);
  return match ? match[1].trim() : '';
}

// Function to extract outcome from content
function extractOutcome(content: string): string {
  const match = content.match(/<h3>Outcome (\d+)/);
  return match ? `Outcome ${match[1]}` : 'Outcome 1';
}

// Function to extract topic from HTML content based on key knowledge sections
function extractTopicFromContent(htmlContent: string, activityText: string): string {
  // Look for different patterns of key knowledge headers
  const patterns = [
    /<strong>Key knowledge:\s*([^<]+)<\/strong>/gi,
    /<p>\s*<strong>Key knowledge:\s*([^<]+)<\/strong>/gi,
    /<strong>Key knowledge: ([^<]+)<\/strong>/gi
  ];
  
  // Extract all key knowledge sections with their positions
  const topicSections: Array<{topic: string, position: number}> = [];
  
  patterns.forEach(pattern => {
    const matches = htmlContent.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const topic = match[1].trim();
        const position = match.index || 0;
        topicSections.push({ topic, position });
      }
    }
  });
  
  // Sort by position
  topicSections.sort((a, b) => a.position - b.position);
  
  if (topicSections.length === 0) {
    return 'General Physics';
  }
  
  // Try multiple approaches to find the activity in the HTML content
  let activityIndex = -1;
  
  // Approach 1: Look for the first few words
  const activityWords = activityText.split(' ').slice(0, 5).join(' ');
  activityIndex = htmlContent.toLowerCase().indexOf(activityWords.toLowerCase());
  
  // Approach 2: If not found, try with the first 3 words
  if (activityIndex === -1) {
    const shorterWords = activityText.split(' ').slice(0, 3).join(' ');
    activityIndex = htmlContent.toLowerCase().indexOf(shorterWords.toLowerCase());
  }
  
  // Approach 3: Try to find key terms from the activity
  if (activityIndex === -1) {
    const keyWords = activityText.match(/\b(simulation|experiment|literature review|fieldwork|case study|classification):\s*(\w+)/i);
    if (keyWords) {
      const searchTerm = keyWords[0].toLowerCase();
      activityIndex = htmlContent.toLowerCase().indexOf(searchTerm);
    }
  }
  
  // Approach 4: Look for distinctive terms in the activity
  if (activityIndex === -1) {
    const distinctiveTerms = activityText.match(/\b(geiger counter|m&ms|radiation counter|half-life|radioactive|arpansa)\b/gi);
    if (distinctiveTerms) {
      for (const term of distinctiveTerms) {
        const termIndex = htmlContent.toLowerCase().indexOf(term.toLowerCase());
        if (termIndex !== -1) {
          activityIndex = termIndex;
          break;
        }
      }
    }
  }
  
  if (activityIndex === -1) {
    return 'General Physics';
  }
  
  // Find the topic section that comes before this activity
  let currentTopic = 'General Physics';
  for (const section of topicSections) {
    if (section.position < activityIndex) {
      currentTopic = section.topic;
    } else {
      break;
    }
  }
  
  return currentTopic;
}

// Function to extract learning activities from accordion content
function extractLearningActivities(accordionData: AccordionComponent[]): PhysicsLearningActivity[] {
  const activities: PhysicsLearningActivity[] = [];

  accordionData.forEach(accordion => {
    if (accordion.field_accordion_body?.processed) {
      const content = accordion.field_accordion_body.processed;
      const title = accordion.field_accordion_title || '';
      
      const unit = extractUnitNumber(title);
      const areaOfStudy = extractAreaOfStudy(title);
      const outcome = extractOutcome(content);

      // Extract activities from list items
      const activityMatches = content.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
      
      activityMatches.forEach((match: string) => {
        const activityText = cleanHtmlContent(match);
        
        // Skip empty activities, detailed examples, and health/safety notes
        if (activityText.length > 20 && 
            !activityText.toLowerCase().includes('detailed example') &&
            !activityText.toLowerCase().includes('health and safety') &&
            !activityText.toLowerCase().includes('teaching notes') &&
            !activityText.toLowerCase().includes('method:') &&
            !activityText.toLowerCase().includes('discussion:')) {
          
          const topic = extractTopicFromContent(content, activityText);
          
          activities.push({
            activity: activityText,
            unit,
            areaOfStudy,
            outcome,
            topic
          });
        }
      });
    }
  });

  return activities;
}

// Function to extract detailed examples
function extractDetailedExamples(accordionData: AccordionComponent[]): PhysicsExample[] {
  const examples: PhysicsExample[] = [];

  accordionData.forEach(accordion => {
    if (accordion.field_accordion_body?.processed) {
      const content = accordion.field_accordion_body.processed;
      const title = accordion.field_accordion_title || '';
      
      const unit = extractUnitNumber(title);
      const areaOfStudy = extractAreaOfStudy(title);
      const outcome = extractOutcome(content);

      // Extract detailed examples
      const exampleMatches = content.match(/<div class="notebox">[\s\S]*?<\/div>/g) || [];
      
      exampleMatches.forEach((match: string) => {
        const titleMatch = match.match(/<h3>(.*?)<\/h3>/);
        const exampleTitle = titleMatch ? cleanHtmlContent(titleMatch[1]) : 'Physics Example';
        const exampleContent = cleanHtmlContent(match);

        if (exampleContent.length > 100) {
          examples.push({
            title: exampleTitle,
            unit,
            areaOfStudy,
            outcome,
            content: exampleContent
          });
        }
      });
    }
  });

  return examples;
}

// Function to extract assessment tasks from Units 1 and 2
async function extractAssessmentTasks(): Promise<PhysicsAssessmentTask[]> {
  const assessmentUrl = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/physics/assessment.json';
  
  try {
    console.log('Fetching physics assessment data...');
    const response = await fetch(assessmentUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const assessmentTasks: PhysicsAssessmentTask[] = [];
    
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
        if (match.includes('<th') || match.includes('VCE Physics task type')) {
          return;
        }
        
        // Extract task name from the first column (strong tag)
        const taskNameMatch = match.match(/<strong[^>]*>(.*?)<\/strong>/);
        if (taskNameMatch) {
          const taskName = cleanHtmlContent(taskNameMatch[1]);
          
          // Extract scope description from the second column
          const scopeMatch = match.match(/<td[^>]*>.*?<\/td>\s*<td[^>]*>(.*?)<\/td>/s);
          const scopeDescription = scopeMatch ? cleanHtmlContent(scopeMatch[1]) : '';
          
          if (taskName.length > 5) {
            // These tasks apply to both Units 1 and 2 based on the table header
            assessmentTasks.push({
              task: taskName,
              unit: 1,
              description: scopeDescription.substring(0, 500) + (scopeDescription.length > 500 ? '...' : '')
            });
            
            assessmentTasks.push({
              task: taskName,
              unit: 2,
              description: scopeDescription.substring(0, 500) + (scopeDescription.length > 500 ? '...' : '')
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
export async function scrapePhysicsCurriculumData(): Promise<PhysicsData> {
  const url = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/physics/teaching-and-learning.json';
  
  try {
    console.log('Fetching physics curriculum data...');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract accordion components
    const accordionComponents = data.pageProps?.node?.field_components?.filter(
      (component: AccordionComponent) => component.type === 'paragraph--accordion'
    ) || [];
    
    console.log(`Found ${accordionComponents.length} accordion sections`);
    
    // Extract learning activities and examples
    const learningActivities = extractLearningActivities(accordionComponents);
    const examples = extractDetailedExamples(accordionComponents);
    const assessmentTasks = await extractAssessmentTasks();
    
    console.log(`Learning Activities: ${learningActivities.length}`);
    console.log(`Examples: ${examples.length}`);
    console.log(`Assessment Tasks: ${assessmentTasks.length}`);
    
    return {
      learningActivities,
      examples,
      assessmentTasks
    };
    
  } catch (error) {
    console.error('Error scraping physics curriculum data:', error);
    throw error;
  }
}

// Function to save data to file
function saveToFile(data: PhysicsData, filename: string) {
  const filePath = join(__dirname, 'data', filename);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Data saved to ${filePath}`);
}

// Main execution
async function main() {
  try {
    const data = await scrapePhysicsCurriculumData();
    saveToFile(data, 'physics_curriculum_data.json');
    console.log('Physics curriculum scraping completed successfully!');
  } catch (error) {
    console.error('Physics curriculum scraping failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
