import fs from 'fs';
import path from 'path';

// Types for the JSON structure
export interface AssessmentTask {
  unit: string;
  title: string;
  description: string;
  subject?: string; // Optional field for multi-subject support
  areasOfStudy: {
    name: string;
    contentDotPoints: string[];
  }[];
  outcomes: {
    outcomeNumber: string;
    keyKnowledge: string[];
    keySkills: string[];
  }[];
}

export interface LearningActivity {
  unit: string;
  title: string;
  description: string;
  subject?: string; // Optional field for multi-subject support
  areasOfStudy: {
    name: string;
    contentDotPoints: string[];
  }[];
  outcomes: {
    outcomeNumber: string;
    keyKnowledge: string[];
    keySkills: string[];
  }[];
}

export interface AssessmentCriterion {
  markRange: string;
  description: string;
  tasks?: {
    taskNumber: string;
    markRange: string;
  }[];
}

export interface OutcomeAssessment {
  unit: string;
  outcomeNumber: string;
  outcomeDescription: string;
  totalMarks: string;
  subject?: string; // Optional field for multi-subject support
  criteria: AssessmentCriterion[];
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

// Function to extract areas of study from HTML table
function extractAreasOfStudy(html: string): { name: string; contentDotPoints: string[] }[] {
  const areasOfStudy: { name: string; contentDotPoints: string[] }[] = [];
  
  // Look for "Areas of study" section
  const areasMatch = html.match(/Areas of study.*?<\/table>/s);
  if (!areasMatch) return areasOfStudy;
  
  const tableHtml = areasMatch[0];
  
  // Extract table rows
  const rowMatches = tableHtml.match(/<tr[^>]*>.*?<\/tr>/gs);
  if (!rowMatches) return areasOfStudy;
  
  for (const row of rowMatches) {
    const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gs);
    if (cellMatches && cellMatches.length >= 2) {
      const areaName = cleanHtml(cellMatches[0]);
      const contentPoints = cleanHtml(cellMatches[1]);
      
      // Skip header rows
      if (areaName.includes('Area of study') || areaName.includes('Unit')) continue;
      
      // Parse content dot points
      const points = contentPoints.split(',').map(p => p.trim()).filter(p => p && p !== '–' && p !== '-');
      
      if (areaName && points.length > 0) {
        areasOfStudy.push({
          name: areaName,
          contentDotPoints: points
        });
      }
    }
  }
  
  return areasOfStudy;
}

// Function to extract outcomes from HTML table
function extractOutcomes(html: string): { outcomeNumber: string; keyKnowledge: string[]; keySkills: string[] }[] {
  const outcomes: { outcomeNumber: string; keyKnowledge: string[]; keySkills: string[] }[] = [];
  
  // Look for "Outcomes" section
  const outcomesMatch = html.match(/Outcomes.*?<\/table>/s);
  if (!outcomesMatch) return outcomes;
  
  const tableHtml = outcomesMatch[0];
  
  // Extract table rows
  const rowMatches = tableHtml.match(/<tr[^>]*>.*?<\/tr>/gs);
  if (!rowMatches) return outcomes;
  
  for (const row of rowMatches) {
    const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gs);
    if (cellMatches && cellMatches.length >= 3) {
      const outcomeNumber = cleanHtml(cellMatches[0]);
      const keyKnowledge = cleanHtml(cellMatches[1]);
      const keySkills = cleanHtml(cellMatches[2]);
      
      // Skip header rows
      if (outcomeNumber.includes('Outcome') || outcomeNumber.includes('Unit')) continue;
      
      // Parse key knowledge and skills
      const knowledgePoints = keyKnowledge.split(',').map(p => p.trim()).filter(p => p && p !== '–' && p !== '-');
      const skillsPoints = keySkills.split(',').map(p => p.trim()).filter(p => p && p !== '–' && p !== '-');
      
      if (outcomeNumber && (knowledgePoints.length > 0 || skillsPoints.length > 0)) {
        outcomes.push({
          outcomeNumber,
          keyKnowledge: knowledgePoints,
          keySkills: skillsPoints
        });
      }
    }
  }
  
  return outcomes;
}

