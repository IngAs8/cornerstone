import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PLANS, formatPrice } from "@/lib/stripe/plans";

const FEATURES = [
  {
    icon: "📊",
    title: "Presupuestos inteligentes",
    desc: "50/30/20, 70/20/10 o personalizado. Tu presupuesto se adapta a ti.",
  },
  {
    icon: "💬",
    title: "Bot de WhatsApp",
    desc: "Registra gastos con un mensaje. \"Gasté $12 en almuerzo\" y listo.",
  },
  {
    icon: "🤖",
    title: "Asesor IA",
    desc: "Consejos financieros personalizados con acceso a tus propios datos.",
  },
  {
    icon: "📈",
    title: "Portafolio de inversiones",
    desc: "Crypto, acciones y ETFs. Precio en tiempo real, P&L automático.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Finanzas en familia",
    desc: "Comparte el dashboard con tu pareja o familia. Hasta 3 usuarios.",
  },
  {
    icon: "🌍",
    title: "Multi-moneda",
    desc: "Más de 150 monedas. Conversión automática a tu moneda base.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Arma tu presupuesto",
    desc: "Declara tus ingresos y elige una metodología. La app distribuye tus categorías automáticamente.",
  },
  {
    step: "02",
    title: "Registra sin fricción",
    desc: "Escribe al bot de WhatsApp o usa la app web. Cada gasto queda categorizado al instante.",
  },
  {
    step: "03",
    title: "Recibe asesoría real",
    desc: "El asesor IA conoce tus deudas, inversiones y presupuesto. Sus consejos son personalizados, no genéricos.",
  },
];

const FAQ = [
  {
    q: "¿Mis datos financieros están seguros?",
    a: "Sí. Todos los datos se almacenan en Supabase con cifrado en reposo y Row Level Security — ningún otro usuario puede ver tus datos.",
  },
  {
    q: "¿Funciona en mi país?",
    a: "Sí. La app soporta más de 150 monedas y el bot de WhatsApp funciona en cualquier país donde esté disponible WhatsApp.",
  },
  {
    q: "¿Cómo comparto datos con mi pareja?",
    a: "Desde la sección Familia, envías una invitación por email. Al aceptar, comparten el mismo dashboard, presupuesto y cuentas.",
  },
  {
    q: "¿Qué necesito para usar el Asesor IA?",
    a: "Tu propia clave de API de Anthropic (Claude) u OpenAI. Tú controlas el costo — la app no cobra por consultas de IA.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí. Sin contratos. Cancelas desde el portal de facturación y tu cuenta pasa al plan gratuito al final del período.",
  },
];

export default async function HomePage() {
  const t = await getTranslations("marketing");
  const tApp = await getTranslations("app");

  return (
    <main className="flex-1">
      {/* Header */}
      <header className="border-b border-foreground/10 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">{tApp("name")}</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/pricing" className="text-foreground/60 hover:text-foreground transition-colors hidden sm:block">
              Precios
            </Link>
            <Link href="/sign-in" className="px-3 py-1.5 rounded-md hover:bg-foreground/5 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/sign-up" className="px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity">
              {t("ctaPrimary")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-28 text-center">
        <p className="text-xs uppercase tracking-widest text-foreground/40 mb-5">{tApp("tagline")}</p>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
          {t("heroTitle")}
        </h1>
        <p className="text-lg text-foreground/60 mb-10 leading-relaxed max-w-xl mx-auto">
          {t("heroSubtitle")}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/sign-up" className="px-7 py-3 rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity">
            {t("ctaPrimary")}
          </Link>
          <Link href="#como-funciona" className="px-7 py-3 rounded-md border border-foreground/20 hover:bg-foreground/5 font-medium transition-colors">
            {t("ctaSecondary")}
          </Link>
        </div>
        <p className="text-xs text-foreground/30 mt-6">Sin tarjeta de crédito · Gratuito para siempre en el plan básico</p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-center mb-12 tracking-tight">Todo lo que necesitas para tomar control</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-foreground/10 p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-center mb-12 tracking-tight">Cómo funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="text-center">
              <div className="text-5xl font-semibold text-foreground/10 mb-4">{s.step}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-center mb-3 tracking-tight">Precios</h2>
        <p className="text-foreground/60 text-center mb-12 text-sm">Empieza gratis, crece cuando lo necesites</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.key}
              className={`rounded-xl border p-5 flex flex-col ${
                plan.key === "family_s" ? "border-foreground/40" : "border-foreground/10"
              }`}
            >
              <h3 className="font-semibold mb-1">{plan.name}</h3>
              <div className="mb-4">
                {plan.priceMonthly === 0 ? (
                  <span className="text-2xl font-semibold">Gratis</span>
                ) : (
                  <>
                    <span className="text-2xl font-semibold">{formatPrice(plan.priceMonthly)}</span>
                    <span className="text-foreground/40 text-sm">/mes</span>
                  </>
                )}
              </div>
              <ul className="space-y-1.5 mb-5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-foreground/60 flex gap-1.5">
                    <span className="text-emerald-400 shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.key === "free" ? "/sign-up" : "/pricing"}
                className="block text-center text-xs py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors"
              >
                {plan.key === "free" ? "Empezar gratis" : "Ver plan →"}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center mt-6">
          <Link href="/pricing" className="text-sm text-foreground/50 hover:text-foreground underline underline-offset-4">
            Ver comparación completa de planes →
          </Link>
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-center mb-10 tracking-tight">Preguntas frecuentes</h2>
        <div className="space-y-6">
          {FAQ.map((item) => (
            <div key={item.q} className="border-b border-foreground/10 pb-6">
              <h3 className="font-medium mb-2">{item.q}</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight mb-4">Empieza hoy, gratis</h2>
        <p className="text-foreground/60 mb-8">Sin tarjeta de crédito. Sin compromisos. Tu primera deuda pagada en semanas.</p>
        <Link href="/sign-up" className="inline-block px-8 py-3 rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity">
          Crear mi cuenta gratis
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-foreground/10 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground/40">
          <span>© 2026 Cornerstone Capital</span>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-foreground transition-colors">Precios</Link>
            <Link href="/sign-in" className="hover:text-foreground transition-colors">Iniciar sesión</Link>
            <Link href="/sign-up" className="hover:text-foreground transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
