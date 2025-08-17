/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb';
import { config } from '$lib/server/config';

export class EducationalVectorStore {
  private client: ChromaClient;
  private embedder: OpenAIEmbeddingFunction;
  private collections: Map<string, Collection> = new Map();

  constructor() {
    this.client = new ChromaClient({
      path: config.CHROMA_URL || 'http://localhost:8000'
    });
    
    this.embedder = new OpenAIEmbeddingFunction({
      openai_api_key: config.OPENAI_API_KEY,
      openai_model: 'text-embedding-3-small'
    });
  }

  async initialize() {
    // Create collections for different content types
    const collectionNames = [
      'curriculum_content',    // Learning areas, outcomes, key knowledge/skills
      'detailed_examples',     // Worked examples and solutions
      'assessment_items',      // Past exam questions and assessments
      'student_responses',     // Anonymized successful responses
      'misconceptions',        // Common errors and misconceptions
      'module_content',        // Generated module content
      'hints_feedback'         // Successful hints and feedback
    ];

    for (const name of collectionNames) {
      const collection = await this.client.getOrCreateCollection({
        name,
        embeddingFunction: this.embedder,
        metadata: { 
          description: `Collection for ${name.replace('_', ' ')}`,
          indexedAt: new Date().toISOString()
        }
      });
      this.collections.set(name, collection);
    }
  }

  async indexCurriculumData(
    subjectData: any,
    subjectName: string
  ): Promise<void> {
    const collection = this.collections.get('curriculum_content')!;
    
    // Index learning areas
    if (subjectData.learning_areas) {
      for (const area of subjectData.learning_areas) {
        await collection.add({
          ids: [`${subjectName}_la_${area.id}`],
          documents: [
            `Learning Area: ${area.name}\n${area.description}\nYear Level: ${area.year_level}`
          ],
          metadatas: [{
            type: 'learning_area',
            subject: subjectName,
            yearLevel: area.year_level,
            id: area.id,
            name: area.name
          }]
        });
      }
    }

    // Index key knowledge
    if (subjectData.key_knowledge) {
      for (const knowledge of subjectData.key_knowledge) {
        await collection.add({
          ids: [`${subjectName}_kk_${knowledge.id}`],
          documents: [
            `Key Knowledge: ${knowledge.name}\n${knowledge.description}`
          ],
          metadatas: [{
            type: 'key_knowledge',
            subject: subjectName,
            id: knowledge.id,
            learningAreaId: knowledge.learning_area_id,
            outcomeId: knowledge.outcome_id
          }]
        });
      }
    }

    // Index key skills
    if (subjectData.key_skills) {
      for (const skill of subjectData.key_skills) {
        await collection.add({
          ids: [`${subjectName}_ks_${skill.id}`],
          documents: [
            `Key Skill: ${skill.name}\n${skill.description}`
          ],
          metadatas: [{
            type: 'key_skill',
            subject: subjectName,
            id: skill.id,
            learningAreaId: skill.learning_area_id,
            outcomeId: skill.outcome_id
          }]
        });
      }
    }

    // Index detailed examples
    if (subjectData.detailed_examples) {
      const examplesCollection = this.collections.get('detailed_examples')!;
      
      for (const example of subjectData.detailed_examples) {
        await examplesCollection.add({
          ids: [`${subjectName}_ex_${example.id}`],
          documents: [
            `Example: ${example.title}\n${example.content}\nContext: ${example.context}`
          ],
          metadatas: [{
            type: 'example',
            subject: subjectName,
            id: example.id,
            difficulty: example.difficulty,
            topics: example.topics
          }]
        });
      }
    }
  }

  async indexExamQuestions(
    examData: any,
    subjectName: string
  ): Promise<void> {
    const collection = this.collections.get('assessment_items')!;
    
    for (const question of examData.questions || []) {
      await collection.add({
        ids: [`${subjectName}_exam_${question.id}`],
        documents: [
          `Question: ${question.question}\nAnswer: ${question.answer}\nMarks: ${question.marks}`
        ],
        metadatas: [{
          type: 'exam_question',
          subject: subjectName,
          year: question.year,
          marks: question.marks,
          topics: question.topics,
          difficulty: question.difficulty
        }]
      });
    }
  }

  async hybridSearch(
    query: string,
    collections: string[],
    filter?: Record<string, any>,
    k: number = 5
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    
    for (const collectionName of collections) {
      const collection = this.collections.get(collectionName);
      if (!collection) continue;
      
      // Semantic search
      const searchResults = await collection.query({
        queryTexts: [query],
        nResults: k,
        where: filter
      });
      
      // Format results
      if (searchResults.documents[0]) {
        searchResults.documents[0].forEach((doc, idx) => {
          results.push({
            content: doc || '',
            score: searchResults.distances?.[0]?.[idx] || 0,
            metadata: searchResults.metadatas[0][idx] as any,
            source: collectionName
          });
        });
      }
    }
    
    // Sort by relevance score
    results.sort((a, b) => a.score - b.score);
    
    return results.slice(0, k);
  }

  async findSimilarQuestions(
    questionType: string,
    difficulty: string,
    topics: string[],
    k: number = 5
  ): Promise<any[]> {
    const query = `${questionType} question about ${topics.join(', ')} at ${difficulty} level`;
    
    return this.hybridSearch(
      query,
      ['assessment_items', 'module_content'],
      {
        difficulty,
        $or: topics.map(t => ({ topics: { $contains: t } }))
      },
      k
    );
  }

  async findCommonMisconceptions(
    concept: string,
    k: number = 3
  ): Promise<any[]> {
    return this.hybridSearch(
      `common mistakes and misconceptions about ${concept}`,
      ['misconceptions', 'student_responses'],
      { isCorrect: false },
      k
    );
  }

  async getSuccessfulHints(
    questionType: string,
    concept: string,
    k: number = 3
  ): Promise<any[]> {
    return this.hybridSearch(
      `effective hints for ${questionType} about ${concept}`,
      ['hints_feedback'],
      { wasHelpful: true },
      k
    );
  }
}

interface RetrievalResult {
  content: string;
  score: number;
  metadata: Record<string, any>;
  source: string;
}