// Function to determine unit from title
function determineUnit(title: string): string {
  if (title.toLowerCase().includes('unit 1') || title.includes('U1')) return 'Unit 1';
  if (title.toLowerCase().includes('unit 2') || title.includes('U2')) return 'Unit 2';
  if (title.toLowerCase().includes('unit 3') || title.includes('U3')) return 'Unit 3';
  if (title.toLowerCase().includes('unit 4') || title.includes('U4')) return 'Unit 4';
  
  // Try to determine from context or default to Unit 1
  return 'Unit 1';
}

// Function to extract assessment criteria from HTML tables
function extractOutcomeAssessments(html: string): OutcomeAssessment[] {
  const outcomeAssessments: OutcomeAssessment[] = [];
  
  // Look for h3 headers with Unit and Outcome pattern
  const unitOutcomeMatches = html.match(/<h3>(Unit [34], Outcome \d+)<\/h3>/g);
  if (!unitOutcomeMatches) return outcomeAssessments;
  
  for (const headerMatch of unitOutcomeMatches) {
    const headerText = headerMatch.replace(/<\/?h3>/g, '');
    const [unitText, outcomeText] = headerText.split(', ');
    const unit = unitText; // "Unit 3" or "Unit 4"
    const outcomeNumber = outcomeText.replace('Outcome ', ''); // "1" or "2"
    
    // Find the table that follows this header
    const headerIndex = html.indexOf(headerMatch);
    const sectionHtml = html.slice(headerIndex);
    const tableMatch = sectionHtml.match(/<table[^>]*>.*?<\/table>/s);
    
    if (!tableMatch) continue;
    
    const tableHtml = tableMatch[0];
    const criteria: AssessmentCriterion[] = [];
    let totalMarks = '';
    let outcomeDescription = '';
    
    // Extract outcome description from the table structure
    const outcomeDescMatch = tableHtml.match(/<h4>Unit [34]<br>Outcome \d+<br>&nbsp;<\/h4><p>(.*?)<\/p>/s);
    if (outcomeDescMatch) {
      outcomeDescription = cleanHtml(outcomeDescMatch[1]);
    }
    
    // Extract table rows
    const rowMatches = tableHtml.match(/<tr[^>]*>.*?<\/tr>/gs);
    if (!rowMatches) continue;
    
    // Debug: Log the number of rows
    console.log(`Found ${rowMatches.length} table rows for ${unit} Outcome ${outcomeNumber}`);
    
    // Process rows and group task information
    const criteriaMap = new Map<string, { description: string; tasks: { taskNumber: string; markRange: string; }[]; markRange?: string }>();
    let currentDescription = '';
    
    for (let i = 0; i < rowMatches.length; i++) {
      const row = rowMatches[i];
      const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gs);
      
      if (!cellMatches || cellMatches.length < 1) continue;
      
      const firstCell = cleanHtml(cellMatches[0]);
      const secondCell = cellMatches.length > 1 ? cleanHtml(cellMatches[1]) : '';
      
      // Debug: For Unit 4 Outcome 2, log all rows to see the complete structure
      if (unit === 'Unit 4' && outcomeNumber === '2') {
        console.log(`U4O2 Row ${i}: "${firstCell}" | "${secondCell}"`);
      }
      
      // Skip header rows
      if (firstCell.toLowerCase().includes('mark range') || 
          secondCell.toLowerCase().includes('criterion')) continue;
      
      // Check for total marks row
      if (firstCell.toLowerCase().includes('mark allocation') || 
          (firstCell.includes('Outcome') && firstCell.includes('mark'))) {
        totalMarks = secondCell;
        continue;
      }
      
      // Check if this row has a description (non-empty second cell with substantial content)
      if (secondCell && secondCell.length > 50 && !secondCell.toLowerCase().includes('criterion')) {
        currentDescription = secondCell;
      }
      
      // Process task rows - look for mark ranges
      if (firstCell.match(/\d+[–-]\d+/) || firstCell.includes('Task')) {
        
        // Debug: Log the cell content when processing tasks
        if (firstCell.includes('Task')) {
          console.log(`Processing task cell: "${firstCell}"`);
        }
        
        // Extract task information
        const taskPattern = /Task (\d+)[^0-9]*(\d+[–-]\d+)/;
        const taskMatch = taskPattern.exec(firstCell);
        
        if (taskMatch) {
          const taskNumber = taskMatch[1];
          const taskMarkRange = taskMatch[2];
          
          // Use the description from the current or previous row
          const descriptionToUse = secondCell && secondCell.length > 50 ? secondCell : currentDescription;
          
          if (descriptionToUse) {
            // Create a key for grouping criteria with the same description
            const criterionKey = descriptionToUse.substring(0, 100); // Use first 100 chars as key
            
            if (!criteriaMap.has(criterionKey)) {
              criteriaMap.set(criterionKey, {
                description: descriptionToUse,
                tasks: []
              });
            }
            
            // Add this task to the criterion
            criteriaMap.get(criterionKey)!.tasks.push({
              taskNumber,
              markRange: taskMarkRange
            });
          }
        } else {
          // Handle non-task specific mark ranges (like Unit 3 outcomes)
          const rangeMatch = firstCell.match(/(\d+[–-]\d+)/);
          if (rangeMatch && secondCell && secondCell.length > 50) {
            // This is a direct criterion with mark range and description
            const criterion: AssessmentCriterion = {
              markRange: rangeMatch[1],
              description: secondCell
            };
            criteria.push(criterion);
          }
        }
      }
    }
    
    // Add task-based criteria from the map
    for (const [, criterionData] of criteriaMap) {
      const criterion: AssessmentCriterion = {
        markRange: criterionData.tasks.length > 0 ? criterionData.tasks[0].markRange : '0-0',
        description: criterionData.description
      };
      
      if (criterionData.tasks.length > 0) {
        criterion.tasks = criterionData.tasks;
      }
      
      criteria.push(criterion);
    }
    
    // Look for total marks in the last row
    if (!totalMarks && rowMatches.length > 0) {
      const lastRow = rowMatches[rowMatches.length - 1];
      const lastCells = lastRow.match(/<td[^>]*>(.*?)<\/td>/gs);
      if (lastCells && lastCells.length >= 2) {
        const lastFirstCell = cleanHtml(lastCells[0]);
        const lastSecondCell = cleanHtml(lastCells[1]);
        if (lastFirstCell.toLowerCase().includes('allocation') || 
            lastSecondCell.match(/^\d+\s*marks?$/i)) {
          totalMarks = lastSecondCell;
        }
      }
    }
    
    if (criteria.length > 0) {
      outcomeAssessments.push({
        unit,
        outcomeNumber,
        outcomeDescription,
        totalMarks,
        criteria
      });
    }
  }
  
  return outcomeAssessments;
}

