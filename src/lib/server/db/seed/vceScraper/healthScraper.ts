import fs from 'fs';
import path from 'path';

// Types for Health and Human Development
export interface HealthLearningActivity {
  unit: string;
  areaOfStudy: string;
  outcome: string;
  title: string;
  description: string;
}

export interface HealthDetailedExample {
  unit: string;
  areaOfStudy: string;
  name: string;
  description: string;
}

export interface HealthAssessmentTask {
  unit: string;
  title: string;
  description: string;
}

export interface HealthSubjectData {
  subject: string;
  learningActivities: HealthLearningActivity[];
  detailedExamples: HealthDetailedExample[];
  assessmentTasks: HealthAssessmentTask[];
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

// Function to extract unit and area of study from title
function parseUnitAreaTitle(title: string): { unit: string; areaOfStudy: string } {
  // Pattern: "Unit X Area of Study Y: Title"
  const match = title.match(/Unit (\d+) Area of Study (\d+):\s*(.+)/);
  if (match) {
    return {
      unit: `Unit ${match[1]}`,
      areaOfStudy: `Area of Study ${match[2]}`
    };
  }
  
  // Fallback patterns
  if (title.includes('Unit 1')) return { unit: 'Unit 1', areaOfStudy: 'Unknown' };
  if (title.includes('Unit 2')) return { unit: 'Unit 2', areaOfStudy: 'Unknown' };
  if (title.includes('Unit 3')) return { unit: 'Unit 3', areaOfStudy: 'Unknown' };
  if (title.includes('Unit 4')) return { unit: 'Unit 4', areaOfStudy: 'Unknown' };
  
  return { unit: 'Unknown', areaOfStudy: 'Unknown' };
}

// Function to extract learning activities from HTML
function extractLearningActivities(htmlContent: string, unit: string, areaOfStudy: string, outcome: string): HealthLearningActivity[] {
    const activities: HealthLearningActivity[] = [];
    
    // Extract all learning activities from ul elements that might contain them
    const activityContainerRegex = /<ul(?:[^>]*class="[^"]*example[^"]*"[^>]*|[^>]*)>(.*?)<\/ul>/gs;
    const containerMatches = htmlContent.match(activityContainerRegex);
    
    if (containerMatches) {
        containerMatches.forEach((containerHtml) => {
            // Extract activities recursively to handle nested structures
            const extractActivitiesRecursively = (html: string): void => {
                const liRegex = /<li[^>]*>(.*?)<\/li>/gs;
                let match;
                
                while ((match = liRegex.exec(html)) !== null) {
                    const liContent = match[1];
                    
                    // Check if this li contains nested ul elements
                    const nestedUlMatches = liContent.match(/<ul[^>]*>(.*?)<\/ul>/gs);
                    
                    if (nestedUlMatches) {
                        // Extract main text before any nested content
                        const mainTextMatch = liContent.match(/^(.*?)(?=<ul)/s);
                        if (mainTextMatch) {
                            const mainText = cleanHtml(mainTextMatch[1]);
                            
                            if (mainText && mainText.length > 15) {
                                const sentences = mainText.split(/(?<=[.!?])\s+/);
                                const firstSentence = sentences[0]?.trim() || mainText;
                                const title = firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence;
                                
                                activities.push({
                                    unit,
                                    areaOfStudy,
                                    outcome,
                                    title,
                                    description: mainText
                                });
                            }
                        }
                        
                        // Process nested ul elements recursively
                        nestedUlMatches.forEach(nestedUl => {
                            extractActivitiesRecursively(nestedUl);
                        });
                    } else {
                        // Simple li without nested content
                        const cleanedText = cleanHtml(liContent);
                        
                        if (cleanedText && cleanedText.length > 10) {
                            const sentences = cleanedText.split(/(?<=[.!?])\s+/);
                            const firstSentence = sentences[0]?.trim() || cleanedText;
                            const title = firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence;
                            
                            activities.push({
                                unit,
                                areaOfStudy,
                                outcome,
                                title,
                                description: cleanedText
                            });
                        }
                    }
                }
            };
            
            extractActivitiesRecursively(containerHtml);
        });
    }
    
    // Fallback: Extract all li elements from the entire HTML if we didn't find enough activities
    if (activities.length < 10) {
        const allLiMatches = htmlContent.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
        
        allLiMatches.forEach((liHtml) => {
            const liContent = liHtml.replace(/<li[^>]*>|<\/li>/g, '');
            const cleanedText = cleanHtml(liContent);
            
            // Only add if it's substantial content and we haven't seen it before
            if (cleanedText && cleanedText.length > 20) {
                const exists = activities.some(activity => 
                    activity.description.substring(0, 100) === cleanedText.substring(0, 100)
                );
                
                if (!exists) {
                    const sentences = cleanedText.split(/(?<=[.!?])\s+/);
                    const firstSentence = sentences[0]?.trim() || cleanedText;
                    const title = firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence;
                    
                    activities.push({
                        unit,
                        areaOfStudy,
                        outcome,
                        title,
                        description: cleanedText
                    });
                }
            }
        });
    }
    
    return activities;
}

// Function to extract detailed examples from HTML
function extractDetailedExamples(html: string, unit: string, areaOfStudy: string): HealthDetailedExample[] {
  const examples: HealthDetailedExample[] = [];
  
  // Look for detailed example sections
  const exampleMatches = html.match(/<div class="notebox"><h2>Detailed example<\/h2><p><strong>([^<]+)<\/strong><\/p>(.*?)<\/div>/gs);
  
  if (!exampleMatches) return examples;
  
  for (const match of exampleMatches) {
    const titleMatch = match.match(/<p><strong>([^<]+)<\/strong><\/p>/);
    const contentMatch = match.match(/<p><strong>[^<]+<\/strong><\/p>(.*?)$/s);
    
    if (titleMatch && contentMatch) {
      const name = titleMatch[1].trim();
      const description = cleanHtml(contentMatch[1]);
      
      examples.push({
        unit,
        areaOfStudy,
        name,
        description
      });
    }
  }
  
  return examples;
}

// Function to extract assessment tasks from HTML
function extractAssessmentTasks(htmlContent: string): HealthAssessmentTask[] {
  const tasks: HealthAssessmentTask[] = [];
  
  // Look for table with assessment task information
  const tableMatch = htmlContent.match(/<table[^>]*class="tablestyle3"[^>]*>(.*?)<\/table>/s);
  if (!tableMatch) return tasks;
  
  const tableContent = tableMatch[1];
  
  // Extract table rows (excluding header)
  const rowMatches = tableContent.match(/<tr[^>]*>.*?<\/tr>/gs);
  if (!rowMatches) return tasks;
  
  // Skip the header row
  for (let i = 1; i < rowMatches.length; i++) {
    const row = rowMatches[i];
    
    // Extract title and description from table cells
    const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gs);
    if (cellMatches && cellMatches.length >= 2) {
      const titleCell = cellMatches[0];
      const descriptionCell = cellMatches[1];
      
      // Extract title text
      const titleMatch = titleCell.match(/<p[^>]*>(.*?)<\/p>/s);
      if (titleMatch) {
        const title = cleanHtml(titleMatch[1]);
        
        // Extract description (can be complex HTML)
        const description = cleanHtml(descriptionCell);
        
        // Skip if description is too short or contains references to other units
        if (description.length > 50 && !description.includes('See the detailed example in Unit')) {
          // Add for both Unit 1 and Unit 2
          tasks.push({
            unit: 'Unit 1',
            title,
            description
          });
          
          tasks.push({
            unit: 'Unit 2', 
            title,
            description
          });
        }
      }
    }
  }
  
