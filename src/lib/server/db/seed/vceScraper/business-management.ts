#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Interfaces for Business Management data structure
interface BusinessManagementLearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface BusinessManagementDetailedExample {
  title: string;
  content: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface BusinessManagementAssessmentTask {
  unit: number;
  title: string;
  areaOfStudy: string;
  outcome: string;
  task: string;
}

interface BusinessManagementCurriculumData {
  learningActivities: BusinessManagementLearningActivity[];
  detailedExamples: BusinessManagementDetailedExample[];
  assessmentTasks: BusinessManagementAssessmentTask[];
}

/**
 * Clean HTML content by removing tags and converting entities
 */
function cleanHtml(html: string): string {
  if (!html) return '';
  
  return html
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Convert HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, '...')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse unit and area of study from title
 */
function parseUnitAreaTitle(title: string): { unit: number; areaOfStudy: string } {
  // Extract unit number - handle both "Unit X" and "Area of Study X:"
  let unit = 0;
  
  // First try to find "Unit X" in the context before the title
  const unitMatch = title.match(/Unit (\d+)/i);
  if (unitMatch) {
    unit = parseInt(unitMatch[1]);
  } else {
    // Try to infer from Area of Study context
    if (title.includes('business idea') || title.includes('Internal business') || title.includes('External business')) {
      unit = 1;
    } else if (title.includes('Legal requirements') || title.includes('Marketing a business') || title.includes('Staffing a business')) {
      unit = 2;
    } else if (title.includes('Business foundations') || title.includes('Human resource') || title.includes('Operations management')) {
      unit = 3;
    } else if (title.includes('Reviewing performance') || title.includes('Implementing change')) {
      unit = 4;
    }
  }
  
  // Extract area of study (text after the colon or after "Area of Study X:")
  let areaOfStudy = '';
  
  const colonIndex = title.indexOf(':');
  if (colonIndex !== -1) {
    areaOfStudy = title.substring(colonIndex + 1).trim();
  } else {
    // Fallback for different formats
    areaOfStudy = title.replace(/Area of Study \d+:\s*/i, '').trim();
  }
  
  return { unit, areaOfStudy };
}

/**
 * Extract learning activities from HTML content
 */
function extractLearningActivities(html: string, unit: number, areaOfStudy: string, outcome: string): BusinessManagementLearningActivity[] {
  const activities: BusinessManagementLearningActivity[] = [];
  
  // Look for the learning activities section specifically
  const learningActivitiesMatch = html.match(/<h3>Examples of learning activities<\/h3>(.*?)(?=<div class="notebox"|<h2>|<h3>|$)/s);
  
  if (learningActivitiesMatch) {
    const activitiesSection = learningActivitiesMatch[1];
    
    // Find list items in the activities section
    const listItemRegex = /<li[^>]*>(.*?)<\/li>/gs;
    let match;
    
    while ((match = listItemRegex.exec(activitiesSection)) !== null) {
      let itemContent = match[1];
      
      // Handle items with special classes
      if (itemContent.includes('examplesAnchor') || itemContent.includes('exampleno-border')) {
        // These might contain activities within divs
        const divMatch = itemContent.match(/<div[^>]*>(.*?)<\/div>/s);
        if (divMatch) {
          itemContent = divMatch[1];
        }
      }
      
      const cleanActivity = cleanHtml(itemContent);
      
      // Filter out very short or empty activities
      if (cleanActivity && cleanActivity.length > 15 && !cleanActivity.startsWith('Image description')) {
        activities.push({
          activity: cleanActivity,
          unit,
          areaOfStudy,
          outcome
        });
      }
    }
  }
  
  return activities;
}

/**
 * Extract detailed examples from HTML content
 */
function extractDetailedExamples(html: string, unit: number, areaOfStudy: string, outcome: string): BusinessManagementDetailedExample[] {
  const examples: BusinessManagementDetailedExample[] = [];
  
  // Find detailed example sections
  const exampleRegex = /<div class="notebox">(.*?)<\/div>/gs;
  let match;
  
  while ((match = exampleRegex.exec(html)) !== null) {
    const exampleContent = match[1];
    
    // Extract title
    const titleMatch = exampleContent.match(/<h[23]>(.*?)<\/h[23]>/);
    const title = titleMatch ? cleanHtml(titleMatch[1]) : 'Detailed example';
    
    // Extract full content
    const content = cleanHtml(exampleContent);
    
    if (content && content.length > 50) {
      examples.push({
        title,
        content,
        unit,
        areaOfStudy,
        outcome
      });
    }
  }
  
  return examples;
}

/**
 * Extract outcome from HTML content
 */
function extractOutcome(html: string): string {
  const outcomeMatch = html.match(/<h3>Outcome (\d+)/);
  return outcomeMatch ? `Outcome ${outcomeMatch[1]}` : 'Outcome 1';
}

/**
 * Main scraping function for Business Management curriculum data
 */
async function scrapeBusinessManagementCurriculumData(): Promise<BusinessManagementCurriculumData> {
  console.log('Starting Business Management curriculum and assessment scraping...');
  
  const url = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/business-management/teaching-and-learning.json';
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const learningActivities: BusinessManagementLearningActivity[] = [];
    const detailedExamples: BusinessManagementDetailedExample[] = [];
    const assessmentTasks: BusinessManagementAssessmentTask[] = [];
    
    // Navigate through the JSON structure to find curriculum components
    const components = data?.pageProps?.node?.field_components || [];
    
    for (const component of components) {
      if (component.type === 'paragraph--accordion') {
        const title = component.field_accordion_title || '';
        const bodyValue = component.field_accordion_body?.processed || component.field_accordion_body?.value || '';
        
        console.log(`Processing: ${title}`);
        
        // Parse unit and area of study from title
        const { unit, areaOfStudy } = parseUnitAreaTitle(title);
        
        if (unit > 0 && bodyValue) {
          // Extract outcome from content
          const outcome = extractOutcome(bodyValue);
          
          console.log(`  Found Unit ${unit}, Area: ${areaOfStudy}, Outcome: ${outcome}`);
          
          // Extract learning activities
          const activities = extractLearningActivities(bodyValue, unit, areaOfStudy, outcome);
          console.log(`  Extracted ${activities.length} activities`);
          learningActivities.push(...activities);
          
          // Extract detailed examples
          const examples = extractDetailedExamples(bodyValue, unit, areaOfStudy, outcome);
          console.log(`  Extracted ${examples.length} examples`);
          detailedExamples.push(...examples);
        } else {
          console.log(`  Skipped - Unit: ${unit}, Body length: ${bodyValue.length}`);
        }
      }
    }
    
    console.log(`Business Management Scraping Complete ===`);
    console.log(`Learning Activities: ${learningActivities.length}`);
    console.log(`Detailed Examples: ${detailedExamples.length}`);
    console.log(`Assessment Tasks: ${assessmentTasks.length}`);
    
    return {
      learningActivities,
      detailedExamples,
      assessmentTasks
    };
    
  } catch (error) {
    console.error('Error scraping Business Management curriculum data:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const curriculumData = await scrapeBusinessManagementCurriculumData();
    
    // Save to JSON file
    const outputPath = join(__dirname, 'data', 'business-management_curriculum_data.json');
    writeFileSync(outputPath, JSON.stringify(curriculumData, null, 2), 'utf-8');
    
    console.log(`Data saved to: business-management_curriculum_data.json`);
    
  } catch (error) {
    console.error('Failed to scrape Business Management curriculum data:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { scrapeBusinessManagementCurriculumData };
