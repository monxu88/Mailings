const express = require('express');
const router = express.Router();
const dns = require('dns').promises;

async function checkSPF(domain) {
  try {
    const records = await dns.resolveTxt(domain);
    const spf = records.flat().find(r => r.startsWith('v=spf1'));
    return { ok: !!spf, value: spf || null };
  } catch { return { ok: false, value: null }; }
}

async function checkDKIM(domain, selector = 'default') {
  const selectors = [selector, 'google', 'mail', 'smtp', 'k1', 'dkim'];
  for (const sel of selectors) {
    try {
      const records = await dns.resolveTxt(`${sel}._domainkey.${domain}`);
      const val = records.flat().join('');
      if (val.includes('v=DKIM1')) return { ok: true, value: val.substring(0, 80) + '...', selector: sel };
    } catch { continue; }
  }
  return { ok: false, value: null, selector: null };
}

async function checkDMARC(domain) {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const dmarc = records.flat().find(r => r.startsWith('v=DMARC1'));
    return { ok: !!dmarc, value: dmarc || null };
  } catch { return { ok: false, value: null }; }
}

async function checkMX(domain) {
  try {
    const records = await dns.resolveMx(domain);
    records.sort((a, b) => a.priority - b.priority);
    return { ok: records.length > 0, value: records.slice(0, 2).map(r => `${r.exchange} (${r.priority})`).join(', ') };
  } catch { return { ok: false, value: null }; }
}

router.get('/:domain', async (req, res) => {
  const { domain } = req.params;
  if (!domain || !domain.includes('.')) return res.status(400).json({ error: 'Dominio inválido' });

  const [spf, dkim, dmarc, mx] = await Promise.all([
    checkSPF(domain),
    checkDKIM(domain),
    checkDMARC(domain),
    checkMX(domain)
  ]);

  const score = [spf.ok, dkim.ok, dmarc.ok, mx.ok].filter(Boolean).length;

  res.json({
    domain,
    score,
    maxScore: 4,
    spf,
    dkim,
    dmarc,
    mx,
    recommendation: score === 4
      ? 'Todo correcto. Este dominio está bien configurado para cold email.'
      : score >= 2
      ? 'Configuración parcial. Corrige los registros marcados en rojo antes de enviar.'
      : 'Configuración insuficiente. No envíes emails desde este dominio hasta configurar SPF y DKIM.'
  });
});

module.exports = router;
