export function playSound(event: string) {
  try {
    const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}')
    if (settings.muted) return
    const volume = (settings.volume ?? 80) / 100
    const file = settings.events?.[event] || 'OK.mp3'
    const audio = new Audio('/sound/' + file)
    audio.volume = volume
    audio.play().catch(() => { /* ignore autoplay restrictions */ })
  } catch { /* ignore */ }
}
