import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Mail, Send, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function Contact() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema)
  });

  const onSubmit = async (data: ContactForm) => {
    setStatus("submitting");
    try {
      await apiFetch("/api/public/contact", {
        method: "POST",
        body: JSON.stringify(data)
      });
      setStatus("success");
      reset();
    } catch (e: any) {
      setStatus("error");
      setErrorMessage(e.message || "Failed to send message.");
    }
  };

  return (
    <div className="flex flex-col w-full pb-20">
      <section className="pt-20 pb-16 md:pt-32 md:pb-16 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-heading font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Get in Touch
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            We live where our community lives. Telegram is our primary hub, but you can also reach us here for formal inquiries.
          </motion.p>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-16">
            
            <div className="lg:col-span-2 space-y-6">
              <motion.a
                href="https://t.me/HustleCoinMinerBot"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card border border-primary/30 p-8 rounded-3xl hover:bg-primary/5 transition-all group relative overflow-hidden block"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform" />
                <div className="w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-heading font-bold mb-2">Telegram Community</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Join thousands of active miners. Ask questions, report bugs, or discuss strategies in real-time.
                </p>
                <span className="font-medium text-primary group-hover:text-white transition-colors flex items-center gap-2">
                  Join Group &rarr;
                </span>
              </motion.a>

              <motion.div
                className="bg-card border border-white/5 p-8 rounded-3xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="w-14 h-14 bg-white/5 text-muted-foreground rounded-full flex items-center justify-center mb-6">
                  <Mail className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-heading font-bold mb-2">Direct Mail</h2>
                <p className="text-muted-foreground text-sm">
                  For partnerships, integrations, or media inquiries, use the form. We review all submissions within 48 hours.
                </p>
              </motion.div>
            </div>

            <motion.div 
              className="lg:col-span-3 bg-card border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              
              <h2 className="text-2xl font-heading font-bold mb-8 relative z-10">Send a Message</h2>

              {status === "success" ? (
                <div className="py-16 text-center relative z-10">
                  <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Message Sent</h3>
                  <p className="text-muted-foreground mb-8">We've received your transmission and will get back to you shortly.</p>
                  <button onClick={() => setStatus("idle")} className="text-primary font-medium hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                  {status === "error" && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
                      {errorMessage}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Name</label>
                      <input 
                        {...register("name")}
                        className={`w-full bg-black border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors`}
                        placeholder="John Doe"
                      />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
                      <input 
                        {...register("email")}
                        className={`w-full bg-black border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors`}
                        placeholder="john@example.com"
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Subject</label>
                    <input 
                      {...register("subject")}
                      className={`w-full bg-black border ${errors.subject ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors`}
                      placeholder="Partnership Inquiry"
                    />
                    {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Message</label>
                    <textarea 
                      {...register("message")}
                      rows={5}
                      className={`w-full bg-black border ${errors.message ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors resize-none`}
                      placeholder="How can we collaborate?"
                    />
                    {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
                  </div>

                  <button 
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full bg-primary text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-70"
                  >
                    {status === "submitting" ? "Transmitting..." : "Send Message"} 
                    {status !== "submitting" && <Send className="w-5 h-5" />}
                  </button>
                </form>
              )}
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
}