  return tasks;
}

// Function to extract Unit 3 structured questions assessment task
function extractUnit3StructuredQuestions(htmlContent: string): HealthAssessmentTask[] {
  const tasks: HealthAssessmentTask[] = [];
  
  // Look for structured questions section
  if (htmlContent.includes('Structured questions') && htmlContent.includes('Unit 3')) {
    const title = 'structured questions';
    
    const description = `Structured questions – General advice
The task can include data analysis and/or case study analysis within the task.
The set of questions could contain a combination of short answer (1–3 marks), longer response questions (4–6 marks) and an extended response question (10–12 marks).
Questions could include reference to data, stimulus, or short case studies as appropriate. The questions should direct students to refer to any stimulus material provided.
Longer response and extended response questions should be structured to ensure an entry point is possible for all students while providing the opportunity for higher marks to be awarded for higher performance (rather than a series of discrete lower order questions).
Questions of 6 or more marks should be marked holistically using a rubric.
Teachers can set multiple questions based on the same stimulus, with each part likely increasing in complexity. Teachers should minimise consequential questions where the answer to one question depends on a correct answer to a previous question.

Preparing for the task

As this example is for Unit 3 Outcome 2, the selection of a structured questions task is dependent upon this task type not being used in Unit 3 Outcome 1.
Given that this outcome is worth 50 marks out of the 100 marks available for School-assessed Coursework in Unit 3, it may be appropriate to have students complete only one task or to split the assessment of the outcome over two tasks. If splitting the task, teachers can either use the same task type or a different task type for the second task (provided this was not used in Unit 3 Outcome 1).
Commercially produced tasks and publicly available material could be used as practice material in preparation for the task. These materials are not to be used in the development of the task without significant modification that ensures their uniqueness.
Identify the assessment tool. A mark guide (scheme) should be used to assess this task, with inbuilt rubrics for longer and extended response questions. This assessment tool should be prepared alongside the task.
Identify the nature and sequence of teaching and learning activities used to cover the key knowledge and key skills outlined in this area of study. The teaching and learning activities included in the support materials for Unit 3 Outcome 2 account for different learning styles and will allow students to build and consolidate their knowledge and skills.

Designing the task

Refer to the outcome statement on page 24 of the study design.
Look carefully at Outcome 2 and the key knowledge and key skills relevant to this statement. The introductory statement to the unit and area of study and the relevant performance descriptor will also provide a clear guide as to the qualities and characteristics of performance for this task.
All or some of the assessable Unit 3 Area of Study 2 key knowledge and key skills on pages 24 and 25 could be assessed in this task.
After considering the key knowledge and key skills that are being assessed, the teacher must set questions that require and allow the student to demonstrate the required level of performance, as well as provide good coverage of the content.
When setting questions, ensure consistent language from the study design outcome, key knowledge and key skills is applied. In addition, give careful consideration to command terms used in questions to ensure they meet the requirements of the outcome.

Examples of possible command terms for Health and Human Development:

Lower order	Medium order	Higher order
Identify
Outline
State
Compare
Describe
Explain* (can be Medium or High)
Analyse
Discuss
Draw conclusions
Evaluate
Explain*
Justify

It is suggested that a range of question types are included, bearing in mind the:
complexity and difficulty of the key knowledge and key skills
command term used in the relevant key skill is the highest level of expected performance. For example, a skill that requires students to describe a concept, a question can be set at a lower level of performance (i.e outline), but not a higher level of performance (i.e. evaluate)
volume of key knowledge to be considered or included within the response.
A rule of thumb would be to prepare 25% lower order questions, 50% medium order questions and 25% higher order questions. This will allow for a spread of marks and a ranking of students to occur while meeting the outcome.
Allocated marks for each question must be clear and the marks allocated should reflect the degree of difficulty or complexity required by task words. Teachers are encouraged to consider the expected answer when allocating marks to ensure the mark allocation matches the command term.

Delivering the task

Decide on the conditions under which the task will be conducted and include this in instructions to students. The school-assessed coursework conditions may be influenced by school requirements.
An example of school-assessed coursework conditions includes:

Closed book, examination conditions: no notes or textbooks permitted and students to be supervised while undertaking the assessment.
Timing: 60 minutes to complete the task. This allows for 10 minutes of reading time, then 50 minutes to complete the written responses to structured questions. This will be influenced by your school and student needs.

Assessing the task

Mark the task, rank student performance and provide feedback.
The Unit 3 Outcome 2 performance descriptor provides a useful guide for ensuring the mark guide (scheme) assesses all levels of student performance and therefore validates the appropriateness of the mark guide.`;
    
    tasks.push({
      unit: 'Unit 3',
      title,
      description
    });
  }
  
  return tasks;
}

