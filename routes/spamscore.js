const express = require('express');
const router = express.Router();
const dns = require('dns').promises;

// ─── Spam word lists ──────────────────────────────────────────────────────

const SPAM_WORDS_HIGH = [
  'gratis','free','dinero rápido','gana dinero','oferta especial','oferta limitada',
  'haz clic aquí','click here','actúa ahora','act now','urgente','urgent',
  '100% gratis','sin costo','sin riesgo','garantizado','guaranteed',
  'winner','ganador','premio','prize','congratulations','enhorabuena',
  'viagra','casino','porn','xxx','sex','adult',
  'make money','trabajo desde casa','work from home','ingresos extra',
  'millonario','millionaire','rico','get rich','wealth',
  'suscríbete ya','subscribe now','unsubscribe','darse de baja',
  'esto no es spam','this is not spam','not spam',
  'inversión segura','safe investment','crypto','bitcoin',
  'eliminar deuda','debt free','préstamo','loan','crédito fácil',
];

const SPAM_WORDS_MED = [
  'promoción','promotion','descuento','discount','oferta','offer',
  'ahorra','save','precio especial','special price',
  'llama ahora','call now','llámanos','contact us now',
  'visita nuestra web','visit our website','haz clic','click',
  'solo hoy','today only','por tiempo limitado','limited time',
  'satisfacción garantizada','money back','devolución',
  'sin compromiso','no obligation','prueba gratis','free trial',
  'miles de','thousands of','millones','millions',
  'responde a este email','reply to this email',
  'confirmación','confirmation','verificar','verify',
  'exclusivo para ti','exclusive','personalizado para',
];

