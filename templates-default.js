// 10 default B2B minimalist templates
// Variables: {{nombre}}, {{empresa}}, {{email}}, {{logo_url}}, {{primary_color}}, {{accent_color}}, {{sender_name}}, {{sender_title}}, {{sender_company}}, {{cta_text}}, {{cta_url}}, {{body_text}}, {{subject_line}}, {{ps_text}}

const DEFAULT_TEMPLATES = [

  // 1. Plain text style
  {
    name: 'Texto puro',
    description: 'Sin HTML llamativo. Máxima entregabilidad.',
    category: 'cold',
    thumbnail_color: '#1a1a1a',
    variables: { primary_color: '#1a1a1a', accent_color: '#4f46e5', sender_name: 'Ramon', sender_title: 'CEO', sender_company: 'Presencia', cta_text: 'Respóndeme a este correo', cta_url: '', body_text: 'Te escribo porque creo que Presencia puede ayudar a tu equipo a cumplir con el registro horario obligatorio de forma sencilla.\n\n¿Tienes 10 minutos esta semana para una llamada?', ps_text: 'P.D. Solo tardamos 15 minutos en configurarlo todo.' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7">
<div style="max-width:560px;margin:0 auto;padding:40px 20px">
{{#if logo_url}}<img src="{{logo_url}}" style="height:36px;margin-bottom:28px;display:block" alt="logo"/>{{/if}}
<p style="margin:0 0 16px">Hola {{nombre}},</p>
<p style="margin:0 0 16px;white-space:pre-line">{{body_text}}</p>
<p style="margin:24px 0 4px">Saludos,</p>
<p style="margin:0;font-weight:600">{{sender_name}}</p>
<p style="margin:0;color:#666;font-size:13px">{{sender_title}} · {{sender_company}}</p>
{{#if ps_text}}<p style="margin:24px 0 0;color:#888;font-size:13px;border-top:1px solid #eee;padding-top:16px">{{ps_text}}</p>{{/if}}
</div></body></html>`
  },

  // 2. Línea superior de color
  {
    name: 'Franja de color',
    description: 'Franja superior de color + contenido limpio.',
    category: 'cold',
    thumbnail_color: '#4f46e5',
    variables: { primary_color: '#4f46e5', accent_color: '#4f46e5', sender_name: 'Ramon', sender_title: 'CEO', sender_company: 'Presencia', cta_text: '¿Hablamos esta semana?', cta_url: '', body_text: 'Te escribo porque creo que Presencia puede ayudar a tu equipo a cumplir con el registro horario obligatorio de forma sencilla.\n\n¿Tienes 10 minutos esta semana?', ps_text: '' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff">
<div style="height:4px;background:{{primary_color}}"></div>
<div style="padding:36px 40px">
{{#if logo_url}}<img src="{{logo_url}}" style="height:32px;margin-bottom:28px;display:block" alt="logo"/>{{/if}}
<p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.7">Hola {{nombre}},</p>
<p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.7;white-space:pre-line">{{body_text}}</p>
<p style="margin:0 0 4px;font-size:15px;color:#1a1a1a">Un saludo,</p>
<p style="margin:0;font-size:15px;font-weight:600;color:#1a1a1a">{{sender_name}}</p>
<p style="margin:0;font-size:13px;color:#888">{{sender_title}} · {{sender_company}}</p>
</div>
<div style="padding:16px 40px;border-top:1px solid #eee;font-size:11px;color:#bbb">{{sender_company}} · <a href="{{cta_url}}" style="color:#bbb">Darse de baja</a></div>
</div></body></html>`
  },

  // 3. Con CTA button
  {
    name: 'Botón CTA',
    description: 'Email limpio con botón de llamada a la acción.',
    category: 'follow-up',
    thumbnail_color: '#059669',
    variables: { primary_color: '#059669', accent_color: '#059669', sender_name: 'Ramon', sender_title: 'CEO', sender_company: 'Presencia', cta_text: 'Reservar 15 minutos', cta_url: 'https://calendly.com/', body_text: 'Te escribo porque creo que Presencia puede ayudar a tu empresa a cumplir con el registro horario obligatorio.\n\nSon 15 minutos, sin compromiso.', ps_text: '' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;margin-bottom:20px">
<div style="padding:40px">
{{#if logo_url}}<img src="{{logo_url}}" style="height:32px;margin-bottom:28px;display:block" alt="logo"/>{{/if}}
<p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.7">Hola {{nombre}},</p>
<p style="margin:0 0 28px;font-size:15px;color:#333;line-height:1.7;white-space:pre-line">{{body_text}}</p>
<a href="{{cta_url}}" style="display:inline-block;background:{{primary_color}};color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600">{{cta_text}}</a>
<p style="margin:28px 0 4px;font-size:14px;color:#1a1a1a">Saludos,</p>
<p style="margin:0;font-size:14px;font-weight:600">{{sender_name}}</p>
<p style="margin:0;font-size:13px;color:#888">{{sender_title}} · {{sender_company}}</p>
</div>
<div style="padding:14px 40px;background:#f9f9f9;font-size:11px;color:#bbb">Si no deseas recibir más emails, <a href="#" style="color:#bbb">haz clic aquí</a>.</div>
</div></body></html>`
  },

  // 4. Tarjeta centrada
  {
    name: 'Tarjeta centrada',
    description: 'Layout de tarjeta con encabezado de color.',
    category: 'cold',
    thumbnail_color: '#2563eb',
    variables: { primary_color: '#2563eb', accent_color: '#1d4ed8', sender_name: 'Ramon', sender_title: 'CEO', sender_company: 'Presencia', cta_text: '¿Te parece bien hablar?', cta_url: '', body_text: 'Trabajo con empresas como la tuya para simplificar el control horario del equipo.\n\n¿Tienes 10 minutos esta semana?', ps_text: 'Respaldados por Lanzadera (Juan Roig).' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:20px;background:#eef2ff;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07)">
<div style="background:{{primary_color}};padding:28px 36px">
{{#if logo_url}}<img src="{{logo_url}}" style="height:28px;display:block;filter:brightness(0) invert(1)" alt="logo"/>{{else}}<p style="margin:0;font-size:18px;font-weight:700;color:#fff">{{sender_company}}</p>{{/if}}
</div>
<div style="padding:32px 36px">
<p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.7">Hola {{nombre}},</p>
<p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;white-space:pre-line">{{body_text}}</p>
<p style="margin:20px 0 4px;font-size:14px;color:#1a1a1a">Un saludo,</p>
<p style="margin:0;font-weight:600;font-size:14px">{{sender_name}}</p>
<p style="margin:0;font-size:13px;color:#888">{{sender_title}} · {{sender_company}}</p>
{{#if ps_text}}<p style="margin:20px 0 0;font-size:12px;color:#999;border-top:1px solid #f0f0f0;padding-top:16px">{{ps_text}}</p>{{/if}}
</div>
<div style="padding:12px 36px;background:#f8f9fa;font-size:11px;color:#ccc">© {{sender_company}} · <a href="#" style="color:#ccc">Baja</a></div>
</div></body></html>`
  },

  // 5. Minimalista lateral
  {
    name: 'Borde lateral',
    description: 'Línea de acento lateral izquierda.',
    category: 'follow-up',
    thumbnail_color: '#dc2626',
    variables: { primary_color: '#dc2626', accent_color: '#dc2626', sender_name: 'Ramon', sender_title: 'CEO', sender_company: 'Presencia', cta_text: 'Responde a este email', cta_url: '', body_text: 'Solo quería hacer un seguimiento de mi email anterior.\n\n¿Has tenido oportunidad de revisarlo? Me encantaría explorar si podemos ayudar a {{empresa}}.', ps_text: '' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#fff;font-family:Georgia,serif">
<div style="max-width:560px;margin:0 auto;padding:48px 20px">
{{#if logo_url}}<img src="{{logo_url}}" style="height:30px;margin-bottom:32px;display:block" alt="logo"/>{{/if}}
<div style="border-left:3px solid {{primary_color}};padding-left:20px">
<p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;line-height:1.8">Hola {{nombre}},</p>
<p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.8;white-space:pre-line">{{body_text}}</p>
</div>
<p style="margin:24px 0 4px;font-size:15px;color:#1a1a1a">Atentamente,</p>
<p style="margin:0;font-weight:700;font-size:15px">{{sender_name}}</p>
<p style="margin:2px 0 0;font-size:13px;color:#888">{{sender_title}}, {{sender_company}}</p>
</div></body></html>`
  },

  // 6. Dos columnas info
  {
    name: 'Propuesta de valor',
    description: 'Con 3 puntos de valor destacados.',
    category: 'cold',
    thumbnail_color: '#7c3aed',
    variables: { primary_color: '#7c3aed', accent_color: '#7c3aed', sender_name: 'Ramon', sender_title: 'CEO', sender_company: 'Presencia', cta_text: '¿Hablamos?', cta_url: '', body_text: 'Presencia ayuda a equipos como el tuyo a:', ps_text: '' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#faf5ff;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff">
<div style="height:3px;background:{{primary_color}}"></div>
<div style="padding:36px 40px">
{{#if logo_url}}<img src="{{logo_url}}" style="height:30px;margin-bottom:28px;display:block" alt="logo"/>{{/if}}
<p style="margin:0 0 8px;font-size:15px;color:#1a1a1a">Hola {{nombre}},</p>
<p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.7">{{body_text}}</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
<tr><td style="padding:10px 12px;background:#faf5ff;border-radius:6px;font-size:14px;color:#333;width:33%">✅ Cumplir con el<br><strong>registro horario</strong></td>
<td style="width:2%"></td>
<td style="padding:10px 12px;background:#faf5ff;border-radius:6px;font-size:14px;color:#333;width:33%">⏱️ Ahorrar tiempo<br><strong>cada semana</strong></td>
<td style="width:2%"></td>
<td style="padding:10px 12px;background:#faf5ff;border-radius:6px;font-size:14px;color:#333;width:33%">📱 Fichar desde<br><strong>móvil</strong></td></tr>
</table>
<p style="margin:0 0 4px;font-size:14px;color:#1a1a1a">¿Te parece bien que hablemos 15 minutos?</p>
<p style="margin:20px 0 4px;font-size:14px">Saludos,</p>
<p style="margin:0;font-weight:600;font-size:14px">{{sender_name}}</p>
<p style="margin:0;font-size:13px;color:#888">{{sender_title}} · {{sender_company}}</p>
</div>
<div style="padding:12px 40px;font-size:11px;color:#ccc;border-top:1px solid #f0f0f0"><a href="#" style="color:#ccc">Darse de baja</a></div>
</div></body></html>`
  },

  // 7. Firma ejecutiva
  {
    name: 'Firma ejecutiva',
    description: 'Muy sobrio, parece email personal de CEO.',
    category: 'cold',
    thumbnail_color: '#374151',
    variables: { primary_color: '#374151', accent_color: '#374151', sender_name: 'Ramon', sender_title: 'CEO & Cofundador', sender_company: 'Presencia', cta_text: '', cta_url: '', body_text: 'He visto que {{empresa}} tiene un equipo considerable y quería preguntarte directamente: ¿cómo gestionáis actualmente el registro de horas?\n\nLlevamos tiempo ayudando a empresas del sector a cumplir con la normativa sin complicaciones. Si tiene sentido, me gustaría contarte cómo en una llamada rápida.', ps_text: 'Respaldados por Lanzadera, la aceleradora de Juan Roig.' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.75">
<div style="max-width:540px;margin:0 auto;padding:48px 20px">
<p style="margin:0 0 20px">Hola {{nombre}},</p>
<p style="margin:0 0 16px;white-space:pre-line">{{body_text}}</p>
<p style="margin:24px 0 2px">Un saludo,</p>
<table style="border-collapse:collapse;margin-top:12px">
<tr>
{{#if logo_url}}<td style="padding-right:16px;border-right:2px solid {{primary_color}};vertical-align:middle"><img src="{{logo_url}}" style="height:40px;display:block" alt="logo"/></td>{{/if}}
<td style="padding-left:{{#if logo_url}}16px{{else}}0px{{/if}};vertical-align:middle">
<p style="margin:0;font-weight:700;font-size:15px;color:{{primary_color}}">{{sender_name}}</p>
<p style="margin:0;font-size:13px;color:#666">{{sender_title}} · {{sender_company}}</p>
</td></tr></table>
{{#if ps_text}}<p style="margin:28px 0 0;font-size:12px;color:#999;font-style:italic">{{ps_text}}</p>{{/if}}
</div></body></html>`
  },

  // 8. Follow-up corto
  {
    name: 'Follow-up corto',
    description: 'Para segundo o tercer contacto. Ultra breve.',
    category: 'follow-up',
    thumbnail_color: '#f59e0b',
    variables: { primary_color: '#f59e0b', accent_color: '#d97706', sender_name: 'Ramon', sender_title: 'CEO', sender_company: 'Presencia', cta_text: '', cta_url: '', body_text: 'Retomo el hilo del email que te mandé la semana pasada.\n\n¿Tiene sentido hablar, o no es el momento?', ps_text: 'Si no es de interés, dímelo y no te escribo más.' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1a1a1a">
<div style="max-width:480px;margin:0 auto;padding:40px 20px">
{{#if logo_url}}<img src="{{logo_url}}" style="height:28px;margin-bottom:24px;display:block" alt="logo"/>{{/if}}
<p style="margin:0 0 16px">Hola {{nombre}},</p>
<p style="margin:0 0 16px;white-space:pre-line">{{body_text}}</p>
<p style="margin:20px 0 2px">Gracias,</p>
<p style="margin:0;font-weight:600">{{sender_name}}</p>
<p style="margin:0;font-size:13px;color:#888">{{sender_company}}</p>
{{#if ps_text}}<p style="margin:20px 0 0;font-size:13px;color:#999;border-top:1px solid #f5f5f5;padding-top:16px;font-style:italic">{{ps_text}}</p>{{/if}}
</div></body></html>`
  },

  // 9. Con imagen de cabecera
  {
    name: 'Cabecera con imagen',
    description: 'Banner de imagen superior + contenido.',
    category: 'nurture',
    thumbnail_color: '#0ea5e9',
    variables: { primary_color: '#0ea5e9', accent_color: '#0284c7', sender_name: 'Ramon', sender_title: 'CEO', sender_company: 'Presencia', cta_text: 'Saber más', cta_url: 'https://presencia.app', body_text: 'En Presencia ayudamos a empresas del sector a cumplir con el registro horario obligatorio desde el móvil, sin papeles ni Excel.\n\n¿Te lo cuento en 15 minutos?', ps_text: '' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f0f9ff;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:16px;margin-bottom:16px">
<div style="background:{{primary_color}};padding:28px 36px;text-align:center">
{{#if logo_url}}<img src="{{logo_url}}" style="height:36px;display:inline-block;filter:brightness(0) invert(1)" alt="logo"/>
{{else}}<p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">{{sender_company}}</p>{{/if}}
</div>
<div style="padding:36px">
<p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.75">Hola {{nombre}},</p>
<p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.75;white-space:pre-line">{{body_text}}</p>
<div style="text-align:center;margin:0 0 28px">
<a href="{{cta_url}}" style="display:inline-block;background:{{primary_color}};color:#fff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:.3px">{{cta_text}}</a>
</div>
<p style="margin:0;font-size:14px;color:#1a1a1a">Saludos,<br><strong>{{sender_name}}</strong></p>
<p style="margin:4px 0 0;font-size:13px;color:#888">{{sender_title}} · {{sender_company}}</p>
</div>
<div style="padding:14px 36px;background:#f8f8f8;font-size:11px;color:#ccc;text-align:center"><a href="#" style="color:#ccc">Cancelar suscripción</a></div>
</div></body></html>`
  },

  // 10. Digest / newsletter
  {
    name: 'Digest B2B',
    description: 'Para nurturing con contenido de valor.',
    category: 'nurture',
    thumbnail_color: '#10b981',
    variables: { primary_color: '#10b981', accent_color: '#059669', sender_name: 'Ramon', sender_title: 'CEO', sender_company: 'Presencia', cta_text: 'Leer más', cta_url: 'https://presencia.app/blog', body_text: 'Desde enero de 2020, la inspección de trabajo ha incrementado un 40% las sanciones por incumplimiento del registro horario.\n\nEn este email te contamos las 3 cosas que tu empresa debe tener en regla antes de que llegue una inspección.', ps_text: '' },
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f6fef9;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;margin-top:16px;margin-bottom:16px;border-radius:8px;overflow:hidden">
<div style="padding:24px 36px;border-bottom:3px solid {{primary_color}};display:flex;align-items:center">
{{#if logo_url}}<img src="{{logo_url}}" style="height:28px;display:block" alt="logo"/>{{else}}<p style="margin:0;font-weight:700;font-size:16px;color:{{primary_color}}">{{sender_company}}</p>{{/if}}
</div>
<div style="padding:32px 36px">
<p style="margin:0 0 20px;font-size:15px;color:#1a1a1a;line-height:1.75">Hola {{nombre}},</p>
<p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.75;white-space:pre-line">{{body_text}}</p>
<div style="background:#f6fef9;border-left:3px solid {{primary_color}};padding:14px 18px;margin:0 0 24px;border-radius:0 6px 6px 0">
<p style="margin:0;font-size:13px;color:#444;line-height:1.6">💡 <strong>¿Sabías que?</strong> Las sanciones por no tener el registro horario pueden llegar hasta <strong>6.250€ por infracción</strong>.</p>
</div>
<a href="{{cta_url}}" style="display:inline-block;background:{{primary_color}};color:#fff;text-decoration:none;padding:11px 24px;border-radius:5px;font-size:14px;font-weight:600">{{cta_text}} →</a>
<hr style="border:none;border-top:1px solid #eee;margin:28px 0"/>
<p style="margin:0;font-size:14px;color:#1a1a1a">Saludos,<br><strong>{{sender_name}}</strong> · {{sender_company}}</p>
</div>
<div style="padding:14px 36px;background:#f8f8f8;font-size:11px;color:#bbb;text-align:center">
Recibes este email porque te registraste en {{sender_company}} · <a href="#" style="color:#bbb">Darse de baja</a>
</div>
</div></body></html>`
  }
];

module.exports = DEFAULT_TEMPLATES;
