import { Link } from "wouter";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-background/50 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-lg">
                H
              </div>
              <span className="font-heading font-bold text-xl tracking-wide">
                HustleCoin
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
              Powered by the Hustle. A premier Telegram Mini App where users mine HP, earn streak bonuses, climb leaderboards, and grow a vibrant community.
            </p>
            <div className="flex gap-4">
              <a 
                href="https://t.me/HustleCoinMinerBot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.9282 2.07183C22.0838 2.22742 22.1466 2.4513 22.0911 2.66699L18.4244 16.9298C18.3615 17.1744 18.1585 17.3481 17.9077 17.3719C17.6568 17.3956 17.4158 17.264 17.2937 17.037L13.8291 10.6276L20.1601 4.29665L12.9238 10.1581L5.94052 7.74796C5.69805 7.66427 5.53982 7.44199 5.53813 7.18243C5.53644 6.92287 5.69151 6.69846 5.93282 6.61111L21.2662 1.05555C21.4925 0.973403 21.7503 1.02534 21.9282 2.07183Z" fill="currentColor"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-medium text-white mb-4">Ecosystem</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/features" className="text-muted-foreground hover:text-primary transition-colors text-sm">Mining Features</Link>
              </li>
              <li>
                <Link href="/roadmap" className="text-muted-foreground hover:text-primary transition-colors text-sm">Roadmap</Link>
              </li>
              <li>
                <a href="https://t.me/HustleCoinMinerBot/hustlecoin" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm">Open App</a>
              </li>
              <li>
                <a href="https://t.me/HustleCoinMinerBot" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm">Telegram Community</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-medium text-white mb-4">Resources</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors text-sm">About Us</Link>
              </li>
              <li>
                <Link href="/docs" className="text-muted-foreground hover:text-primary transition-colors text-sm">Docs</Link>
              </li>
              <li>
                <Link href="/docs/whitepaper" className="text-muted-foreground hover:text-primary transition-colors text-sm">Whitepaper</Link>
              </li>
              <li>
                <Link href="/documentation" className="text-muted-foreground hover:text-primary transition-colors text-sm">Documentation</Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors text-sm">FAQ</Link>
              </li>
              <li>
                <Link href="/news" className="text-muted-foreground hover:text-primary transition-colors text-sm">News</Link>
              </li>
              <li>
                <Link href="/support" className="text-muted-foreground hover:text-primary transition-colors text-sm">Support</Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">Contact</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {currentYear} HustleCoin. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-xs">Privacy Policy</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors text-xs">Terms of Service</Link>
            <Link href="/cookies" className="text-muted-foreground hover:text-primary transition-colors text-xs">Cookies</Link>
            <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Powered by the Hustle</span>
          </div>
        </div>
      </div>
    </footer>
  );
}