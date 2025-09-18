export function chunkText(text, targetChars=1000) {
  // naive chunking by paragraphs/sentences
  const paras = text.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean)
  const chunks = []
  let buf = ''
  for (const p of paras) {
    if ((buf + '\n\n' + p).length > targetChars) {
      if (buf) chunks.push(buf.trim())
      if (p.length > targetChars) {
        // hard split long paragraph
        for (let i=0; i<p.length; i+=targetChars) {
          chunks.push(p.slice(i, i+targetChars))
        }
        buf=''
      } else {
        buf = p
      }
    } else {
      buf = buf ? (buf + '\n\n' + p) : p
    }
  }
  if (buf) chunks.push(buf.trim())
  return chunks
}