// Function to extract Unit 4 extended response assessment task
function extractUnit4ExtendedResponse(htmlContent: string): HealthAssessmentTask[] {
  const tasks: HealthAssessmentTask[] = [];
  
  // Look for extended response section
  if (htmlContent.includes('Extended response') && htmlContent.includes('Unit 4')) {
    const title = 'extended response';
    
    const description = `Extended response – General advice

This task requires students to annotate a range of stimuli to synthesise key ideas and to develop a detailed plan based on the components of the question and stimulus material provided by the teacher.

Preparing for the task

As this example is for Unit 4 Outcome 2, the selection of an extended response task is dependent upon this task type not being used in Unit 4 Outcome 1.
Given that this outcome is worth 50 marks out of the 100 marks available for School-assessed Coursework in Unit 4, it may be appropriate to have students complete only one task or to split the assessment of the outcome over two tasks. If splitting the task, teachers can either use the same task type or a different task type for the second task (provided this was not used in Unit 4 Outcome 1).
Identify the assessment tool. A rubric should be used to assess this task. The Unit 4 Area of Study 2 performance descriptor is an appropriate starting point in designing an assessment tool for this task; however, this requires modification to ensure it meets the needs of the task.
Identify the nature and sequence of teaching and learning activities used to cover the key knowledge and key skills outlined in this area of study. The teaching and learning activities included in the support materials for Unit 3 Outcome 2 account for different learning styles and will allow students to build and consolidate their knowledge and skills.

Designing the task

The teacher needs to set a question that provides good coverage of the outcome and allows students to demonstrate the highest level of performance and the qualities and characteristics that define this. To do this, refer to the outcome statement on page 28 of the study design.
Look carefully at Outcome 2 and the key knowledge and key skills relevant to this statement. The introductory statement to the unit and area of study and the relevant performance descriptor will also provide a clear guide as to the qualities and characteristics of performance for this task.
All or some of the assessable Unit 4 Area of Study 2 key knowledge and key skills on pages 28 and 29 could be assessed in this task.
After considering the key knowledge and key skills that are being assessed, the teacher needs to source and select two or three stimuli that students will use in their response. The stimuli selected should have strong links to the outcome being assessed and allow students to apply their understanding of the key knowledge and to demonstrate the key skills. The stimuli should include a variety of types such as:
data (tables or graphs or text-based data) related to a key feature of an SDG or an aspect of health and/or human development
an infographic outlining the key features of an SDG
a case study, of an aid program addressing an SDG or a WHO priority
a photograph, linked to an SDG.
Students are to be provided with time to plan their response. During this time students should be encouraged to annotate the stimulus material and plann the components of their response.
To complete the planning element, students could develop their own hardcopy mind map or use mind mapping software such as SmartDraw, Prezi, MindManager, Mind42

Delivering the task

Decide on the conditions under which the task will be conducted and include this in instructions to students. A suggested time allocation for this task could be:
30–40 minutes annotating and planning
20–30 minutes writing the response.

Assessing the task

Use the rubric to assess the planning tool and the extended written response. Mark allocation should be prioritised towards the extended response.
Mark the task, rank student performance and provide feedback.`;
    
    tasks.push({
      unit: 'Unit 4',
      title,
      description
    });
  }
  
  return tasks;
}

