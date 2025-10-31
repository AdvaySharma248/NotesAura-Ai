import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json()

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 })
    }

    // Get previous messages from this session for context
    const previousMessages = await db.message.findMany({
      where: { sessionId: sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20 // Get last 20 messages for context (10 exchanges)
    })

    // Save user message
    await db.message.create({
      data: {
        content: message,
        role: 'USER',
        sessionId: sessionId
      }
    })

    // Get AI response using Gemini
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables')
      return NextResponse.json({ error: 'AI service not properly configured' }, { status: 500 })
    }

    console.log('Initializing Google Generative AI with API key:', apiKey.substring(0, 10) + '...')

    const genAI = new GoogleGenerativeAI(apiKey)
    // Use an available model
    const model = genAI.getGenerativeModel({ model: 'models/gemini-flash-latest' })

    // Build conversation history for context
    let conversationHistory = ''
    if (previousMessages.length > 0) {
      conversationHistory = '\n\nPrevious conversation in this session:\n'
      previousMessages.forEach((msg) => {
        const role = msg.role === 'USER' ? 'User' : 'Assistant'
        conversationHistory += `${role}: ${msg.content}\n\n`
      })
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
9. REMEMBER the conversation history and refer to previous topics discussed
10. Build upon previous answers and maintain context throughout the conversation

Format your responses with:
- Emoji section headings (e.g., "📚 Key Concepts")
- Simple bullet points using • or -
- Numbered lists for step-by-step instructions
- Short paragraphs with natural language
- NO markdown formatting symbols

Example format:
Hey there! Let me help you understand this topic 😊

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

User's current message: ${message}

Remember: Write naturally without markdown! Use emojis and spacing for structure. Be engaging and helpful! 🚀`

    console.log('Sending prompt to Gemini API...')
    const result = await model.generateContent(prompt)
    console.log('Received response from Gemini API')
    
    const response = result.response
    let aiResponse = response.text() || 'Sorry, I could not generate a summary. Please try again.'
    
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

    return NextResponse.json({ summary: aiResponse })
  } catch (error: any) {
    console.error('Error in chat API:', error)
    console.error('Error stack:', error.stack)
    
    // Provide more detailed error information
    let errorMessage = 'Failed to process message'
    if (error.message) {
      errorMessage += ': ' + error.message
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}