import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.RESEND_FROM_NAME ?? "Payment Report"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@example.com"}>`;
const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "Payment Report";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Bienvenido a ${APP}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1d4ed8">¡Bienvenido, ${name}!</h2>
        <p>Tu cuenta en <strong>${APP}</strong> ha sido creada exitosamente.</p>
        <p>Ya puedes iniciar sesión y reportar tus pagos de manera rápida y segura.</p>
        <p>
          <a href="${APP_URL}/dashboard" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:white;text-decoration:none;border-radius:6px">
            Ir al Panel
          </a>
        </p>
        <p style="color:#6b7280;font-size:.875rem">No respondas a este correo.</p>
      </div>
    `,
  });
}

export async function sendPaymentReceivedEmail(to: string, name: string, reference?: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[${APP}] Reporte de pago recibido`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1d4ed8">Reporte de Pago Recibido</h2>
        <p>Hola ${name},</p>
        <p>Hemos recibido tu reporte de pago${reference ? ` (ref: <strong>${reference}</strong>)` : ""}.</p>
        <p>Nuestro equipo lo revisará y validará pronto. Recibirás un correo cuando se tome una decisión.</p>
        <p style="color:#6b7280;font-size:.875rem">No respondas a este correo.</p>
      </div>
    `,
  });
}

export async function sendPaymentApprovedEmail(
  to: string,
  name: string,
  reference: string | undefined,
  receiptUrl: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[${APP}] Pago aprobado ✓`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16a34a">Pago Aprobado</h2>
        <p>Hola ${name},</p>
        <p>Tu pago${reference ? ` (ref: <strong>${reference}</strong>)` : ""} ha sido <strong>aprobado</strong>.</p>
        <p>Puedes ver y descargar tu recibo en el siguiente enlace:</p>
        <p>
          <a href="${receiptUrl}" style="display:inline-block;padding:10px 20px;background:#16a34a;color:white;text-decoration:none;border-radius:6px">
            Ver Recibo
          </a>
        </p>
        <p style="color:#6b7280;font-size:.875rem">El recibo es válido por 6 meses. No respondas a este correo.</p>
      </div>
    `,
  });
}

export async function sendPaymentRejectedEmail(
  to: string,
  name: string,
  reference: string | undefined,
  reason: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[${APP}] Pago rechazado — Acción requerida`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">Pago Rechazado</h2>
        <p>Hola ${name},</p>
        <p>Tu pago${reference ? ` (ref: <strong>${reference}</strong>)` : ""} no pudo ser aprobado.</p>
        <p><strong>Motivo:</strong> ${reason}</p>
        <p>Por favor inicia sesión y envía un reporte corregido si es necesario.</p>
        <p style="color:#6b7280;font-size:.875rem">No respondas a este correo.</p>
      </div>
    `,
  });
}

export async function sendPendingAlertsEmail(
  to: string,
  adminName: string,
  payments: { userName: string; reference?: string; hoursOld: number }[]
) {
  const rows = payments
    .map(
      (p) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${p.userName}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace">${p.reference ?? "—"}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#b45309">${p.hoursOld}h pendiente</td>
        </tr>`
    )
    .join("");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `[${APP}] ${payments.length} pago(s) pendiente(s) de revisión`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#b45309">Pagos Pendientes de Revisión</h2>
        <p>Hola ${adminName},</p>
        <p>Los siguientes pagos llevan más de 48 horas sin revisión:</p>
        <table style="width:100%;border-collapse:collapse;font-size:.875rem">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:6px 12px;text-align:left">Usuario</th>
              <th style="padding:6px 12px;text-align:left">Referencia</th>
              <th style="padding:6px 12px;text-align:left">Tiempo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:16px">
          <a href="${APP_URL}/admin/payments?status=PENDING" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:white;text-decoration:none;border-radius:6px">
            Revisar Pagos
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendDailySummaryEmail(
  to: string,
  adminName: string,
  stats: { pending: number; approved: number; rejected: number }
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[${APP}] Resumen diario`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1d4ed8">Resumen del Día</h2>
        <p>Hola ${adminName},</p>
        <table style="width:100%;border-collapse:collapse;font-size:.875rem">
          <tr><td style="padding:8px 12px">Pendientes</td><td style="padding:8px 12px;font-weight:bold;color:#b45309">${stats.pending}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px 12px">Aprobados hoy</td><td style="padding:8px 12px;font-weight:bold;color:#16a34a">${stats.approved}</td></tr>
          <tr><td style="padding:8px 12px">Rechazados hoy</td><td style="padding:8px 12px;font-weight:bold;color:#dc2626">${stats.rejected}</td></tr>
        </table>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[${APP}] Restablecer contraseña`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4f46e5">Restablecer Contraseña</h2>
        <p>Hola ${name},</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>${APP}</strong>.</p>
        <p>Haz clic en el botón de abajo para crear una nueva contraseña. Este enlace es válido por <strong>1 hora</strong>.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:white;text-decoration:none;border-radius:6px">
            Restablecer Contraseña
          </a>
        </p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no cambiará.</p>
        <p style="color:#6b7280;font-size:.875rem">Este enlace expira en 1 hora. No respondas a este correo.</p>
      </div>
    `,
  });
}

export { resend };
