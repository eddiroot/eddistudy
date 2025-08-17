/* eslint-disable @typescript-eslint/no-explicit-any */
import { EducationalVectorStore } from './vector-store';
import { readFile } from 'fs/promises';
import { join } from 'path';

export class DataIndexer {
  private vectorStore: EducationalVectorStore;

  constructor() {
    this.vectorStore = new EducationalVectorStore();
  }

  async indexAllCurriculumData(): Promise<void> {
    await this.vectorStore.initialize();

    const dataDir = join(process.cwd(), 'data');
    
    // Index curriculum files
    const curriculumFiles = [
      'mathematics_curriculum_data.json',
      'physics_curriculum_data.json',
      'chemistry_curriculum_data.json',
      'biology_curriculum_data.json',
      'english_curriculum_data.json',
      // ... add all subjects
    ];

    for (const file of curriculumFiles) {
      const subject = file.split('_')[0];
      const data = JSON.parse(
        await readFile(join(dataDir, file), 'utf-8')
      );
      
      await this.vectorStore.indexCurriculumData(data, subject);
      console.log(`Indexed ${subject} curriculum data`);
    }

    // Index exam questions
    const examDir = join(dataDir, 'exam-questions');
    const examFiles = await readdir(examDir);
    
    for (const file of examFiles) {
      const subject = file.replace('.json', '');
      const data = JSON.parse(
        await readFile(join(examDir, file), 'utf-8')
      );
      
      await this.vectorStore.indexExamQuestions(data, subject);
      console.log(`Indexed ${subject} exam questions`);
    }
  }

  async indexPDFContent(pdfPath: string, metadata: any): Promise<void> {
    // For future PDF processing
    // Would use a PDF parser to extract text
    // Then chunk and index with metadata
  }

  async indexModuleContent(moduleId: number, content: any): Promise<void> {
    // Index generated module content for reuse
    const collection = this.vectorStore.collections.get('module_content');
    if (!collection) return;

    // Index each section
    for (const section of content.sections) {
      await collection.add({
        ids: [`module_${moduleId}_section_${section.id}`],
        documents: [JSON.stringify(section)],
        metadatas: [{
          moduleId,
          sectionId: section.id,
          concepts: section.concepts,
          difficulty: section.difficulty
        }]
      });
    }
  }
}