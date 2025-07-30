import fs from 'fs';
import path from 'path';

// Types for Physical Education curriculum data (from original pe.ts)
interface PELearningActivity {
  activity: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

interface PEDetailedExample {
  title: string;
  content: string;
  unit: number;
  areaOfStudy: string;
  outcome: string;
}

// Types for Physical Education assessment data (from original pe-assessment.ts)
interface PEAssessmentTask {
  unit: string;
  title: string;
  description: string;
}

// Combined interface
interface PECombinedData {
  learningActivities: PELearningActivity[];
  detailedExamples: PEDetailedExample[];
  assessmentTasks: PEAssessmentTask[];
}

// Function to extract learning activities from HTML content (exact copy from pe.ts)
function extractCurriculumLearningActivities(htmlContent: string, unit: number, areaOfStudy: string, outcome: string): PELearningActivity[] {
  const activities: PELearningActivity[] = [];
  
  // Extract activities from HTML using simple string parsing
  const activityRegex = /<li[^>]*>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>[^<]*)*)<\/li>/g;
  let match;
  
  while ((match = activityRegex.exec(htmlContent)) !== null) {
    const activityText = match[1]
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .trim();
    
    if (activityText && !match[0].includes('exampleno-border')) {
      activities.push({
        activity: activityText,
        unit,
        areaOfStudy,
        outcome
      });
    }
  }
  
  return activities;
}

// Function to extract detailed examples from HTML content (exact copy from pe.ts)
function extractCurriculumDetailedExamples(htmlContent: string, unit: number, areaOfStudy: string, outcome: string): PEDetailedExample[] {
  const examples: PEDetailedExample[] = [];
  
  // Extract detailed examples using regex
  const noteboxRegex = /<div class="notebox">(.*?)<\/div>/gs;
  const matches = htmlContent.match(noteboxRegex);
  
  if (matches) {
    matches.forEach((match: string) => {
      // Extract title - look for strong tags within the content for the actual title
      let title = 'Detailed Example';
      
      // Try to find title in strong tags within paragraphs
      const strongTitleMatch = match.match(/<p[^>]*><strong[^>]*>(.*?)<\/strong>/);
      if (strongTitleMatch) {
        title = strongTitleMatch[1].replace(/<[^>]+>/g, '').trim();
      } else {
        // Fallback: look for any strong tag content
        const anyStrongMatch = match.match(/<strong[^>]*>(.*?)<\/strong>/);
        if (anyStrongMatch) {
          title = anyStrongMatch[1].replace(/<[^>]+>/g, '').trim();
        }
      }
      
      // Extract content by removing HTML tags
      const content = match
        .replace(/<h2[^>]*>.*?<\/h2>/g, '') // Remove h2 headers
        .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .trim();
      
      if (content) {
        examples.push({
          title,
          content,
          unit,
          areaOfStudy,
          outcome
        });
      }
    });
  }
  
  return examples;
}

// Main scraping function for PE curriculum (exact logic from pe.ts)
async function scrapePECurriculumData(): Promise<{ learningActivities: PELearningActivity[], detailedExamples: PEDetailedExample[] }> {
  const url = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/physical-education/teaching-and-learning.json';
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Navigate to the page content
    const pageContent = data?.pageProps?.node || data?.pageProps?.page;
    
    if (!pageContent?.field_components) {
      throw new Error('Could not find page components in the data structure');
    }
    
    const allActivities: PELearningActivity[] = [];
    const allDetailedExamples: PEDetailedExample[] = [];
    
    // Process each component
    for (const component of pageContent.field_components) {
      if (component.type === 'paragraph--accordion') {
        const title = component.field_accordion_title;
        const htmlContent = component.field_accordion_body?.processed || component.field_accordion_body?.value || '';
        
        if (title && htmlContent) {
          let unit = 0;
          let areaOfStudy = '';
          let outcome = '';
          
          // Extract unit and area of study information from title (exact logic from pe.ts)
          if (title.includes('Unit 1')) {
            unit = 1;
            if (title.includes('Area of Study 1')) {
              areaOfStudy = 'How does the musculoskeletal system work to produce movement?';
              outcome = 'Outcome 1';
            } else if (title.includes('Area of Study 2')) {
              areaOfStudy = 'How does the cardiovascular and respiratory systems work to produce movement?';
              outcome = 'Outcome 2';
            }
          } else if (title.includes('Unit 2')) {
            unit = 2;
            if (title.includes('Area of Study 1')) {
              areaOfStudy = 'What physical, social and emotional benefits are derived from participating in physical activity?';
              outcome = 'Outcome 1';
            } else if (title.includes('Area of Study 2')) {
              areaOfStudy = 'What are the contemporary issues associated with physical activity and sport?';
              outcome = 'Outcome 2';
            }
          } else if (title.includes('Unit 3')) {
            unit = 3;
            if (title.includes('Area of Study 1')) {
              areaOfStudy = 'How are movement skills improved?';
              outcome = 'Outcome 1';
            } else if (title.includes('Area of Study 2')) {
              areaOfStudy = 'How does the body produce energy?';
              outcome = 'Outcome 2';
            }
          } else if (title.includes('Unit 4')) {
            unit = 4;
            if (title.includes('Area of Study 1')) {
              areaOfStudy = 'What are the foundations of an effective training program?';
              outcome = 'Outcome 1';
            } else if (title.includes('Area of Study 2')) {
              areaOfStudy = 'How is training implemented effectively to improve fitness?';
              outcome = 'Outcome 2';
            }
          }
          
          // Only process if we have valid unit information
          if (unit > 0 && areaOfStudy && outcome) {
            const activities = extractCurriculumLearningActivities(htmlContent, unit, areaOfStudy, outcome);
            const examples = extractCurriculumDetailedExamples(htmlContent, unit, areaOfStudy, outcome);
            
            allActivities.push(...activities);
            allDetailedExamples.push(...examples);
          }
        }
      }
    }
    
    return {
      learningActivities: allActivities,
      detailedExamples: allDetailedExamples
    };
    
  } catch (error) {
    console.error('Error scraping PE curriculum data:', error);
    throw error;
  }
}

