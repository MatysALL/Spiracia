const TITLES = ['Forniqueur', 'Vandale', 'Truand', 'Batard', 'Salaud', 'Gourgandin'] as const
const SPECIAL_TITLES = ['Imposteur', 'Contrefaçon', 'Alter-Ego', 'Complotiste'] as const

export function generatePlayerName(): string {
  const title = TITLES[Math.floor(Math.random() * TITLES.length)]
  const pseudoLength = Math.floor(Math.random() * 7) + 4 // 4-10 caractères
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let pseudo = ''
  for (let i = 0; i < pseudoLength; i++) {
    pseudo += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${title} ${pseudo}`
}

export function resolveDuplicateNames(names: string[]): string[] {
  const nameMap = new Map<string, number>()
  const resolved: string[] = []
  const counts = new Map<string, number>()

  // Compter les occurrences de chaque nom complet
  names.forEach((name) => {
    counts.set(name, (counts.get(name) || 0) + 1)
  })

  names.forEach((name) => {
    const count = counts.get(name) || 0
    if (count === 1) {
      resolved.push(name)
    } else {
      // Nom dupliqué - extraire le pseudo (partie après le premier espace)
      const parts = name.split(' ')
      const pseudo = parts.slice(1).join(' ') // Tout après le titre
      
      const occurrence = nameMap.get(name) || 0
      nameMap.set(name, occurrence + 1)

      if (count === 2) {
        if (occurrence === 0) {
          resolved.push(name) // Premier garde son nom
        } else {
          resolved.push(`${SPECIAL_TITLES[0]} ${pseudo}`) // Imposteur
        }
      } else if (count === 3) {
        if (occurrence === 0) {
          resolved.push(name) // Premier garde son nom
        } else if (occurrence === 1) {
          resolved.push(`${SPECIAL_TITLES[0]} ${pseudo}`) // Imposteur
        } else {
          resolved.push(`${SPECIAL_TITLES[1]} ${pseudo}`) // Contrefaçon
        }
      } else if (count === 4) {
        if (occurrence === 0) {
          resolved.push(`${SPECIAL_TITLES[3]} ${pseudo}`) // Complotiste (easter egg)
        } else if (occurrence === 1) {
          resolved.push(`${SPECIAL_TITLES[0]} ${pseudo}`) // Imposteur
        } else if (occurrence === 2) {
          resolved.push(`${SPECIAL_TITLES[1]} ${pseudo}`) // Contrefaçon
        } else {
          resolved.push(`${SPECIAL_TITLES[2]} ${pseudo}`) // Alter-Ego
        }
      } else {
        resolved.push(name) // Fallback
      }
    }
  })

  return resolved
}