// Function to extract description from HTML
function extractDescription(html: string): string {
  // Remove tables from the description to avoid including curriculum mapping tables
  const contentHtml = html.replace(/<table[^>]*>.*?<\/table>/gs, '');
  
  // Clean and extract the full text content
  const cleaned = cleanHtml(contentHtml);
  
  // Return the full cleaned description - no truncation needed as this is the complete task description
  return cleaned;
}

// Main scraper function for learning activities
async function scrapeVCELearningActivities(jsonUrl: string): Promise<LearningActivity[]> {
  try {
    console.log(`Fetching learning activities from: ${jsonUrl}`);
    
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const learningActivities: LearningActivity[] = [];
    
    // Debug: Print the top-level structure
    console.log('Top-level keys:', Object.keys(data));
    
    // Navigate through the JSON structure to find accordion components
    let components = null;
    
    // Try different possible paths
    if (data.pageProps?.page?.field_components) {
      components = data.pageProps.page.field_components;
      console.log('Found components at pageProps.page.field_components');
    } else if (data.props?.pageProps?.page?.field_components) {
      components = data.props.pageProps.page.field_components;
      console.log('Found components at props.pageProps.page.field_components');
    } else if (data.page?.field_components) {
      components = data.page.field_components;
      console.log('Found components at page.field_components');
    } else if (data.field_components) {
      components = data.field_components;
      console.log('Found components at field_components');
    } else {
      // Look for any field_components anywhere in the structure
      const findComponents = (obj: unknown, path = ''): unknown => {
        if (obj && typeof obj === 'object' && obj !== null) {
          const objRecord = obj as Record<string, unknown>;
          if (objRecord.field_components) {
            console.log(`Found field_components at path: ${path}`);
            return objRecord.field_components;
          }
          for (const [key, value] of Object.entries(objRecord)) {
            const result = findComponents(value, path ? `${path}.${key}` : key);
            if (result) return result;
          }
        }
        return null;
      };
      
      components = findComponents(data);
    }
    
    if (!components) {
      console.log('No field_components found in the data structure');
      console.log('Available top-level keys:', Object.keys(data));
      return learningActivities;
    }
    
    console.log(`Found ${components.length} components`);
    
    // Process each component
    for (const component of components) {
      console.log(`Component type: ${component.type}`);
      
      // Debug: For Specialist Mathematics, log more details about each component
      if (jsonUrl.includes('specialist-mathematics')) {
        console.log(`  Component title: ${component.field_accordion_title || component.field_awa_heading || 'No title'}`);
      }
      
      // Look for accordion_within_accordion components (unit sections)
      if (component.type === 'paragraph--accordion_within_accordion') {
        const unitTitle = component.field_awa_heading || '';
        console.log(`Processing section: ${unitTitle}`);
        
        // Process sub-accordions (individual learning activities)
        if (component.field_sub_accordion) {
          for (const subAccordion of component.field_sub_accordion) {
            if (subAccordion.type === 'paragraph--accordion') {
              const activityTitle = subAccordion.field_accordion_title || '';
              const activityHtml = subAccordion.field_accordion_body?.processed || '';
              
              if (activityTitle && activityHtml) {
                console.log(`  Processing learning activity: ${activityTitle}`);
                
                const unit = determineUnit(unitTitle || activityTitle);
                const description = extractDescription(activityHtml);
                const areasOfStudy = extractAreasOfStudy(activityHtml);
                const outcomes = extractOutcomes(activityHtml);
                
                const activity: LearningActivity = {
                  unit,
                  title: activityTitle,
                  description,
                  areasOfStudy,
                  outcomes
                };
                
                learningActivities.push(activity);
              }
            }
          }
        }
      }
      
      // Look for regular accordion components that might contain learning activities
      if (component.type === 'paragraph--accordion') {
        const accordionTitle = component.field_accordion_title || '';
        const accordionHtml = component.field_accordion_body?.processed || '';
        
        // Check if this is a unit-based accordion (like "Unit 1", "Unit 2", "Units 3 and 4")
        if (accordionTitle.toLowerCase().includes('unit') && accordionHtml) {
          console.log(`Processing learning activities from: ${accordionTitle}`);
          
          // Try to extract individual learning activities from this accordion
          // Look for main activity headings (but not "Part", "Areas of study", "Outcomes")
          const activityMatches = accordionHtml.match(/<h[3-6][^>]*>(.*?)<\/h[3-6]>/g);
          if (activityMatches) {
            const mainActivities = activityMatches.filter((match: string) => {
              const title = cleanHtml(match);
              return title && 
                     !title.toLowerCase().includes('introduction') && 
                     !title.toLowerCase().includes('overview') &&
                     !title.toLowerCase().startsWith('part ') &&
                     !title.toLowerCase().includes('areas of study') &&
                     !title.toLowerCase().includes('outcomes');
            });
            
            for (const activityMatch of mainActivities) {
              const activityTitle = cleanHtml(activityMatch);
              console.log(`  Processing learning activity from accordion: ${activityTitle}`);
              
              // Extract the content for this main activity (until the next main activity)
              const currentIndex = accordionHtml.indexOf(activityMatch);
              const nextActivityIndex = mainActivities.indexOf(activityMatch) + 1 < mainActivities.length 
                ? accordionHtml.indexOf(mainActivities[mainActivities.indexOf(activityMatch) + 1])
                : accordionHtml.length;
              
              const activityContent = accordionHtml.substring(currentIndex, nextActivityIndex);
              
              const unit = determineUnit(accordionTitle || activityTitle);
              const description = extractDescription(activityContent);
              const areasOfStudy = extractAreasOfStudy(activityContent);
              const outcomes = extractOutcomes(activityContent);
              
              const activity: LearningActivity = {
                unit,
                title: activityTitle,
                description,
                areasOfStudy,
                outcomes
              };
              
              learningActivities.push(activity);
            }
          }
        }
      }
    }
    
    console.log(`Total learning activities extracted: ${learningActivities.length}`);
    return learningActivities;
    
  } catch (error) {
    console.error('Error scraping VCE learning activities:', error);
    throw error;
  }
}

