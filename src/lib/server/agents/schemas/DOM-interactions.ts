// These are schemas for UI interactions that aren't stored in the database

export const uiInteractionSchemas = {
  // For displaying progress indicators
  progressUpdate: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['progress_update'] },
      data: {
        type: 'object',
        properties: {
          currentSection: { type: 'number' },
          totalSections: { type: 'number' },
          currentQuestion: { type: 'number' },
          totalQuestions: { type: 'number' },
          percentComplete: { type: 'number' }
        }
      }
    }
  },

  // For showing real-time feedback
  instantFeedback: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['instant_feedback'] },
      data: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['correct', 'incorrect', 'partial'] },
          message: { type: 'string' },
          points: { type: 'number' },
          showHintButton: { type: 'boolean' }
        }
      }
    }
  },

  // For adaptive UI changes
  difficultyAdjustment: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['difficulty_adjustment'] },
      data: {
        type: 'object',
        properties: {
          newDifficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          message: { type: 'string' },
          encouragement: { type: 'string' }
        }
      }
    }
  },

  // For interactive diagram manipulation
  diagramInteraction: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['diagram_interaction'] },
      data: {
        type: 'object',
        properties: {
          componentId: { type: 'string' },
          interactionType: { type: 'string', enum: ['drag', 'connect', 'edit', 'rotate'] },
          newState: { type: 'object' },
          validation: {
            type: 'object',
            properties: {
              isValid: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    }
  },

  // For graph plotting interactions
  graphPlotInteraction: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['graph_plot_interaction'] },
      data: {
        type: 'object',
        properties: {
          points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                isCorrect: { type: 'boolean' }
              }
            }
          },
          feedback: { type: 'string' },
          showSolution: { type: 'boolean' }
        }
      }
    }
  }
};