// Assessment functions (exact copy from pe-assessment.ts)
async function scrapePEAssessmentData(): Promise<PEAssessmentTask[]> {
  try {
    const response = await fetch('https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/physical-education/assessment.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Navigate to the page content - try both possible paths
    const pageContent = data?.pageProps?.node || data?.pageProps?.page;
    
    if (!pageContent?.field_components) {
      throw new Error('Could not find page components in the assessment data structure');
    }
    
    const assessmentTasks: PEAssessmentTask[] = [];
    
    // Process each component
    for (const component of pageContent.field_components) {
      if (component.type === 'paragraph--accordion') {
        const title = component.field_accordion_title;
        const bodyContent = component.field_accordion_body?.processed || component.field_accordion_body?.value || '';
        
        // Extract assessment tasks from accordion content
        if (title && bodyContent) {
          if (title.includes('Unit 1 and 2') && title.includes('sample assessment tasks')) {
            // Extract table-based assessment tasks for Units 1 and 2
            extractUnit1And2Tasks(bodyContent, assessmentTasks);
          } else if (title.includes('Unit 3') || title.includes('Unit 4')) {
            // Extract individual task information from accordion titles
            extractUnit3And4Tasks(title, bodyContent, assessmentTasks);
          }
        }
      }
    }
    
    console.log(`Scraped ${assessmentTasks.length} assessment tasks for Physical Education`);
    
    return assessmentTasks;
    
  } catch (error) {
    console.error('Error scraping PE assessment data:', error);
    throw error;
  }
}

function extractUnit1And2Tasks(htmlContent: string, assessmentTasks: PEAssessmentTask[]): void {
  // Extract table rows containing assessment task types
  const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gs;
  const tableRows = htmlContent.match(tableRowRegex) || [];
  
  for (const row of tableRows) {
    // Skip header rows
    if (row.includes('<th') || !row.includes('<td')) {
      continue;
    }
    
    // Extract task type and description from table cells
    const cellRegex = /<td[^>]*>(.*?)<\/td>/gs;
    const cells = [];
    let match;
    
    while ((match = cellRegex.exec(row)) !== null) {
      cells.push(match[1]);
    }
    
    if (cells.length >= 2) {
      const taskTypeCell = cells[0];
      const descriptionCell = cells[1];
      
      // Extract task title from the first cell
      const titleMatch = taskTypeCell.match(/<li[^>]*>(.*?)<\/li>/s);
      if (titleMatch) {
        let title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        
        // Clean up title
        title = title.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
        
        if (title) {
          // Extract description content, removing HTML tags
          let description = descriptionCell.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          description = description.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
          
          // Add tasks for both Unit 1 and Unit 2 as specified in the user requirements
          assessmentTasks.push({
            unit: 'Unit 1',
            title,
            description
          });
          
          assessmentTasks.push({
            unit: 'Unit 2',
            title,
            description
          });
        }
      }
    }
  }
  
  // Add the specific oral presentation task for Unit 1 and 2 as requested
  const oralPresentationTask = {
    unit: 'Unit 1',
    title: 'an oral presentation, such as a debate or a podcast',
    description: `The task could be a persuasive oral presentation, debate of a specific topic or an informative podcast that responds to a question. 3 minutes is a reasonable time limit for an individual oral presentation. Students should be provided with the topic (encompassing multiple key knowledge points) or specific question to complete the research required prior to completing the oral component. The key skills need to be provided so as students know what they are expected to do with their knowledge in responding to the topic or question. Planning time should be provided where students can collect or organise information based on the questions and any scaffolding prompts. Consideration should be given to the constraints that need to be put in place regarding the research time; amount of time provided, what students are asked to prepare (script if a podcast or palm cards for an oral presentation), what they have access to in preparing the notes (i.e. any stimulus material or class notes) Teachers should authenticate any prepared material and these should be all students have access to in completing the oral component. The oral presentation and completed notes are assessed. Example of potential U1 & U2 application Unit 2 Area of Study 2 – Contemporary issues associated with physical activity and sport`
  };
  
  // Add the oral presentation task for Unit 2 as well
  const oralPresentationTaskU2 = {
    unit: 'Unit 2',
    title: 'an oral presentation, such as a debate or a podcast',
    description: `The task could be a persuasive oral presentation, debate of a specific topic or an informative podcast that responds to a question. 3 minutes is a reasonable time limit for an individual oral presentation. Students should be provided with the topic (encompassing multiple key knowledge points) or specific question to complete the research required prior to completing the oral component. The key skills need to be provided so as students know what they are expected to do with their knowledge in responding to the topic or question. Planning time should be provided where students can collect or organise information based on the questions and any scaffolding prompts. Consideration should be given to the constraints that need to be put in place regarding the research time; amount of time provided, what students are asked to prepare (script if a podcast or palm cards for an oral presentation), what they have access to in preparing the notes (i.e. any stimulus material or class notes) Teachers should authenticate any prepared material and these should be all students have access to in completing the oral component. The oral presentation and completed notes are assessed. Example of potential U1 & U2 application Unit 2 Area of Study 2 – Contemporary issues associated with physical activity and sport`
  };
  
  assessmentTasks.push(oralPresentationTask);
  assessmentTasks.push(oralPresentationTaskU2);
}

function extractUnit3And4Tasks(title: string, htmlContent: string, assessmentTasks: PEAssessmentTask[]): void {
  // Determine unit from title
  let unit = '';
  if (title.includes('Unit 3')) {
    unit = 'Unit 3';
  } else if (title.includes('Unit 4')) {
    unit = 'Unit 4';
  } else {
    return;
  }
  
  // Extract task type from title
  let taskTitle = '';
  if (title.includes('Structured questions')) {
    taskTitle = 'structured questions';
  } else if (title.includes('Laboratory report')) {
    taskTitle = 'laboratory report';
  } else if (title.includes('Written report')) {
    taskTitle = 'written report';
  } else if (title.includes('Case Study')) {
    taskTitle = 'case study';
  } else if (title.includes('Area of Study 3')) {
    taskTitle = 'extended response';
  } else if (title.includes('Unit 4 Outcome 2')) {
    // Special handling for Unit 4 Outcome 2 which has multiple tasks
    const caseStudyDescription = extractCaseStudyDescription(htmlContent);
    const secondTaskDescription = extractSecondTaskDescription(htmlContent);
    
    // Add case study task
    assessmentTasks.push({
      unit: 'Unit 4',
      title: 'case study',
      description: caseStudyDescription
    });
    
    // Add second task
    assessmentTasks.push({
      unit: 'Unit 4', 
      title: 'case study analysis, data analysis, or structured questions',
      description: secondTaskDescription
    });
    
    return;
  } else {
    // Extract task title from the accordion title
    const titleParts = title.split('–');
    if (titleParts.length > 1) {
      taskTitle = titleParts[1].trim().toLowerCase();
    }
  }
  
  if (taskTitle) {
    // Clean up the HTML content to extract description
    let description = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    description = description.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
    
    // Extract the main content, focusing on the key instructional parts
    const preparingMatch = description.match(/Preparing for the task(.*?)(?:Designing the task|Delivering the task|Assessing the task|$)/s);
    const designingMatch = description.match(/Designing the task(.*?)(?:Delivering the task|Assessing the task|$)/s);
    const deliveringMatch = description.match(/Delivering the task(.*?)(?:Assessing the task|$)/s);
    const assessingMatch = description.match(/Assessing the task(.*?)$/s);
    
    let finalDescription = '';
    
    if (preparingMatch) {
      finalDescription += 'Preparing for the task\n\n' + preparingMatch[1].trim() + '\n\n';
    }
    if (designingMatch) {
      finalDescription += 'Designing the task\n\n' + designingMatch[1].trim() + '\n\n';
    }
    if (deliveringMatch) {
      finalDescription += 'Delivering the task\n\n' + deliveringMatch[1].trim() + '\n\n';
    }
    if (assessingMatch) {
      finalDescription += 'Assessing the task\n\n' + assessingMatch[1].trim();
    }
    
    // If no structured content found, use the first part of the description
    if (!finalDescription) {
      finalDescription = description.substring(0, 2000); // Limit length
    }
    
    assessmentTasks.push({
      unit,
      title: taskTitle,
      description: finalDescription.trim()
    });
  }
}

function extractCaseStudyDescription(htmlContent: string): string {
  // Extract content from "Unit 4 Outcome 2 (Task 1)– Case Study" section
  const caseStudyMatch = htmlContent.match(/Unit 4 Outcome 2 \(Task 1\)– Case Study(.*?)(?:Unit 4 Outcome 2 \(Task 2\)|$)/s);
  
  if (caseStudyMatch) {
    let description = caseStudyMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    description = description.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
    
    // Extract structured sections
    const preparingMatch = description.match(/Preparing for the task(.*?)(?:Designing the task|Delivering the task|Assessing the task|$)/s);
    const designingMatch = description.match(/Designing the task(.*?)(?:Delivering the task|Assessing the task|$)/s);
    const deliveringMatch = description.match(/Delivering the task(.*?)(?:Assessing the task|$)/s);
    const assessingMatch = description.match(/Assessing the task(.*?)$/s);
    
    let finalDescription = '';
    
    if (preparingMatch) {
      finalDescription += 'Preparing for the task\n\n' + preparingMatch[1].trim() + '\n\n';
    }
    if (designingMatch) {
      finalDescription += 'Designing the task\n\n' + designingMatch[1].trim() + '\n\n';
    }
    if (deliveringMatch) {
      finalDescription += 'Delivering the task\n\n' + deliveringMatch[1].trim() + '\n\n';
    }
    if (assessingMatch) {
      finalDescription += 'Assessing the task\n\n' + assessingMatch[1].trim();
    }
    
    return finalDescription.trim() || description.substring(0, 2000);
  }
  
  return 'Case study task description not found';
}

function extractSecondTaskDescription(htmlContent: string): string {
  // Extract content for the second task in Unit 4 Outcome 2
  const secondTaskMatch = htmlContent.match(/Unit 4 Outcome 2 \(Task 2\)(.*?)$/s);
  
  if (secondTaskMatch) {
    let description = secondTaskMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    description = description.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
    return description;
  }
  
  // Fallback: look for the description of the second assessment task
  const fallbackMatch = htmlContent.match(/A response in one following formats, which links chronic adaptations(.*?)(?:Assessment Rubrics|$)/s);
  
  if (fallbackMatch) {
    let description = fallbackMatch[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    description = description.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
    return description;
  }
  
  return 'A response in one following formats, which links chronic adaptations of the cardiovascular, respiratory and muscular systems to training methods and improved performance: a case study analysis a data analysis structured questions   The second assessment task in Outcome 2 enables students to demonstrate an understanding of the impact of training on the cardiovascular, respiratory and muscular systems. A case study or data analysis could be completed in either a report format (such as Unit 4 task 1) or a series of short answer questions provided each question relates directly to the case study or data (such as pre and post-test data from an assessment of fitness). Structured questions may include a variety of types of questions (multiple choice, short answer, extended answer).';
}

// Main combined scraping function
async function scrapePECombinedData(): Promise<void> {
  try {
    console.log('Starting Physical Education curriculum and assessment scraping...');
    
    // Scrape curriculum data (learning activities and detailed examples)
    const { learningActivities, detailedExamples } = await scrapePECurriculumData();
    
    // Scrape assessment data
    const assessmentTasks = await scrapePEAssessmentData();
    
    // Create the combined data object with the exact same structure as original files
    const combinedData: PECombinedData = {
      learningActivities,
      detailedExamples,
      assessmentTasks
    };
    
    // Write combined data to single JSON file
    const outputPath = path.join(process.cwd(), 'data', 'pe_curriculum_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));
    
    console.log(`\n=== Physical Education Scraping Complete ===`);
    console.log(`Learning Activities: ${learningActivities.length}`);
    console.log(`Detailed Examples: ${detailedExamples.length}`);
    console.log(`Assessment Tasks: ${assessmentTasks.length}`);
    console.log(`Data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error scraping PE combined data:', error);
    throw error;
  }
}

// Run the combined scraper
scrapePECombinedData().catch(console.error);
