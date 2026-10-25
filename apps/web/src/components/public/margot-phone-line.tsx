import { E164 } from '@/lib/margot/phone-line'

// "Call Margot (AI assistant)" slot. Renders nothing while there is no valid number,
// so a dead or placeholder number can never reach a page.
export function MargotPhoneLine({ number }: { number: string | null }) {
  if (!number || !E164.test(number)) return null
  return (
    <p data-margot-phone style={{ margin: 0 }}>
      <a href={`tel:${number}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
        Call Margot (AI assistant) {number}
      </a>
      <br />
      <span style={{ fontSize: '0.875em', opacity: 0.8 }}>Answered by our AI assistant. Messages go to our team by email.</span>
    </p>
  )
}
