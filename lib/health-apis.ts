interface NutritionHint {
  source: 'api-ninjas'
  items: string[]
}

interface SymptomHint {
  source: 'infermedica'
  summary: string
}

export async function getNutritionHint(message: string): Promise<NutritionHint | null> {
  const apiKey = process.env.NUTRITION_API_KEY
  if (!apiKey) return null

  if (!/(eat|food|nutrition|diet|meal|iron|craving)/i.test(message)) {
    return null
  }

  const query = pickNutritionQuery(message)

  try {
    const response = await fetch(
      `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Api-Key': apiKey,
        },
      }
    )

    if (!response.ok) return null
    const data = (await response.json()) as Array<{ name?: string }>

    const items = data
      .map((item) => item.name)
      .filter((name): name is string => Boolean(name))
      .slice(0, 3)

    if (items.length === 0) return null

    return {
      source: 'api-ninjas',
      items,
    }
  } catch {
    return null
  }
}

export async function getSymptomHint(message: string): Promise<SymptomHint | null> {
  const appId = process.env.INFERMEDICA_APP_ID
  const appKey = process.env.INFERMEDICA_APP_KEY
  if (!appId || !appKey) return null

  if (!/(pain|cramps|headache|fatigue|nausea|symptom|bleeding|dizziness)/i.test(message)) {
    return null
  }

  try {
    const response = await fetch('https://api.infermedica.com/v3/symptoms', {
      headers: {
        'App-Id': appId,
        'App-Key': appKey,
      },
    })

    if (!response.ok) return null
    const data = (await response.json()) as Array<{ name?: string }>
    const names = data
      .map((item) => item.name)
      .filter((name): name is string => Boolean(name))
      .slice(0, 2)

    if (names.length === 0) return null

    return {
      source: 'infermedica',
      summary: `Related tracked symptoms: ${names.join(', ')}`,
    }
  } catch {
    return null
  }
}

function pickNutritionQuery(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('iron')) return 'spinach lentils pumpkin seeds'
  if (lower.includes('cramp')) return 'banana salmon yogurt'
  if (lower.includes('bloat')) return 'cucumber ginger oats'

  return 'leafy greens nuts yogurt'
}
