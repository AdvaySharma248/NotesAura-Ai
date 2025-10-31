import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET() {
  try {
    // Get AI response using Gemini
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not found in environment variables' }, { status: 500 })
    }

    console.log('Testing Google Generative AI with API key:', apiKey.substring(0, 10) + '...')

    const genAI = new GoogleGenerativeAI(apiKey)
    // Use an available model
    const model = genAI.getGenerativeModel({ model: 'models/gemini-flash-latest' })

    const prompt = 'Hello, this is a test message. Please respond with a short greeting.'

    console.log('Sending prompt to Gemini API...')
    const result = await model.generateContent(prompt)
    console.log('Received response from Gemini API')
    
    const response = result.response
    const aiResponse = response.text() || 'Sorry, I could not generate a response.'

    return NextResponse.json({ response: aiResponse })
  } catch (error: any) {
    console.error('Error in test Gemini API:', error)
    console.error('Error stack:', error.stack)
    
    return NextResponse.json({ 
      error: 'Failed to test Gemini API',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}