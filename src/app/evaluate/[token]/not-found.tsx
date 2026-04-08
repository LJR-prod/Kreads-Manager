export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
      <div className="text-center space-y-3">
        <p className="text-5xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#e63329' }}>404</p>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#f5f5f5' }}>
          Lien invalide ou expiré
        </h1>
        <p className="text-sm" style={{ color: '#5a5a5a' }}>
          Ce lien d'évaluation n'existe pas ou a été désactivé.
        </p>
      </div>
    </div>
  )
}
