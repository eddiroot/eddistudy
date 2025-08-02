import fs from 'fs';

// Debug script to examine the HTML structure
const API_URL = 'https://www.vcaa.vic.edu.au/_next/data/xNPaE9SEGNPKni94ZsAl6/curriculum/vce-curriculum/vce-study-designs/english-and-english-additional-language/teaching-and-learning.json';

interface AccordionComponent {
  type: string;
  field_accordion_title?: string;
  field_accordion_body?: {
    processed?: string;
  };
}

interface ApiResponse {
  pageProps?: {
    node?: {
      field_components?: AccordionComponent[];
    };
  };
}

async function debugHtmlStructure() {
  try {
    console.log('Fetching English curriculum data...');
    
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ApiResponse = await response.json();
    const components = data?.pageProps?.node?.field_components;
    
    if (!components) {
      console.log('No components found');
      return;
    }

    // Find Unit 1 Area of Study 1
    const unit1Area1 = components.find(comp => 
      comp.type === 'paragraph--accordion' && 
      comp.field_accordion_title &&
      comp.field_accordion_title.includes('Unit 1') &&
      comp.field_accordion_title.includes('Area of Study 1') &&
      comp.field_accordion_title.includes('Reading and exploring')
    );

    if (unit1Area1) {
      console.log('Found Unit 1 Area of Study 1');
      const htmlContent = unit1Area1.field_accordion_body?.processed || '';
      
      // Find the Examples of learning activities section
      const examplesMatch = htmlContent.match(/Examples of learning activities(.*?)$/is);
      if (examplesMatch) {
        const activitiesHtml = examplesMatch[1];
        console.log('\n=== RAW HTML STRUCTURE ===');
        console.log(activitiesHtml.substring(0, 2000));
        
        // Save to file for examination
        fs.writeFileSync('/tmp/english_unit1_area1_html.html', activitiesHtml);
        console.log('\nFull HTML saved to /tmp/english_unit1_area1_html.html');
        
        // Try to find bullet point patterns
        console.log('\n=== LOOKING FOR BULLET PATTERNS ===');
        
        // Check for <ul><li> structure
        const ulMatches = activitiesHtml.match(/<ul[^>]*>(.*?)<\/ul>/gs);
        if (ulMatches) {
          console.log(`Found ${ulMatches.length} <ul> blocks`);
          ulMatches.forEach((ul, index) => {
            console.log(`\nUL Block ${index + 1}:`);
            const liMatches = ul.match(/<li[^>]*>(.*?)<\/li>/gs);
            if (liMatches) {
              console.log(`  Found ${liMatches.length} <li> items`);
              liMatches.slice(0, 3).forEach((li, liIndex) => {
                const cleanText = li.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                console.log(`  ${liIndex + 1}: ${cleanText.substring(0, 100)}...`);
              });
            }
          });
        } else {
          console.log('No <ul> blocks found');
        }
        
        // Check for paragraph structure
        const pMatches = activitiesHtml.match(/<p[^>]*>(.*?)<\/p>/gs);
        if (pMatches) {
          console.log(`\nFound ${pMatches.length} <p> blocks`);
          pMatches.slice(0, 5).forEach((p, index) => {
            const cleanText = p.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            console.log(`P ${index + 1}: ${cleanText.substring(0, 100)}...`);
          });
        }
      }
    } else {
      console.log('Unit 1 Area of Study 1 not found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugHtmlStructure();