// Main scraper function for assessment tasks
async function scrapeVCEAssessmentTasks(jsonUrl: string): Promise<{ tasks: AssessmentTask[], assessments: OutcomeAssessment[] }> {
  try {
    console.log(`Fetching data from: ${jsonUrl}`);
    
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const assessmentTasks: AssessmentTask[] = [];
    const outcomeAssessments: OutcomeAssessment[] = [];
    
    // Debug: Print the top-level structure
    console.log('Top-level keys:', Object.keys(data));
    
    // Navigate through the JSON structure to find accordion components
    let components = null;
    
    // Try different possible paths
    if (data.pageProps?.page?.field_components) {
      components = data.pageProps.page.field_components;
      console.log('Found components at pageProps.page.field_components');
    } else if (data.props?.pageProps?.page?.field_components) {
      components = data.props.pageProps.page.field_components;
      console.log('Found components at props.pageProps.page.field_components');
    } else if (data.page?.field_components) {
      components = data.page.field_components;
      console.log('Found components at page.field_components');
    } else if (data.field_components) {
      components = data.field_components;
      console.log('Found components at field_components');
    } else {
      // Look for any field_components anywhere in the structure
      const findComponents = (obj: unknown, path = ''): unknown => {
        if (obj && typeof obj === 'object' && obj !== null) {
          const objRecord = obj as Record<string, unknown>;
          if (objRecord.field_components) {
            console.log(`Found field_components at path: ${path}`);
            return objRecord.field_components;
          }
          for (const [key, value] of Object.entries(objRecord)) {
            const result = findComponents(value, path ? `${path}.${key}` : key);
            if (result) return result;
          }
        }
        return null;
      };
      
      components = findComponents(data);
    }
    
    if (!components) {
      console.log('No field_components found in the data structure');
      console.log('Available top-level keys:', Object.keys(data));
      return { tasks: assessmentTasks, assessments: outcomeAssessments };
    }
    
    console.log(`Found ${components.length} components`);
    
    // Process each component
    for (const component of components) {
      console.log(`Component type: ${component.type}`);
      
      // Debug: For Specialist Mathematics, log more details about each component
      if (jsonUrl.includes('specialist-mathematics')) {
        console.log(`  Component title: ${component.field_accordion_title || component.field_awa_heading || 'No title'}`);
      }
      
      // Look for accordion_within_accordion components (unit sections)
      if (component.type === 'paragraph--accordion_within_accordion') {
        const unitTitle = component.field_awa_heading || '';
        console.log(`Processing section: ${unitTitle}`);
        
        // Process sub-accordions (individual tasks)
        if (component.field_sub_accordion) {
          for (const subAccordion of component.field_sub_accordion) {
            if (subAccordion.type === 'paragraph--accordion') {
              const taskTitle = subAccordion.field_accordion_title || '';
              const taskHtml = subAccordion.field_accordion_body?.processed || '';
              
              if (taskTitle && taskHtml) {
                console.log(`  Processing task: ${taskTitle}`);
                
                const unit = determineUnit(unitTitle || taskTitle);
                const description = extractDescription(taskHtml);
                const areasOfStudy = extractAreasOfStudy(taskHtml);
                const outcomes = extractOutcomes(taskHtml);
                
                const task: AssessmentTask = {
                  unit,
                  title: taskTitle,
                  description,
                  areasOfStudy,
                  outcomes
                };
                
                assessmentTasks.push(task);
              }
            }
          }
        }
      }
      
      // Look for regular accordion components that might contain sample assessment tasks
      if (component.type === 'paragraph--accordion') {
        const accordionTitle = component.field_accordion_title || '';
        const accordionHtml = component.field_accordion_body?.processed || '';
        
        // Check if this contains sample assessment tasks (for subjects like Specialist Mathematics)
        if (accordionTitle.toLowerCase().includes('sample assessment tasks') && accordionHtml) {
          console.log(`Processing sample tasks from: ${accordionTitle}`);
          
          // Try to extract individual tasks from this accordion
          // Look for headings that might indicate tasks
          const taskMatches = accordionHtml.match(/<h[3-6][^>]*>(.*?)<\/h[3-6]>/g);
          if (taskMatches) {
            for (const taskMatch of taskMatches) {
              const taskTitle = cleanHtml(taskMatch);
              if (taskTitle && !taskTitle.toLowerCase().includes('introduction') && 
                  !taskTitle.toLowerCase().includes('overview')) {
                console.log(`  Processing task from accordion: ${taskTitle}`);
                
                // Extract the content following this heading
                const headingRegex = new RegExp(taskMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(.*?)(?=<h[3-6]|$)', 's');
                const contentMatch = accordionHtml.match(headingRegex);
                const taskContent = contentMatch ? contentMatch[1] : '';
                
                const unit = determineUnit(taskTitle);
                const description = extractDescription(taskContent);
                const areasOfStudy = extractAreasOfStudy(taskContent);
                const outcomes = extractOutcomes(taskContent);
                
                const task: AssessmentTask = {
                  unit,
                  title: taskTitle,
                  description,
                  areasOfStudy,
                  outcomes
                };
                
                assessmentTasks.push(task);
              }
            }
          }
        }
        
        // Check if this is a unit-based accordion that might contain tasks (like "Unit 3", "Unit 4")
        if ((accordionTitle === 'Unit 3' || accordionTitle === 'Unit 4') && accordionHtml && 
            !accordionHtml.includes('Unit 3, Outcome') && !accordionHtml.includes('Unit 4, Outcome')) {
          // These sections contain links to external resources, not inline tasks
          // Skip processing as they don't contain extractable task content
        }
        
        // Check if this contains Unit 3 or Unit 4 outcome assessments
        if (accordionHtml && (accordionHtml.includes('Unit 3') || accordionHtml.includes('Unit 4')) && 
            accordionHtml.includes('Outcome')) {
          console.log(`Processing assessment criteria in: ${accordionTitle}`);
          
          // Debug: Log the first 500 characters of the HTML
          console.log(`HTML preview: ${accordionHtml.substring(0, 500)}...`);
          
          const assessments = extractOutcomeAssessments(accordionHtml);
          console.log(`Found ${assessments.length} assessments in this section`);
          outcomeAssessments.push(...assessments);
        }
      }
    }
    
    console.log(`Total tasks extracted: ${assessmentTasks.length}`);
    console.log(`Total outcome assessments extracted: ${outcomeAssessments.length}`);
    return { tasks: assessmentTasks, assessments: outcomeAssessments };
    
  } catch (error) {
    console.error('Error scraping VCE assessment tasks:', error);
    throw error;
  }
}

// Interface for combined subject data
export interface SubjectData {
  subject: string;
  assessmentTasks: AssessmentTask[];
  outcomeAssessments: OutcomeAssessment[];
  learningActivities: LearningActivity[];
}

// Function to save subject data to JSON file
function saveSubjectDataToFile(subjectData: SubjectData): void {
  const filename = `${subjectData.subject.toLowerCase().replace(/\s+/g, '_')}_curriculum_data.json`;
  const outputPath = path.join(process.cwd(), 'data', filename);
  
  // Ensure data directory exists
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(subjectData, null, 2));
  console.log(`${subjectData.subject} curriculum data saved to: ${outputPath}`);
}