const SPAM_PHRASES = [
  { pattern: /\$\d+/, weight: 2, label: 'Contiene cantidades en dólares ($)' },
  { pattern: /€\d+/, weight: 1, label: 'Contiene cantidades en euros (€)' },
  { pattern: /\b(100|99|95|90)%\b/, weight: 2, label: 'Porcentajes llamativos (99%, 100%)' },
  { pattern: /!{2,}/, weight: 3, label: 'Múltiples signos de exclamación (!!)' },
  { pattern: /\?{2,}/, weight: 2, label: 'Múltiples signos de interrogación (??)' },
  { pattern: /[A-ZÁÉÍÓÚÑ]{4,}/, weight: 2, label: 'Texto en MAYÚSCULAS excesivo' },
  { pattern: /(http[s]?:\/\/[^\s]+){3,}/, weight: 3, label: 'Demasiados enlaces (3+)' },
  { pattern: /href=["'][^"']*bit\.ly[^"']*["']/i, weight: 3, label: 'URL acortada (bit.ly)' },
  { pattern: /href=["'][^"']*tinyurl[^"']*["']/i, weight: 3, label: 'URL acortada (tinyurl)' },
  { pattern: /color\s*:\s*(red|#[fF]{2}0{4}|rgb\(25[0-5])/i, weight: 1, label: 'Texto en color rojo' },
  { pattern: /font-size\s*:\s*([2-9]\d|1\d{2,})px/i, weight: 1, label: 'Fuente de tamaño muy grande' },
  { pattern: /<img[^>]*>/gi, weight: 0, label: 'Contiene imágenes' },
  { pattern: /background(-color)?\s*:\s*[^;]+/i, weight: 1, label: 'Fondo de color en el email' },
];

// ─── Analyzer ─────────────────────────────────────────────────────────────

function analyzeContent(subject, body) {
  const issues = [];
  let score = 0;

  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();
  const fullText = subjectLower + ' ' + bodyLower;
  const bodyPlain = body.replace(/<[^>]+>/g, ' ');

  // 1. Spam words in subject (high weight)
  SPAM_WORDS_HIGH.forEach(w => {
    if (subjectLower.includes(w)) {
      score += 4;
      issues.push({ severity: 'high', text: `Palabra de spam en asunto: "${w}"` });
    }
  });
  SPAM_WORDS_MED.forEach(w => {
    if (subjectLower.includes(w)) {
      score += 2;
      issues.push({ severity: 'medium', text: `Palabra promocional en asunto: "${w}"` });
    }
  });

  // 2. Spam words in body
  const foundHigh = SPAM_WORDS_HIGH.filter(w => bodyLower.includes(w));
  const foundMed = SPAM_WORDS_MED.filter(w => bodyLower.includes(w));
  foundHigh.forEach(w => { score += 2; issues.push({ severity: 'high', text: `Palabra de spam en cuerpo: "${w}"` }); });
  if (foundMed.length > 3) {
    score += foundMed.length;
    issues.push({ severity: 'medium', text: `${foundMed.length} palabras promocionales en el cuerpo` });
  } else {
    foundMed.forEach(w => { score += 1; issues.push({ severity: 'low', text: `Palabra promocional: "${w}"` }); });
  }

  // 3. Patterns in subject + body
  SPAM_PHRASES.forEach(({ pattern, weight, label }) => {
    if (pattern.test(subject) || pattern.test(body)) {
      score += weight;
      if (weight > 0) issues.push({ severity: weight >= 3 ? 'high' : weight >= 2 ? 'medium' : 'low', text: label });
    }
  });

  // 4. Subject length checks
  if (subject.length > 80) { score += 2; issues.push({ severity: 'medium', text: 'Asunto demasiado largo (>80 caracteres)' }); }
  if (subject.length < 10) { score += 1; issues.push({ severity: 'low', text: 'Asunto muy corto (<10 caracteres)' }); }

  // 5. Body length
  const wordCount = bodyPlain.split(/\s+/).filter(Boolean).length;
  if (wordCount < 20) { score += 2; issues.push({ severity: 'medium', text: 'Email demasiado corto (<20 palabras) — parece spam' }); }
  if (wordCount > 800) { score += 1; issues.push({ severity: 'low', text: 'Email muy largo (>800 palabras)' }); }

  // 6. HTML checks
  const linkMatches = body.match(/href=["'][^"']+["']/gi) || [];
  if (linkMatches.length > 5) { score += 3; issues.push({ severity: 'high', text: `Demasiados enlaces (${linkMatches.length}) en el email` }); }
  else if (linkMatches.length > 2) { score += 1; issues.push({ severity: 'low', text: `${linkMatches.length} enlaces en el email` }); }

  const imgMatches = body.match(/<img[^>]*>/gi) || [];
  if (imgMatches.length > 0) { score += 1; issues.push({ severity: 'low', text: `Contiene ${imgMatches.length} imagen(es)` }); }

  // Image to text ratio (if many images, few text = spammy)
  if (imgMatches.length > 2 && wordCount < 50) {
    score += 3;
    issues.push({ severity: 'high', text: 'Ratio imagen/texto muy alto — típico de spam' });
  }

  // 7. Missing plain text (HTML only)
  if (body.includes('<html') && wordCount < 5) {
    score += 2;
    issues.push({ severity: 'medium', text: 'Email solo HTML sin texto visible suficiente' });
  }

  // 8. No unsubscribe link (required by law + spam filters)
  const hasUnsub = /baja|unsub|cancelar suscripci|opt.out|darse de baja/i.test(body);
  if (!hasUnsub && wordCount > 30) {
    score += 2;
    issues.push({ severity: 'medium', text: 'Sin enlace de baja (requerido legalmente y por filtros)' });
  }

  // 9. Personalization check
  const hasPersonalization = /{{nombre}}|{{empresa}}|{{email}}/i.test(body + subject);
  if (!hasPersonalization) {
    score += 1;
    issues.push({ severity: 'low', text: 'Sin personalización — añadir {{nombre}} mejora entregabilidad' });
  }

  // 10. Subject all caps
  if (subject === subject.toUpperCase() && subject.length > 5) {
    score += 3;
    issues.push({ severity: 'high', text: 'Asunto completamente en MAYÚSCULAS' });
  }

  // Good practices (reduce score)
  const goodPractices = [];
  if (hasPersonalization) goodPractices.push('Usa personalización ({{nombre}}, {{empresa}})');
  if (linkMatches.length <= 1) goodPractices.push('Pocos enlaces — correcto para cold email');
  if (wordCount >= 50 && wordCount <= 300) goodPractices.push(`Longitud adecuada (${wordCount} palabras)`);
  if (subject.length >= 20 && subject.length <= 60) goodPractices.push('Longitud de asunto óptima');
  if (!body.includes('<img')) goodPractices.push('Sin imágenes — mejora entregabilidad en cold email');
  if (hasUnsub) goodPractices.push('Incluye opción de baja');

  // Cap score at 100
  score = Math.min(score, 100);

  // Rating
  let rating, color;
  if (score <= 5)       { rating = 'Excelente'; color = '#1D9E75'; }
  else if (score <= 15) { rating = 'Bueno'; color = '#3B6D11'; }
  else if (score <= 30) { rating = 'Aceptable'; color = '#BA7517'; }
  else if (score <= 50) { rating = 'Arriesgado'; color = '#E24B4A'; }
  else                  { rating = 'Muy peligroso'; color = '#A32D2D'; }

  // Sort issues by severity
  const order = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return { score, rating, color, issues: issues.slice(0, 20), goodPractices, wordCount, linkCount: linkMatches.length };
}

// ─── Routes ───────────────────────────────────────────────────────────────

// POST /api/spamscore/analyze — analyze subject + body
router.post('/analyze', async (req, res) => {
  const { subject, body, domain } = req.body;
  if (!subject && !body) return res.status(400).json({ error: 'Falta asunto o cuerpo' });

  const content = analyzeContent(subject || '', body || '');

  // DNS check if domain provided
  let dnsCheck = null;
  if (domain) {
    try {
      const [spfRecords, dmarcRecords] = await Promise.all([
        dns.resolveTxt(domain).catch(() => []),
        dns.resolveTxt(`_dmarc.${domain}`).catch(() => [])
      ]);
      const spf = spfRecords.flat().find(r => r.startsWith('v=spf1'));
      const dmarc = dmarcRecords.flat().find(r => r.startsWith('v=DMARC1'));
      dnsCheck = { spf: !!spf, dmarc: !!dmarc };

      if (!spf) {
        content.score += 5;
        content.issues.unshift({ severity: 'high', text: `SPF no configurado en ${domain} — alta probabilidad de spam` });
      }
      if (!dmarc) {
        content.score += 3;
        content.issues.unshift({ severity: 'medium', text: `DMARC no configurado en ${domain}` });
      }
      content.score = Math.min(content.score, 100);
    } catch(e) {}
  }

  res.json({ ...content, dnsCheck });
});

module.exports = router;