// Function to scrape assessment tasks from Health and Human Development assessment JSON
async function scrapeHealthAssessmentTasks(jsonUrl: string): Promise<HealthAssessmentTask[]> {
  try {
    console.log(`Fetching Health and Human Development assessment data from: ${jsonUrl}`);
    
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const assessmentTasks: HealthAssessmentTask[] = [];
    
    // Navigate through the JSON structure to find accordion components
    let components = null;
    
    // Try different possible paths for components
    if (data.pageProps?.page?.field_components) {
      components = data.pageProps.page.field_components;
    } else if (data.props?.pageProps?.page?.field_components) {
      components = data.props.pageProps.page.field_components;
    } else if (data.page?.field_components) {
      components = data.page.field_components;
    } else if (data.field_components) {
      components = data.field_components;
    } else {
      // Look for any field_components anywhere in the structure
      const findComponents = (obj: unknown, path = ''): unknown => {
        if (obj && typeof obj === 'object' && obj !== null) {
          const objRecord = obj as Record<string, unknown>;
          if (objRecord.field_components) {
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
      console.log('No field_components found in the assessment data structure');
      return assessmentTasks;
    }
    
    console.log(`Found ${components.length} assessment components`);
    
    // Process each component looking for accordion sections
    for (const component of components) {
      if (component.type === 'paragraph--accordion') {
        const accordionTitle = component.field_accordion_title || '';
        const accordionHtml = component.field_accordion_body?.processed || '';
        
        console.log(`Processing assessment accordion: ${accordionTitle}`);
        
        // Extract Units 1 and 2 assessment tasks from scope table
        if (accordionTitle.includes('Unit 1 and 2') && accordionTitle.includes('sample assessment tasks')) {
          const tasks = extractAssessmentTasks(accordionHtml);
          assessmentTasks.push(...tasks);
          console.log(`  Found ${tasks.length} Units 1&2 assessment tasks`);
        }
        
        // Extract Unit 3 structured questions
        if (accordionTitle.includes('Unit 3') && accordionTitle.includes('Structured questions')) {
          const tasks = extractUnit3StructuredQuestions(accordionHtml);
          assessmentTasks.push(...tasks);
          console.log(`  Found ${tasks.length} Unit 3 assessment tasks`);
        }
        
        // Extract Unit 4 extended response
        if (accordionTitle.includes('Unit 4') && accordionTitle.includes('extended response')) {
          const tasks = extractUnit4ExtendedResponse(accordionHtml);
          assessmentTasks.push(...tasks);
          console.log(`  Found ${tasks.length} Unit 4 assessment tasks`);
        }
      }
    }
    
    console.log(`Total assessment tasks extracted: ${assessmentTasks.length}`);
    return assessmentTasks;
    
  } catch (error) {
    console.error('Error scraping Health and Human Development assessment tasks:', error);
    throw error;
  }
}

// Main scraper function for Health and Human Development
async function scrapeHealthAndHumanDevelopment(jsonUrl: string): Promise<HealthSubjectData> {
  try {
    console.log(`Fetching Health and Human Development data from: ${jsonUrl}`);
    
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const learningActivities: HealthLearningActivity[] = [];
    const detailedExamples: HealthDetailedExample[] = [];
    
    // Navigate through the JSON structure to find accordion components
    let components = null;
    
    // Try different possible paths for components
    if (data.pageProps?.page?.field_components) {
      components = data.pageProps.page.field_components;
    } else if (data.props?.pageProps?.page?.field_components) {
      components = data.props.pageProps.page.field_components;
    } else if (data.page?.field_components) {
      components = data.page.field_components;
    } else if (data.field_components) {
      components = data.field_components;
    } else {
      // Look for any field_components anywhere in the structure
      const findComponents = (obj: unknown, path = ''): unknown => {
        if (obj && typeof obj === 'object' && obj !== null) {
          const objRecord = obj as Record<string, unknown>;
          if (objRecord.field_components) {
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
      return {
        subject: 'Health and Human Development',
        learningActivities,
        detailedExamples,
        assessmentTasks: []
      };
    }
    
    console.log(`Found ${components.length} components`);
    
    // Process each component looking for accordion sections
    for (const component of components) {
      if (component.type === 'paragraph--accordion') {
        const accordionTitle = component.field_accordion_title || '';
        const accordionHtml = component.field_accordion_body?.processed || '';
        
        console.log(`Processing accordion: ${accordionTitle}`);
        
        // Check if this is a unit/area of study section
        if (accordionTitle.includes('Unit') && accordionTitle.includes('Area of Study')) {
          const { unit, areaOfStudy } = parseUnitAreaTitle(accordionTitle);
          
          console.log(`  Extracted: ${unit}, ${areaOfStudy}`);
          
          // Extract outcome information from the HTML content
          const outcomeMatch = accordionHtml.match(/<h3>Outcome\s+(\d+):<br>&nbsp;<\/h3><p>(.*?)<\/p>/s);
          const outcome = outcomeMatch ? `Outcome ${outcomeMatch[1]}` : `${unit} ${areaOfStudy}`;
          
          // Extract learning activities
          const activities = extractLearningActivities(accordionHtml, unit, areaOfStudy, outcome);
          learningActivities.push(...activities);
          console.log(`  Found ${activities.length} learning activities`);
          
          // Extract detailed examples
          const examples = extractDetailedExamples(accordionHtml, unit, areaOfStudy);
          detailedExamples.push(...examples);
          console.log(`  Found ${examples.length} detailed examples`);
        }
      }
    }
    
    console.log(`Total learning activities extracted: ${learningActivities.length}`);
    console.log(`Total detailed examples extracted: ${detailedExamples.length}`);
    
    return {
      subject: 'Health and Human Development',
      learningActivities,
      detailedExamples,
      assessmentTasks: []
    };
    
  } catch (error) {
    console.error('Error scraping Health and Human Development:', error);
    throw error;
  }
}

// Function to save Health and Human Development data to JSON file
function saveHealthDataToFile(healthData: HealthSubjectData): void {
  const filename = 'health_and_human_development_curriculum_data.json';
  const outputPath = path.join(process.cwd(), 'data', filename);
  
  // Ensure data directory exists
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(healthData, null, 2));
  console.log(`Health and Human Development curriculum data saved to: ${outputPath}`);
}

// Main execution function
async function main() {
  try {
    console.log('Starting Health and Human Development curriculum scraping...');
    
    const teachingUrl = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/health-and-human-development/teaching-and-learning.json';
    const assessmentUrl = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/health-and-human-development/assessment.json';
    
    // Scrape Health and Human Development data
    const healthData = await scrapeHealthAndHumanDevelopment(teachingUrl);
    
    // Scrape assessment tasks
    const assessmentTasks = await scrapeHealthAssessmentTasks(assessmentUrl);
    
    // Combine the data
    const combinedData: HealthSubjectData = {
      ...healthData,
      assessmentTasks
    };
    
    // Save to file
    saveHealthDataToFile(combinedData);
    
    // Display summary
    console.log('\n=== HEALTH AND HUMAN DEVELOPMENT SUMMARY ===');
    console.log(`Subject: ${combinedData.subject}`);
    console.log(`Learning Activities: ${combinedData.learningActivities.length}`);
    console.log(`Detailed Examples: ${combinedData.detailedExamples.length}`);
    console.log(`Assessment Tasks: ${combinedData.assessmentTasks.length}`);
    
    console.log('\n=== LEARNING ACTIVITIES BY UNIT AND AREA ===');
    const groupedActivities = combinedData.learningActivities.reduce((acc, activity) => {
      const key = `${activity.unit} - ${activity.areaOfStudy}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    }, {} as Record<string, HealthLearningActivity[]>);
    
    Object.entries(groupedActivities).forEach(([key, activities]) => {
      console.log(`\n${key}: ${activities.length} activities`);
    });
    
    console.log('\n=== DETAILED EXAMPLES BY UNIT AND AREA ===');
    const groupedExamples = combinedData.detailedExamples.reduce((acc, example) => {
      const key = `${example.unit} - ${example.areaOfStudy}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(example);
      return acc;
    }, {} as Record<string, HealthDetailedExample[]>);
    
    Object.entries(groupedExamples).forEach(([key, examples]) => {
      console.log(`${key}: ${examples.length} examples`);
    });
    
    console.log('\n=== ASSESSMENT TASKS BY UNIT ===');
    const groupedTasks = combinedData.assessmentTasks.reduce((acc, task) => {
      const key = task.unit;
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {} as Record<string, HealthAssessmentTask[]>);
    
    Object.entries(groupedTasks).forEach(([key, tasks]) => {
      console.log(`${key}: ${tasks.length} tasks`);
    });
    
  } catch (error) {
    console.error('Health and Human Development scraping failed:', error);
    process.exit(1);
  }
}

// Export for module use or run directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}

export { scrapeHealthAndHumanDevelopment, scrapeHealthAssessmentTasks };
