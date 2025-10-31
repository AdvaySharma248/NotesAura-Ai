'use client'
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Send, 
  Plus, 
  Settings, 
  MessageSquare, 
  Trash2, 
  FileText,
  Mic,
  Download,
  Sparkles,
  User,
  LogOut,
  MicOff,
  Copy,
  Check
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  fileName?: string
  fileType?: 'TEXT' | 'PDF' | 'DOCX' | 'AUDIO'
  createdAt: Date
}

interface ChatSession {
  id: string
  title: string
  createdAt: Date
  messages: Message[]
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechTranscript, setSpeechTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.lang = 'en-US'
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setSpeechTranscript(transcript)
          setInput(transcript)
          setIsListening(false)
          toast({
            title: 'Speech recognized',
            description: 'Click send to submit your message.'
          })
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
          toast({
            title: 'Speech recognition error',
            description: event.error === 'no-speech' ? 'No speech detected. Please try again.' : 'An error occurred. Please try again.',
            variant: 'destructive'
          })
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }
  }, [])

  const startListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Not supported',
        description: 'Speech recognition is not supported in this browser. Please use Chrome or Edge.',
        variant: 'destructive'
      })
      return
    }

    try {
      setSpeechTranscript('')
      setInput('')
      setIsListening(true)
      recognitionRef.current.start()
      toast({
        title: 'Listening...',
        description: 'Speak now'
      })
    } catch (error) {
      console.error('Error starting recognition:', error)
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (status === 'authenticated') {
      console.log('User authenticated, loading sessions...')
      loadSessions()
      // Don't auto-create session on load - create only when user sends message/uploads file
    }
  }, [status])

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      } else if (response.status === 401) {
        console.error('Unauthorized: redirecting to signin')
        router.push('/auth/signin')
      } else {
        console.error('Failed to load sessions:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' })
      })
      if (response.ok) {
        const session = await response.json()
        setCurrentSessionId(session.id)
        setMessages([])
        setSessions(prev => [session, ...prev])
        return session.id // Return the session ID
      } else if (response.status === 401) {
        console.error('Unauthorized: redirecting to signin')
        router.push('/auth/signin')
        return null
      } else {
        console.error('Failed to create session:', response.statusText)
        return null
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      return null
    }
  }

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (response.ok) {
        const session = await response.json()
        setCurrentSessionId(sessionId)
        setMessages(session.messages || [])
        setSidebarOpen(false)
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null)
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const clearAllHistory = async () => {
    try {
      const response = await fetch('/api/sessions', { method: 'DELETE' })
      if (response.ok) {
        setSessions([])
        setCurrentSessionId(null)
        setMessages([])
        toast({ title: 'All chat history cleared' })
      }
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  }

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return

    // Create a new session if one doesn't exist
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await createNewSession()
      if (!sessionId) {
        toast({ 
          title: 'Error',
          description: 'Failed to create chat session. Please try again.',
          variant: 'destructive'
        })
        return
      }
    }

    // If there's a selected file, upload it with the text
    if (selectedFile) {
      setIsLoading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('sessionId', sessionId)
      
      // Get custom instructions from input (if any)
      const customInstructions = input.trim()
      if (customInstructions) {
        formData.append('customInstructions', customInstructions)
      }

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const data = await response.json()
          
          const userMessage: Message = {
            id: Date.now().toString(),
            content: customInstructions 
              ? `Uploaded: ${selectedFile.name}\n\nInstructions: ${customInstructions}`
              : `Uploaded: ${selectedFile.name}`,
            role: 'user',
            fileName: selectedFile.name,
            fileType: data.fileType,
            createdAt: new Date()
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.summary,
            role: 'assistant',
            createdAt: new Date()
          }

          setMessages(prev => [...prev, userMessage, assistantMessage])
          
          if (messages.length === 0) {
            setSessions(prev => prev.map(s => 
              s.id === sessionId 
                ? { ...s, title: selectedFile.name.slice(0, 30) + (selectedFile.name.length > 30 ? '...' : '') }
                : s
            ))
          }
        } else {
          throw new Error('Failed to process file')
        }
      } catch (error) {
        console.error('Error uploading file:', error)
        toast({ 
          title: 'Error',
          description: 'Failed to process file. Please try again.',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
        setSelectedFile(null)
        setInput('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
      return
    }

    // Regular text message (no file)
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      createdAt: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          sessionId: sessionId
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: data.summary,
          role: 'assistant',
          createdAt: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        
        // Update session title with first message
        if (messages.length === 0) {
          setSessions(prev => prev.map(s => 
            s.id === sessionId 
              ? { ...s, title: input.slice(0, 30) + (input.length > 30 ? '...' : '') }
              : s
          ))
        }
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({ 
        title: 'Error',
        description: 'Failed to get AI response. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Set the selected file
    setSelectedFile(file)
    // Clear input so user can type instructions
    setInput('')
  }

  const downloadSummary = () => {
    if (messages.length === 0) {
      toast({ 
        title: 'No messages to download',
        description: 'Start a conversation first to download summaries.',
        variant: 'destructive'
      })
      return
    }

    // Get all messages with proper formatting
    const summary = messages
      .map(m => {
        const timestamp = new Date(m.createdAt).toLocaleString()
        const role = m.role === 'user' ? 'You' : 'NotesAura AI'
        const header = `[${timestamp}] ${role}:`
        const content = m.content
        return `${header}\n${content}`
      })
      .join('\n\n' + '='.repeat(80) + '\n\n')
    
    // Create a more detailed summary with metadata
    const header = `NotesAura AI - Chat Summary
Generated: ${new Date().toLocaleString()}
Total Messages: ${messages.length}
${'='.repeat(80)}

`
    const fullContent = header + summary
    
    if (!fullContent || fullContent.trim() === '') {
      toast({ 
        title: 'Error',
        description: 'No content to download.',
        variant: 'destructive'
      })
      return
    }
    
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notesaura-summary-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({ 
      title: 'Success',
      description: 'Chat summary downloaded successfully!'
    })
  }

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      toast({
        title: 'Copied!',
        description: 'Message copied to clipboard'
      })
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      })
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <Image
              src="/logo-final.png"
              alt="NotesAura AI"
              width={64}
              height={64}
              className="rounded-lg mx-auto"
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-500/30 to-slate-400/30 blur-lg -z-10"></div>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading NotesAura AI...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
    return null
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Fixed Sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 h-full w-64 sidebar-gradient border-r border-border flex-col z-10">
        <div className="p-4 border-b border-border">
          <Button 
            onClick={createNewSession}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground neon-glow hover-lift"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-4 scrollbar-thin" style={{ height: 'calc(100vh - 140px)' }}>
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-all duration-300 hover-lift ${
                  currentSessionId === session.id 
                    ? 'bg-primary/20 border-primary/50 shadow-lg' 
                    : 'bg-card/50 hover:bg-card border-border/50'
                }`}
                onClick={() => loadSession(session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{session.title}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllHistory}
            className="w-full border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All History
          </Button>
        </div>
      </div>

      {/* Main Content Area with Left Margin */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 sidebar-gradient border-border p-0 flex flex-col">
            <div className="p-4 border-b border-border">
              <Button 
                onClick={createNewSession}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground neon-glow"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4 scrollbar-thin" style={{ height: 'calc(100vh - 140px)' }}>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`p-3 cursor-pointer transition-all duration-300 hover-lift ${
                      currentSessionId === session.id 
                        ? 'bg-primary/20 border-primary/50 shadow-lg' 
                        : 'bg-card/50 hover:bg-card border-border/50'
                    }`}
                    onClick={() => loadSession(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{session.title}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Header */}
        <header className="glass-morphism border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Image
                    src="/logo-final.png"
                    alt="NotesAura AI"
                    width={24}
                    height={24}
                    className="rounded"
                  />
                  <div className="absolute inset-0 rounded bg-gradient-to-r from-slate-500/20 to-slate-400/20 blur-sm -z-10"></div>
                </div>
                <h1 className="text-xl font-bold gradient-text">NotesAura AI</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSummary}
                disabled={messages.length === 0}
                className="border-border text-muted-foreground hover:bg-card hover:text-foreground transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              {/* User Profile Dropdown */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/settings')}
                  className="border-border text-muted-foreground hover:bg-card hover:text-foreground transition-all"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center space-x-2 pl-2 border-l border-border">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                    <AvatarFallback>
                      {session?.user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">{session?.user?.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 scrollbar-thin">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 fade-in">
                <div className="relative mb-6 flex justify-center">
                  <div className="relative">
                    <Image
                      src="/logo-final.png"
                      alt="NotesAura AI"
                      width={64}
                      height={64}
                      className="rounded-lg"
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-500/30 to-slate-400/30 blur-lg -z-10"></div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold gradient-text mb-4">Welcome to NotesAura AI</h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Your AI-powered study assistant for summarizing notes and documents
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass-morphism border-border/50 p-6 hover-lift group">
                    <FileText className="w-8 h-8 text-primary mb-3 mx-auto group-hover:scale-110 transition-transform" />
                    <h3 className="text-foreground font-semibold mb-2">Document Upload</h3>
                    <p className="text-muted-foreground text-sm">Upload PDFs, DOCX, and text files for instant summarization</p>
                  </Card>
                  <Card className="glass-morphism border-border/50 p-6 hover-lift group">
                    <Mic className="w-8 h-8 text-green-500 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                    <h3 className="text-foreground font-semibold mb-2">Audio Processing</h3>
                    <p className="text-muted-foreground text-sm">Record and transcribe audio lectures automatically</p>
                  </Card>
                  <Card className="glass-morphism border-border/50 p-6 hover-lift group">
                    <Sparkles className="w-8 h-8 text-purple-500 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                    <h3 className="text-foreground font-semibold mb-2">AI Summaries</h3>
                    <p className="text-muted-foreground text-sm">Get concise, intelligent summaries powered by AI</p>
                  </Card>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${
                    message.role === 'user' ? 'slide-in-right' : 'slide-in-left'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Card
                    className={`max-w-[80%] p-4 transition-all duration-300 hover-lift relative group ${
                      message.role === 'user'
                        ? 'chat-bubble-user text-primary-foreground border-0'
                        : 'chat-bubble-ai text-foreground'
                    }`}
                  >
                    {/* Copy button for AI messages */}
                    {message.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-background/20"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {message.fileName && (
                      <div className="flex items-center space-x-2 mb-3">
                        {message.fileType === 'AUDIO' && <Mic className="w-4 h-4" />}
                        {message.fileType === 'PDF' && <FileText className="w-4 h-4" />}
                        {message.fileType === 'DOCX' && <FileText className="w-4 h-4" />}
                        <Badge variant="secondary" className="text-xs bg-background/20 text-foreground border-border/50">
                          {message.fileName}
                        </Badge>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                    <div className="text-xs opacity-70 mt-3 font-mono">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </Card>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start slide-in-left">
                <Card className="chat-bubble-ai text-foreground p-4">
                  <div className="typing-indicator">
                    <span className="text-muted-foreground mr-2">AI is thinking</span>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4 glass-morphism">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.docx,.doc,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (selectedFile) {
                    // Clear the selected file
                    setSelectedFile(null)
                    setInput('')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  } else {
                    fileInputRef.current?.click()
                  }
                }}
                disabled={isLoading}
                className={`border-border transition-all ${
                  selectedFile
                    ? 'text-red-500 hover:text-red-600 border-red-500/50 bg-red-500/10'
                    : 'text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/10'
                }`}
              >
                {selectedFile ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                className={`border-border transition-all ${
                  isListening 
                    ? 'text-red-500 hover:text-red-600 border-red-500/50 bg-red-500/10 animate-pulse' 
                    : 'text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/10'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening... Speak now" : selectedFile ? "Add instructions for the file..." : "Type your message or upload a file..."}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isLoading || isListening}
                className="flex-1 bg-card/50 border-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <Button
                onClick={handleSendMessage}
                disabled={(!input.trim() && !selectedFile) || isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground neon-glow hover-lift disabled:opacity-50 transition-all"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              {isListening ? (
                <span className="text-red-500 font-medium animate-pulse">🎙️ Listening... Speak now</span>
              ) : speechTranscript ? (
                <span className="text-green-500">✓ Speech recognized. Click send to submit.</span>
              ) : selectedFile ? (
                <span className="text-primary font-medium">📎 File ready: {selectedFile.name} - Add instructions or press send</span>
              ) : (
                'Supports: Text files, PDFs, DOCX, audio files (MP3, WAV, M4A, OGG, WEBM, FLAC, AAC), and voice input'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}