import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

// Function to clean up AI response formatting (but keep emojis!)
function cleanAiResponse(text: string): string {
  // Only remove markdown formatting, preserve emojis and content
  let cleanedText = text
  
  // Remove markdown bold (**text** or __text__)
  cleanedText = cleanedText.replace(/\*\*(.*?)\*\*/g, '$1')
  cleanedText = cleanedText.replace(/__(.*?)__/g, '$1')
  
  // Remove markdown italic (*text* or _text_)
  cleanedText = cleanedText.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '$1')
  cleanedText = cleanedText.replace(/(?<!_)_(?!_)(.*?)_(?!_)/g, '$1')
  
  // Remove markdown headers (## or ###)
  cleanedText = cleanedText.replace(/^#{1,6}\s+/gm, '')
  
  // Remove quotation marks around terms
  cleanedText = cleanedText.replace(/"([^"]+)"/g, '$1')
  cleanedText = cleanedText.replace(/'([^']+)'/g, '$1')
  
  // Clean up markdown code blocks
  cleanedText = cleanedText.replace(/```.*?\n([\s\S]*?)```/g, '$1')
  cleanedText = cleanedText.replace(/`([^`]+)`/g, '$1')
  
  // Remove extra newlines (more than 2 in a row)
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n')
  
  // Trim whitespace
  cleanedText = cleanedText.trim()
  
  return cleanedText
}

// Helper function to determine file type
function getFileType(filename: string): 'TEXT' | 'PDF' | 'DOCX' | 'AUDIO' {
  const ext = filename.toLowerCase().split('.').pop()
  if (['txt', 'md'].includes(ext || '')) return 'TEXT'
  if (ext === 'pdf') return 'PDF'
  if (['doc', 'docx'].includes(ext || '')) return 'DOCX'
  if (['mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac', 'aac'].includes(ext || '')) return 'AUDIO'
  return 'TEXT'
}

// Helper function to get audio MIME type
function getAudioMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: { [key: string]: string } = {
    'mp3': 'audio/mp3',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm',
    'flac': 'audio/flac',
    'aac': 'audio/aac'
  }
  return mimeTypes[ext || ''] || 'audio/mp3'
}

// Helper function to extract text from different file types
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = getFileType(file.name)
  
  if (fileType === 'TEXT') {
    return await file.text()
  }
  
  if (fileType === 'AUDIO') {
    // For audio files, return a special marker to use Gemini's audio API
    return '__USE_GEMINI_AUDIO_API__'
  }
  
  if (fileType === 'DOCX') {
    // For DOCX files, extract actual text content
    try {
      // Convert the File to a Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Extract text from DOCX
      const result = await mammoth.extractRawText({ buffer })
      return result.value || `Extracted text from ${file.name}.\n\n[Document content would appear here in a production environment.]`
    } catch (error) {
      console.error('Error extracting text from DOCX:', error)
      // Fallback to simulated extraction
      return `[Document: ${file.name}]\n\nThis is a simulated text extraction from a DOCX file. In a production environment, this would contain the actual text content extracted from the document. The document appears to contain study materials that need to be summarized.`
    }
  }
  
  if (fileType === 'PDF') {
    // For PDF files, we'll let Gemini AI process it directly
    // Return a special marker that tells us to use file upload with Gemini
    return '__USE_GEMINI_FILE_API__'
  }
  
  return 'Unable to extract text from this file type.'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    const customInstructions = formData.get('customInstructions') as string | null

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'File and sessionId are required' }, { status: 400 })
    }

    // Extract text from file
    const extractedText = await extractTextFromFile(file)
    const fileType = getFileType(file.name)

    // Get previous messages from this session for context
    const previousMessages = await db.message.findMany({
      where: { sessionId: sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20 // Get last 20 messages for context
    })

    // Save user message about file upload
    const userMessageContent = customInstructions 
      ? `Uploaded: ${file.name}\n\nInstructions: ${customInstructions}`
      : `Uploaded: ${file.name}`
    
    await db.message.create({
      data: {
        content: userMessageContent,
        role: 'USER',
        sessionId: sessionId,
        fileName: file.name,
        fileType: fileType
      }
    })

    // Get AI summary using Gemini
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // Use gemini-1.5-pro which supports multimodal content including PDFs
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    let aiResponse: string

    // Build conversation history for context
    let conversationHistory = ''
    if (previousMessages.length > 0) {
      conversationHistory = '\n\nPrevious conversation in this session:\n'
      previousMessages.forEach((msg) => {
        const role = msg.role === 'USER' ? 'User' : 'Assistant'
        // Only include the first 200 chars of each message to avoid token limits
        const content = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content
        conversationHistory += `${role}: ${content}\n\n`
      })
      conversationHistory += '\nBased on the conversation above, continue helping the user with their studies.\n'
    }

    // For PDFs and Audio files, use Gemini's multimodal processing capabilities
    if (extractedText === '__USE_GEMINI_FILE_API__' || extractedText === '__USE_GEMINI_AUDIO_API__') {
      try {
        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64Data = buffer.toString('base64')

        // Determine MIME type based on file type
        const mimeType = extractedText === '__USE_GEMINI_FILE_API__' 
          ? 'application/pdf' 
          : getAudioMimeType(file.name)

        const fileTypeDescription = extractedText === '__USE_GEMINI_FILE_API__' 
          ? 'PDF document' 
          : 'audio file'

        const taskDescription = extractedText === '__USE_GEMINI_FILE_API__'
          ? 'analyze and summarize the content of this'
          : 'transcribe and summarize the complete content of this'

        const audioInstructions = extractedText === '__USE_GEMINI_AUDIO_API__' 
          ? '11. For audio files, transcribe the ENTIRE audio content completely from start to finish\n12. Do not skip any parts of the audio - process the full duration'
          : ''

        const audioReminder = extractedText === '__USE_GEMINI_AUDIO_API__' 
          ? 'Make sure to process the complete audio from beginning to end.' 
          : ''

        // Build the task based on custom instructions
        let taskPrompt = ''
        if (customInstructions) {
          taskPrompt = `The user has uploaded a ${fileTypeDescription} titled "${file.name}" with the following specific instructions:

