import fs from 'fs';
import path from 'path';

// Types for the JSON structure
export interface AssessmentTask {
  unit: string;
  title: string;
  description: string;
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

// Main scraper function
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
      
      // Look for regular accordion components that might contain assessment criteria
      if (component.type === 'paragraph--accordion') {
        const accordionTitle = component.field_accordion_title || '';
        const accordionHtml = component.field_accordion_body?.processed || '';
        
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

// Function to save assessment criteria to JSON file
function saveAssessmentsToFile(assessments: OutcomeAssessment[], filename: string = 'vce_outcome_assessments.json'): void {
  const outputPath = path.join(process.cwd(), 'data', filename);
  
  // Ensure data directory exists
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(assessments, null, 2));
  console.log(`Assessment criteria saved to: ${outputPath}`);
}

// Function to save results to JSON file
function saveTasksToFile(tasks: AssessmentTask[], filename: string = 'vce_assessment_tasks.json'): void {
  const outputPath = path.join(process.cwd(), 'data', filename);
  
  // Ensure data directory exists
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(tasks, null, 2));
  console.log(`Tasks saved to: ${outputPath}`);
}

// Main execution function
async function main() {
  try {
    const mathMethodsUrl = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/mathematical-methods/assessment.json';
    
    console.log('Starting VCE Mathematical Methods assessment task scraping...');
    
    const result = await scrapeVCEAssessmentTasks(mathMethodsUrl);
    const { tasks, assessments } = result;
    
    console.log('\n=== EXTRACTED ASSESSMENT TASKS ===');
    tasks.forEach((task, index) => {
      console.log(`\n${index + 1}. ${task.title}`);
      console.log(`   Unit: ${task.unit}`);
      console.log(`   Description: ${task.description.substring(0, 100)}...`);
      console.log(`   Areas of Study: ${task.areasOfStudy.length}`);
      console.log(`   Outcomes: ${task.outcomes.length}`);
      
      // Show detailed breakdown
      task.areasOfStudy.forEach(area => {
        console.log(`     - ${area.name}: [${area.contentDotPoints.join(', ')}]`);
      });
      
      task.outcomes.forEach(outcome => {
        console.log(`     - Outcome ${outcome.outcomeNumber}:`);
        console.log(`       Knowledge: [${outcome.keyKnowledge.join(', ')}]`);
        console.log(`       Skills: [${outcome.keySkills.join(', ')}]`);
      });
    });
    
    // Save assessment tasks to file
    saveTasksToFile(tasks, 'mathematical_methods_assessment_tasks.json');
    
    console.log('\n=== EXTRACTED OUTCOME ASSESSMENTS ===');
    assessments.forEach((assessment, index) => {
      console.log(`\n${index + 1}. ${assessment.unit} Outcome ${assessment.outcomeNumber}`);
      console.log(`   Description: ${assessment.outcomeDescription.substring(0, 100)}...`);
      console.log(`   Total Marks: ${assessment.totalMarks}`);
      console.log(`   Criteria: ${assessment.criteria.length}`);
      
      assessment.criteria.forEach((criterion, critIndex) => {
        console.log(`     ${critIndex + 1}. Mark Range: ${criterion.markRange}`);
        console.log(`        Description: ${criterion.description.substring(0, 80)}...`);
        if (criterion.tasks) {
          criterion.tasks.forEach(task => {
            console.log(`        Task ${task.taskNumber}: ${task.markRange}`);
          });
        }
      });
    });
    
    // Save assessment criteria to file
    saveAssessmentsToFile(assessments, 'mathematical_methods_outcome_assessments.json');
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total tasks extracted: ${tasks.length}`);
    console.log(`Total outcome assessments extracted: ${assessments.length}`);
    console.log(`Units covered: ${[...new Set(tasks.map(t => t.unit))].join(', ')}`);
    
  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  }
}

// Export for module use or run directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}

export { scrapeVCEAssessmentTasks };