// Function to save unified data across all subjects
function saveUnifiedDataToFile(allSubjects: SubjectData[]): void {
  const outputPath = path.join(process.cwd(), 'data', 'vce_curriculum_data.json');
  
  // Ensure data directory exists
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(allSubjects, null, 2));
  console.log(`Unified curriculum data saved to: ${outputPath}`);
}

// Main execution function
async function main() {
  try {
    // Define URLs for all subjects
    const subjects = [
      {
        name: 'Mathematical Methods',
        assessmentUrl: 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/mathematical-methods/assessment.json',
        teachingUrl: 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/mathematical-methods/teaching-and-learning.json'
      },
      {
        name: 'Specialist Mathematics',
        assessmentUrl: 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/specialist-mathematics/assessment.json',
        teachingUrl: 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/specialist-mathematics/teaching-and-learning.json'
      },
      {
        name: 'General Mathematics',
        assessmentUrl: 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/general-mathematics/assessment.json',
        teachingUrl: 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/general-mathematics/teaching-and-learning.json'
      }
    ];
    
    console.log('Starting VCE curriculum scraping for multiple subjects...');
    
    // Array to store all subject data
    const allSubjectData: SubjectData[] = [];
    
    // Process each subject
    for (const subject of subjects) {
      console.log(`\n=== PROCESSING ${subject.name.toUpperCase()} ===`);
      
      // Scrape assessment tasks and criteria
      console.log(`\n--- SCRAPING ${subject.name} ASSESSMENT TASKS AND CRITERIA ---`);
      const assessmentResult = await scrapeVCEAssessmentTasks(subject.assessmentUrl);
      const { tasks, assessments } = assessmentResult;
      
      // Scrape learning activities
      console.log(`\n--- SCRAPING ${subject.name} LEARNING ACTIVITIES ---`);
      const learningActivities = await scrapeVCELearningActivities(subject.teachingUrl);
      
      // Create subject data object
      const subjectData: SubjectData = {
        subject: subject.name,
        assessmentTasks: tasks,
        outcomeAssessments: assessments,
        learningActivities: learningActivities
      };
      
      // Add to combined array
      allSubjectData.push(subjectData);
      
      // Save individual subject file
      saveSubjectDataToFile(subjectData);
      
      console.log(`${subject.name} - Tasks: ${tasks.length}, Assessments: ${assessments.length}, Activities: ${learningActivities.length}`);
    }
    
    // Save unified file containing all subjects
    saveUnifiedDataToFile(allSubjectData);
    
    console.log('\n=== EXTRACTED ASSESSMENT TASKS BY SUBJECT ===');
    allSubjectData.forEach(subjectData => {
      console.log(`\n--- ${subjectData.subject.toUpperCase()} ASSESSMENT TASKS ---`);
      subjectData.assessmentTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.title}`);
        console.log(`   Unit: ${task.unit}`);
        console.log(`   Description: ${task.description.substring(0, 100)}...`);
        console.log(`   Areas of Study: ${task.areasOfStudy.length}`);
        console.log(`   Outcomes: ${task.outcomes.length}`);
      });
    });
    
    console.log('\n=== EXTRACTED OUTCOME ASSESSMENTS BY SUBJECT ===');
    allSubjectData.forEach(subjectData => {
      console.log(`\n--- ${subjectData.subject.toUpperCase()} OUTCOME ASSESSMENTS ---`);
      subjectData.outcomeAssessments.forEach((assessment, index) => {
        console.log(`${index + 1}. ${assessment.unit} Outcome ${assessment.outcomeNumber}`);
        console.log(`   Description: ${assessment.outcomeDescription.substring(0, 100)}...`);
        console.log(`   Total Marks: ${assessment.totalMarks}`);
        console.log(`   Criteria: ${assessment.criteria.length}`);
      });
    });
    
    console.log('\n=== EXTRACTED LEARNING ACTIVITIES BY SUBJECT ===');
    allSubjectData.forEach(subjectData => {
      console.log(`\n--- ${subjectData.subject.toUpperCase()} LEARNING ACTIVITIES ---`);
      subjectData.learningActivities.forEach((activity, index) => {
        console.log(`${index + 1}. ${activity.title}`);
        console.log(`   Unit: ${activity.unit}`);
        console.log(`   Description: ${activity.description.substring(0, 100)}...`);
        console.log(`   Areas of Study: ${activity.areasOfStudy.length}`);
        console.log(`   Outcomes: ${activity.outcomes.length}`);
      });
    });
    
    console.log('\n=== SUMMARY ===');
    allSubjectData.forEach(subjectData => {
      console.log(`${subjectData.subject}:`);
      console.log(`  - Assessment tasks: ${subjectData.assessmentTasks.length}`);
      console.log(`  - Outcome assessments: ${subjectData.outcomeAssessments.length}`);
      console.log(`  - Learning activities: ${subjectData.learningActivities.length}`);
    });
    
    const totalTasks = allSubjectData.reduce((sum, s) => sum + s.assessmentTasks.length, 0);
    const totalAssessments = allSubjectData.reduce((sum, s) => sum + s.outcomeAssessments.length, 0);
    const totalActivities = allSubjectData.reduce((sum, s) => sum + s.learningActivities.length, 0);
    
    console.log(`\nTOTAL ACROSS ALL SUBJECTS:`);
    console.log(`  - Assessment tasks: ${totalTasks}`);
    console.log(`  - Outcome assessments: ${totalAssessments}`);
    console.log(`  - Learning activities: ${totalActivities}`);
    console.log(`  - Subjects processed: ${allSubjectData.map(s => s.subject).join(', ')}`);
    
  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  }
}

// Export for module use or run directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}

export { scrapeVCEAssessmentTasks, scrapeVCELearningActivities };
