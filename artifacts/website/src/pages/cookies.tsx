import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";

const LAST_UPDATED = "July 15, 2026";

const sections = [
  {
    title: "What Are Cookies",
    body: `Cookies are small text files stored on your device. HustleCoin's public website uses minimal, functional storage rather than third-party advertising cookies.`,
  },
  {
    title: "How We Use Storage",
    body: `We use local/session storage to remember lightweight preferences (such as dismissed announcements) and to associate anonymous analytics events (page views, referrers, device type) with a session so we can understand aggregate traffic patterns. We do not use this data to build cross-site advertising profiles.`,
  },
  {
    title: "Telegram Mini App",
    body: `Inside the Telegram Mini App itself, session state is managed through Telegram's WebApp platform rather than browser cookies.`,
  },
  {
    title: "Managing Cookies",
    body: `Most browsers let you block or delete cookies and local storage through their settings. Doing so may affect some non-essential website features (like remembering a dismissed announcement) but will not prevent you from using the site or the Mini App.`,
  },
];

export default function Cookies() {
  return (
    <div className="flex flex-col w-full pb-20">
      <Seo
        title="Cookies Policy | HustleCoin"
        description="How HustleCoin's website uses cookies and local storage."
        path="/cookies"
      />
      <section className="pt-20 pb-12 md:pt-32 md:pb-16 px-4 md:px-6">
        <div className="container mx-auto max-w-3xl">
          <motion.h1
            className="text-4xl md:text-5xl font-heading font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Cookies Policy
          </motion.h1>
          <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-3xl space-y-12">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-2xl font-heading font-bold mb-3">{s.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
