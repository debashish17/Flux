"""
AI Content Generation Module
Handles content generation for documents and presentations using Google's Gemini AI.
Improved with better prompts, error handling, and code organization.
"""

import google.generativeai as genai
import os
import logging
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# API Configuration
API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = 'gemini-flash-latest'
REQUEST_TIMEOUT = 600

if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    logger.warning("GEMINI_API_KEY not set in environment variables")


class APIError:
    """Centralized error messages and handling"""
    
    @staticmethod
    def no_api_key() -> str:
        return "⚠️ Error: GEMINI_API_KEY not configured. Please set your API key in the .env file."
    
    @staticmethod
    def rate_limit() -> str:
        return "⚠️ API rate limit reached. The free tier allows 15 requests per minute. Please wait a moment and try again."
    
    @staticmethod
    def generation_error(error: str) -> str:
        return f"⚠️ Error generating content: {error}. Please try again."
    
    @staticmethod
    def is_rate_limit(error_msg: str) -> bool:
        """Check if error is rate limit related"""
        error_lower = error_msg.lower()
        return any(keyword in error_lower for keyword in ["429", "quota", "rate limit", "too many requests"])


def _get_model():
    """Get configured Gemini model instance"""
    if not API_KEY:
        return None
    return genai.GenerativeModel(MODEL_NAME)


