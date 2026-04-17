# ColdMail — Gestor de cold email para Presencia

App web completa para gestionar envíos de cold email masivos con múltiples cuentas SMTP.

## Funcionalidades

- Importar suscriptores desde Excel (.xlsx) o CSV
- Gestión de múltiples cuentas SMTP con límite diario por cuenta
- Verificación real de SPF, DKIM, DMARC y MX de cualquier dominio
- Planificador de envíos con distribución automática entre cuentas
- Personalización con {{nombre}} y {{empresa}} en el cuerpo del email
- Dashboard con métricas en tiempo real
- Log de envíos

---

## Instalación local

```bash
git clone <tu-repo>
cd coldmail
npm install
npm start
```

Abre http://localhost:3000

---

## Despliegue en Railway (recomendado)

1. Crea una cuenta en https://railway.app
2. Nuevo proyecto → Deploy from GitHub repo
3. Sube este código a un repo de GitHub
4. Railway detecta Node.js automáticamente y despliega

La base de datos SQLite se crea automáticamente en el primer arranque.

> ⚠️ En Railway el disco es efímero. Para producción seria, migra la DB a Railway PostgreSQL o usa un volumen persistente.

---

## Uso

### 1. Añade cuentas SMTP
Ve a "Cuentas SMTP" y configura tus dominios alternativos:
- Host: smtp.tudominio.com (o smtp.gmail.com, smtp.brevo.com, etc.)
- Puerto: 587 (TLS) o 465 (SSL)
- Límite recomendado: 30-50 emails/día por cuenta en fase de warm-up

### 2. Verifica tus dominios
En "Verificar DNS" comprueba que SPF, DKIM y DMARC estén bien configurados antes de enviar.

### 3. Importa tu lista
En "Suscriptores" importa tu Excel. Columnas reconocidas automáticamente:
- email / Email / EMAIL
- nombre / name / Name
- empresa / company / Company
- sector / Sector

### 4. Envía
En "Enviar campaña" redacta el email, ajusta cuántos enviar hoy y lanza.
Usa {{nombre}} y {{empresa}} para personalizar cada email.

---

## Stack técnico

- Node.js + Express
- SQLite (better-sqlite3)
- Nodemailer
- SheetJS (xlsx)
- HTML/CSS/JS vanilla (sin frameworks)
