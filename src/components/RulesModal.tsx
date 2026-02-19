import { X } from 'lucide-react'

interface RulesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-stone-800 rounded-2xl border border-stone-600 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-amber-100">Règles du Jeu</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-parchment transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 text-parchment text-sm">
          <section>
            <h3 className="font-display text-xl text-amber-200 mb-2">But du Jeu</h3>
            <p>Être le dernier survivant en éliminant tous les autres joueurs.</p>
          </section>

          <section>
            <h3 className="font-display text-xl text-amber-200 mb-2">Setup</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Chaque joueur commence avec 2 cartes faces cachées</li>
              <li>Chaque joueur commence avec 2 pièces</li>
              <li>Le reste des pièces forme le Trésor</li>
              <li>Les cartes restantes forment la Cour</li>
            </ul>
          </section>

          <section>
            <h3 className="font-display text-xl text-amber-200 mb-2">Actions</h3>
            <div className="space-y-3">
              <div>
                <strong className="text-amber-300">Revenu (+1 pièce)</strong>
                <p className="text-stone-400">Action incontrable. Prenez 1 pièce du Trésor.</p>
              </div>
              <div>
                <strong className="text-amber-300">Aide étrangère (+2 pièces)</strong>
                <p className="text-stone-400">Contrable par la Duchesse. Prenez 2 pièces du Trésor.</p>
              </div>
              <div>
                <strong className="text-amber-300">Assassinat (-7 pièces)</strong>
                <p className="text-stone-400">Action incontrable. Coûte 7 pièces. Obligatoire si vous avez 10+ pièces. Élimine une carte d'un adversaire.</p>
              </div>
              <div>
                <strong className="text-amber-300">Pouvoirs des personnages</strong>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-1 text-stone-400">
                  <li><strong>Duchesse</strong> : +3 pièces (contrable)</li>
                  <li><strong>Assassin</strong> : Coûte 3 pièces. Élimine une carte (contrable par la Comtesse)</li>
                  <li><strong>Capitaine</strong> : Vole 2 pièces (contrable par l'Ambassadeur)</li>
                  <li><strong>Ambassadeur</strong> : Échange vos cartes avec la Cour</li>
                  <li><strong>Comtesse</strong> : Pas d'action active, mais peut contrer l'Assassin</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-display text-xl text-amber-200 mb-2">Réactions</h3>
            <p className="mb-2">Quand une action contrable est annoncée, vous avez 15 secondes pour :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Mettre en doute</strong> : Challengez le joueur. S'il n'a pas le personnage, il perd une carte. Sinon, vous perdez une carte.</li>
              <li><strong>Contrer</strong> : Utilisez un personnage pour bloquer l'action (Duchesse contre Aide étrangère, Comtesse contre Assassin, Ambassadeur contre Capitaine).</li>
            </ul>
          </section>

          <section>
            <h3 className="font-display text-xl text-amber-200 mb-2">Élimination</h3>
            <p>Un joueur est éliminé quand toutes ses cartes sont révélées. Ses pièces retournent au Trésor.</p>
          </section>

          <section>
            <h3 className="font-display text-xl text-amber-200 mb-2">Bluff</h3>
            <p>Vous pouvez annoncer n'importe quelle action, même si vous n'avez pas le personnage correspondant. Mais si vous êtes mis en doute et que vous n'avez pas le personnage, vous perdez une carte !</p>
          </section>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-900 font-semibold"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