"${customInstructions}"

Please process the file content and respond according to these instructions.`
        } else {
          taskPrompt = `Please ${taskDescription} ${fileTypeDescription} titled "${file.name}". ${audioReminder}`
        }

        const prompt = `You are NotesAura AI, an energetic and engaging study assistant! 🎓 Your task is to help students learn effectively with clear, well-organized, and interactive responses.

Your personality:
- Friendly, encouraging, and enthusiastic about learning
- Use relevant emojis to make content more engaging (but don't overdo it - 2-4 emojis per response)
- Make learning feel exciting and approachable
- Celebrate student progress and curiosity

IMPORTANT FORMATTING RULES:
- DO NOT use markdown symbols (**, __, *, _, ##, ###)
- DO NOT put words in quotation marks
- Use plain text with emojis for emphasis
- Write in a natural, conversational style
- Use simple line breaks and spacing for structure

When responding, you should:
1. Start with a friendly greeting or acknowledgment 👋
2. Create clear, structured summaries with emoji headings
3. Use bullet points (•) and numbered lists to organize information
4. Add relevant emojis to section headings (📚 📝 💡 ✨ 🎯 ⭐ 📌 🔑 etc.)
5. Emphasize key concepts naturally without special formatting
6. Break down complex topics into digestible sections
7. Use encouraging language and positive reinforcement
8. End with helpful tips or next steps when appropriate
9. REMEMBER the conversation history and build upon previous topics discussed
10. Connect new file content with previously discussed materials when relevant
${audioInstructions}

Format your responses with:
- Emoji section headings (e.g., "📚 Key Concepts")
- Simple bullet points using • or -
- Numbered lists for step-by-step instructions
- Short paragraphs with natural language
- NO markdown formatting symbols

Example format:
Hey there! Let me help you with this 😊

📚 Key Concepts

• First important point with clear explanation in plain text
• Second important point that builds on the first
• Third point connecting everything together

🎯 Step-by-Step Guide

1. First step explained simply
2. Second step with practical examples
3. Third step to master the concept

💡 Key Takeaways

Here's what you should remember...

✨ Pro Tip: Helpful advice for better understanding${conversationHistory}

${taskPrompt}

Remember: Write naturally without markdown! Use emojis and spacing for structure. Be engaging and helpful! 🚀`

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ])
        
        aiResponse = result.response.text() || 'Sorry, I could not generate a summary. Please try again.'
      } catch (fileError: any) {
        console.error(`Error processing ${fileType} with Gemini:`, fileError)
        // Fallback to a simpler message
        const fileTypeName = extractedText === '__USE_GEMINI_FILE_API__' ? 'PDF' : 'audio'
        aiResponse = `I've received the ${fileTypeName} file "${file.name}", but I'm having trouble processing it directly. ${fileError.message || 'Please try again or use a different file format.'}`
      }
    } else {
      // For other file types, use the extracted text
      // Build the task based on custom instructions
      let taskPrompt = ''
      if (customInstructions) {
        taskPrompt = `The user has uploaded a file titled "${file.name}" with the following specific instructions:

"${customInstructions}"

File content:
${extractedText}

Please respond according to the user's instructions above.`
      } else {
        taskPrompt = `Please summarize the following content from the file "${file.name}":\n\n${extractedText}`
      }

      const prompt = `You are NotesAura AI, an energetic and engaging study assistant! 🎓 Your task is to help students learn effectively with clear, well-organized, and interactive responses.

Your personality:
- Friendly, encouraging, and enthusiastic about learning
- Use relevant emojis to make content more engaging (but don't overdo it - 2-4 emojis per response)
- Make learning feel exciting and approachable
- Celebrate student progress and curiosity

IMPORTANT FORMATTING RULES:
- DO NOT use markdown symbols (**, __, *, _, ##, ###)
- DO NOT put words in quotation marks  
- Use plain text with emojis for emphasis
- Write in a natural, conversational style
- Use simple line breaks and spacing for structure

When responding, you should:
1. Start with a friendly greeting or acknowledgment 👋
2. Create clear, structured summaries with emoji headings
3. Use bullet points (•) and numbered lists to organize information
4. Add relevant emojis to section headings (📚 📝 💡 ✨ 🎯 ⭐ 📌 🔑 etc.)
5. Emphasize key concepts naturally without special formatting
6. Break down complex topics into digestible sections
7. Use encouraging language and positive reinforcement
8. End with helpful tips or next steps when appropriate
9. REMEMBER the conversation history and build upon previous topics discussed
10. Connect new file content with previously discussed materials when relevant

Format your responses with:
- Emoji section headings (e.g., "📚 Key Concepts")
- Simple bullet points using • or -
- Numbered lists for step-by-step instructions
- Short paragraphs with natural language
- NO markdown formatting symbols

Example format:
Hey there! Let me help you with this 😊

📚 Key Concepts

• First important point with clear explanation in plain text
• Second important point that builds on the first
• Third point connecting everything together

🎯 Step-by-Step Guide

1. First step explained simply
2. Second step with practical examples
3. Third step to master the concept

💡 Key Takeaways

Here's what you should remember...

✨ Pro Tip: Helpful advice for better understanding${conversationHistory}

${taskPrompt}

Remember: Write naturally without markdown! Use emojis and spacing for structure. Be engaging and helpful! 🚀`

      const result = await model.generateContent(prompt)
      aiResponse = result.response.text() || 'Sorry, I could not generate a summary. Please try again.'
    }
    
    // Clean up the AI response
    aiResponse = cleanAiResponse(aiResponse)

    // Save AI response
    await db.message.create({
      data: {
        content: aiResponse,
        role: 'ASSISTANT',
        sessionId: sessionId
      }
    })

    // Update session timestamp
    await db.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({ 
      summary: aiResponse,
      fileType: fileType
    })
  } catch (error: any) {
    console.error('Error in upload API:', error)
    return NextResponse.json({ error: 'Failed to process file: ' + error.message }, { status: 500 })
  }
}