def _generate_content_sync(model, prompt: str) -> str:
    """
    Synchronous content generation with error handling
    
    Args:
        model: Gemini model instance
        prompt: The prompt to send
        
    Returns:
        Generated text
    """
    try:
        response = model.generate_content(
            prompt,
            request_options={'timeout': REQUEST_TIMEOUT}
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Content generation error: {str(e)}")
        raise


async def _generate_content_async(model, prompt: str) -> str:
    """
    Asynchronous content generation with error handling
    
    Args:
        model: Gemini model instance
        prompt: The prompt to send
        
    Returns:
        Generated text
    """
    try:
        response = await model.generate_content_async(
            prompt, 
            request_options={'timeout': REQUEST_TIMEOUT}
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Async content generation error: {str(e)}")
        raise


def generate_section_content(project_title: str, project_type: str, section_title: str) -> str:
    """
    Generate content for a single section/slide
    
    Args:
        project_title: The overall project title
        project_type: Either 'pptx' or 'docx'
        section_title: Title of the specific section
        
    Returns:
        Generated content string
    """
    if not API_KEY:
        return APIError.no_api_key()

    model = _get_model()
    
    if project_type == "pptx":
        prompt = _build_presentation_section_prompt(project_title, section_title)
    else:  # docx
        prompt = _build_document_section_prompt(project_title, section_title)

    try:
        return _generate_content_sync(model, prompt)
    except Exception as e:
        error_msg = str(e)
        if APIError.is_rate_limit(error_msg):
            return APIError.rate_limit()
        return APIError.generation_error(error_msg)


def _build_presentation_section_prompt(project_title: str, section_title: str) -> str:
    """Build optimized prompt for presentation slide content"""
    return f"""You are an expert presentation designer creating impactful, visually-oriented slides.

PROJECT TITLE: {project_title}
SLIDE TOPIC: {section_title}

Create compelling slide content following this EXACT structure:

TITLE: [A punchy, memorable title - maximum 8 words]

CONTENT:
• [Key point 1: Clear, action-oriented - max 15 words]
• [Key point 2: Use strong verbs and concrete details - max 15 words]
• [Key point 3: Focus on benefits and outcomes - max 15 words]
• [Optional point 4: Only if absolutely necessary - max 15 words]

IMAGE_SUGGESTION: [Describe a powerful, relevant visual that enhances the message]

CRITICAL RULES:
✓ Use 3-4 bullet points (maximum 5 only if essential)
✓ Each bullet should be scannable in 3 seconds
✓ Focus on "what" and "why", not "how"
✓ Use parallel structure (start bullets similarly)
✓ Avoid jargon and buzzwords
✓ Make every word count - be ruthlessly concise
✓ Suggest one highly relevant, professional image

REMEMBER: Great slides support speech, they don't replace it. Keep it minimal and impactful."""


def _build_document_section_prompt(project_title: str, section_title: str) -> str:
    """Build optimized prompt for document section content"""
    return f"""You are a professional business writer creating clear, authoritative document content.

DOCUMENT TITLE: {project_title}
SECTION: {section_title}

Write comprehensive, professional content for this section.

STRUCTURE REQUIREMENTS:
• Write 2-4 well-developed paragraphs (200-400 words total)
• Each paragraph should have:
  - A clear topic sentence that previews the main idea
  - 3-5 supporting sentences with specific details
  - A concluding sentence that connects to the next paragraph or summarizes

CONTENT REQUIREMENTS:
• Include concrete examples, data points, or real-world applications
• Use professional yet accessible language (avoid unnecessary jargon)
• Maintain an authoritative, confident tone
• Be specific and actionable rather than vague or theoretical
• Use transitions between paragraphs for smooth flow

FORMATTING RULES:
✗ NO markdown formatting (no **, ##, _italics_, etc.)
✗ NO bullet points or lists (write in paragraph form)
✗ NO placeholder text like "[insert example]"
✓ Separate paragraphs with double line breaks
✓ Write complete, polished prose ready for publication

Focus on delivering genuine value and insight, not filler content."""


def refine_section_content(current_content: str, instruction: str, project_type: str) -> str:
    """
    Refine existing content based on user instructions
    
    Args:
        current_content: The existing content to refine
        instruction: User's refinement instructions
        project_type: Either 'pptx' or 'docx'
        
    Returns:
        Refined content string
    """
    if not API_KEY:
        return APIError.no_api_key()

    model = _get_model()
    
    if project_type == "pptx":
        prompt = _build_presentation_refinement_prompt(current_content, instruction)
    else:  # docx
        prompt = _build_document_refinement_prompt(current_content, instruction)

    try:
        return _generate_content_sync(model, prompt)
    except Exception as e:
        error_msg = str(e)
        if APIError.is_rate_limit(error_msg):
            return APIError.rate_limit()
        return APIError.generation_error(error_msg)


def _build_presentation_refinement_prompt(current_content: str, instruction: str) -> str:
    """Build prompt for refining presentation content"""
    return f"""You are a presentation design expert tasked with improving slide content.

CURRENT SLIDE CONTENT:
{current_content}

USER'S REFINEMENT REQUEST: {instruction}

Rewrite the slide to address the user's feedback while maintaining professional quality.

OUTPUT FORMAT (maintain this structure):
TITLE: [Improved title]
CONTENT:
• [Refined bullet point 1]
• [Refined bullet point 2]
• [Refined bullet point 3]
IMAGE_SUGGESTION: [Updated or new image suggestion]

GUIDELINES:
• Preserve what works, improve what doesn't
• Keep the same concise, scannable format (max 5 bullets)
• Each bullet should be impactful and specific (max 15 words)
• Ensure the refinement directly addresses the user's request
• Maintain professional, engaging tone"""


def _build_document_refinement_prompt(current_content: str, instruction: str) -> str:
    """Build prompt for refining document content"""
    return f"""You are a professional editor improving document content based on client feedback.

CURRENT CONTENT:
{current_content}

CLIENT'S REVISION REQUEST: {instruction}

Rewrite the content to address the feedback while maintaining quality and professionalism.

REQUIREMENTS:
• Directly address the user's specific request
• Preserve effective parts of the original
• Maintain professional tone and clear structure
• Keep 2-4 well-developed paragraphs (200-400 words)
• NO markdown formatting - only plain text with paragraph breaks
• Ensure smooth flow and logical progression
• Make improvements beyond just the requested change if relevant

Deliver polished, publication-ready prose."""


def plan_presentation_structure(user_prompt: str) -> Dict[str, any]:
    """
    Analyze user prompt and generate optimal presentation structure
    
    Args:
        user_prompt: User's description of desired presentation
        
    Returns:
        Dictionary with 'title', 'slides', and optional 'error'
    """
    if not API_KEY:
        return {"error": APIError.no_api_key()}

    model = _get_model()
    prompt = _build_presentation_planning_prompt(user_prompt)

    try:
        text = _generate_content_sync(model, prompt)
        return _parse_structure_response(text, "slides")
    except Exception as e:
        logger.error(f"Presentation planning error: {str(e)}")
        return {
            "title": "Untitled Presentation",
            "slides": ["Opening Slide", "Main Content", "Key Takeaways", "Closing"],
            "error": str(e)
        }


def _build_presentation_planning_prompt(user_prompt: str) -> str:
    """Build prompt for presentation structure planning"""
    return f"""You are an expert presentation strategist analyzing a client's needs.

CLIENT REQUEST: "{user_prompt}"

Analyze this request and design an optimal presentation structure.

PLANNING CONSIDERATIONS:
1. What is the core message or goal?
2. Who is the target audience?
3. What key points must be covered?
4. What's the logical flow from opening to close?
5. How many slides create impact without overwhelming? (Typically 6-12)

OUTPUT FORMAT (use exactly this format):
TITLE: [Compelling, clear presentation title that captures the essence]

SLIDES:
- [Slide 1: Strong opening that hooks the audience]
- [Slide 2: Context or problem statement]
- [Slide 3: Main point or solution component 1]
- [Slide 4: Main point or solution component 2]
- [Slide 5: Main point or solution component 3]
- [Continue as needed...]
- [Final slide: Strong conclusion with call-to-action]

EXAMPLE OUTPUT:
TITLE: Revolutionizing Customer Experience Through AI
SLIDES:
- Why Customer Experience Matters Today
- The Challenge: Current Pain Points
- Our AI-Powered Solution Overview
- Key Feature: Intelligent Automation
- Key Feature: Predictive Analytics
- Real-World Success Stories
- Implementation Roadmap
- ROI and Expected Outcomes
- Next Steps and Call to Action

Now analyze the client's request and provide the optimal structure:"""


def plan_document_structure(user_prompt: str) -> Dict[str, any]:
    """
    Analyze user prompt and generate optimal document structure
    
    Args:
        user_prompt: User's description of desired document
        
    Returns:
        Dictionary with 'title', 'sections', and optional 'error'
    """
    logger.info(f"Planning document structure for prompt: {user_prompt}")
    
    if not API_KEY:
        return {"error": APIError.no_api_key()}

    model = _get_model()
    prompt = _build_document_planning_prompt(user_prompt)

    try:
        text = _generate_content_sync(model, prompt)
        return _parse_structure_response(text, "sections")
    except Exception as e:
        logger.error(f"Document planning error: {str(e)}")
        return {
            "title": "Untitled Document",
            "sections": ["Introduction", "Background", "Main Discussion", "Analysis", "Conclusion"],
            "error": str(e)
        }


def _build_document_planning_prompt(user_prompt: str) -> str:
    """Build prompt for document structure planning"""
    return f"""You are an expert document architect designing professional business documents.

CLIENT REQUEST: "{user_prompt}"

Analyze this request and create an optimal document structure.

PLANNING CONSIDERATIONS:
1. What type of document is needed? (report, proposal, plan, analysis, etc.)
2. What is the document's primary purpose?
3. Who is the intended audience?
4. What sections are essential vs. optional?
5. What's the logical flow of information? (Typically 5-8 main sections)

OUTPUT FORMAT (use exactly this format):
TITLE: [Professional, descriptive document title]

SECTIONS:
- [Section 1: Compelling introduction or executive summary]
- [Section 2: Background, context, or problem statement]
- [Section 3: Main topic area 1]
- [Section 4: Main topic area 2]
- [Section 5: Main topic area 3]
- [Continue as needed...]
- [Final section: Conclusions, recommendations, or next steps]

EXAMPLE OUTPUT:
TITLE: Digital Transformation Strategy for Retail Operations
SECTIONS:
- Executive Summary
- Current State Assessment
- Market Trends and Competitive Analysis
- Strategic Vision and Objectives
- Technology Infrastructure Requirements
- Implementation Roadmap
- Risk Management and Mitigation
- Financial Projections and ROI
- Conclusion and Recommendations

Now analyze the client's request and provide the optimal structure:"""


def _parse_structure_response(text: str, content_type: str) -> Dict[str, any]:
    """
    Parse AI response into structured format
    
    Args:
        text: Raw AI response text
        content_type: Either 'slides' or 'sections'
        
    Returns:
        Parsed structure dictionary
    """
    lines = text.split('\n')
    title = ""
    items = []
    
    in_items_section = False
    for line in lines:
        line = line.strip()
        
        if line.startswith('TITLE:'):
            title = line.replace('TITLE:', '').strip()
        elif line.upper().startswith(content_type.upper() + ':'):
            in_items_section = True
        elif in_items_section and line.startswith('-'):
            item_title = line.lstrip('- ').strip()
            if item_title:
                items.append(item_title)
    
    # Provide sensible defaults if parsing fails
    if not title:
        title = "Untitled Presentation" if content_type == "slides" else "Untitled Document"
    
    if not items:
        items = (
            ["Opening", "Main Content", "Closing"] 
            if content_type == "slides" 
            else ["Introduction", "Main Body", "Conclusion"]
        )
    
    return {"title": title, content_type: items}


async def generate_full_markdown_document(
    title: str,
    sections: List[str],
    user_prompt: str = ""
) -> str:
    """
    Generate a complete Markdown document with all sections

    Args:
        title: Document title
        sections: List of section names
        user_prompt: Original user prompt for context

    Returns:
        Complete Markdown document as string
    """
    logger.info("=" * 80)
    logger.info("GENERATING FULL MARKDOWN DOCUMENT")
    logger.info(f"Title: {title}")
    logger.info(f"Sections: {sections}")
    logger.info(f"User Prompt: {user_prompt}")
    logger.info("=" * 80)

    if not API_KEY:
        logger.error("GEMINI_API_KEY not set")
        return APIError.no_api_key()

    model = _get_model()
    prompt = _build_markdown_generation_prompt(title, sections, user_prompt)

    try:
        logger.info("Sending Markdown generation request to Gemini API...")
        markdown_content = await _generate_content_async(model, prompt)

        logger.info(f"Received response: {len(markdown_content)} characters")

        # Clean up the response (remove code blocks if present)
        markdown_content = _extract_markdown_document(markdown_content)

        logger.info(f"Final Markdown document: {len(markdown_content)} characters")
        logger.info("=" * 80)

        return markdown_content

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Markdown generation error: {error_msg}")
        logger.error("=" * 80)

        if APIError.is_rate_limit(error_msg):
            return APIError.rate_limit()
        return APIError.generation_error(error_msg)


async def generate_full_latex_document(
    title: str,
    sections: List[str],
    project_type: str = "docx",
    user_prompt: str = ""
) -> str:
    """
    LEGACY: Generate a complete, compilable LaTeX document
    Kept for backward compatibility with existing projects

    Args:
        title: Document title
        sections: List of section names
        project_type: Document type (for logging)
        user_prompt: Original user prompt for context

    Returns:
        Complete LaTeX document as string
    """
    logger.info("=" * 80)
    logger.info("GENERATING FULL LATEX DOCUMENT")
    logger.info(f"Title: {title}")
    logger.info(f"Sections: {sections}")
    logger.info(f"User Prompt: {user_prompt}")
    logger.info("=" * 80)

    if not API_KEY:
        logger.error("GEMINI_API_KEY not set")
        return APIError.no_api_key()

    model = _get_model()
    prompt = _build_latex_generation_prompt(title, sections, user_prompt)

    try:
        logger.info("Sending LaTeX generation request to Gemini API...")
        latex_content = await _generate_content_async(model, prompt)
        
        logger.info(f"Received response: {len(latex_content)} characters")
        
        # Extract clean LaTeX document
        latex_content = _extract_latex_document(latex_content)
        
        logger.info(f"Final LaTeX document: {len(latex_content)} characters")
        logger.info("=" * 80)
        
        return latex_content
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"LaTeX generation error: {error_msg}")
        logger.error("=" * 80)
        
        if APIError.is_rate_limit(error_msg):
            return APIError.rate_limit()
        return APIError.generation_error(error_msg)


def _build_latex_generation_prompt(title: str, sections: List[str], user_prompt: str) -> str:
    """Build comprehensive prompt for LaTeX document generation"""
    sections_formatted = "\n".join([f"  - {section}" for section in sections])
    
    return f"""You are an expert LaTeX document author creating professional, publication-ready documents.

PROJECT DETAILS:
Title: {title}
Required Sections:
{sections_formatted}

User Context: {user_prompt if user_prompt else "Professional business document"}

Generate a COMPLETE, COMPILABLE LaTeX document that meets these specifications.

CRITICAL REQUIREMENTS:

1. DOCUMENT CLASS AND STRUCTURE:
   - Use: \\documentclass[11pt, a4paper]{{article}}
   - Use \\section{{}} for main sections (NOT \\chapter{{}})
   - Include proper preamble with essential packages

2. REQUIRED PACKAGES:
   \\usepackage[margin=1in]{{geometry}}
   \\usepackage{{hyperref}}
   \\usepackage{{graphicx}}
   \\usepackage{{amsmath}}
   \\usepackage{{enumitem}}
   \\usepackage{{booktabs}}

3. TITLE FORMATTING (CRITICAL):
   - Keep title SIMPLE and CLEAN
   - ✓ CORRECT: \\title{{Business Plan for Tech Startup}}
   - ✗ WRONG: \\title{{\\vspace{{-2cm}}\\bfseries Business...}}
   - No formatting commands inside \\title{{}}
   - Use \\maketitle after \\begin{{document}}

4. CONTENT QUALITY:
   - Write 3-5 substantial paragraphs per section
   - Include specific details, examples, and data where relevant
   - NO placeholders like "Insert content here"
   - Use professional, authoritative language
   - Make it comprehensive and valuable
   - Add relevant equations or lists where appropriate

5. OUTPUT FORMAT:
   - Return ONLY raw LaTeX code
   - NO markdown code blocks (no ```latex)
   - NO explanatory text before or after
   - Start with \\documentclass and end with \\end{{document}}

TEMPLATE STRUCTURE:
\\documentclass[11pt, a4paper]{{article}}
\\usepackage[margin=1in]{{geometry}}
\\usepackage{{hyperref}}
\\usepackage{{amsmath}}

\\title{{{title}}}
\\author{{Professional Author}}
\\date{{\\today}}

\\begin{{document}}
\\maketitle

\\tableofcontents
\\newpage

\\section{{First Section Name}}
Comprehensive content with multiple paragraphs...

\\section{{Second Section Name}}
More detailed, valuable content...

% Continue for all sections

\\end{{document}}

Now generate the complete, professional LaTeX document:"""


def _extract_latex_document(raw_content: str) -> str:
    """
    Extract clean LaTeX document from AI response

    Args:
        raw_content: Raw response that may contain markdown or extra text

    Returns:
        Clean LaTeX document
    """
    lines = raw_content.split('\n')
    start_idx = None
    end_idx = None

    # Find document boundaries
    for i, line in enumerate(lines):
        stripped = line.strip()
        if start_idx is None and stripped.startswith("\\documentclass"):
            start_idx = i
        if stripped.startswith("\\end{document}"):
            end_idx = i
            break

    # Extract document if boundaries found
    if start_idx is not None and end_idx is not None and end_idx > start_idx:
        latex_content = '\n'.join(lines[start_idx:end_idx + 1])
        logger.info("Successfully extracted LaTeX document from response")
        return latex_content

    # If extraction failed, try to clean up the raw content
    logger.warning("Could not find document boundaries, attempting cleanup")

    # Remove markdown code blocks if present
    cleaned = raw_content.replace('```latex', '').replace('```', '').strip()

    return cleaned


def _build_markdown_generation_prompt(title: str, sections: List[str], user_prompt: str) -> str:
    """Build comprehensive prompt for Markdown document generation"""
    sections_formatted = "\n".join([f"  - {section}" for section in sections])

    return f"""You are an expert professional writer creating comprehensive, well-structured business documents.

PROJECT DETAILS:
Title: {title}
Required Sections:
{sections_formatted}

User Context: {user_prompt if user_prompt else "Professional business document"}

Generate a COMPLETE, publication-ready Markdown document with exceptional structure and flow.

CRITICAL REQUIREMENTS:

1. DOCUMENT STRUCTURE:
   - Start with the title as # {title}
   - Use ## for main section headings (one for each required section in order)
   - DO NOT include numbers in section headings (e.g., use "## Executive Summary" NOT "## 1. Executive Summary")
   - Use ### for subsections within each main section to create hierarchy
   - Use #### for sub-subsections when needed for detailed topics
   - Create logical flow with smooth transitions between sections
   - Include all {len(sections)} required sections in order

2. CONTENT ORGANIZATION PER SECTION:
   Each main section (##) should include:
   - Opening paragraph that introduces the section's purpose and scope
   - 2-4 subsections (###) that break down the topic into logical parts
   - Mix of content types: paragraphs, lists, tables, examples
   - Concluding insights that tie the section together
   - Total: 300-600 words per main section

3. SUBSECTION GUIDELINES:
   Within each main section, create meaningful subsections like:
   - Overview/Introduction
   - Key Concepts/Components
   - Benefits/Advantages
   - Challenges/Considerations
   - Best Practices/Recommendations
   - Real-world Examples/Case Studies
   - Implementation Steps
   Choose subsections that fit the topic naturally

4. CONTENT QUALITY:
   - Use **bold** for critical terms, key concepts, and important data
   - Use *italic* for subtle emphasis, definitions, or quotes
   - Include specific examples, metrics, and real-world applications
   - NO placeholders like "Insert content here" or "[Add details]"
   - Use professional, authoritative, yet accessible language
   - Support claims with logical reasoning or hypothetical scenarios
   - Include relevant statistics, percentages, or comparative data when appropriate

5. FORMATTING VARIETY:
   - Bullet lists (- item) for features, benefits, or related points
   - Numbered lists (1. item) for steps, sequences, or ranked items
   - > Blockquotes for key insights, important notes, or expert tips
   - Tables (| Column |) for comparisons, specifications, or data
   - `inline code` for technical terms, formulas, or specific values
   - **Bold lists** for emphasis: **Point:** Description format

6. OUTPUT FORMAT:
   - Return ONLY raw Markdown content
   - NO code fences (no ```markdown blocks)
   - NO explanatory text before or after
   - Start with # {title} and include all sections
   - Ensure professional polish and readability

EXAMPLE STRUCTURE WITH DEPTH:

# {title}

## {{First Section Name}}

Opening paragraph introducing this section's importance and what will be covered. Set context and explain why this matters to the reader.

### Overview

Comprehensive explanation of the fundamental concepts. Include **key terminology** in bold and provide clear definitions. Make it accessible yet thorough.

### Key Components

- **Component 1:** Detailed description with specific examples
- **Component 2:** Benefits and use cases clearly articulated
- **Component 3:** How it integrates with the broader system

### Implementation Approach

1. **Initial Assessment:** Analyze current state and requirements
2. **Strategic Planning:** Define objectives and success metrics
3. **Execution:** Deploy solutions with proper oversight
4. **Optimization:** Continuously improve based on feedback

> **Expert Tip:** Provide actionable insight or best practice that adds real value

### Practical Example

Describe a realistic scenario showing how this works in practice. Include specific details and outcomes that demonstrate the concept's effectiveness.

## {{Second Section Name}}

Continue with rich, well-organized content for each section...

### Subsection Title

Content with proper depth, mixing paragraphs and structured elements.

| Feature | Benefit | Implementation |
|---------|---------|----------------|
| Feature 1 | Clear value proposition | How to deploy |
| Feature 2 | Measurable advantage | Step-by-step guide |

### Additional Subsection

More detailed, valuable content with smooth transitions.

## {{Continue for all {len(sections)} sections}}

Each section must be comprehensive, logically structured, and professionally written with appropriate subsections.

Now generate the complete, expertly-structured Markdown document:"""


def _extract_markdown_document(raw_content: str) -> str:
    """
    Extract clean Markdown document from AI response

    Args:
        raw_content: Raw response that may contain markdown code blocks or extra text

    Returns:
        Clean Markdown document
    """
    content = raw_content.strip()

    # Remove markdown code fences if present
    if content.startswith('```markdown'):
        content = content[len('```markdown'):].strip()
    elif content.startswith('```'):
        content = content[3:].strip()

    if content.endswith('```'):
        content = content[:-3].strip()

    logger.info("Successfully extracted Markdown document from response")
    return content


def chat_with_ai(message: str, project_context: str = "") -> str:
    """
    Interactive AI assistant for project help
    
    Args:
        message: User's question or message
        project_context: Optional context about current project
        
    Returns:
        AI assistant's response
    """
    if not API_KEY:
        return APIError.no_api_key()

    model = _get_model()
    prompt = _build_chat_prompt(message, project_context)

    try:
        return _generate_content_sync(model, prompt)
    except Exception as e:
        error_msg = str(e)
        if APIError.is_rate_limit(error_msg):
            return APIError.rate_limit()
        return APIError.generation_error(error_msg)


def _build_chat_prompt(message: str, project_context: str) -> str:
    """Build prompt for AI chat assistant"""
    context_section = f"""
CURRENT PROJECT CONTEXT:
{project_context}

""" if project_context else ""

    return f"""You are an expert AI assistant helping users create professional documents and presentations.

{context_section}USER QUESTION: {message}

Provide a helpful, actionable response that:
• Directly addresses the user's question
• Offers specific, practical suggestions
• Maintains a friendly, professional tone
• Includes concrete examples when relevant
• Keeps responses concise but thorough (2-4 paragraphs max)
• Focuses on helping them improve their project

If asked about content, suggest specific improvements.
If asked about structure, recommend organizational changes.
If asked about style, provide formatting or tone guidance.

Your response:"""


# Utility function for health check
def check_api_status() -> Dict[str, any]:
    """
    Check API configuration and availability
    
    Returns:
        Status dictionary
    """
    status = {
        "api_configured": bool(API_KEY),
        "model": MODEL_NAME,
    }
    
    if API_KEY:
        try:
            model = _get_model()
            # Quick test generation
            test_response = _generate_content_sync(model, "Say 'OK' if you can hear me.")
            status["api_accessible"] = bool(test_response)
            status["status"] = "operational"
        except Exception as e:
            status["api_accessible"] = False
            status["status"] = "error"
            status["error"] = str(e)
    else:
        status["api_accessible"] = False
        status["status"] = "not_configured"
    
    return status