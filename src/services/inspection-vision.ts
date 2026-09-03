import { createServerFn } from '@tanstack/react-start'
import { supabase } from '@/config/supabase'

export interface InspectionVisionAnalysis {
  detectedHazard: boolean
  hazardTitle: string
  description: string
  category: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  confidence: number
  recommendation: string
}

type AnalysisInput = { inspectionId: string; evidenceId: string; accessToken: string }

const analysisSchema = {
  type: 'OBJECT',
  properties: {
    detectedHazard: { type: 'BOOLEAN' },
    hazardTitle: { type: 'STRING' },
    description: { type: 'STRING' },
    category: { type: 'STRING' },
    severity: { type: 'STRING', enum: ['Low', 'Medium', 'High', 'Critical'] },
    confidence: { type: 'NUMBER' },
    recommendation: { type: 'STRING' },
  },
  required: ['detectedHazard', 'hazardTitle', 'description', 'category', 'severity', 'confidence', 'recommendation'],
}

const analyzeInspectionEvidenceServer = createServerFn({ method: 'POST' })
  .inputValidator((input: AnalysisInput) => input)
  .handler(async ({ data }): Promise<InspectionVisionAnalysis> => {
    const apiKey = process.env.GEMINI_API_KEY
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    if (!apiKey) throw new Error('AI Vision is not configured on the server.')
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase server configuration is missing.')

    const userSupabase = (await import('@supabase/supabase-js')).createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    })
    const { data: userData, error: userError } = await userSupabase.auth.getUser(data.accessToken)
    if (userError || !userData.user) throw new Error('The Supabase session is invalid or expired.')

    const { data: evidence, error: evidenceError } = await userSupabase
      .from('documents')
      .select('id, inspection_id, storage_path, storage_mode, mime_type')
      .eq('id', data.evidenceId)
      .eq('inspection_id', data.inspectionId)
      .maybeSingle()

    if (evidenceError) throw new Error(evidenceError.message)
    if (!evidence) throw new Error('Evidence was not found for this inspection.')
    if (evidence.storage_mode !== 'supabase' || !evidence.storage_path) throw new Error('This evidence is not stored in Supabase Storage.')
    if (!evidence.mime_type?.startsWith('image/')) throw new Error('AI Vision analysis currently supports image evidence only.')

    const { data: file, error: downloadError } = await userSupabase.storage.from('inspection-evidence').download(evidence.storage_path)
    if (downloadError || !file) throw new Error(downloadError?.message ?? 'Unable to download evidence.')

    const imageBytes = new Uint8Array(await file.arrayBuffer())
    let binary = ''
    for (let index = 0; index < imageBytes.length; index += 0x8000) {
      binary += String.fromCharCode(...imageBytes.subarray(index, index + 0x8000))
    }

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: 'Analyze this coal mine inspection evidence image. Identify visible hazards or state that none are detected. Return only the requested JSON. Categories may include Safety, PPE, Environmental, Equipment, Electrical, Fire, Structural, or Operational.' },
          { inlineData: { mimeType: evidence.mime_type, data: btoa(binary) } },
        ] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: analysisSchema },
      }),
    })

    if (!geminiResponse.ok) throw new Error(`AI Vision request failed: ${(await geminiResponse.text()).slice(0, 300)}`)
    const payload = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('AI Vision returned no analysis.')

    let result: InspectionVisionAnalysis
    try {
      result = JSON.parse(text) as InspectionVisionAnalysis
    } catch {
      throw new Error('AI Vision returned an invalid structured result.')
    }

    return { ...result, confidence: Math.max(0, Math.min(100, Math.round(result.confidence <= 1 ? result.confidence * 100 : result.confidence))) }
  })

export async function analyzeInspectionEvidence(inspectionId: string, evidenceId: string): Promise<InspectionVisionAnalysis> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Sign in before analyzing evidence.')
  return analyzeInspectionEvidenceServer({ data: { inspectionId, evidenceId, accessToken: data.session.access_token } })
}
